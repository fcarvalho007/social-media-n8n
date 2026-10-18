/** Synthetic data only. No export from the live database belongs in this preview. */
export const DEMO_USER_ID = "hub-local-user";
export const DEMO_PROJECT_ID = "hub-local-digitalsprint";
export const demoUser = { id: DEMO_USER_ID, email: "demo@example.invalid", user_metadata: { full_name: "Conta de demonstração" }, app_metadata: {}, aud: "authenticated", created_at: "2026-10-01T09:00:00Z" };
export const demoSession = { user: demoUser, access_token: "local-demo-no-token", refresh_token: "local-demo-no-token", expires_in: 3600, token_type: "local" };
export type DemoRow = Record<string, unknown>;

export function criarTabelasHub(): Record<string, DemoRow[]> {
  const agora = new Date();
  const data = agora.toISOString();
  const amanha = new Date(agora); amanha.setDate(amanha.getDate() + 1); amanha.setHours(10, 0, 0, 0);
  const projeto = { id: DEMO_PROJECT_ID, name: "DIGITALSPRINT · exemplo", description: "Marca de demonstração para rever o fluxo editorial.", color: "#0077B6", icon: "D", logo_url: null, status: "active", owner_id: DEMO_USER_ID, created_at: data, updated_at: data, start_date: null, due_date: null };
  return {
    projects: [projeto, { ...projeto, id: "hub-local-frederico", name: "Frederico Carvalho · exemplo", color: "#171A21" }],
    estudio_preferencias: [{ user_id: DEMO_USER_ID, project_id: null, direcao_visual: {} }],
    estudio_identidades: [{ id: "hub-local-identidade", chave: "digitalsprint", nome: "DIGITALSPRINT · exemplo", tipo: "newsletter", project_id: DEMO_PROJECT_ID }],
    profiles: [{ id: DEMO_USER_ID, email: demoUser.email, full_name: "Conta de demonstração", avatar_url: null }],
    user_roles: [{ id: "hub-local-admin", user_id: DEMO_USER_ID, role: "admin", created_at: data }],
    user_ai_credits: [{ user_id: DEMO_USER_ID, credits_remaining: 0, credits_monthly_allowance: 0, plan_tier: "demo", last_reset_at: null }],
    art_rascunhos: [{ id: "hub-local-artigo", project_id: DEMO_PROJECT_ID, created_by: DEMO_USER_ID, user_id: DEMO_USER_ID, titulo: "Como preparar uma edição com menos retrabalho", resumo: "Artigo de exemplo para testar a edição e a recuperação de texto.", corpo: "Uma rotina editorial começa pela escolha das fontes.\n\nDepois de rever os factos, a mesma seleção pode dar origem a uma newsletter, um artigo e peças sociais. Cada formato pede uma adaptação, mantendo a autoria e as fontes claras.\n\nEste texto é fictício. As alterações são guardadas apenas neste navegador.", estado: "rascunho", created_at: data, updated_at: data }],
    posts_drafts: [
      { id: "hub-local-draft-1", user_id: DEMO_USER_ID, project_id: DEMO_PROJECT_ID, platform: "instagram", caption: "Exemplo · Três decisões para uma rotina editorial mais simples. Guarda para a próxima edição.", media_urls: [], media_items: [], scheduled_date: null, scheduled_time: null, publish_immediately: false, status: "draft", format: "carousel", created_at: data, updated_at: data },
      { id: "hub-local-draft-2", user_id: DEMO_USER_ID, project_id: "hub-local-frederico", platform: "linkedin", caption: "Exemplo · A minha leitura: o valor está no contexto que acrescentamos à notícia.", media_urls: [], media_items: [], scheduled_date: null, scheduled_time: null, publish_immediately: false, status: "draft", format: "post", created_at: data, updated_at: data },
    ],
    posts: [{ id: "hub-local-post", user_id: DEMO_USER_ID, project_id: DEMO_PROJECT_ID, tema: "Exemplo · Uma ideia para a próxima edição", caption: "Conteúdo fictício no calendário local.", content_type: "carousel", status: "scheduled", scheduled_date: amanha.toISOString(), created_at: data, updated_at: data, template_a_images: [], media_items: [], media_urls_backup: [], selected_networks: ["instagram"], external_post_ids: {}, cover_image_url: null }],
    stories: [], publication_attempts: [], scheduled_jobs: [], notifications: [],
    tasks: [], project_tasks: [], project_milestones: [], project_members: [], project_comments: [],
    nl_edicoes: [{ id: "hub-local-edicao", numero: 320, assunto: "Exemplo · Uma rotina editorial mais simples", estado: "rascunho", identidade_id: "hub-local-identidade", created_at: data, data_envio_prevista: null, enviada_em: null, cronica: null, episodio: null }],
    nl_noticias: criarNoticiasHub().map(n=>({...n,updated_at:n.criado_em})), mc_documentos: [], nl_conteudos_derivados: [], nl_cronicas: [], nl_episodios_podcast: [], nl_secoes_edicao: [], nl_ferramentas_semana: [], nl_config: [], nl_perfis: [], nl_emails_recebidos: [], nl_email_mensagens: [], nl_curadoria_fila: [], nl_egoi_campanhas: [],
    nl_fontes_curadoria: [{ id: "hub-local-fonte", nome: "Fonte de demonstração", tipo: "rss", url: "https://example.invalid/feed", activa: true, created_at: data, ultimo_acesso: null }],
    user_notification_preferences: [], ai_user_settings: [], templates: [],
  };
}

export function criarNoticiasHub() {
  return [
    { id: "hub-local-noticia-1", titulo: "Uma equipa organiza a investigação num arquivo partilhado", descricao: "O arquivo reúne as fontes e as notas usadas pela equipa. A revisão editorial continua a ser feita por uma pessoa.", categoria: "ia", origem: "rss", editorial_estado: "pendente", nivel: "resumo" },
    { id: "hub-local-noticia-2", titulo: "Um guia ajuda a adaptar artigos para outros formatos", descricao: "O guia apresenta uma sequência de revisão, síntese e adaptação. Os autores recomendam confirmar as fontes antes de publicar.", categoria: "media", origem: "manual", editorial_estado: "aprovada", nivel: "artigo" },
    { id: "hub-local-noticia-3", titulo: "Uma biblioteca disponibiliza um novo catálogo digital", descricao: "O catálogo permite pesquisar por tema e guardar uma lista de leitura. O lançamento inclui sessões abertas à comunidade.", categoria: "google", origem: "email", editorial_estado: "pendente", nivel: "resumo" },
  ].map((n) => ({ ...n, url: null, estado_newsletter: "pendente", edicao_id: null, criado_em: new Date().toISOString(), usos: 0, edicoes: [], fonte_nome: "Fonte de demonstração", fonte_tipo: "rss" }));
}
