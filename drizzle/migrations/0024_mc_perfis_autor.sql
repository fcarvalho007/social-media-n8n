CREATE TABLE public.mc_perfis_autor (
  project_id uuid PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  voz text[] NOT NULL DEFAULT '{}',
  notas text NOT NULL DEFAULT '' CHECK (char_length(notas) <= 800),
  atualizado_por uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mc_perfis_autor TO authenticated;
GRANT ALL ON public.mc_perfis_autor TO service_role;
ALTER TABLE public.mc_perfis_autor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ler perfil de autor do projeto" ON public.mc_perfis_autor FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));

CREATE OR REPLACE FUNCTION public.mc_definir_perfil_autor(_project_id uuid, _voz text[], _notas text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.mc_pode_escrever(_project_id) THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE = '42501'; END IF;
  IF coalesce(array_length(_voz,1),0) > 12 OR char_length(coalesce(_notas,'')) > 800 THEN RAISE EXCEPTION 'perfil demasiado longo' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.mc_perfis_autor(project_id, voz, notas, atualizado_por, atualizado_em)
  VALUES (_project_id, coalesce(_voz,'{}'), coalesce(_notas,''), auth.uid(), now())
  ON CONFLICT (project_id) DO UPDATE SET voz = EXCLUDED.voz, notas = EXCLUDED.notas, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = now();
END $$;
REVOKE ALL ON FUNCTION public.mc_definir_perfil_autor(uuid, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_definir_perfil_autor(uuid, text[], text) TO authenticated, service_role;