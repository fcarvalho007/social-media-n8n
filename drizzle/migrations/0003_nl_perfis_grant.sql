REVOKE ALL ON public.nl_perfis FROM PUBLIC, anon;
GRANT SELECT ON public.nl_perfis TO authenticated;
GRANT SELECT ON public.nl_perfis TO service_role;