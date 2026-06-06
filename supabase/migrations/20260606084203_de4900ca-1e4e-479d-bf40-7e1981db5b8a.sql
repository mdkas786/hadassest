CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_had text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT had_id INTO v_had FROM public.profiles WHERE id = _user_id;

  IF v_had IS NOT NULL THEN
    UPDATE public.profiles
    SET referred_by = NULL
    WHERE referred_by = v_had;
  END IF;

  DELETE FROM public.return_payments
  WHERE user_id = _user_id OR (v_had IS NOT NULL AND had_id = v_had);

  DELETE FROM public.transactions
  WHERE user_id = _user_id OR (v_had IS NOT NULL AND had_id = v_had);

  DELETE FROM public.investments
  WHERE user_id = _user_id OR (v_had IS NOT NULL AND had_id = v_had);

  DELETE FROM public.notifications
  WHERE (v_had IS NOT NULL AND had_id = v_had);

  DELETE FROM public.sponsor_income
  WHERE earner_user_id = _user_id
     OR referred_user_id = _user_id
     OR (v_had IS NOT NULL AND (earner_had_id = v_had OR referred_had_id = v_had));

  DELETE FROM public.partner_income
  WHERE earner_user_id = _user_id
     OR (v_had IS NOT NULL AND (earner_had_id = v_had OR direct1_had_id = v_had OR direct2_had_id = v_had));

  DELETE FROM public.daily_reports
  WHERE (v_had IS NOT NULL AND had_id = v_had);

  DELETE FROM public.user_roles
  WHERE user_id = _user_id;

  DELETE FROM public.profiles
  WHERE id = _user_id;

  DELETE FROM auth.users
  WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.process_monthly_roi(_month text)
RETURNS TABLE(processed integer, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  v_amt numeric;
  v_remaining numeric;
  v_count int := 0;
  v_total numeric := 0;
  v_period_start date := to_date(_month || '-01', 'YYYY-MM-DD');
  v_sponsor_id uuid;
  v_sponsor_had text;
  v_directs int;
  v_level_amt numeric;
  v_sp_inv record;
  v_sp_remaining numeric;
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR r IN
    SELECT i.* FROM public.investments i
    WHERE i.status = 'active' AND i.start_date <= v_period_start
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.return_payments rp
      WHERE rp.had_id = r.had_id AND rp.notes = 'monthly_roi:' || _month
    ) THEN CONTINUE; END IF;

    v_remaining := GREATEST(0, COALESCE(r.expected_2x, r.amount_invested * 2) - COALESCE(r.amount_received,0));
    IF v_remaining <= 0 THEN
      UPDATE public.investments SET status = 'completed'::investment_status WHERE id = r.id;
      CONTINUE;
    END IF;

    v_amt := round((r.amount_invested * r.plan_rate / 100.0)::numeric, 2);
    v_amt := LEAST(v_amt, v_remaining);
    IF v_amt <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.return_payments(had_id, user_id, amount, method, txn_ref, notes, paid_by)
    VALUES (r.had_id, r.user_id, v_amt, 'AUTO', 'monthly-' || _month, 'monthly_roi:' || _month, auth.uid());

    UPDATE public.investments
       SET amount_received = COALESCE(amount_received,0) + v_amt,
           status = CASE WHEN COALESCE(amount_received,0) + v_amt >= COALESCE(expected_2x, amount_invested * 2)
                         THEN 'completed'::investment_status ELSE status END
     WHERE id = r.id;

    INSERT INTO public.notifications(had_id, title, body, notif_type)
    VALUES (r.had_id, 'Monthly ROI Credited 💰',
            'Aapke ' || r.plan_name || ' plan ka ' || _month || ' ka monthly return: ₹' || v_amt,
            'success');

    v_count := v_count + 1;
    v_total := v_total + v_amt;

    SELECT p.id, p.had_id INTO v_sponsor_id, v_sponsor_had
      FROM public.profiles me
      JOIN public.profiles p ON p.had_id = me.referred_by
     WHERE me.id = r.user_id;

    IF v_sponsor_id IS NOT NULL THEN
      SELECT COUNT(DISTINCT p2.id) INTO v_directs
        FROM public.profiles p2
        JOIN public.transactions t2
          ON t2.user_id = p2.id AND t2.type = 'investment' AND t2.status = 'verified'
       WHERE p2.referred_by = v_sponsor_had;

      IF v_directs >= 2 THEN
        v_level_amt := round((v_amt * 0.10)::numeric, 2);

        SELECT * INTO v_sp_inv FROM public.investments
         WHERE user_id = v_sponsor_id ORDER BY created_at LIMIT 1;

        IF v_sp_inv.id IS NOT NULL THEN
          v_sp_remaining := GREATEST(0,
            COALESCE(v_sp_inv.expected_2x, v_sp_inv.amount_invested * 2) - COALESCE(v_sp_inv.amount_received,0));
          v_level_amt := LEAST(v_level_amt, v_sp_remaining);
        END IF;

        IF v_level_amt > 0 THEN
          INSERT INTO public.partner_income(
            earner_user_id, earner_had_id, period_month,
            direct1_had_id, direct1_roi, total_bonus, status, notes
          ) VALUES (
            v_sponsor_id, v_sponsor_had, _month,
            r.had_id, v_amt, v_level_amt, 'pending',
            'level_income:' || _month || ':' || r.had_id
          );

          IF v_sp_inv.id IS NOT NULL THEN
            UPDATE public.investments
               SET amount_received = COALESCE(amount_received,0) + v_level_amt,
                   partner_income_total = COALESCE(partner_income_total,0) + v_level_amt,
                   status = CASE WHEN COALESCE(amount_received,0) + v_level_amt >= COALESCE(expected_2x, amount_invested * 2)
                                 THEN 'completed'::investment_status ELSE status END
             WHERE id = v_sp_inv.id;
          END IF;

          INSERT INTO public.notifications(had_id, title, body, notif_type)
          VALUES (v_sponsor_had, 'Level Income 🎯',
                  'Aapko ' || r.had_id || ' ke ROI par 10% level income mila: ₹' || v_level_amt,
                  'success');
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count, v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_monthly_roi(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_monthly_roi(text) TO authenticated, service_role;