ALTER TABLE public.nl_noticias ADD COLUMN IF NOT EXISTS fonte_publicado_em timestamptz;
COMMENT ON COLUMN public.nl_noticias.fonte_publicado_em IS 'Publication date reported by the original source (from the curadoria queue).';
UPDATE public.nl_noticias n SET fonte_publicado_em = q.publicado_em
  FROM (SELECT DISTINCT ON (url) url, publicado_em FROM public.nl_curadoria_fila WHERE url IS NOT NULL AND publicado_em IS NOT NULL ORDER BY url, publicado_em DESC) q
  WHERE n.fonte_publicado_em IS NULL AND n.curadoria_origem_id IS NULL AND (q.url = n.url OR q.url = n.fonte_url_original);
CREATE OR REPLACE FUNCTION public.nl_curadoria_listar(_estado text DEFAULT 'aprovada'::text, _query text DEFAULT ''::text, _categoria text DEFAULT ''::text, _desde timestamp with time zone DEFAULT NULL::timestamp with time zone, _limite integer DEFAULT 24, _offset integer DEFAULT 0, _edicao uuid DEFAULT NULL::uuid)
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
  ), pagina AS (SELECT * FROM filtradas ORDER BY coalesce(fonte_publicado_em, created_at) DESC, id LIMIT _limite OFFSET _offset)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM filtradas),'itens',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',p.id,'titulo',p.titulo,'descricao',p.descricao,'url',p.url,'categoria',p.categoria,'origem',p.origem,
    'fonte_id',p.fonte_id,
    'fonte_nome',(SELECT nome FROM public.nl_fontes_curadoria WHERE id=p.fonte_id),
    'fonte_tipo',(SELECT tipo FROM public.nl_fontes_curadoria WHERE id=p.fonte_id),
    'editorial_estado',p.editorial_estado,'estado_newsletter',p.estado,'edicao_id',p.edicao_id,'criado_em',p.created_at,'publicado_em',p.fonte_publicado_em,
    'nivel',CASE WHEN length(btrim(coalesce(p.corpo_artigo,'')))>0 THEN 'artigo' ELSE 'resumo' END,
    'edicoes',coalesce((SELECT jsonb_agg(DISTINCT c.edicao_id) FROM public.nl_noticias c WHERE (c.id=p.id OR c.curadoria_origem_id=p.id) AND c.edicao_id IS NOT NULL),'[]'::jsonb),
    'usos',(SELECT count(*) FROM public.mc_trabalhos t JOIN public.mc_fontes f ON f.id=t.fonte_id WHERE coalesce((t.brief->>'framework'),'')='' AND t.brief->'regen' IS NULL AND f.metadados->>'noticia_id'=p.id::text AND public.mc_pode_ler(f.project_id))
  ) ORDER BY coalesce(p.fonte_publicado_em, p.created_at) DESC,p.id) FROM pagina p),'[]'::jsonb)) INTO r;
  RETURN r;
END
$function$;