-- Read-only adapter so the ported newsletter engine can resolve "perfis" from the studio's own users/roles.
CREATE OR REPLACE VIEW public.nl_perfis WITH (security_invoker = true) AS
SELECT p.id,
       coalesce(p.full_name, p.email) AS nome,
       CASE
         WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'admin') THEN 'admin'
         WHEN EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'editor') THEN 'curador'
         ELSE 'leitor'
       END AS papel
FROM public.profiles p;
REVOKE ALL ON public.nl_perfis FROM anon, authenticated;
GRANT SELECT ON public.nl_perfis TO service_role;