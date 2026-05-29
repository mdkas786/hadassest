-- Update handle_new_user: respect had_id from metadata, set referral_code = had_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_had_id TEXT;
BEGIN
  v_had_id := COALESCE(NEW.raw_user_meta_data->>'had_id', public.generate_had_id());

  INSERT INTO public.profiles (id, had_id, full_name, email, mobile, city, upi_id, wallet_address, referred_by, referral_code)
  VALUES (
    NEW.id,
    v_had_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'mobile',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'upi_id',
    NEW.raw_user_meta_data->>'wallet_address',
    NEW.raw_user_meta_data->>'referred_by',
    v_had_id  -- referral code = own HAD ID
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

-- Recreate the auth.users trigger if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing profiles to use HAD ID as referral_code
UPDATE public.profiles SET referral_code = had_id WHERE referral_code IS DISTINCT FROM had_id;

-- Public RPC to register a new HAD ID user (passwordless model: derives email & password from HAD ID server-side)
CREATE OR REPLACE FUNCTION public.register_had_user(
  p_full_name text,
  p_mobile text,
  p_city text,
  p_upi_id text DEFAULT NULL,
  p_wallet_address text DEFAULT NULL,
  p_referred_by text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_had_id text;
BEGIN
  v_had_id := public.generate_had_id();
  RETURN v_had_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_had_user(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_had_user(text,text,text,text,text,text) TO anon, authenticated;

-- Allow anon to look up a HAD ID's existence + active status (just had_id + is_active, nothing PII)
CREATE OR REPLACE FUNCTION public.check_had_id(p_had_id text)
RETURNS TABLE(exists_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE had_id = p_had_id AND is_active = true);
$$;

REVOKE EXECUTE ON FUNCTION public.check_had_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_had_id(text) TO anon, authenticated;