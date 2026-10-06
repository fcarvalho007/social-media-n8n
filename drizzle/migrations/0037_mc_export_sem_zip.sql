CREATE OR REPLACE FUNCTION public.mc_concluir_exportacao(_id uuid, _lease uuid, _manifesto jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _t public.mc_export_trabalhos; _png integer; _pdf integer;
BEGIN
  SELECT * INTO _t FROM public.mc_export_trabalhos WHERE id = _id FOR UPDATE;
  IF NOT FOUND OR _t.lease_token IS DISTINCT FROM _lease OR _t.lease_ate <= now() OR _t.estado <> 'a_processar' THEN RETURN false; END IF;
  SELECT count(*) INTO _png FROM public.mc_exportacoes e WHERE e.documento_id = _t.documento_id AND e.documento_versao = _t.documento_versao AND e.formato = 'png';
  -- Social files are PNG + PDF; the ZIP is no longer required (personal downloads are made in the browser).
  SELECT count(*) INTO _pdf FROM public.mc_exportacoes e WHERE e.documento_id = _t.documento_id AND e.documento_versao = _t.documento_versao AND e.formato = 'pdf' AND e.pagina IS NULL;
  IF _png <> _t.paginas OR _pdf <> 1 THEN RAISE EXCEPTION 'exportação incompleta' USING ERRCODE = '22023'; END IF;
  UPDATE public.mc_export_trabalhos SET estado = 'concluido', manifesto = _manifesto, lease_token = NULL, lease_ate = NULL, erro = NULL, erro_classe = NULL,
    concluido_em = now(), actualizado_em = now() WHERE id = _id;
  RETURN true;
END
$function$;