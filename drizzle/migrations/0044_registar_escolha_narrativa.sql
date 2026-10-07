CREATE TABLE public.mc_escolhas_narrativa (
  trabalho_id uuid PRIMARY KEY REFERENCES public.mc_trabalhos(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  framework text NOT NULL CHECK (framework IN ('editorial','pas')),
  escolhido_por uuid,
  escolhido_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mc_escolhas_narrativa TO authenticated;
GRANT ALL ON public.mc_escolhas_narrativa TO service_role;
ALTER TABLE public.mc_escolhas_narrativa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ler escolha narrativa do projeto" ON public.mc_escolhas_narrativa FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));

CREATE OR REPLACE FUNCTION public.mc_escolher_narrativa(_trabalho_id uuid, _framework text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.mc_trabalhos;
BEGIN
  IF _framework NOT IN ('editorial','pas') THEN RAISE EXCEPTION 'estrutura inválida' USING ERRCODE='22023'; END IF;
  SELECT * INTO t FROM public.mc_trabalhos WHERE id=_trabalho_id FOR UPDATE;
  IF NOT FOUND OR NOT public.mc_pode_escrever(t.project_id) THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  IF coalesce(t.parametros->>'comparacao','') <> 'editorial-pas' OR t.estado <> 'concluido' THEN RAISE EXCEPTION 'comparação indisponível' USING ERRCODE='MC409'; END IF;
  IF _framework='pas' AND NOT EXISTS (
    SELECT 1 FROM public.mc_trabalhos p
    WHERE p.project_id=t.project_id AND p.estado='concluido' AND p.brief->>'origem_trabalho'=t.id::text AND p.brief->>'framework'='pas'
  ) THEN RAISE EXCEPTION 'a versão PAS ainda não está pronta' USING ERRCODE='MC409'; END IF;
  INSERT INTO public.mc_escolhas_narrativa(trabalho_id,project_id,framework,escolhido_por)
  VALUES(t.id,t.project_id,_framework,auth.uid())
  ON CONFLICT(trabalho_id) DO UPDATE SET framework=excluded.framework, escolhido_por=auth.uid(), escolhido_em=now();
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.mc_escolher_narrativa(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mc_escolher_narrativa(uuid,text) TO authenticated,service_role;