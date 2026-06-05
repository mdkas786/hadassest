
-- Admin: full cascade delete of a user and all their data, plus bulk monthly ROI processor

CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_had text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT had_id INTO v_had FROM public.profiles WHERE id = _user_id;

  DELETE FROM public.return_payments  WHERE user_id = _user_id OR (v_had IS NOT NULL AND had_id = v_had);
  DELETE FROM public.transactions     WHERE user_id = _user_id OR (v_had IS NOT NULL AND had_id = v_had);
  DELETE FROM public.investments      WHERE user_id = _user_id OR (v_had IS NOT NULL AND had_id = v_had);
  DELETE FROM public.notifications    WHERE (v_had IS NOT NULL AND had_id = v_had);
  DELETE FROM public.sponsor_income   WHERE earner_user_id = _user_id OR (v_had IS NOT NULL AND (earner_had_id = v_had OR referred_had_id = v_had));
  DELETE FROM public.partner_income   WHERE earner_user_id = _user_id OR (v_had IS NOT NULL AND (earner_had_id = v_had OR direct1_had_id = v_had OR direct2_had_id = v_had));
  DELETE FROM public.daily_reports    WHERE (v_had IS NOT NULL AND had_id = v_had);
  DELETE FROM public.user_roles       WHERE user_id = _user_id;
  DELETE FROM public.profiles         WHERE id = _user_id;
  DELETE FROM auth.users              WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;


-- Bulk Monthly ROI processor: for every active investment, credit one month's plan_rate%
-- as a return_payment for the given month, if not already credited.
CREATE OR REPLACE FUNCTION public.process_monthly_roi(_month text)
RETURNS TABLE(processed int, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_amt numeric;
  v_count int := 0;
  v_total numeric := 0;
  v_period_start date := to_date(_month || '-01', 'YYYY-MM-DD');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  FOR r IN
    SELECT i.*
    FROM public.investments i
    WHERE i.status = 'active'
      AND i.start_date <= v_period_start
  LOOP
    -- skip if already a return paid for this investment in this month
    IF EXISTS (
      SELECT 1 FROM public.return_payments rp
      WHERE rp.had_id = r.had_id
        AND date_trunc('month', rp.created_at) = date_trunc('month', v_period_start)
        AND rp.notes = 'monthly_roi:' || _month
    ) THEN
      CONTINUE;
    END IF;

    v_amt := round((r.amount_invested * r.plan_rate / 100.0)::numeric, 2);
    IF v_amt <= 0 THEN CONTINUE; END IF;

    INSERT INTO public.return_payments(had_id, user_id, amount, method, txn_ref, notes, paid_by)
    VALUES (r.had_id, r.user_id, v_amt, 'AUTO', 'monthly-' || _month, 'monthly_roi:' || _month, auth.uid());

    UPDATE public.investments
       SET amount_received = amount_received + v_amt,
           status = CASE WHEN amount_received + v_amt >= expected_2x THEN 'completed'::investment_status ELSE status END
     WHERE id = r.id;

    INSERT INTO public.notifications(had_id, title, body, notif_type)
    VALUES (r.had_id, 'Monthly ROI Credited 💰',
            'Aapke ' || r.plan_name || ' plan ka ' || _month || ' ka monthly return credit ho gaya: ₹' || v_amt,
            'success');

    v_count := v_count + 1;
    v_total := v_total + v_amt;
  END LOOP;

  RETURN QUERY SELECT v_count, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.process_monthly_roi(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_monthly_roi(text) TO authenticated;
