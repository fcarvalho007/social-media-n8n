ALTER TABLE public.mc_perfis_autor
  ADD COLUMN apresentacao text NOT NULL DEFAULT '' CHECK (char_length(apresentacao) <= 1500),
  ADD COLUMN publico text NOT NULL DEFAULT '' CHECK (char_length(publico) <= 500),
  ADD COLUMN teses text NOT NULL DEFAULT '' CHECK (char_length(teses) <= 2000),
  ADD COLUMN objetivo_cronica text NOT NULL DEFAULT '' CHECK (char_length(objetivo_cronica) <= 500);

DROP FUNCTION public.mc_definir_perfil_autor(uuid, text[], text);
CREATE FUNCTION public.mc_definir_perfil_autor(_project_id uuid, _voz text[], _notas text, _apresentacao text DEFAULT '', _publico text DEFAULT '', _teses text DEFAULT '', _objetivo_cronica text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.mc_pode_escrever(_project_id) THEN RAISE EXCEPTION 'sem acesso' USING ERRCODE = '42501'; END IF;
  IF coalesce(array_length(_voz,1),0) > 12 OR char_length(coalesce(_notas,'')) > 800 OR char_length(coalesce(_apresentacao,'')) > 1500
     OR char_length(coalesce(_publico,'')) > 500 OR char_length(coalesce(_teses,'')) > 2000 OR char_length(coalesce(_objetivo_cronica,'')) > 500
  THEN RAISE EXCEPTION 'perfil demasiado longo' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.mc_perfis_autor(project_id, voz, notas, apresentacao, publico, teses, objetivo_cronica, atualizado_por, atualizado_em)
  VALUES (_project_id, coalesce(_voz,'{}'), coalesce(_notas,''), coalesce(_apresentacao,''), coalesce(_publico,''), coalesce(_teses,''), coalesce(_objetivo_cronica,''), auth.uid(), now())
  ON CONFLICT (project_id) DO UPDATE SET voz = EXCLUDED.voz, notas = EXCLUDED.notas, apresentacao = EXCLUDED.apresentacao, publico = EXCLUDED.publico,
    teses = EXCLUDED.teses, objetivo_cronica = EXCLUDED.objetivo_cronica, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = now();
END $$;
REVOKE ALL ON FUNCTION public.mc_definir_perfil_autor(uuid, text[], text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_definir_perfil_autor(uuid, text[], text, text, text, text, text) TO authenticated, service_role;