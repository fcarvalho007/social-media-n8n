CREATE TABLE public.mc_sistemas_visuais (
  trabalho_id uuid PRIMARY KEY REFERENCES public.mc_trabalhos(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  estilo_id text NOT NULL CHECK (estilo_id IN ('editorial','contraste','revista','fotografico','minimalista','didatico')),
  variante_id text NOT NULL CHECK (variante_id IN ('A','B')),
  paleta_id text NOT NULL CHECK (paleta_id IN ('navy-editorial','navy-digital','navy-signal','navy-sage','navy-ice')),
  quebras jsonb NOT NULL DEFAULT '{"3":true,"5":true,"8":true}'::jsonb,
  versao integer NOT NULL DEFAULT 1,
  atualizado_por uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mc_sistemas_visuais TO authenticated;
GRANT ALL ON public.mc_sistemas_visuais TO service_role;
ALTER TABLE public.mc_sistemas_visuais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ler sistema visual" ON public.mc_sistemas_visuais FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));

CREATE OR REPLACE FUNCTION public.mc_definir_sistema_visual(_trabalho_id uuid, _estilo text, _variante text, _paleta text, _quebras jsonb, _versao_esperada integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _proj uuid; _atual integer;
BEGIN
  SELECT project_id INTO _proj FROM public.mc_trabalhos WHERE id = _trabalho_id;
  IF _proj IS NULL OR NOT public.mc_pode_escrever(_proj) THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(coalesce(_quebras,'{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'quebras inválidas' USING ERRCODE = '22023'; END IF;
  SELECT versao INTO _atual FROM public.mc_sistemas_visuais WHERE trabalho_id = _trabalho_id FOR UPDATE;
  IF coalesce(_atual,0) <> coalesce(_versao_esperada,0) THEN RAISE EXCEPTION 'conflito de versão' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.mc_sistemas_visuais(trabalho_id, project_id, estilo_id, variante_id, paleta_id, quebras, versao, atualizado_por, atualizado_em)
  VALUES (_trabalho_id, _proj, _estilo, _variante, _paleta, coalesce(_quebras,'{}'::jsonb), 1, auth.uid(), now())
  ON CONFLICT (trabalho_id) DO UPDATE SET estilo_id = EXCLUDED.estilo_id, variante_id = EXCLUDED.variante_id, paleta_id = EXCLUDED.paleta_id,
    quebras = EXCLUDED.quebras, versao = public.mc_sistemas_visuais.versao + 1, atualizado_por = auth.uid(), atualizado_em = now();
  RETURN coalesce(_atual,0) + 1;
END $$;
REVOKE ALL ON FUNCTION public.mc_definir_sistema_visual(uuid,text,text,text,jsonb,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_definir_sistema_visual(uuid,text,text,text,jsonb,integer) TO authenticated;