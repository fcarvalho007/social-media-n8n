CREATE OR REPLACE FUNCTION public.auth_conta_existe(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(_email));
$$;
REVOKE ALL ON FUNCTION public.auth_conta_existe(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_conta_existe(text) TO service_role;