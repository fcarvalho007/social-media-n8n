CREATE TABLE public.mc_reservas_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  trabalho_id uuid NOT NULL UNIQUE REFERENCES public.mc_trabalhos(id) ON DELETE CASCADE,
  dia date NOT NULL,
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','consumida','libertada')),
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  consumida_em timestamptz
);
GRANT SELECT ON public.mc_reservas_ia TO authenticated;
GRANT ALL ON public.mc_reservas_ia TO service_role;
ALTER TABLE public.mc_reservas_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ler reservas de IA do projeto" ON public.mc_reservas_ia FOR SELECT TO authenticated USING (public.mc_pode_ler(project_id));
CREATE INDEX mc_reservas_ia_project_dia_idx ON public.mc_reservas_ia(project_id, dia, estado);

CREATE OR REPLACE FUNCTION public.mc_uso_dia(_project_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH hoje AS (SELECT (now() AT TIME ZONE 'Europe/Lisbon')::date AS data)
  SELECT (SELECT count(*) FROM public.mc_chamadas_ia c, hoje h WHERE c.project_id = _project_id AND c.modelo <> 'simulado-demo'
            AND c.criado_em >= (h.data::timestamp AT TIME ZONE 'Europe/Lisbon'))::int
       + (SELECT count(*) FROM public.mc_traducoes_tentativas t, hoje h WHERE t.project_id = _project_id
            AND t.criado_em >= (h.data::timestamp AT TIME ZONE 'Europe/Lisbon'))::int
       + (SELECT count(*) FROM public.mc_reservas_ia r, hoje h WHERE r.project_id = _project_id AND r.dia = h.data AND r.estado = 'pendente')::int
$$;
REVOKE ALL ON FUNCTION public.mc_uso_dia(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_uso_dia(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mc_reservar_chamada(_trabalho_id uuid, _lease uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _t public.mc_trabalhos; _o public.mc_orcamentos; _reserva_id uuid; _reserva_dia date; _n integer; _dia integer; _id uuid; _hoje date;
BEGIN
  SELECT * INTO _t FROM public.mc_trabalhos WHERE id = _trabalho_id AND lease_token = _lease AND lease_ate > now() AND estado = 'a_processar' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'lease inválido' USING ERRCODE = '40001'; END IF;
  SELECT count(*) INTO _n FROM public.mc_chamadas_ia WHERE trabalho_id = _trabalho_id;
  IF EXISTS (SELECT 1 FROM public.mc_chamadas_ia WHERE trabalho_id = _trabalho_id AND estado IN ('desconhecido','pedido_enviado','reservada')) THEN
    RAISE EXCEPTION 'chamada anterior sem resultado conhecido; não repetir automaticamente' USING ERRCODE = 'P0004';
  END IF;
  IF _t.modelo = 'simulado-demo' THEN
    IF _n >= 1 THEN RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003'; END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext('mc_orcamento:' || _t.project_id::text));
    _hoje := (now() AT TIME ZONE 'Europe/Lisbon')::date;
    SELECT r.id, r.dia INTO _reserva_id, _reserva_dia FROM public.mc_reservas_ia r WHERE r.trabalho_id = _trabalho_id AND r.estado = 'pendente' FOR UPDATE;
    IF _reserva_id IS NOT NULL AND _reserva_dia <> _hoje THEN
      UPDATE public.mc_reservas_ia SET estado = 'libertada' WHERE id = _reserva_id;
      _reserva_id := NULL;
    END IF;
    IF _n = 0 AND _reserva_id IS NOT NULL THEN
      UPDATE public.mc_reservas_ia SET estado = 'consumida', consumida_em = now() WHERE id = _reserva_id;
    ELSE
      SELECT * INTO _o FROM public.mc_orcamentos WHERE project_id = _t.project_id;
      IF NOT FOUND OR _o.max_chamadas_dia = 0 OR _o.max_chamadas_trabalho = 0 THEN RAISE EXCEPTION 'orçamento a zero' USING ERRCODE = 'P0002'; END IF;
      _dia := public.mc_uso_dia(_t.project_id);
      IF _n >= LEAST(_o.max_chamadas_trabalho, 2) OR _dia >= LEAST(_o.max_chamadas_dia, 10) THEN RAISE EXCEPTION 'teto de chamadas atingido' USING ERRCODE = 'P0003'; END IF;
    END IF;
  END IF;
  INSERT INTO public.mc_chamadas_ia (project_id, trabalho_id, cache_chave, tentativa, modelo, custo_incerto)
  VALUES (_t.project_id, _trabalho_id, _t.cache_chave, _n + 1, _t.modelo, _t.modelo <> 'simulado-demo') RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.mc_reservar_chamada(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mc_reservar_chamada(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mc_criar_par_narrativo(_project_id uuid, _tipo text, _texto text, _titulo text, _origem_url text, _metadados jsonb, _noticia_id uuid, _noticia_hash text, _brief jsonb, _modelo text)
RETURNS TABLE(editorial_id uuid, pas_id uuid, reutilizado boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE snapshot jsonb; meta jsonb; texto_n text; titulo_n text; url_n text; fh text; fid uuid;
  b_editorial jsonb; b_pas jsonb; p_editorial jsonb; p_pas jsonb; ck_editorial text; ck_pas text;
  id_editorial uuid; id_pas uuid; novo_editorial boolean := false; novo_pas boolean := false;
  necessarios integer; orc public.mc_orcamentos; usados integer; hoje date;
BEGIN
  IF NOT public.mc_pode_escrever(_project_id) THEN RAISE EXCEPTION 'sem acesso ao projeto' USING ERRCODE='42501'; END IF;
  IF _tipo NOT IN ('texto','link','pdf','curadoria') THEN RAISE EXCEPTION 'tipo de fonte inválido' USING ERRCODE='22023'; END IF;
  IF _tipo = 'curadoria' THEN
    IF _noticia_id IS NULL OR _noticia_hash IS NULL THEN RAISE EXCEPTION 'notícia inválida' USING ERRCODE='22023'; END IF;
    PERFORM 1 FROM public.nl_noticias WHERE id=_noticia_id FOR SHARE;
    snapshot := public.nl_curadoria_snapshot(_noticia_id);
    IF snapshot->>'hash' IS DISTINCT FROM _noticia_hash THEN RAISE EXCEPTION 'a fonte mudou; escolhe a notícia novamente' USING ERRCODE='MC409'; END IF;
    texto_n := snapshot->>'texto'; titulo_n := left(snapshot->>'titulo',300); url_n := left(snapshot->>'url',2000); meta := snapshot-'texto';
    fh := public.mc_hash(jsonb_build_object('tipo','curadoria','snapshot',snapshot));
  ELSE
    meta := coalesce(_metadados,'{}'::jsonb);
    texto_n := btrim(regexp_replace(replace(coalesce(_texto,''), E'\r\n', E'\n'), '[ \t]+', ' ', 'g'));
    titulo_n := nullif(left(coalesce(_titulo,''),300),''); url_n := nullif(left(coalesce(_origem_url,''),2000),'');
    fh := public.mc_hash(jsonb_build_object('tipo',_tipo,'texto',texto_n,'url',url_n,'meta',meta));
  END IF;
  INSERT INTO public.mc_fontes(project_id,tipo,titulo,origem_url,texto,metadados,hash,criado_por)
  VALUES(_project_id,_tipo,titulo_n,url_n,texto_n,meta,fh,auth.uid()) ON CONFLICT(project_id,hash) DO NOTHING;
  SELECT f.id INTO fid FROM public.mc_fontes f WHERE f.project_id=_project_id AND f.hash=fh;

  b_editorial := coalesce(_brief,'{}'::jsonb) - 'framework' - 'origem_trabalho' - 'base_versao';
  p_editorial := jsonb_build_object('slides',b_editorial->'slides','formato',b_editorial->'formato','comparacao','editorial-pas');
  ck_editorial := public.mc_hash(jsonb_build_object('projeto',_project_id,'fonte',fh,'prompt','r13-editorial-pas-v1','modelo',_modelo,'parametros',p_editorial,'brief',b_editorial));
  SELECT id INTO id_editorial FROM public.mc_trabalhos WHERE cache_chave=ck_editorial;
  IF id_editorial IS NULL THEN novo_editorial := true; id_editorial := gen_random_uuid(); END IF;

  b_pas := b_editorial || jsonb_build_object('framework','pas','origem_trabalho',id_editorial,'base_versao',1);
  p_pas := jsonb_build_object('slides',b_editorial->'slides','formato',b_editorial->'formato','framework','pas','comparacao','editorial-pas');
  ck_pas := public.mc_hash(jsonb_build_object('origem',id_editorial,'fonte',fid,'brief',b_pas,'prompt','r13-pas-intencao-v1','modelo',_modelo,'parametros',p_pas));
  SELECT id INTO id_pas FROM public.mc_trabalhos WHERE cache_chave=ck_pas;
  IF id_pas IS NULL THEN novo_pas := true; id_pas := gen_random_uuid(); END IF;

  necessarios := (CASE WHEN novo_editorial THEN 1 ELSE 0 END) + (CASE WHEN novo_pas THEN 1 ELSE 0 END);
  IF necessarios > 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext('mc_orcamento:' || _project_id::text));
    SELECT * INTO orc FROM public.mc_orcamentos WHERE project_id=_project_id;
    IF NOT FOUND OR orc.max_chamadas_dia=0 OR orc.max_chamadas_trabalho=0 THEN RAISE EXCEPTION 'orçamento a zero' USING ERRCODE='P0002'; END IF;
    usados := public.mc_uso_dia(_project_id);
    IF usados + necessarios > LEAST(orc.max_chamadas_dia,10) THEN RAISE EXCEPTION 'faltam pedidos disponíveis para comparar Editorial e PAS' USING ERRCODE='P0003'; END IF;
  END IF;

  IF novo_editorial THEN
    INSERT INTO public.mc_trabalhos(id,project_id,fonte_id,brief,prompt_versao,modelo,parametros,cache_chave,explicito,criado_por)
    VALUES(id_editorial,_project_id,fid,b_editorial,'r13-editorial-pas-v1',_modelo,p_editorial,ck_editorial,false,auth.uid());
    INSERT INTO public.mc_propostas(project_id,trabalho_id) VALUES(_project_id,id_editorial);
    INSERT INTO public.mc_etapas(trabalho_id,etapa,estado) VALUES(id_editorial,'fonte','criado');
  END IF;
  IF novo_pas THEN
    INSERT INTO public.mc_trabalhos(id,project_id,fonte_id,brief,prompt_versao,modelo,parametros,cache_chave,explicito,criado_por)
    VALUES(id_pas,_project_id,fid,b_pas,'r13-pas-intencao-v1',_modelo,p_pas,ck_pas,true,auth.uid());
    INSERT INTO public.mc_propostas(project_id,trabalho_id) VALUES(_project_id,id_pas);
    INSERT INTO public.mc_etapas(trabalho_id,etapa,estado) VALUES(id_pas,'fonte','criado');
  END IF;
  hoje := (now() AT TIME ZONE 'Europe/Lisbon')::date;
  IF novo_editorial THEN INSERT INTO public.mc_reservas_ia(project_id,trabalho_id,dia,criado_por) VALUES(_project_id,id_editorial,hoje,auth.uid()); END IF;
  IF novo_pas THEN INSERT INTO public.mc_reservas_ia(project_id,trabalho_id,dia,criado_por) VALUES(_project_id,id_pas,hoje,auth.uid()); END IF;
  RETURN QUERY SELECT id_editorial,id_pas,NOT novo_editorial AND NOT novo_pas;
END $$;
REVOKE ALL ON FUNCTION public.mc_criar_par_narrativo(uuid,text,text,text,text,jsonb,uuid,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mc_criar_par_narrativo(uuid,text,text,text,text,jsonb,uuid,text,jsonb,text) TO authenticated, service_role;