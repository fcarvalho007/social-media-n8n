CREATE OR REPLACE FUNCTION public.mc_renomear_trabalho(_trabalho_id uuid, _titulo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _t text := btrim(regexp_replace(coalesce(_titulo, ''), '\s+', ' ', 'g'));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária.' USING ERRCODE = '42501';
  END IF;
  IF char_length(_t) < 1 OR char_length(_t) > 300 THEN
    RAISE EXCEPTION 'O título deve ter entre 1 e 300 caracteres.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.mc_trabalhos t
     SET brief = jsonb_set(coalesce(t.brief, '{}'::jsonb), '{titulo}', to_jsonb(_t)),
         actualizado_em = now()
   WHERE t.id = _trabalho_id AND public.mc_pode_escrever(t.project_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sem permissão para renomear este carrossel.' USING ERRCODE = '42501';
  END IF;
  RETURN _t;
END
$$;
REVOKE ALL ON FUNCTION public.mc_renomear_trabalho(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mc_renomear_trabalho(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mc_renomear_trabalho(uuid, text) TO service_role;
COMMENT ON FUNCTION public.mc_renomear_trabalho(uuid, text) IS 'Renames a carousel (brief.titulo only) for project editors; never touches content or versions.';