CREATE TABLE public.mc_composicao_paginas (
  trabalho_id uuid NOT NULL REFERENCES public.mc_trabalhos(id) ON DELETE RESTRICT,
  project_id uuid NOT NULL,
  variante text NOT NULL CHECK (variante IN ('A','B')),
  slide_id text NOT NULL CHECK (char_length(slide_id) BETWEEN 1 AND 64),
  composicao jsonb NOT NULL,
  versao integer NOT NULL DEFAULT 1,
  atualizado_por uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trabalho_id, variante, slide_id)
);
COMMENT ON TABLE public.mc_composicao_paginas IS 'Per-slide image composition overrides (pageRole, imageMode, textRegion, focalPoint, overlay, asset). Only explicit user choices are stored; absent rows mean automatic.';
GRANT SELECT ON public.mc_composicao_paginas TO authenticated;
GRANT ALL ON public.mc_composicao_paginas TO service_role;
ALTER TABLE public.mc_composicao_paginas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ler composicao paginas" ON public.mc_composicao_paginas FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));

CREATE OR REPLACE FUNCTION public.mc_definir_composicao_pagina(_trabalho_id uuid, _variante text, _slide_id text, _composicao jsonb, _versao_esperada integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _proj uuid; _atual integer;
BEGIN
  SELECT project_id INTO _proj FROM public.mc_trabalhos WHERE id = _trabalho_id;
  IF _proj IS NULL OR NOT public.mc_pode_escrever(_proj) THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(_composicao) <> 'object' OR pg_column_size(_composicao) > 4000 THEN RAISE EXCEPTION 'composição inválida' USING ERRCODE = '22023'; END IF;
  IF _composicao ? 'asset_id' AND _composicao->>'asset_id' IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.mc_assets WHERE id::text = _composicao->>'asset_id' AND project_id = _proj) THEN
    RAISE EXCEPTION 'imagem de outro projeto' USING ERRCODE = '42501';
  END IF;
  SELECT versao INTO _atual FROM public.mc_composicao_paginas WHERE trabalho_id = _trabalho_id AND variante = _variante AND slide_id = _slide_id FOR UPDATE;
  IF coalesce(_atual,0) <> coalesce(_versao_esperada,0) THEN RAISE EXCEPTION 'conflito de versão' USING ERRCODE = 'MC409'; END IF;
  INSERT INTO public.mc_composicao_paginas(trabalho_id, project_id, variante, slide_id, composicao, versao, atualizado_por)
  VALUES (_trabalho_id, _proj, _variante, _slide_id, _composicao, 1, auth.uid())
  ON CONFLICT (trabalho_id, variante, slide_id) DO UPDATE SET composicao = EXCLUDED.composicao,
    versao = public.mc_composicao_paginas.versao + 1, atualizado_por = auth.uid(), atualizado_em = now();
  RETURN coalesce(_atual,0) + 1;
END $$;
REVOKE ALL ON FUNCTION public.mc_definir_composicao_pagina(uuid,text,text,jsonb,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_definir_composicao_pagina(uuid,text,text,jsonb,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.mc_definir_sistema_visual(_trabalho_id uuid, _estilo text, _variante text, _paleta text, _quebras jsonb, _versao_esperada integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _proj uuid; _atual integer;
BEGIN
  SELECT project_id INTO _proj FROM public.mc_trabalhos WHERE id = _trabalho_id;
  IF _proj IS NULL OR NOT public.mc_pode_escrever(_proj) THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(coalesce(_quebras,'{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'quebras inválidas' USING ERRCODE = '22023'; END IF;
  SELECT versao INTO _atual FROM public.mc_sistemas_visuais WHERE trabalho_id = _trabalho_id FOR UPDATE;
  IF coalesce(_atual,0) <> coalesce(_versao_esperada,0) THEN RAISE EXCEPTION 'conflito de versão' USING ERRCODE = 'MC409'; END IF;
  INSERT INTO public.mc_sistemas_visuais(trabalho_id, project_id, estilo_id, variante_id, paleta_id, quebras, versao, atualizado_por, atualizado_em)
  VALUES (_trabalho_id, _proj, _estilo, _variante, _paleta, coalesce(_quebras,'{}'::jsonb), 1, auth.uid(), now())
  ON CONFLICT (trabalho_id) DO UPDATE SET estilo_id = EXCLUDED.estilo_id, variante_id = EXCLUDED.variante_id, paleta_id = EXCLUDED.paleta_id,
    quebras = EXCLUDED.quebras, versao = public.mc_sistemas_visuais.versao + 1, atualizado_por = auth.uid(), atualizado_em = now();
  RETURN coalesce(_atual,0) + 1;
END $$;