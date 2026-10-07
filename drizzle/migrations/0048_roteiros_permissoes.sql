-- Cloud defaults grant DML/TRUNCATE even when RLS has only SELECT policies.
-- Keep clients read-only: all writes continue through the existing authorised RPCs.
REVOKE ALL ON TABLE public.rv_roteiros, public.rv_versoes, public.rv_geracoes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.rv_roteiros, public.rv_versoes, public.rv_geracoes TO authenticated;
GRANT ALL ON TABLE public.rv_roteiros, public.rv_versoes, public.rv_geracoes TO service_role;
REVOKE ALL ON FUNCTION public.rv_validar(jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rv_validar(jsonb,jsonb) TO service_role;
