CREATE TABLE public.nl_audit_log (
    id bigint NOT NULL,
    quem text,
    accao text NOT NULL,
    detalhe jsonb,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.nl_audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.nl_audit_log_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1
);
CREATE TABLE public.nl_brief_edicoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brief_id uuid NOT NULL,
    edicao_id uuid NOT NULL,
    papel text DEFAULT 'destaque'::text NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    titulo_apresentado text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.nl_brief_eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evento text NOT NULL,
    brief_slug text DEFAULT ''::text NOT NULL,
    edicao_numero integer,
    dia date DEFAULT ((now() AT TIME ZONE 'Europe/Lisbon'::text))::date NOT NULL,
    contagem integer DEFAULT 0 NOT NULL,
    actualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_brief_eventos_evento_check CHECK ((evento = ANY (ARRAY['email_brief_click'::text, 'brief_open_from_email'::text, 'edition_brief_click'::text, 'brief_source_click'::text, 'brief_related_click'::text, 'brief_commercial_cta'::text]))),
    CONSTRAINT nl_brief_eventos_evento_valido CHECK ((evento = ANY (ARRAY['email_brief_click'::text, 'edition_brief_click'::text, 'brief_source_click'::text, 'brief_related_click'::text, 'brief_commercial_cta'::text])))
);
CREATE TABLE public.nl_brief_versoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brief_id uuid NOT NULL,
    versao integer NOT NULL,
    conteudo jsonb DEFAULT '{}'::jsonb NOT NULL,
    hash text NOT NULL,
    motivo text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    criado_por text
);
CREATE TABLE public.nl_briefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    noticia_id uuid,
    fingerprint text NOT NULL,
    slug text NOT NULL,
    slug_congelado boolean DEFAULT false NOT NULL,
    tipo text DEFAULT 'destaque'::text NOT NULL,
    estado text DEFAULT 'por_gerar'::text NOT NULL,
    indexavel boolean DEFAULT false NOT NULL,
    em_30_segundos jsonb DEFAULT '[]'::jsonb NOT NULL,
    porque_interessa jsonb DEFAULT '[]'::jsonb NOT NULL,
    leitura_sugerida text DEFAULT ''::text NOT NULL,
    leitura_aprovada text DEFAULT ''::text NOT NULL,
    aprovada_em timestamp with time zone,
    aprovada_por text,
    fonte_url text,
    fonte_url_norm text,
    fonte_publisher text,
    fonte_data date,
    fonte_primaria_url text,
    fontes_adicionais jsonb DEFAULT '[]'::jsonb NOT NULL,
    verificacao jsonb DEFAULT '{}'::jsonb NOT NULL,
    ia jsonb DEFAULT '{}'::jsonb NOT NULL,
    hash_publicado text,
    publicado_em timestamp with time zone,
    erro text,
    tentativas integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    factos jsonb DEFAULT '[]'::jsonb NOT NULL,
    contexto jsonb DEFAULT '[]'::jsonb NOT NULL,
    incertezas jsonb DEFAULT '[]'::jsonb NOT NULL,
    pull_quote_sugerida text DEFAULT ''::text NOT NULL,
    titulo_editorial text DEFAULT ''::text NOT NULL,
    tese_editorial text DEFAULT ''::text NOT NULL
);
CREATE TABLE public.nl_configuracoes (
    chave text NOT NULL,
    valor text,
    actualizado_em timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.nl_cronicas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edicao_id uuid NOT NULL,
    conteudo text,
    leituras_recomendadas text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    conteudo_html text,
    titulo text,
    concluida boolean DEFAULT false NOT NULL,
    busca tsvector GENERATED ALWAYS AS (to_tsvector('portuguese'::regconfig, public.nl_f_unaccent(((COALESCE(titulo, ''::text) || ' '::text) || COALESCE(conteudo, ''::text))))) STORED
);
CREATE TABLE public.nl_curadoria_config (
    id smallint DEFAULT 1 NOT NULL,
    max_insercoes_por_corrida integer DEFAULT 15 NOT NULL,
    janela_horas integer DEFAULT 24 NOT NULL,
    actualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    max_por_email integer DEFAULT 4 NOT NULL,
    max_por_dia integer DEFAULT 25 NOT NULL,
    max_por_fonte integer DEFAULT 2 NOT NULL,
    max_por_categoria integer DEFAULT 3 NOT NULL,
    max_por_dia_email integer DEFAULT 15 NOT NULL,
    CONSTRAINT nl_curadoria_config_id_check CHECK ((id = 1)),
    CONSTRAINT nl_curadoria_config_janela_horas_check CHECK (((janela_horas >= 1) AND (janela_horas <= 168))),
    CONSTRAINT nl_curadoria_config_max_insercoes_por_corrida_check CHECK (((max_insercoes_por_corrida >= 1) AND (max_insercoes_por_corrida <= 100)))
);
CREATE TABLE public.nl_curadoria_ferramentas_config (
    id smallint DEFAULT 1 NOT NULL,
    dia_semana integer DEFAULT 1 NOT NULL,
    hora integer DEFAULT 9 NOT NULL,
    max_por_corrida integer DEFAULT 10 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    actualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_curadoria_ferramentas_config_dia_semana_check CHECK (((dia_semana >= 0) AND (dia_semana <= 6))),
    CONSTRAINT nl_curadoria_ferramentas_config_hora_check CHECK (((hora >= 0) AND (hora <= 23))),
    CONSTRAINT nl_curadoria_ferramentas_config_id_check CHECK ((id = 1)),
    CONSTRAINT nl_curadoria_ferramentas_config_max_por_corrida_check CHECK (((max_por_corrida >= 1) AND (max_por_corrida <= 50)))
);
CREATE TABLE public.nl_curadoria_fila (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    origem text DEFAULT 'rss'::text NOT NULL,
    fonte_id uuid,
    fonte_nome text,
    fonte_grupo text,
    email_recebido_id uuid,
    titulo text NOT NULL,
    url text,
    url_norm text,
    descricao text DEFAULT ''::text NOT NULL,
    publicado_em timestamp with time zone DEFAULT now() NOT NULL,
    estado text DEFAULT 'em_fila'::text NOT NULL,
    motivo text,
    tentativas integer DEFAULT 0 NOT NULL,
    noticia_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_curadoria_fila_estado_chk CHECK ((estado = ANY (ARRAY['em_fila'::text, 'processado'::text, 'falhado'::text, 'descartado'::text]))),
    CONSTRAINT nl_curadoria_fila_origem_chk CHECK ((origem = ANY (ARRAY['rss'::text, 'email'::text])))
);
CREATE TABLE public.nl_definicoes_ia (
    id text DEFAULT 'default'::text NOT NULL,
    provider text DEFAULT 'lovable'::text NOT NULL,
    modelo text DEFAULT 'google/gemini-2.5-flash'::text NOT NULL,
    estado text DEFAULT 'configurada'::text NOT NULL,
    ultimo_teste_em timestamp with time zone,
    ultimo_erro text,
    actualizado_por uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_definicoes_ia_estado_check CHECK ((estado = ANY (ARRAY['nao_configurada'::text, 'configurada'::text, 'erro'::text]))),
    CONSTRAINT nl_definicoes_ia_provider_check CHECK ((provider = ANY (ARRAY['lovable'::text, 'deepseek'::text]))),
    CONSTRAINT nl_definicoes_ia_singleton CHECK ((id = 'default'::text))
);
CREATE TABLE public.nl_edicoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero integer NOT NULL,
    data_envio_prevista date,
    assunto text,
    estado text DEFAULT 'rascunho'::text NOT NULL,
    episodio_podcast_id uuid,
    bloco_livro boolean DEFAULT true NOT NULL,
    bloco_recursos boolean DEFAULT true NOT NULL,
    snapshot_envio jsonb,
    enviada_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    wordpress_post_id bigint,
    wordpress_post_url text,
    links_verificados jsonb,
    links_verificados_em timestamp with time zone,
    bloco_consultoria jsonb DEFAULT jsonb_build_object('titulo', 'Isto aplica-se à tua empresa?', 'subtitulo', 'Se este tema tocou nalguma decisão que estás a adiar, marca 15 minutos comigo. Digo-te já se vale a pena aprofundar.', 'texto_botao', 'Marcar 15 minutos', 'url_botao', 'https://digitalfc.pt/agendar') NOT NULL,
    descricoes_ajustadas_em timestamp with time zone,
    links_ignorados jsonb DEFAULT '[]'::jsonb NOT NULL,
    categorias_ocultas_email jsonb DEFAULT '[]'::jsonb NOT NULL,
    agendado_para timestamp with time zone,
    agendamento_estado text DEFAULT 'nenhum'::text NOT NULL,
    agendamento_listas jsonb DEFAULT '[]'::jsonb NOT NULL,
    agendamento_wordpress boolean DEFAULT true NOT NULL,
    agendamento_erro text,
    agendado_por text,
    agendamento_iniciado_em timestamp with time zone,
    envio_em_curso timestamp with time zone,
    template_version text DEFAULT 'revista'::text NOT NULL,
    revista_snapshot jsonb,
    destinos jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT nl_edicoes_agendamento_estado_chk CHECK ((agendamento_estado = ANY (ARRAY['nenhum'::text, 'agendado'::text, 'a_executar'::text, 'executado'::text, 'falhou'::text]))),
    CONSTRAINT nl_edicoes_estado_check CHECK ((estado = ANY (ARRAY['rascunho'::text, 'enviada'::text]))),
    CONSTRAINT nl_edicoes_template_version_chk CHECK ((template_version = ANY (ARRAY['classic'::text, 'revista'::text])))
);
CREATE TABLE public.nl_egoi_campanhas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edicao_id uuid NOT NULL,
    lista_id uuid NOT NULL,
    campaign_hash text NOT NULL,
    estado text DEFAULT 'rascunho'::text NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_egoi_campanhas_estado_check CHECK ((estado = ANY (ARRAY['rascunho'::text, 'enviada'::text])))
);
CREATE TABLE public.nl_egoi_listas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    egoi_lista_id text NOT NULL,
    tipo text DEFAULT 'real'::text NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_egoi_listas_tipo_check CHECK ((tipo = ANY (ARRAY['teste'::text, 'real'::text])))
);
CREATE TABLE public.nl_emails_recebidos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    remetente text,
    remetente_nome text,
    assunto text,
    corpo_html text,
    corpo_texto text,
    classificacao text,
    notas_processadas integer DEFAULT 0 NOT NULL,
    recebido_em timestamp with time zone DEFAULT now() NOT NULL,
    message_id text,
    corpo_hash text,
    classificacao_detalhe jsonb DEFAULT '{}'::jsonb NOT NULL,
    processamento_estado text DEFAULT 'por_processar'::text NOT NULL,
    processamento_erro text,
    processamento_tentativas integer DEFAULT 0 NOT NULL,
    processado_em timestamp with time zone,
    CONSTRAINT nl_emails_recebidos_classificacao_check CHECK ((classificacao = ANY (ARRAY['confirmacao'::text, 'newsletter'::text, 'outro'::text])))
);
CREATE TABLE public.nl_episodios_podcast (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    codigo text,
    data_publicacao date,
    url text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.nl_ferramentas_excluidas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_norm text,
    dominio text,
    motivo text,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.nl_ferramentas_semana (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edicao_id uuid NOT NULL,
    posicao integer NOT NULL,
    nome text,
    descricao text,
    url text,
    emoji text,
    cor text DEFAULT 'indigo'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    etiqueta text DEFAULT ''::text NOT NULL,
    cta_rotulo text DEFAULT ''::text NOT NULL,
    CONSTRAINT nl_ferramentas_semana_cor_check CHECK ((cor = ANY (ARRAY['indigo'::text, 'verde'::text, 'laranja'::text, 'cinzento'::text]))),
    CONSTRAINT nl_ferramentas_semana_posicao_check CHECK ((posicao = ANY (ARRAY[1, 2])))
);
CREATE TABLE public.nl_ferramentas_sugeridas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    url text NOT NULL,
    descricao text,
    categoria text,
    fonte_email_id uuid,
    remetente text,
    assunto_origem text,
    estado text DEFAULT 'pendente'::text NOT NULL,
    aprovada_em timestamp with time zone,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    emoji text,
    cor text DEFAULT 'indigo'::text NOT NULL,
    descricao_original text,
    fonte_directorio_id uuid,
    edicao_usada_id uuid,
    edicao_aprovada_id uuid,
    CONSTRAINT nl_ferramentas_sugeridas_cor_check CHECK ((cor = ANY (ARRAY['indigo'::text, 'verde'::text, 'laranja'::text, 'cinzento'::text]))),
    CONSTRAINT nl_ferramentas_sugeridas_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'rejeitada'::text, 'arquivada'::text])))
);
CREATE TABLE public.nl_fontes_curadoria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    url_feed text NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ultima_recolha timestamp with time zone,
    criada_em timestamp with time zone DEFAULT now() NOT NULL,
    tipo text DEFAULT 'rss'::text NOT NULL,
    url_listagem text,
    remetente_email text,
    remetente_dominio text,
    foca_ferramentas boolean DEFAULT false NOT NULL,
    zeros_consecutivos integer DEFAULT 0 NOT NULL,
    grupo text,
    CONSTRAINT nl_fontes_curadoria_tipo_check CHECK ((tipo = ANY (ARRAY['rss'::text, 'html'::text, 'newsletter'::text, 'directorio_ferramentas'::text])))
);
CREATE TABLE public.nl_ia_uso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    modelo text NOT NULL,
    tokens_entrada_cache_hit integer DEFAULT 0 NOT NULL,
    tokens_entrada_cache_miss integer DEFAULT 0 NOT NULL,
    tokens_saida integer DEFAULT 0 NOT NULL,
    custo_usd numeric(10,6) DEFAULT 0 NOT NULL,
    origem text NOT NULL,
    edicao_id uuid,
    brief_id uuid,
    operacao text,
    duracao_ms integer,
    sucesso boolean DEFAULT true NOT NULL,
    erro text,
    CONSTRAINT nl_ia_uso_origem_check CHECK ((origem = ANY (ARRAY['colagem_manual'::text, 'curadoria_rss'::text, 'sugerir_assunto'::text, 'encurtar_descricao'::text, 'pesquisar_fonte'::text, 'embedding_deteccao_repeticao'::text, 'confirmar_repeticao'::text, 'curadoria_fila'::text, 'extraccao_noticia'::text, 'descricao_reescrita'::text, 'minha_leitura'::text, 'email'::text, 'email_newsletter'::text, 'manual_ia'::text, 'sugestao_organizacao'::text, 'preparar_consulta_fonte'::text, 'curadoria_ferramentas_relevancia'::text, 'curadoria_ferramentas_polimento'::text, 'brief'::text])))
);
CREATE TABLE public.nl_noticias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edicao_id uuid,
    titulo text NOT NULL,
    descricao text,
    url text,
    categoria text NOT NULL,
    origem text NOT NULL,
    estado text DEFAULT 'pendente'::text NOT NULL,
    destino text DEFAULT 'news'::text NOT NULL,
    destaque boolean DEFAULT false NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    url_curto text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fonte_id uuid,
    busca tsvector GENERATED ALWAYS AS (to_tsvector('portuguese'::regconfig, public.nl_f_unaccent(((COALESCE(titulo, ''::text) || ' '::text) || COALESCE(descricao, ''::text))))) STORED,
    email_remetente text,
    email_assunto text,
    repeticao_de uuid,
    repeticao_score real,
    repeticao_verificada_em timestamp with time zone,
    embedding extensions.halfvec(3072),
    email_recebido_id uuid,
    override_destino text DEFAULT 'auto'::text NOT NULL,
    url_norm text,
    fonte_estado text DEFAULT 'ok'::text NOT NULL,
    fonte_url_original text,
    corpo_artigo text,
    CONSTRAINT nl_noticias_categoria_check CHECK ((categoria = ANY (ARRAY['ia'::text, 'google'::text, 'youtube'::text, 'meta'::text, 'linkedin'::text, 'tiktok'::text, 'x'::text, 'media'::text]))),
    CONSTRAINT nl_noticias_destino_check CHECK ((destino = ANY (ARRAY['news'::text, 'site'::text]))),
    CONSTRAINT nl_noticias_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'aprovada'::text, 'rejeitada'::text, 'enviada'::text]))),
    CONSTRAINT nl_noticias_origem_check CHECK ((origem = ANY (ARRAY['form_unica'::text, 'form_bloco'::text, 'whatsapp'::text, 'curadoria_ia'::text, 'manual'::text, 'manual_ia'::text, 'email_newsletter'::text]))),
    CONSTRAINT nl_noticias_override_destino_check CHECK ((override_destino = ANY (ARRAY['auto'::text, 'email'::text, 'site'::text])))
);
CREATE TABLE public.nl_prioridades_editoriais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    palavra_chave text NOT NULL,
    peso integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_palavra_chave_minusculas CHECK ((palavra_chave = lower(palavra_chave))),
    CONSTRAINT nl_palavra_chave_nao_vazia CHECK ((length(btrim(palavra_chave)) > 0)),
    CONSTRAINT nl_prioridades_editoriais_peso_check CHECK (((peso >= '-5'::integer) AND (peso <= 5)))
);
CREATE TABLE public.nl_revista_edicao (
    edicao_id uuid NOT NULL,
    preheader text DEFAULT ''::text NOT NULL,
    cronica_titulo text DEFAULT ''::text NOT NULL,
    cronica_subtitulo text DEFAULT ''::text NOT NULL,
    cronica_lede text DEFAULT ''::text NOT NULL,
    cronica_excerto text DEFAULT ''::text NOT NULL,
    cronica_url text DEFAULT ''::text NOT NULL,
    momento_activo boolean DEFAULT false NOT NULL,
    momento_etiqueta text DEFAULT 'O número da semana'::text NOT NULL,
    momento_valor text DEFAULT ''::text NOT NULL,
    momento_descricao text DEFAULT ''::text NOT NULL,
    pull_quote text DEFAULT ''::text NOT NULL,
    recomendacao_tipo text DEFAULT ''::text NOT NULL,
    recomendacao_meta text DEFAULT ''::text NOT NULL,
    recomendacao_titulo text DEFAULT ''::text NOT NULL,
    recomendacao_url text DEFAULT ''::text NOT NULL,
    recomendacao_nota text DEFAULT ''::text NOT NULL,
    bloco_ferramentas boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    podcast_activo boolean DEFAULT false NOT NULL,
    podcast_etiqueta text DEFAULT 'Podcast semanal'::text NOT NULL,
    podcast_programa text DEFAULT ''::text NOT NULL,
    podcast_tema text DEFAULT ''::text NOT NULL,
    podcast_convidado text DEFAULT ''::text NOT NULL,
    podcast_pergunta text DEFAULT ''::text NOT NULL,
    podcast_url text DEFAULT ''::text NOT NULL,
    podcast_cta text DEFAULT 'Ouvir o episódio'::text NOT NULL,
    livro_activo boolean DEFAULT false NOT NULL,
    livro_etiqueta text DEFAULT 'Para aprofundar · Livro'::text NOT NULL,
    livro_titulo text DEFAULT ''::text NOT NULL,
    livro_texto text DEFAULT ''::text NOT NULL,
    livro_cta text DEFAULT 'Conhecer o livro'::text NOT NULL,
    livro_url text DEFAULT ''::text NOT NULL,
    servicos_activo boolean DEFAULT false NOT NULL,
    servicos_titulo text DEFAULT 'Como te posso ajudar'::text NOT NULL,
    servicos_intro text DEFAULT ''::text NOT NULL,
    servicos_cta text DEFAULT 'Pedir uma auditoria digital'::text NOT NULL,
    servicos_url text DEFAULT ''::text NOT NULL,
    servicos_consultoria_texto text DEFAULT ''::text NOT NULL,
    servicos_consultoria_cta text DEFAULT 'Conhecer a consultoria'::text NOT NULL,
    servicos_consultoria_url text DEFAULT ''::text NOT NULL,
    servicos_cursos_texto text DEFAULT ''::text NOT NULL,
    servicos_cursos_cta text DEFAULT 'Explorar cursos e formação'::text NOT NULL,
    servicos_cursos_url text DEFAULT ''::text NOT NULL,
    momento_posicao smallint DEFAULT 99 NOT NULL,
    pull_quote_posicao smallint DEFAULT 99 NOT NULL,
    cronica_imagem_url text DEFAULT ''::text NOT NULL,
    cronica_imagem_alt text DEFAULT ''::text NOT NULL,
    cronica_imagem_credito text DEFAULT ''::text NOT NULL,
    cronica_imagem_credito_url text DEFAULT ''::text NOT NULL,
    cronica_imagem_fonte text DEFAULT ''::text NOT NULL,
    cronica_imagem_posicao integer DEFAULT '-1'::integer NOT NULL,
    cronica_lede_posicao integer DEFAULT 0 NOT NULL,
    recomendacao_activa boolean DEFAULT true NOT NULL
);
CREATE TABLE public.nl_revista_itens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edicao_id uuid NOT NULL,
    noticia_id uuid NOT NULL,
    papel text NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    titulo_override text,
    resumo_factual text DEFAULT ''::text NOT NULL,
    minha_leitura text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cta_rotulo text DEFAULT ''::text NOT NULL,
    radar_nota text DEFAULT ''::text NOT NULL,
    CONSTRAINT nl_revista_itens_papel_check CHECK ((papel = ANY (ARRAY['destaque'::text, 'radar'::text])))
);
CREATE TABLE public.nl_secoes_edicao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    edicao_id uuid NOT NULL,
    tipo text NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    titulo text,
    texto text,
    cor text,
    texto_botao text,
    url_botao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_secoes_edicao_cor_check CHECK ((cor = ANY (ARRAY['indigo'::text, 'verde'::text, 'laranja'::text, 'cinzento'::text]))),
    CONSTRAINT nl_secoes_edicao_tipo_check CHECK ((tipo = ANY (ARRAY['destaques'::text, 'contadores'::text, 'cronica'::text, 'consultoria'::text, 'podcast'::text, 'categorias'::text, 'ferramentas_semana'::text, 'livro'::text, 'recursos'::text, 'personalizada'::text])))
);
CREATE TABLE public.nl_subscricao_eventos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    lista_egoi_id text,
    lista_nome text,
    accao text NOT NULL,
    motivo text,
    retoma_em timestamp with time zone,
    retomado_em timestamp with time zone,
    origem text DEFAULT 'email'::text NOT NULL,
    edicao_id uuid,
    detalhe jsonb DEFAULT '{}'::jsonb NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT nl_subscricao_eventos_accao_check CHECK ((accao = ANY (ARRAY['cancelado'::text, 'pausado'::text, 'mensal'::text, 'reactivado'::text, 'revertido'::text])))
);
ALTER TABLE ONLY public.nl_audit_log ADD CONSTRAINT nl_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_brief_edicoes ADD CONSTRAINT nl_brief_edicoes_brief_id_edicao_id_key UNIQUE (brief_id, edicao_id);
ALTER TABLE ONLY public.nl_brief_edicoes ADD CONSTRAINT nl_brief_edicoes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_brief_eventos ADD CONSTRAINT nl_brief_eventos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_brief_eventos ADD CONSTRAINT nl_brief_eventos_unico UNIQUE (evento, brief_slug, dia);
ALTER TABLE ONLY public.nl_brief_versoes ADD CONSTRAINT nl_brief_versoes_brief_id_versao_key UNIQUE (brief_id, versao);
ALTER TABLE ONLY public.nl_brief_versoes ADD CONSTRAINT nl_brief_versoes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_briefs ADD CONSTRAINT nl_briefs_fingerprint_key UNIQUE (fingerprint);
ALTER TABLE ONLY public.nl_briefs ADD CONSTRAINT nl_briefs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_briefs ADD CONSTRAINT nl_briefs_slug_key UNIQUE (slug);
ALTER TABLE ONLY public.nl_configuracoes ADD CONSTRAINT nl_configuracoes_pkey PRIMARY KEY (chave);
ALTER TABLE ONLY public.nl_cronicas ADD CONSTRAINT nl_cronicas_edicao_id_key UNIQUE (edicao_id);
ALTER TABLE ONLY public.nl_cronicas ADD CONSTRAINT nl_cronicas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_curadoria_config ADD CONSTRAINT nl_curadoria_config_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_curadoria_ferramentas_config ADD CONSTRAINT nl_curadoria_ferramentas_config_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_definicoes_ia ADD CONSTRAINT nl_definicoes_ia_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_edicoes ADD CONSTRAINT nl_edicoes_numero_key UNIQUE (numero);
ALTER TABLE ONLY public.nl_edicoes ADD CONSTRAINT nl_edicoes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_edicao_id_lista_id_key UNIQUE (edicao_id, lista_id);
ALTER TABLE ONLY public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_egoi_listas ADD CONSTRAINT nl_egoi_listas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_emails_recebidos ADD CONSTRAINT nl_emails_recebidos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_episodios_podcast ADD CONSTRAINT nl_episodios_podcast_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_ferramentas_excluidas ADD CONSTRAINT nl_ferramentas_excluidas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_ferramentas_semana ADD CONSTRAINT nl_ferramentas_semana_edicao_id_posicao_key UNIQUE (edicao_id, posicao);
ALTER TABLE ONLY public.nl_ferramentas_semana ADD CONSTRAINT nl_ferramentas_semana_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_fontes_curadoria ADD CONSTRAINT nl_fontes_curadoria_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_noticias ADD CONSTRAINT nl_noticias_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_prioridades_editoriais ADD CONSTRAINT nl_prioridades_editoriais_palavra_chave_key UNIQUE (palavra_chave);
ALTER TABLE ONLY public.nl_prioridades_editoriais ADD CONSTRAINT nl_prioridades_editoriais_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_revista_edicao ADD CONSTRAINT nl_revista_edicao_pkey PRIMARY KEY (edicao_id);
ALTER TABLE ONLY public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_edicao_id_noticia_id_key UNIQUE (edicao_id, noticia_id);
ALTER TABLE ONLY public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_secoes_edicao ADD CONSTRAINT nl_secoes_edicao_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.nl_subscricao_eventos ADD CONSTRAINT nl_subscricao_eventos_pkey PRIMARY KEY (id);
CREATE INDEX nl_brief_edicoes_edicao_idx ON public.nl_brief_edicoes USING btree (edicao_id);
CREATE INDEX nl_brief_eventos_dia_idx ON public.nl_brief_eventos USING btree (dia DESC, evento);
CREATE INDEX nl_briefs_estado_idx ON public.nl_briefs USING btree (estado);
CREATE INDEX nl_briefs_fonte_url_norm_idx ON public.nl_briefs USING btree (fonte_url_norm);
CREATE INDEX nl_briefs_noticia_idx ON public.nl_briefs USING btree (noticia_id);
CREATE INDEX nl_cronicas_busca_gin ON public.nl_cronicas USING gin (busca);
CREATE INDEX nl_curadoria_fila_estado_idx ON public.nl_curadoria_fila USING btree (estado, publicado_em DESC);
CREATE INDEX nl_curadoria_fila_origem_idx ON public.nl_curadoria_fila USING btree (origem, estado);
CREATE UNIQUE INDEX nl_curadoria_fila_url_norm_uidx ON public.nl_curadoria_fila USING btree (url_norm) WHERE (url_norm IS NOT NULL);
CREATE INDEX nl_edicoes_agendamento_idx ON public.nl_edicoes USING btree (agendamento_estado, agendado_para);
CREATE UNIQUE INDEX nl_emails_recebidos_message_id_uidx ON public.nl_emails_recebidos USING btree (message_id) WHERE (message_id IS NOT NULL);
CREATE INDEX nl_emails_recebidos_processamento_idx ON public.nl_emails_recebidos USING btree (processamento_estado, recebido_em DESC) WHERE (processamento_estado <> 'processado'::text);
CREATE UNIQUE INDEX nl_emails_recebidos_remetente_hash_uidx ON public.nl_emails_recebidos USING btree (remetente, corpo_hash) WHERE (corpo_hash IS NOT NULL);
CREATE UNIQUE INDEX nl_ferramentas_excluidas_dominio_uk ON public.nl_ferramentas_excluidas USING btree (dominio) WHERE (dominio IS NOT NULL);
CREATE INDEX nl_ferramentas_excluidas_nome_idx ON public.nl_ferramentas_excluidas USING btree (nome_norm);
CREATE INDEX nl_ferramentas_semana_edicao_idx ON public.nl_ferramentas_semana USING btree (edicao_id);
CREATE INDEX nl_ferramentas_sugeridas_edicao_aprovada_idx ON public.nl_ferramentas_sugeridas USING btree (edicao_aprovada_id) WHERE (edicao_aprovada_id IS NOT NULL);
CREATE INDEX nl_ferramentas_sugeridas_email_idx ON public.nl_ferramentas_sugeridas USING btree (fonte_email_id);
CREATE INDEX nl_ferramentas_sugeridas_estado_criado_idx ON public.nl_ferramentas_sugeridas USING btree (estado, criado_em DESC);
CREATE UNIQUE INDEX nl_ferramentas_sugeridas_url_unico ON public.nl_ferramentas_sugeridas USING btree (lower(url));
CREATE INDEX nl_ia_uso_brief_id_idx ON public.nl_ia_uso USING btree (brief_id);
CREATE INDEX nl_ia_uso_criado_em_idx ON public.nl_ia_uso USING btree (criado_em DESC);
CREATE INDEX nl_ia_uso_origem_idx ON public.nl_ia_uso USING btree (origem);
CREATE INDEX nl_idx_egoi_campanhas_edicao ON public.nl_egoi_campanhas USING btree (edicao_id);
CREATE INDEX nl_idx_emails_recebidos_recebido_em ON public.nl_emails_recebidos USING btree (recebido_em DESC);
CREATE INDEX nl_idx_fontes_curadoria_grupo ON public.nl_fontes_curadoria USING btree (grupo);
CREATE INDEX nl_idx_noticias_edicao_ordem ON public.nl_noticias USING btree (edicao_id, ordem);
CREATE INDEX nl_idx_noticias_estado ON public.nl_noticias USING btree (estado);
CREATE INDEX nl_idx_noticias_fonte_created ON public.nl_noticias USING btree (fonte_id, created_at DESC);
CREATE INDEX nl_idx_noticias_override_destino ON public.nl_noticias USING btree (edicao_id, override_destino);
CREATE INDEX nl_idx_noticias_url_norm ON public.nl_noticias USING btree (url_norm);
CREATE INDEX nl_idx_noticias_repeticao_de ON public.nl_noticias USING btree (repeticao_de) WHERE (repeticao_de IS NOT NULL);
CREATE INDEX nl_idx_secoes_edicao_edicao_ordem ON public.nl_secoes_edicao USING btree (edicao_id, ordem);
CREATE INDEX nl_ix_fontes_tipo_activa ON public.nl_fontes_curadoria USING btree (tipo, activa);
CREATE INDEX nl_noticias_busca_gin ON public.nl_noticias USING gin (busca);
CREATE INDEX nl_noticias_email_recebido_id_idx ON public.nl_noticias USING btree (email_recebido_id) WHERE (email_recebido_id IS NOT NULL);
CREATE INDEX nl_noticias_fonte_estado_idx ON public.nl_noticias USING btree (fonte_estado) WHERE (fonte_estado <> 'ok'::text);
CREATE INDEX nl_noticias_titulo_trgm_idx ON public.nl_noticias USING gin (titulo extensions.gin_trgm_ops);
CREATE INDEX nl_revista_itens_edicao_papel_ordem_idx ON public.nl_revista_itens USING btree (edicao_id, papel, ordem);
CREATE INDEX nl_subscricao_eventos_criado_idx ON public.nl_subscricao_eventos USING btree (criado_em DESC);
CREATE INDEX nl_subscricao_eventos_email_idx ON public.nl_subscricao_eventos USING btree (lower(email), criado_em DESC);
CREATE INDEX nl_subscricao_eventos_retoma_idx ON public.nl_subscricao_eventos USING btree (retoma_em) WHERE ((retoma_em IS NOT NULL) AND (retomado_em IS NULL));
CREATE UNIQUE INDEX nl_uniq_secoes_padrao_por_edicao ON public.nl_secoes_edicao USING btree (edicao_id, tipo) WHERE (tipo <> 'personalizada'::text);
CREATE UNIQUE INDEX nl_ux_fontes_remetente_email ON public.nl_fontes_curadoria USING btree (lower(remetente_email)) WHERE ((tipo = 'newsletter'::text) AND (remetente_email IS NOT NULL));
CREATE TRIGGER nl_brief_edicoes_validar_tg BEFORE INSERT OR UPDATE ON public.nl_brief_edicoes FOR EACH ROW EXECUTE FUNCTION public.nl_brief_edicoes_validar();
CREATE TRIGGER nl_briefs_validar_tg BEFORE INSERT OR UPDATE ON public.nl_briefs FOR EACH ROW EXECUTE FUNCTION public.nl_briefs_validar();
CREATE TRIGGER nl_curadoria_ferramentas_config_updated BEFORE UPDATE ON public.nl_curadoria_ferramentas_config FOR EACH ROW EXECUTE FUNCTION public.nl_tg_curadoria_config_updated();
CREATE TRIGGER nl_egoi_campanhas_set_actualizado_em BEFORE UPDATE ON public.nl_egoi_campanhas FOR EACH ROW EXECUTE FUNCTION public.nl_set_actualizado_em();
CREATE TRIGGER nl_ferramentas_semana_set_updated_at BEFORE UPDATE ON public.nl_ferramentas_semana FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_ferramentas_sugeridas_set_updated_at BEFORE UPDATE ON public.nl_ferramentas_sugeridas FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_prioridades_editoriais_set_updated_at BEFORE UPDATE ON public.nl_prioridades_editoriais FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_revista_edicao_updated_at BEFORE UPDATE ON public.nl_revista_edicao FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_revista_itens_updated_at BEFORE UPDATE ON public.nl_revista_itens FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_trg_configuracoes_updated BEFORE UPDATE ON public.nl_configuracoes FOR EACH ROW EXECUTE FUNCTION public.nl_set_actualizado_em();
CREATE TRIGGER nl_trg_cronicas_updated_at BEFORE UPDATE ON public.nl_cronicas FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_trg_curadoria_config_updated BEFORE UPDATE ON public.nl_curadoria_config FOR EACH ROW EXECUTE FUNCTION public.nl_tg_curadoria_config_updated();
CREATE TRIGGER nl_trg_curadoria_fila_updated_at BEFORE UPDATE ON public.nl_curadoria_fila FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_trg_definicoes_ia_updated_at BEFORE UPDATE ON public.nl_definicoes_ia FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_trg_fontes_curadoria_grupo BEFORE INSERT OR UPDATE ON public.nl_fontes_curadoria FOR EACH ROW EXECUTE FUNCTION public.nl_fontes_curadoria_set_grupo();
CREATE TRIGGER nl_trg_noticias_updated_at BEFORE UPDATE ON public.nl_noticias FOR EACH ROW EXECUTE FUNCTION public.nl_set_updated_at();
CREATE TRIGGER nl_trg_noticias_url_norm BEFORE INSERT OR UPDATE OF url ON public.nl_noticias FOR EACH ROW EXECUTE FUNCTION public.nl_noticias_set_url_norm();
ALTER TABLE ONLY public.nl_brief_edicoes ADD CONSTRAINT nl_brief_edicoes_brief_id_fkey FOREIGN KEY (brief_id) REFERENCES public.nl_briefs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_brief_edicoes ADD CONSTRAINT nl_brief_edicoes_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_brief_versoes ADD CONSTRAINT nl_brief_versoes_brief_id_fkey FOREIGN KEY (brief_id) REFERENCES public.nl_briefs(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_briefs ADD CONSTRAINT nl_briefs_noticia_id_fkey FOREIGN KEY (noticia_id) REFERENCES public.nl_noticias(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_cronicas ADD CONSTRAINT nl_cronicas_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_email_recebido_id_fkey FOREIGN KEY (email_recebido_id) REFERENCES public.nl_emails_recebidos(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_fonte_id_fkey FOREIGN KEY (fonte_id) REFERENCES public.nl_fontes_curadoria(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_curadoria_fila ADD CONSTRAINT nl_curadoria_fila_noticia_id_fkey FOREIGN KEY (noticia_id) REFERENCES public.nl_noticias(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_edicoes ADD CONSTRAINT nl_edicoes_episodio_podcast_id_fkey FOREIGN KEY (episodio_podcast_id) REFERENCES public.nl_episodios_podcast(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_egoi_campanhas ADD CONSTRAINT nl_egoi_campanhas_lista_id_fkey FOREIGN KEY (lista_id) REFERENCES public.nl_egoi_listas(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.nl_ferramentas_semana ADD CONSTRAINT nl_ferramentas_semana_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_edicao_aprovada_id_fkey FOREIGN KEY (edicao_aprovada_id) REFERENCES public.nl_edicoes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_edicao_usada_id_fkey FOREIGN KEY (edicao_usada_id) REFERENCES public.nl_edicoes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_fonte_directorio_id_fkey FOREIGN KEY (fonte_directorio_id) REFERENCES public.nl_fontes_curadoria(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_ferramentas_sugeridas ADD CONSTRAINT nl_ferramentas_sugeridas_fonte_email_id_fkey FOREIGN KEY (fonte_email_id) REFERENCES public.nl_emails_recebidos(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_brief_id_fkey FOREIGN KEY (brief_id) REFERENCES public.nl_briefs(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_ia_uso ADD CONSTRAINT nl_ia_uso_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_noticias ADD CONSTRAINT nl_noticias_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_noticias ADD CONSTRAINT nl_noticias_email_recebido_id_fkey FOREIGN KEY (email_recebido_id) REFERENCES public.nl_emails_recebidos(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_noticias ADD CONSTRAINT nl_noticias_fonte_id_fkey FOREIGN KEY (fonte_id) REFERENCES public.nl_fontes_curadoria(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_noticias ADD CONSTRAINT nl_noticias_repeticao_de_fkey FOREIGN KEY (repeticao_de) REFERENCES public.nl_noticias(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.nl_revista_edicao ADD CONSTRAINT nl_revista_edicao_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_revista_itens ADD CONSTRAINT nl_revista_itens_noticia_id_fkey FOREIGN KEY (noticia_id) REFERENCES public.nl_noticias(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_secoes_edicao ADD CONSTRAINT nl_secoes_edicao_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.nl_subscricao_eventos ADD CONSTRAINT nl_subscricao_eventos_edicao_id_fkey FOREIGN KEY (edicao_id) REFERENCES public.nl_edicoes(id) ON DELETE SET NULL;