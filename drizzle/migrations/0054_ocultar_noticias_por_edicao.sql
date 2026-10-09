CREATE TABLE public.nl_curadoria_ocultas_edicao (
  edicao_id uuid NOT NULL REFERENCES public.nl_edicoes(id) ON DELETE CASCADE,
  noticia_id uuid NOT NULL REFERENCES public.nl_noticias(id) ON DELETE CASCADE,
  ocultada_por uuid NOT NULL DEFAULT auth.uid(),
  criada_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (edicao_id, noticia_id)
);

GRANT SELECT, INSERT, DELETE ON public.nl_curadoria_ocultas_edicao TO authenticated;
GRANT ALL ON public.nl_curadoria_ocultas_edicao TO service_role;

ALTER TABLE public.nl_curadoria_ocultas_edicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY nl_curadoria_ocultas_equipa
ON public.nl_curadoria_ocultas_edicao
FOR ALL
TO authenticated
USING (public.nl_is_staff())
WITH CHECK (public.nl_is_staff() AND ocultada_por = auth.uid());

CREATE OR REPLACE FUNCTION public.nl_curadoria_ocultar_edicao(_id uuid, _edicao uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  origem_id uuid;
  estado_edicao text;
BEGIN
  IF NOT public.nl_is_staff() THEN
    RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501';
  END IF;

  SELECT estado INTO estado_edicao FROM public.nl_edicoes WHERE id=_edicao;
  IF estado_edicao IS DISTINCT FROM 'rascunho' THEN
    RAISE EXCEPTION 'a edição não é editável' USING ERRCODE='MC409';
  END IF;

  SELECT CASE WHEN curadoria_origem_id IS NULL THEN id ELSE curadoria_origem_id END
    INTO origem_id
    FROM public.nl_noticias
    WHERE id=_id;
  IF origem_id IS NULL THEN
    RAISE EXCEPTION 'notícia inexistente' USING ERRCODE='P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.nl_noticias n
    WHERE n.edicao_id=_edicao AND (n.id=origem_id OR n.curadoria_origem_id=origem_id)
  ) THEN
    RAISE EXCEPTION 'a notícia já pertence a esta edição' USING ERRCODE='MC409';
  END IF;

  INSERT INTO public.nl_curadoria_ocultas_edicao(edicao_id, noticia_id, ocultada_por)
  VALUES (_edicao, origem_id, auth.uid())
  ON CONFLICT (edicao_id, noticia_id) DO NOTHING;
END
$function$;

CREATE OR REPLACE FUNCTION public.nl_curadoria_repor_edicao(_id uuid, _edicao uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  origem_id uuid;
BEGIN
  IF NOT public.nl_is_staff() THEN
    RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501';
  END IF;

  SELECT CASE WHEN curadoria_origem_id IS NULL THEN id ELSE curadoria_origem_id END
    INTO origem_id
    FROM public.nl_noticias
    WHERE id=_id;
  IF origem_id IS NULL THEN
    RAISE EXCEPTION 'notícia inexistente' USING ERRCODE='P0002';
  END IF;

  DELETE FROM public.nl_curadoria_ocultas_edicao
  WHERE edicao_id=_edicao AND noticia_id=origem_id;
END
$function$;

CREATE OR REPLACE FUNCTION public.nl_curadoria_listar(
  _estado text DEFAULT 'aprovada'::text,
  _query text DEFAULT ''::text,
  _categoria text DEFAULT ''::text,
  _desde timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _limite integer DEFAULT 24,
  _offset integer DEFAULT 0,
  _edicao uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r jsonb;
BEGIN
  IF NOT public.nl_is_staff() THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE='42501'; END IF;
  IF _estado NOT IN ('aprovada','pendente','rejeitada') OR _limite NOT BETWEEN 1 AND 50 OR _offset NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'filtro inválido' USING ERRCODE='22023'; END IF;
  WITH filtradas AS (
    SELECT n.* FROM public.nl_noticias n WHERE n.curadoria_origem_id IS NULL AND n.editorial_estado=_estado
      AND (_categoria='' OR n.categoria=_categoria) AND (_desde IS NULL OR n.created_at>=_desde)
      AND (_query='' OR n.titulo ILIKE '%'||left(_query,200)||'%' OR n.descricao ILIKE '%'||left(_query,200)||'%')
      AND (_edicao IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.nl_curadoria_ocultas_edicao o
        WHERE o.edicao_id=_edicao AND o.noticia_id=n.id
      ))
  ), pagina AS (SELECT * FROM filtradas ORDER BY created_at DESC, id LIMIT _limite OFFSET _offset)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtradas),'itens',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',p.id,'titulo',p.titulo,'descricao',p.descricao,'url',p.url,'categoria',p.categoria,'origem',p.origem,
    'fonte_id',p.fonte_id,
    'fonte_nome',(SELECT nome FROM public.nl_fontes_curadoria WHERE id=p.fonte_id),
    'fonte_tipo',(SELECT tipo FROM public.nl_fontes_curadoria WHERE id=p.fonte_id),
    'editorial_estado',p.editorial_estado,'estado_newsletter',p.estado,'edicao_id',p.edicao_id,'criado_em',p.created_at,
    'nivel',CASE WHEN length(btrim(coalesce(p.corpo_artigo,'')))>0 THEN 'artigo' ELSE 'resumo' END,
    'edicoes',coalesce((SELECT jsonb_agg(DISTINCT c.edicao_id) FROM public.nl_noticias c WHERE (c.id=p.id OR c.curadoria_origem_id=p.id) AND c.edicao_id IS NOT NULL),'[]'::jsonb),
    'usos',(SELECT count(*) FROM public.mc_trabalhos t JOIN public.mc_fontes f ON f.id=t.fonte_id WHERE coalesce((t.brief->>'framework'),'')='' AND t.brief->'regen' IS NULL AND f.metadados->>'noticia_id'=p.id::text AND public.mc_pode_ler(f.project_id))
  ) ORDER BY p.created_at DESC,p.id) FROM pagina p),'[]'::jsonb)) INTO r;
  RETURN r;
END
$function$;

REVOKE ALL ON FUNCTION public.nl_curadoria_ocultar_edicao(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nl_curadoria_repor_edicao(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nl_curadoria_ocultar_edicao(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.nl_curadoria_repor_edicao(uuid, uuid) TO authenticated, service_role;