import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/**
 * Remove um emoji/símbolo decorativo (e espaços/pontuação leve) do início
 * do título. Usado só para apresentação — o valor persistido não é mudado.
 * Notícias antigas foram criadas com emoji obrigatório; a partir de agora
 * o extractor IA gera sem emoji, mas as antigas continuam na BD.
 */
export function stripLeadingEmoji(titulo: string | null | undefined): string {
  if (!titulo) return "";
  // Regex: apanha emojis (símbolos + variation selectors + ZWJ sequences)
  // no início, seguidos de espaços ou pontuação leve.
  const re = /^(?:[\p{Extended_Pictographic}\u2600-\u27BF\uFE0F\u200D]+[\s\p{P}]*)+/u;
  return titulo.replace(re, "").trimStart();
}


export type CatId =
  | "ia" | "google" | "youtube" | "meta"
  | "linkedin" | "tiktok" | "x" | "media";

export type EstadoNoticia = "pendente" | "aprovada" | "rejeitada" | "enviada";
export type DestinoNoticia = "news" | "site";
export type OrigemNoticia = "form_unica" | "form_bloco" | "whatsapp" | "curadoria_ia" | "manual" | "manual_ia" | "email_newsletter";
export type EstadoEdicao = "rascunho" | "enviada";

export type Noticia = Database["public"]["Tables"]["nl_noticias"]["Row"];
// `Pendente` estende a Row com colunas novas (email_remetente/email_assunto)
// e o join opcional com fontes_curadoria — só para os cards da fila de
// pendentes. Não usar em inserts/updates.
export type Pendente = Noticia & {
  email_remetente?: string | null;
  email_assunto?: string | null;
  repeticao_de?: string | null;
  repeticao_score?: number | null;
  fonte_estado?: string | null;
  fonte_url_original?: string | null;
  fonte?: { nome: string } | null;
  repeticao?: { titulo: string; edicao?: { numero: number | null } | null } | null;
};

export type Cronica = Database["public"]["Tables"]["nl_cronicas"]["Row"];
export type Episodio = Database["public"]["Tables"]["nl_episodios_podcast"]["Row"];
export type Fonte = Database["public"]["Tables"]["nl_fontes_curadoria"]["Row"];
export type Audit = Database["public"]["Tables"]["nl_audit_log"]["Row"];
export type EdicaoRow = Database["public"]["Tables"]["nl_edicoes"]["Row"];
export type SeccaoRow = Database["public"]["Tables"]["nl_secoes_edicao"]["Row"];
export type Ferramenta = Database["public"]["Tables"]["nl_ferramentas_semana"]["Row"];

export type SeccaoTipo =
  | "destaques" | "contadores" | "cronica" | "consultoria" | "podcast" | "categorias"
  | "ferramentas_semana" | "livro" | "recursos" | "personalizada";
export type SeccaoCor = "indigo" | "verde" | "laranja" | "cinzento";

export interface EdicaoAtual extends EdicaoRow {
  cronica: Cronica | null;
  episodio: Episodio | null;
}

/* ─── Edições ─── */

async function numeroUltimaEnviada(): Promise<number> {
  const { data, error } = await supabase
    .from("nl_edicoes")
    .select("numero")
    .eq("estado", "enviada")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.numero ?? 0;
}

export async function getEdicaoAtual(): Promise<EdicaoAtual | null> {
  // Drafts numbered below the last sent edition are obsolete: never auto-open them.
  const ultima = await numeroUltimaEnviada();
  const { data, error } = await supabase
    .from("nl_edicoes")
    .select("*, cronica:cronicas(*), episodio:episodios_podcast(*)")
    .eq("estado", "rascunho")
    .gt("numero", ultima)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Supabase devolve arrays quando não sabe se é 1:1; normalizamos
  const cronica = Array.isArray(data.cronica) ? (data.cronica[0] ?? null) : (data.cronica ?? null);
  const episodio = Array.isArray(data.episodio) ? (data.episodio[0] ?? null) : (data.episodio ?? null);
  return { ...data, cronica, episodio } as EdicaoAtual;
}

export async function getUltimaEnviada(): Promise<EdicaoAtual | null> {
  const { data, error } = await supabase
    .from("nl_edicoes")
    .select("*, cronica:cronicas(*), episodio:episodios_podcast(*)")
    .eq("estado", "enviada")
    .order("enviada_em", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cronica = Array.isArray(data.cronica) ? (data.cronica[0] ?? null) : (data.cronica ?? null);
  const episodio = Array.isArray(data.episodio) ? (data.episodio[0] ?? null) : (data.episodio ?? null);
  return { ...data, cronica, episodio } as EdicaoAtual;
}

export type EdicaoEnviadaRow = Pick<
  EdicaoRow,
  "id" | "numero" | "assunto" | "enviada_em" | "data_envio_prevista" | "snapshot_envio" | "template_version"
>;

export async function listarEnviadas(): Promise<EdicaoEnviadaRow[]> {
  const { data, error } = await supabase
    .from("nl_edicoes")
    .select("id, numero, assunto, enviada_em, data_envio_prevista, snapshot_envio, template_version")
    .eq("estado", "enviada")
    // Ordem cronológica real: o número nem sempre acompanha a data de envio.
    .order("enviada_em", { ascending: false, nullsFirst: false })
    .order("numero", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EdicaoEnviadaRow[];
}

// Pesquisa full-text no arquivo (edições enviadas).
// Usa a RPC `pesquisar_arquivo` — devolve trechos com <mark> pré-inserido.
export type ResultadoArquivo = {
  edicao_id: string;
  edicao_numero: number;
  edicao_data: string | null;
  tipo: "noticia" | "cronica";
  titulo: string;
  trecho: string;
  url: string | null;
  rank: number;
};

export async function pesquisarArquivo(query: string, limite = 20): Promise<ResultadoArquivo[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc("pesquisar_arquivo", { query: q, limite });
  if (error) throw error;
  return (data ?? []) as ResultadoArquivo[];
}

/* ─── Pesquisa global (todos os âmbitos) ─── */

export type AmbitoPesquisa =
  | "edicao_actual" | "enviadas" | "pendentes" | "rejeitadas" | "ferramentas";

export type ResultadoGlobal = {
  id: string;
  ambito: AmbitoPesquisa;
  tipo: "noticia" | "cronica" | "ferramenta";
  titulo: string;
  trecho: string | null;
  url: string | null;
  categoria: string | null;
  origem: string | null;
  estado: string | null;
  edicao_id: string | null;
  edicao_numero: number | null;
  edicao_data: string | null;
  criado_em: string | null;
  usada_em_numero: number | null;
  rank: number;
};

/**
 * Pesquisa transversal: notícias da edição em curso, de edições enviadas,
 * pendentes e rejeitadas, mais crónicas e ferramentas. Cada linha traz o
 * âmbito e o estado, para o painel saber onde a notícia vive.
 */
export async function pesquisarGlobal(
  query: string,
  ambitos: AmbitoPesquisa[] | null,
  edicaoActual: string | null,
  limite = 40,
): Promise<ResultadoGlobal[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc("pesquisar_global", {
    query: q,
    ambitos: ambitos && ambitos.length ? ambitos : undefined,
    edicao_actual: edicaoActual ?? undefined,
    limite,
  });
  if (error) throw error;
  return (data ?? []) as ResultadoGlobal[];
}

function proximaQuinta(): string {
  const hoje = new Date();
  const dow = hoje.getDay(); // 0=dom .. 4=qui
  const diff = (4 - dow + 7) % 7; // 0 se hoje é qui
  const alvo = new Date(hoje);
  alvo.setDate(hoje.getDate() + diff);
  return alvo.toISOString().slice(0, 10);
}

export async function criarEdicaoDaSemana(
  templateVersion: "classic" | "revista" = "revista",
): Promise<string> {
  const { data: max, error: e1 } = await supabase
    .from("nl_edicoes")
    .select("numero")
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e1) throw e1;
  const numero = (max?.numero ?? 0) + 1;

  const { data: ed, error: e2 } = await supabase
    .from("nl_edicoes")
    .insert({
      numero,
      data_envio_prevista: proximaQuinta(),
      assunto: `Edição #${numero}`,
      estado: "rascunho",
      bloco_livro: true,
      bloco_recursos: true,
      template_version: templateVersion,
    })
    .select("id")
    .single();
  if (e2 || !ed) throw e2 ?? new Error("Falha ao criar edição");

  const { error: e3 } = await supabase
    .from("nl_cronicas")
    .insert({ edicao_id: ed.id, conteudo: "", conteudo_html: "", leituras_recomendadas: "" });
  if (e3) throw e3;

  // Popular as 7 secções-padrão desta edição
  const { error: e4 } = await supabase.rpc("nl_criar_seccoes_padrao", { _edicao_id: ed.id });
  if (e4) throw e4;

  if (templateVersion === "revista") {
    const { error: e5 } = await supabase.from("nl_revista_edicao").insert({ edicao_id: ed.id });
    if (e5) throw e5;
  }

  return ed.id;
}


/**
 * Rede de segurança: detecta uma edição ainda em rascunho que já teve um
 * disparo real para subscritores (campanha E-goi de uma lista `real` no
 * estado «enviada»). Devolve a data do disparo, ou null.
 */
export async function detectarEnvioRealPendente(edicaoId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("nl_egoi_campanhas")
    .select("actualizado_em, lista:egoi_listas!inner(tipo)")
    .eq("edicao_id", edicaoId)
    .eq("estado", "enviada")
    .eq("egoi_listas.tipo", "real")
    .order("actualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as { actualizado_em: string } | null)?.actualizado_em ?? null;
}

/** Fecha manualmente uma edição que já foi enviada mas ficou marcada como rascunho. */
export async function fecharEdicaoManualmente(edicaoId: string, enviadaEm: string) {
  const { error } = await supabase
    .from("nl_edicoes")
    .update({ estado: "enviada", enviada_em: enviadaEm })
    .eq("id", edicaoId);
  if (error) throw error;
  await supabase.from("nl_noticias").update({ estado: "enviada" })
    .eq("edicao_id", edicaoId).eq("estado", "aprovada");
  await supabase.from("nl_audit_log").insert({
    quem: await nomeUtilizador(),
    accao: "Fechou manualmente uma edição já enviada",
  });
}

async function nomeUtilizador(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) return "utilizador";
  const { data: perfil } = await supabase.from("nl_perfis").select("nome").eq("id", id).maybeSingle();
  return perfil?.nome ?? "utilizador";
}

/* ─── Edições passadas: repescar (clonar / reabrir) ─── */

export type RascunhoRow = Pick<EdicaoRow, "id" | "numero" | "assunto" | "data_envio_prevista" | "created_at">;

/**
 * Um rascunho é obsoleto quando foi criado antes da última edição já enviada:
 * ficou para trás e não deve ser confundido com a edição em curso.
 */
export async function rascunhoObsoleto(edicao: { created_at: string } | null): Promise<
  { obsoleto: false } | { obsoleto: true; ultimaNumero: number; ultimaEnviadaEm: string | null }
> {
  if (!edicao) return { obsoleto: false };
  const { data } = await supabase
    .from("nl_edicoes")
    .select("numero, enviada_em")
    .eq("estado", "enviada")
    .order("enviada_em", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!data?.enviada_em) return { obsoleto: false };
  if (new Date(edicao.created_at).getTime() >= new Date(data.enviada_em).getTime()) return { obsoleto: false };
  return { obsoleto: true, ultimaNumero: data.numero, ultimaEnviadaEm: data.enviada_em };
}

/** Todos os rascunhos abertos, do mais recente para o mais antigo. */
export async function listarRascunhos(): Promise<RascunhoRow[]> {
  const { data, error } = await supabase
    .from("nl_edicoes")
    .select("id, numero, assunto, data_envio_prevista, created_at")
    .eq("estado", "rascunho")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RascunhoRow[];
}

/** Carrega uma edição específica (rascunho ou enviada) com crónica e episódio. */
export async function getEdicaoPorId(edicaoId: string): Promise<EdicaoAtual | null> {
  const { data, error } = await supabase
    .from("nl_edicoes")
    .select("*, cronica:cronicas(*), episodio:episodios_podcast(*)")
    .eq("id", edicaoId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const cronica = Array.isArray(data.cronica) ? (data.cronica[0] ?? null) : (data.cronica ?? null);
  const episodio = Array.isArray(data.episodio) ? (data.episodio[0] ?? null) : (data.episodio ?? null);
  return { ...data, cronica, episodio } as EdicaoAtual;
}

/**
 * Troca o formato (modelo de email + editor) de uma edição em rascunho.
 * Edições já enviadas são imutáveis: a troca é recusada.
 */
export async function alterarFormatoEdicao(
  edicaoId: string,
  formato: "classic" | "revista",
  quem: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("nl_edicoes")
    .update({ template_version: formato })
    .eq("id", edicaoId)
    .eq("estado", "rascunho")
    .select("id, numero")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Só é possível mudar o formato de uma edição em rascunho.");
  await registarAudit(quem, "formato_alterado", { edicao_id: edicaoId, numero: data.numero, formato });
}

export interface EdicaoPassada extends EdicaoEnviadaRow {
  wordpress_post_url: string | null;
  n_noticias: number;
  tem_cronica: boolean;
  listas: string[];
  /** "enviada" = edição fechada; "parcial" = já saiu, mas continua em rascunho. */
  estado_envio: "enviada" | "parcial";
  /** Hora do último disparo confirmado (fallback quando não há `enviada_em`). */
  ultimo_disparo: string | null;
  /** Listas reais activas que ainda não receberam esta edição. */
  listas_em_falta: string[];
}

/**
 * Edições que já saíram: as fechadas (`estado = "enviada"`) e também as que
 * continuam em rascunho mas já tiveram pelo menos um disparo real confirmado
 * (envio parcial). Sem isto, uma edição disparada a meio desaparecia da lista.
 */
export async function listarEdicoesPassadas(): Promise<EdicaoPassada[]> {
  const [enviadas, { data: campsTodas }, { data: listasReais }] = await Promise.all([
    listarEnviadas(),
    supabase
      .from("nl_egoi_campanhas")
      .select("edicao_id, estado, actualizado_em, lista:egoi_listas(id, nome, tipo, activa)")
      .eq("estado", "enviada"),
    supabase.from("nl_egoi_listas").select("id, nome").eq("tipo", "real").eq("activa", true),
  ]);

  type CampRow = {
    edicao_id: string;
    actualizado_em: string | null;
    lista: { id: string; nome: string; tipo: string; activa: boolean } | { id: string; nome: string; tipo: string; activa: boolean }[] | null;
  };
  const camps = ((campsTodas ?? []) as CampRow[]).map((c) => ({
    edicao_id: c.edicao_id,
    actualizado_em: c.actualizado_em,
    lista: Array.isArray(c.lista) ? (c.lista[0] ?? null) : c.lista,
  }));

  const idsEnviadas = new Set(enviadas.map((e) => e.id));
  const idsComDisparoReal = new Set(
    camps.filter((c) => c.lista?.tipo === "real").map((c) => c.edicao_id),
  );
  const idsParciais = [...idsComDisparoReal].filter((id) => !idsEnviadas.has(id));

  let parciais: EdicaoEnviadaRow[] = [];
  if (idsParciais.length > 0) {
    const { data } = await supabase
      .from("nl_edicoes")
      .select("id, numero, assunto, enviada_em, data_envio_prevista, snapshot_envio, template_version")
      .in("id", idsParciais);
    parciais = (data ?? []) as EdicaoEnviadaRow[];
  }

  const base = [...enviadas, ...parciais].sort((a, b) => b.numero - a.numero);
  if (base.length === 0) return [];
  const ids = base.map((e) => e.id);

  const [{ data: urls }, { data: nots }, { data: crons }] = await Promise.all([
    supabase.from("nl_edicoes").select("id, wordpress_post_url").in("id", ids),
    supabase.from("nl_noticias").select("id, edicao_id").in("edicao_id", ids),
    supabase.from("nl_cronicas").select("edicao_id, conteudo, conteudo_html").in("edicao_id", ids),
  ]);

  const urlPor = new Map<string, string | null>(
    ((urls ?? []) as Array<{ id: string; wordpress_post_url: string | null }>).map((r) => [r.id, r.wordpress_post_url]),
  );
  const contagem = new Map<string, number>();
  for (const n of (nots ?? []) as Array<{ edicao_id: string | null }>) {
    if (!n.edicao_id) continue;
    contagem.set(n.edicao_id, (contagem.get(n.edicao_id) ?? 0) + 1);
  }
  const comCronica = new Set(
    ((crons ?? []) as Array<{ edicao_id: string; conteudo: string | null; conteudo_html: string | null }>)
      .filter((c) => (c.conteudo ?? "").trim() || (c.conteudo_html ?? "").trim())
      .map((c) => c.edicao_id),
  );

  const listasPor = new Map<string, string[]>();
  const idsListasPor = new Map<string, Set<string>>();
  const ultimoPor = new Map<string, string>();
  for (const c of camps) {
    if (!c.lista?.nome) continue;
    const arr = listasPor.get(c.edicao_id) ?? [];
    if (!arr.includes(c.lista.nome)) arr.push(c.lista.nome);
    listasPor.set(c.edicao_id, arr);
    const set = idsListasPor.get(c.edicao_id) ?? new Set<string>();
    set.add(c.lista.id);
    idsListasPor.set(c.edicao_id, set);
    if (c.actualizado_em) {
      const actual = ultimoPor.get(c.edicao_id);
      if (!actual || c.actualizado_em > actual) ultimoPor.set(c.edicao_id, c.actualizado_em);
    }
  }

  const reais = (listasReais ?? []) as Array<{ id: string; nome: string }>;

  return base.map((e) => {
    const jaRecebeu = idsListasPor.get(e.id) ?? new Set<string>();
    const parcial = !idsEnviadas.has(e.id);
    return {
      ...e,
      wordpress_post_url: urlPor.get(e.id) ?? null,
      n_noticias: contagem.get(e.id) ?? 0,
      tem_cronica: comCronica.has(e.id),
      listas: listasPor.get(e.id) ?? [],
      estado_envio: parcial ? ("parcial" as const) : ("enviada" as const),
      ultimo_disparo: ultimoPor.get(e.id) ?? null,
      listas_em_falta: parcial ? reais.filter((l) => !jaRecebeu.has(l.id)).map((l) => l.nome) : [],
    };
  });
}


/**
 * Clona uma edição enviada num rascunho novo (número seguinte), copiando
 * notícias, crónica, secções, ferramentas e blocos fixos. A edição de
 * origem fica intacta.
 */
export async function clonarEdicao(edicaoId: string): Promise<string> {
  const { data: origem, error: e0 } = await supabase
    .from("nl_edicoes")
    .select("*")
    .eq("id", edicaoId)
    .single();
  if (e0 || !origem) throw e0 ?? new Error("Edição de origem não encontrada");

  const { data: max } = await supabase
    .from("nl_edicoes").select("numero").order("numero", { ascending: false }).limit(1).maybeSingle();
  const numero = (max?.numero ?? 0) + 1;

  const { data: nova, error: e1 } = await supabase
    .from("nl_edicoes")
    .insert({
      numero,
      data_envio_prevista: proximaQuinta(),
      assunto: origem.assunto ?? `Edição #${numero}`,
      estado: "rascunho",
      bloco_livro: origem.bloco_livro,
      bloco_recursos: origem.bloco_recursos,
      bloco_consultoria: origem.bloco_consultoria,
      episodio_podcast_id: origem.episodio_podcast_id,
      categorias_ocultas_email: origem.categorias_ocultas_email,
      links_ignorados: origem.links_ignorados,
    })
    .select("id")
    .single();
  if (e1 || !nova) throw e1 ?? new Error("Falha ao criar a edição clonada");
  const novaId = nova.id;

  // Crónica
  const { data: cron } = await supabase
    .from("nl_cronicas")
    .select("titulo, conteudo, conteudo_html, leituras_recomendadas, concluida")
    .eq("edicao_id", edicaoId)
    .maybeSingle();
  const { error: e2 } = await supabase.from("nl_cronicas").insert({
    edicao_id: novaId,
    titulo: cron?.titulo ?? null,
    conteudo: cron?.conteudo ?? "",
    conteudo_html: cron?.conteudo_html ?? "",
    leituras_recomendadas: cron?.leituras_recomendadas ?? "",
    // A crónica clonada entra sempre por confirmar: obriga a revisão antes do envio.
    concluida: false,

  });
  if (e2) throw e2;

  // Secções (mantém ordem, activo e campos das personalizadas)
  const { data: secs } = await supabase
    .from("nl_secoes_edicao")
    .select("tipo, ordem, activo, titulo, texto, cor, texto_botao, url_botao")
    .eq("edicao_id", edicaoId)
    .order("ordem", { ascending: true });
  if (secs && secs.length > 0) {
    const { error: e3 } = await supabase.from("nl_secoes_edicao").insert(
      secs.map((s) => ({ ...s, edicao_id: novaId })),
    );
    if (e3) throw e3;
  } else {
    await supabase.rpc("nl_criar_seccoes_padrao", { _edicao_id: novaId });
  }

  // Ferramentas da semana
  const { data: ferrs } = await supabase
    .from("nl_ferramentas_semana")
    .select("posicao, nome, descricao, url, emoji, cor")
    .eq("edicao_id", edicaoId)
    .order("posicao", { ascending: true });
  if (ferrs && ferrs.length > 0) {
    const { error: e4 } = await supabase.from("nl_ferramentas_semana").insert(
      ferrs.map((f) => ({ ...f, edicao_id: novaId })),
    );
    if (e4) throw e4;
  }

  // Notícias — cópias novas, já aprovadas na edição clonada
  const { data: nots } = await supabase
    .from("nl_noticias")
    .select("titulo, descricao, url, categoria, origem, destino, destaque, ordem, override_destino, url_curto, fonte_id, fonte_estado, fonte_url_original, email_remetente, email_assunto")
    .eq("edicao_id", edicaoId)
    .in("estado", ["enviada", "aprovada"])
    .order("ordem", { ascending: true });
  if (nots && nots.length > 0) {
    const { error: e5 } = await supabase.from("nl_noticias").insert(
      nots.map((n) => ({
        ...n,
        edicao_id: novaId,
        estado: "aprovada",
        // Links de rastreio caducam: se a origem já tinha sido resolvida a
        // partir de um redireccionador, a cópia fica por confirmar.
        fonte_estado: n.fonte_url_original ? "por_confirmar" : n.fonte_estado,
      })),
    );
    if (e5) throw e5;

  }

  await registarAudit(
    await nomeUtilizador(),
    `Repescou a edição #${origem.numero} como nova edição #${numero}`,
    { origem: edicaoId, nova: novaId },
  );

  return novaId;
}

/**
 * Reabre uma edição já enviada, devolvendo-a a rascunho com o mesmo número,
 * para permitir um reenvio. As notícias voltam a `aprovada`.
 */
export async function reabrirEdicao(edicaoId: string): Promise<void> {
  const { data: ed, error: e0 } = await supabase
    .from("nl_edicoes").select("numero, estado").eq("id", edicaoId).single();
  if (e0 || !ed) throw e0 ?? new Error("Edição não encontrada");
  if (ed.estado === "rascunho") return;

  const { error: e1 } = await supabase
    .from("nl_edicoes")
    .update({ estado: "rascunho", enviada_em: null, envio_em_curso: null })
    .eq("id", edicaoId);
  if (e1) throw e1;

  // Só depois da edição estar em rascunho é que as notícias podem ser tocadas.
  const { error: e2 } = await supabase
    .from("nl_noticias")
    .update({ estado: "aprovada" })
    .eq("edicao_id", edicaoId)
    .eq("estado", "enviada");
  if (e2) throw e2;

  await registarAudit(
    await nomeUtilizador(),
    `Reabriu a edição #${ed.numero} para reenvio`,
    { edicao: edicaoId },
  );
}




export async function atualizarAssunto(edicaoId: string, assunto: string) {
  const { error } = await supabase.from("nl_edicoes").update({ assunto }).eq("id", edicaoId);
  if (error) throw error;
}

export async function atualizarBlocos(
  edicaoId: string,
  patch: Partial<Pick<EdicaoRow, "bloco_livro" | "bloco_recursos">>,
) {
  const { error } = await supabase.from("nl_edicoes").update(patch).eq("id", edicaoId);
  if (error) throw error;
}

export interface BlocoConsultoria {
  titulo: string;
  subtitulo: string;
  texto_botao: string;
  url_botao: string;
}
export const CONSULTORIA_DEFAULT: BlocoConsultoria = {
  titulo: "Antes da tecnologia, o processo",
  subtitulo: "A maioria das empresas não precisa de mais ferramentas — precisa de perceber onde perde tempo e dinheiro. Diagnóstico de processos e marketing digital primeiro; a tecnologia (com ou sem IA) só entra onde compensa.",
  texto_botao: "Marcar 15 minutos",
  url_botao: "https://lunacal.ai/digitalfc/chamada-consultoria-15m",
};

export function normalizarConsultoria(v: unknown): BlocoConsultoria {
  const o = (v && typeof v === "object") ? v as Record<string, unknown> : {};
  return {
    titulo: typeof o.titulo === "string" && o.titulo.trim() ? o.titulo : CONSULTORIA_DEFAULT.titulo,
    subtitulo: typeof o.subtitulo === "string" && o.subtitulo.trim() ? o.subtitulo : CONSULTORIA_DEFAULT.subtitulo,
    texto_botao: typeof o.texto_botao === "string" && o.texto_botao.trim() ? o.texto_botao : CONSULTORIA_DEFAULT.texto_botao,
    url_botao: typeof o.url_botao === "string" && o.url_botao.trim() ? o.url_botao : CONSULTORIA_DEFAULT.url_botao,
  };
}
export async function atualizarConsultoria(edicaoId: string, patch: Partial<BlocoConsultoria>) {
  // Lê o valor actual, aplica patch, grava tudo (idempotente e sem depender de rpc).
  const { data, error: e1 } = await supabase
    .from("nl_edicoes").select("bloco_consultoria").eq("id", edicaoId).single();
  if (e1) throw e1;
  const atual = normalizarConsultoria(data?.bloco_consultoria);
  const proximo = { ...atual, ...patch };
  const { error } = await supabase
    .from("nl_edicoes")
    .update({ bloco_consultoria: proximo as unknown as EdicaoRow["bloco_consultoria"] })
    .eq("id", edicaoId);
  if (error) throw error;
}

export async function escolherEpisodio(edicaoId: string, episodioId: string | null) {
  const { error } = await supabase
    .from("nl_edicoes")
    .update({ episodio_podcast_id: episodioId })
    .eq("id", edicaoId);
  if (error) throw error;
}

export async function enviarEdicao(edicaoId: string, snapshot: unknown) {
  const { error: e1 } = await supabase
    .from("nl_edicoes")
    .update({
      estado: "enviada",
      enviada_em: new Date().toISOString(),
      snapshot_envio: snapshot as never,
    })
    .eq("id", edicaoId);
  if (e1) throw e1;

  const { error: e2 } = await supabase
    .from("nl_noticias")
    .update({ estado: "enviada" })
    .eq("edicao_id", edicaoId)
    .eq("estado", "aprovada");
  if (e2) throw e2;
}

/* ─── Notícias ─── */

export async function listarPendentes(): Promise<Pendente[]> {
  const { data, error } = await supabase
    .from("nl_noticias")
    .select("*, fonte:fontes_curadoria(nome), repeticao:repeticao_de(titulo, edicao:edicoes(numero))")
    .eq("estado", "pendente")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Pendente[];
}


export async function listarAprovadasDaEdicao(edicaoId: string): Promise<Noticia[]> {
  const { data, error } = await supabase
    .from("nl_noticias")
    .select("*")
    .eq("edicao_id", edicaoId)
    .in("estado", ["aprovada", "enviada"])
    .order("ordem", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function aprovarNoticia(id: string, edicaoId: string, patch?: Partial<Noticia>) {
  const { data: max } = await supabase
    .from("nl_noticias")
    .select("ordem")
    .eq("edicao_id", edicaoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = (max?.ordem ?? 0) + 1;

  const { error } = await supabase
    .from("nl_noticias")
    .update({
      ...(patch ?? {}),
      estado: "aprovada",
      edicao_id: edicaoId,
      ordem,
      destino: "news",
      destaque: false,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function rejeitarNoticia(id: string) {
  const { error } = await supabase
    .from("nl_noticias")
    .update({ estado: "rejeitada" })
    .eq("id", id);
  if (error) throw error;
}

export async function devolverNoticia(id: string) {
  const { error } = await supabase
    .from("nl_noticias")
    .update({ estado: "pendente", edicao_id: null, destaque: false, ordem: 0 })
    .eq("id", id);
  if (error) throw error;
}

export async function apagarNoticia(id: string) {
  const { error } = await supabase.from("nl_noticias").delete().eq("id", id);
  if (error) throw error;
}

export async function atualizarNoticia(id: string, patch: Partial<Noticia>) {
  const { error } = await supabase.from("nl_noticias").update(patch).eq("id", id);
  if (error) throw error;
}

/** Sincroniza o campo `destino` (persistido) para várias notícias em batch.
 *  Chamado após qualquer mutação que possa afectar o destino efectivo
 *  (reordenação, pin, categoria oculta) para que Preview e envio E-goi
 *  continuem a filtrar apenas por `destino !== 'site'`. */
export async function sincronizarDestinos(
  updates: Array<{ id: string; destino: "news" | "site" }>,
): Promise<number> {
  if (updates.length === 0) return 0;
  let mudadas = 0;
  for (const u of updates) {
    const { error } = await supabase
      .from("nl_noticias")
      .update({ destino: u.destino })
      .eq("id", u.id);
    if (error) throw error;
    mudadas += 1;
  }
  return mudadas;
}

/** Actualiza o pin manual (`override_destino`) de uma notícia. */
export async function definirOverrideDestino(
  id: string,
  override: "auto" | "email" | "site",
) {
  const { error } = await supabase
    .from("nl_noticias")
    .update({ override_destino: override })
    .eq("id", id);
  if (error) throw error;
}

/** Actualiza a lista de categorias ocultas no email para a edição. */
export async function definirCategoriasOcultasEmail(
  edicaoId: string,
  categorias: string[],
) {
  const uniq = Array.from(new Set(categorias)).sort();
  const { error } = await supabase
    .from("nl_edicoes")
    .update({ categorias_ocultas_email: uniq })
    .eq("id", edicaoId);
  if (error) throw error;
}

/** Aplica a heurística `ajustarDescricao` a todas as notícias aprovadas da
 *  edição e marca `edicoes.descricoes_ajustadas_em`. Devolve o número de
 *  descrições efectivamente alteradas. */
export async function ajustarDescricoesEdicao(edicaoId: string): Promise<number> {
  const { ajustarDescricao } = await import("@/newsletter/lib/ajustar-descricao");
  const { data: rows, error } = await supabase
    .from("nl_noticias")
    .select("id, descricao")
    .eq("edicao_id", edicaoId)
    .eq("estado", "aprovada");
  if (error) throw error;
  let alteradas = 0;
  for (const n of rows ?? []) {
    const nova = ajustarDescricao(n.descricao);
    if (nova && nova !== (n.descricao ?? "")) {
      const { error: uE } = await supabase.from("nl_noticias").update({ descricao: nova }).eq("id", n.id);
      if (uE) throw uE;
      alteradas += 1;
    }
  }
  await supabase.from("nl_edicoes").update({ descricoes_ajustadas_em: new Date().toISOString() }).eq("id", edicaoId);
  return alteradas;
}


/**
 * Verifica, antes de gravar, se já existe uma notícia com o mesmo URL
 * (normalizado) ou com título muito parecido. Só informa — quem decide é o
 * editor.
 */
export async function verificarDuplicado(
  payload: { url: string; titulo: string; categoria: string },
): Promise<{ tipo: "url" | "titulo"; descricao: string } | null> {
  const { normalizarUrl } = await import("@/newsletter/edge-shared/ia-limpeza");
  const url = (payload.url ?? "").trim();
  if (url) {
    const { data } = await supabase
      .from("nl_noticias")
      .select("titulo, estado, edicao:edicoes(numero)")
      .eq("url_norm", normalizarUrl(url))
      .limit(1);
    const g = (data ?? [])[0] as { titulo: string; estado: string; edicao: { numero: number } | null } | undefined;
    if (g) {
      const onde = g.estado === "enviada"
        ? (g.edicao?.numero ? `já enviada na edição #${g.edicao.numero}` : "já enviada")
        : g.estado === "aprovada" ? "já aprovada nesta edição"
        : g.estado === "rejeitada" ? "já rejeitada" : "já em pendentes";
      return { tipo: "url", descricao: `Este link já existe: «${g.titulo}» — ${onde}.` };
    }
  }
  const titulo = (payload.titulo ?? "").trim();
  if (titulo.length >= 8) {
    const { data } = await supabase.rpc("nl_encontrar_candidatos_repeticao", {
      _titulo: titulo,
      _categoria: payload.categoria,
    });
    const m = (data ?? [])[0] as { titulo: string; edicao_numero: number | null; score: number } | undefined;
    if (m && typeof m.score === "number" && m.score >= 0.55) {
      return {
        tipo: "titulo",
        descricao: `Título muito parecido com «${m.titulo}»${m.edicao_numero ? ` (edição #${m.edicao_numero})` : ""}.`,
      };
    }
  }
  return null;
}

export async function adicionarManual(
  edicaoId: string,
  payload: { titulo: string; descricao: string; url: string; categoria: CatId },
  opts: { modo?: "pendente" | "aprovada" } = {},
) {
  const modo = opts.modo ?? "pendente";

  if (modo === "pendente") {
    const { error } = await supabase.from("nl_noticias").insert({
      edicao_id: null,
      titulo: payload.titulo,
      descricao: payload.descricao,
      url: payload.url || null,
      categoria: payload.categoria,
      origem: "manual",
      estado: "pendente",
      destino: "news",
      destaque: false,
    });
    if (error) throw error;
    return;
  }

  const { data: max } = await supabase
    .from("nl_noticias")
    .select("ordem")
    .eq("edicao_id", edicaoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = (max?.ordem ?? 0) + 1;

  const { error } = await supabase.from("nl_noticias").insert({
    edicao_id: edicaoId,
    titulo: payload.titulo,
    descricao: payload.descricao,
    url: payload.url || null,
    categoria: payload.categoria,
    origem: "manual",
    estado: "aprovada",
    destino: "news",
    destaque: false,
    ordem,
  });
  if (error) throw error;
}


/* ─── Crónica ─── */

export async function atualizarCronica(
  edicaoId: string,
  patch: Partial<Pick<Cronica, "titulo" | "conteudo" | "conteudo_html" | "leituras_recomendadas" | "concluida">>,
) {
  if (!edicaoId) throw new Error("Crónica sem edição identificada — nada foi gravado.");
  const { data, error } = await supabase
    .from("nl_cronicas").update(patch).eq("edicao_id", edicaoId).select("id");
  if (error) throw error;
  if (data && data.length > 0) return;
  // Sem linha (ex.: após «Recomeçar edição»): criar a crónica. RLS continua a bloquear edições enviadas.
  const { data: criada, error: errIns } = await supabase
    .from("nl_cronicas").insert({ edicao_id: edicaoId, ...patch }).select("id");
  if (errIns || !criada || criada.length === 0) {
    throw new Error("A crónica não foi gravada (edição bloqueada ou inexistente).");
  }
}


export async function marcarCronicaConcluida(edicaoId: string, valor: boolean) {
  const { error } = await supabase
    .from("nl_cronicas")
    .update({ concluida: valor })
    .eq("edicao_id", edicaoId);
  if (error) throw error;
}

/* ─── Episódios ─── */

export async function listarEpisodios(): Promise<Episodio[]> {
  const { data, error } = await supabase
    .from("nl_episodios_podcast")
    .select("*")
    .order("data_publicacao", { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function sincronizarPodcastRss(): Promise<{ novos: number; total_feed?: number }> {
  const { data: sess } = await supabase.auth.getSession();
  const apikey = (supabase as unknown as { supabaseKey: string }).supabaseKey;
  const res = await fetch("/api/public/hooks/sincronizar-podcast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey,
      Authorization: `Bearer ${sess.session?.access_token ?? apikey}`,
    },
    body: "{}",
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; novos?: number; total_feed?: number; mensagem?: string };
  if (!res.ok || json.ok === false) {
    throw new Error(json.mensagem ?? `Erro ${res.status}`);
  }
  return { novos: json.novos ?? 0, total_feed: json.total_feed };
}

/* ─── Configurações (chave/valor) ─── */

export async function getConfig(chave: string): Promise<string> {
  const { data, error } = await supabase
    .from("nl_configuracoes").select("valor").eq("chave", chave).maybeSingle();
  if (error) throw error;
  return data?.valor ?? "";
}

export async function setConfig(chave: string, valor: string): Promise<void> {
  const { error } = await supabase
    .from("nl_configuracoes")
    .upsert({ chave, valor }, { onConflict: "chave" });
  if (error) throw error;
}

export interface ListaEgoi {
  id: string;
  nome: string;
  egoi_lista_id: string;
  tipo: "teste" | "real";
  activa: boolean;
  ordem: number;
}

export async function listarListasEgoi(): Promise<ListaEgoi[]> {
  const { data, error } = await supabase
    .from("nl_egoi_listas")
    .select("id, nome, egoi_lista_id, tipo, activa, ordem")
    .order("tipo", { ascending: true })
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ListaEgoi[];
}

export async function criarListaEgoi(v: { nome: string; egoi_lista_id: string; tipo: "teste" | "real"; activa?: boolean; ordem?: number }): Promise<ListaEgoi> {
  const { data, error } = await supabase
    .from("nl_egoi_listas")
    .insert({ nome: v.nome, egoi_lista_id: v.egoi_lista_id, tipo: v.tipo, activa: v.activa ?? true, ordem: v.ordem ?? 0 })
    .select("id, nome, egoi_lista_id, tipo, activa, ordem")
    .single();
  if (error) throw error;
  return data as ListaEgoi;
}

export async function actualizarListaEgoi(id: string, campos: Partial<Pick<ListaEgoi, "nome" | "egoi_lista_id" | "tipo" | "activa" | "ordem">>): Promise<void> {
  const { error } = await supabase.from("nl_egoi_listas").update(campos).eq("id", id);
  if (error) throw error;
}

export async function apagarListaEgoi(id: string): Promise<void> {
  const { error } = await supabase.from("nl_egoi_listas").delete().eq("id", id);
  if (error) throw error;
}



/* ─── Fontes ─── */

export async function listarFontes(): Promise<Fonte[]> {
  const { data, error } = await supabase
    .from("nl_fontes_curadoria")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function criarFonte(
  nome: string,
  url_feed: string,
  extras: { tipo?: "rss" | "html" | "newsletter"; url_listagem?: string; remetente_email?: string } = {},
) {
  const tipo = extras.tipo ?? "rss";
  if (tipo === "newsletter") {
    const email = (extras.remetente_email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Email do remetente inválido");
    const dominio = email.split("@")[1] ?? null;
    const { error } = await supabase.from("nl_fontes_curadoria").insert({
      nome,
      url_feed: `mailto:${email}`,
      activa: true,
      tipo: "newsletter",
      url_listagem: null,
      remetente_email: email,
      remetente_dominio: dominio,
    } as never);
    if (error) throw error;
    return;
  }
  const payload = {
    nome,
    url_feed: tipo === "html" ? (extras.url_listagem ?? url_feed) : url_feed,
    activa: true,
    tipo,
    url_listagem: tipo === "html" ? (extras.url_listagem ?? url_feed) : null,
  };
  const { error } = await supabase.from("nl_fontes_curadoria").insert(payload as never);
  if (error) throw error;
}

export async function alternarFonteActiva(id: string, activa: boolean) {
  const { error } = await supabase.from("nl_fontes_curadoria").update({ activa }).eq("id", id);
  if (error) throw error;
}

export async function apagarFonte(id: string) {
  const { error } = await supabase.from("nl_fontes_curadoria").delete().eq("id", id);
  if (error) throw error;
}

export async function actualizarFocaFerramentas(id: string, foca: boolean) {
  const { error } = await supabase
    .from("nl_fontes_curadoria")
    .update({ foca_ferramentas: foca } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function actualizarFonte(
  id: string,
  campos: { nome?: string; url_feed?: string; url_listagem?: string; tipo?: "rss" | "html" | "newsletter"; remetente_email?: string },
) {
  const { error } = await supabase.from("nl_fontes_curadoria").update(campos as never).eq("id", id);
  if (error) throw error;
}

/** Estatísticas 30 d por fonte (sugeridas + aprovadas). */
export async function listarEstatisticasFontes(): Promise<Record<string, { sugeridas: number; aprovadas: number }>> {
  const { data, error } = await supabase.rpc("nl_stats_fontes_30d");
  if (error) throw error;
  const map: Record<string, { sugeridas: number; aprovadas: number }> = {};
  for (const r of data ?? []) {
    const row = r as { fonte_id: string | null; sugeridas_30d: number | null; aprovadas_30d: number | null };
    if (!row.fonte_id) continue;
    map[row.fonte_id] = {
      sugeridas: Number(row.sugeridas_30d ?? 0),
      aprovadas: Number(row.aprovadas_30d ?? 0),
    };
  }
  return map;
}

/** Configuração do motor de curadoria (linha única, id=1). */
export type CuradoriaConfig = {
  max_insercoes_por_corrida: number;
  janela_horas: number;
  max_por_email: number;
  max_por_dia: number;
  max_por_dia_email: number;
  max_por_fonte: number;
  max_por_categoria: number;
};

export async function getCuradoriaConfig(): Promise<CuradoriaConfig> {
  const { data, error } = await supabase
    .from("nl_curadoria_config")
    .select("max_insercoes_por_corrida, janela_horas, max_por_email, max_por_dia, max_por_dia_email, max_por_fonte, max_por_categoria" as never)
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  const d = (data ?? {}) as Record<string, number | null>;
  return {
    max_insercoes_por_corrida: d["max_insercoes_por_corrida"] ?? 15,
    janela_horas: d["janela_horas"] ?? 24,
    max_por_email: d["max_por_email"] ?? 4,
    max_por_dia: d["max_por_dia"] ?? 25,
    max_por_dia_email: d["max_por_dia_email"] ?? 15,
    max_por_fonte: d["max_por_fonte"] ?? 2,
    max_por_categoria: d["max_por_categoria"] ?? 3,
  };
}

export async function setCuradoriaMax(max: number) {
  const clamp = Math.max(1, Math.min(100, Math.round(max)));
  const { error } = await supabase
    .from("nl_curadoria_config")
    .update({ max_insercoes_por_corrida: clamp })
    .eq("id", 1);
  if (error) throw error;
}

/** Actualiza qualquer um dos tectos configuráveis (valores já validados aqui). */
export async function setCuradoriaTecto(
  campo: "max_por_email" | "max_por_dia" | "max_por_dia_email" | "max_por_fonte" | "max_por_categoria",
  valor: number,
) {
  const limites: Record<string, [number, number]> = {
    max_por_email: [1, 20],
    max_por_dia: [1, 200],
    max_por_dia_email: [1, 200],
    max_por_fonte: [1, 10],
    max_por_categoria: [1, 15],
  };
  const [min, max] = limites[campo]!;
  const clamp = Math.max(min, Math.min(max, Math.round(valor)));
  const { error } = await supabase
    .from("nl_curadoria_config")
    .update({ [campo]: clamp } as never)
    .eq("id", 1);
  if (error) throw error;
}

export type ResumoCorrida = {
  quando: string;
  inseridas: number;
  tecto: number;
  vagas_dia: number | null;
  motivo_zero: string | null;
  por_fonte: Record<string, number>;
};

/** Último resumo real da curadoria automática, para mostrar no cartão de fontes. */
export async function getUltimaCorridaCuradoria(): Promise<ResumoCorrida | null> {
  const { data } = await supabase
    .from("nl_audit_log")
    .select("accao, detalhe, criado_em")
    .ilike("accao", "Curadoria automática%")
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const d = (data.detalhe ?? {}) as Record<string, unknown>;
  const motivo = d["motivo_zero"];
  return {
    quando: data.criado_em,
    inseridas: Number(d["inseridas"] ?? 0),
    tecto: Number(d["tecto"] ?? 0),
    vagas_dia: d["vagas_dia"] === undefined ? null : Number(d["vagas_dia"]),
    motivo_zero: typeof motivo === "string" ? motivo : null,
    por_fonte: (d["distribuicao_por_fonte"] as Record<string, number>) ?? {},
  };
}


/**
 * Devolve, para cada fonte_id, quantas notícias com origem 'curadoria_ia'
 * foram criadas nos últimos 30 dias.
 */
export async function contarNoticiasPorFonte30d(): Promise<Record<string, number>> {
  const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("nl_noticias")
    .select("fonte_id")
    .eq("origem", "curadoria_ia")
    .gte("created_at", desde)
    .not("fonte_id", "is", null);
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { fonte_id: string | null }).fonte_id;
    if (!id) continue;
    map[id] = (map[id] ?? 0) + 1;
  }
  return map;
}

/** IDs de notícias pendentes com mais de `diasMin` dias. */
export async function idsPendentesAntigas(diasMin: number): Promise<string[]> {
  const limite = new Date(Date.now() - diasMin * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("nl_noticias")
    .select("id")
    .eq("estado", "pendente")
    .lt("created_at", limite);
  if (error) throw error;
  return (data ?? []).map((r) => r.id);
}

export async function rejeitarNoticiasEmMassa(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("nl_noticias")
    .update({ estado: "rejeitada" })
    .in("id", ids);
  if (error) throw error;
}

/** Apaga definitivamente notícias (usado na limpeza de pendentes antigas). */
export async function apagarNoticiasEmMassa(ids: string[]) {
  if (ids.length === 0) return;
  // Em lotes para não estourar o tamanho do pedido.
  for (let i = 0; i < ids.length; i += 200) {
    const lote = ids.slice(i, i + 200);
    const { error } = await supabase.from("nl_noticias").delete().in("id", lote);
    if (error) throw error;
  }
}

export type ContagemDadosAntigos = { dias: number; noticias: number; fila: number; emails: number };

/** Quantos registos com mais de `dias` dias seriam apagados pela retenção. */
export async function contarDadosAntigos(dias = 30): Promise<ContagemDadosAntigos> {
  const { data, error } = await supabase.rpc("nl_contar_dados_antigos", { _dias: dias });
  if (error) throw error;
  return data as unknown as ContagemDadosAntigos;
}

/** Corre a limpeza de retenção (apenas admin). */
export async function limparDadosAntigos(dias = 30): Promise<ContagemDadosAntigos> {
  const { data, error } = await supabase.rpc("nl_limpar_dados_antigos", { _dias: dias });
  if (error) throw error;
  return data as unknown as ContagemDadosAntigos;
}

/* ─── Arquivo: crónicas e notícias históricas ─── */

export type CronicaArquivo = {
  id: string;
  titulo: string | null;
  conteudo: string | null;
  conteudo_html: string | null;
  leituras_recomendadas: string | null;
  edicao: { id: string; numero: number; enviada_em: string | null; assunto: string | null } | null;
};

export async function listarCronicasEnviadas(): Promise<CronicaArquivo[]> {
  const { data, error } = await supabase
    .from("nl_cronicas")
    .select("id, titulo, conteudo, conteudo_html, leituras_recomendadas, edicao:edicoes!inner(id, numero, enviada_em, assunto, estado)")
    .eq("edicao.estado", "enviada")
    .order("enviada_em", { foreignTable: "edicoes", ascending: false, nullsFirst: false });
  if (error) throw error;
  type Raw = { id: string; titulo: string | null; conteudo: string | null; conteudo_html: string | null; leituras_recomendadas: string | null; edicao: { id: string; numero: number; enviada_em: string | null; assunto: string | null } | { id: string; numero: number; enviada_em: string | null; assunto: string | null }[] | null };
  return ((data ?? []) as Raw[]).map((r) => ({
    id: r.id,
    titulo: r.titulo,
    conteudo: r.conteudo,
    conteudo_html: r.conteudo_html,
    leituras_recomendadas: r.leituras_recomendadas,
    edicao: Array.isArray(r.edicao) ? (r.edicao[0] ?? null) : (r.edicao ?? null),
  }));
}

export type NoticiaArquivo = Noticia & {
  edicao?: { numero: number | null; enviada_em: string | null } | null;
};

export async function listarNoticiasArquivo(estado: "enviada" | "rejeitada"): Promise<NoticiaArquivo[]> {
  const { data, error } = await supabase
    .from("nl_noticias")
    .select("*, edicao:edicoes(numero, enviada_em)")
    .eq("estado", estado)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as NoticiaArquivo[];
}

export async function recuperarNoticiaRejeitada(id: string) {
  const { error } = await supabase
    .from("nl_noticias")
    .update({ estado: "pendente", edicao_id: null })
    .eq("id", id);
  if (error) throw error;
}



/* ─── Audit ─── */

export async function registarAudit(quem: string, accao: string, detalhe?: unknown) {
  const { error } = await supabase
    .from("nl_audit_log")
    .insert({ quem, accao, detalhe: (detalhe ?? null) as never });
  if (error) console.warn("audit_log insert falhou", error);
}

export async function listarAuditRecente(limit = 8): Promise<Audit[]> {
  const { data, error } = await supabase
    .from("nl_audit_log")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/* ─── Secções da edição ─── */

export async function listarSeccoes(edicaoId: string): Promise<SeccaoRow[]> {
  const { data, error } = await supabase
    .from("nl_secoes_edicao")
    .select("*")
    .eq("edicao_id", edicaoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function garantirSeccoesPadrao(edicaoId: string) {
  const { error } = await supabase.rpc("nl_criar_seccoes_padrao", { _edicao_id: edicaoId });
  if (error) throw error;
}


export async function reordenarSeccoes(edicaoId: string, ids: string[]) {
  const { error } = await supabase.rpc("nl_reordenar_seccoes", { _edicao_id: edicaoId, _ids: ids });
  if (error) throw error;
}

export async function moverSeccao(seccaoId: string, direccao: "cima" | "baixo") {
  const { error } = await supabase.rpc("nl_mover_seccao", { _seccao_id: seccaoId, _direccao: direccao });
  if (error) throw error;
}

export async function reordenarNoticias(edicaoId: string, ids: string[]) {
  const { error } = await supabase.rpc("nl_reordenar_noticias", { _edicao_id: edicaoId, _ids: ids });
  if (error) throw error;
}

export async function alternarSeccaoActiva(id: string, activo: boolean) {
  const { error } = await supabase.from("nl_secoes_edicao").update({ activo }).eq("id", id);
  if (error) throw error;
}

export interface CamposSeccaoPersonalizada {
  titulo: string;
  texto: string;
  cor: SeccaoCor;
  texto_botao?: string | null;
  url_botao?: string | null;
}

export async function criarSeccaoPersonalizada(edicaoId: string, campos: CamposSeccaoPersonalizada) {
  const { data: max } = await supabase
    .from("nl_secoes_edicao")
    .select("ordem")
    .eq("edicao_id", edicaoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordem = (max?.ordem ?? 0) + 1;
  const { data, error } = await supabase
    .from("nl_secoes_edicao")
    .insert({
      edicao_id: edicaoId,
      tipo: "personalizada",
      ordem,
      activo: true,
      titulo: campos.titulo,
      texto: campos.texto,
      cor: campos.cor,
      texto_botao: campos.texto_botao ?? null,
      url_botao: campos.url_botao ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function actualizarSeccaoPersonalizada(
  id: string,
  campos: Partial<CamposSeccaoPersonalizada>,
) {
  const { error } = await supabase
    .from("nl_secoes_edicao")
    .update({
      ...(campos.titulo !== undefined ? { titulo: campos.titulo } : {}),
      ...(campos.texto !== undefined ? { texto: campos.texto } : {}),
      ...(campos.cor !== undefined ? { cor: campos.cor } : {}),
      ...(campos.texto_botao !== undefined ? { texto_botao: campos.texto_botao } : {}),
      ...(campos.url_botao !== undefined ? { url_botao: campos.url_botao } : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function removerSeccaoPersonalizada(id: string) {
  const { error } = await supabase.from("nl_secoes_edicao").delete().eq("id", id);
  if (error) throw error;
}

/* ─── Ferramenta da semana ─── */

export async function listarFerramentas(edicaoId: string): Promise<Ferramenta[]> {
  const { data, error } = await supabase
    .from("nl_ferramentas_semana")
    .select("*")
    .eq("edicao_id", edicaoId)
    .order("posicao", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function criarFerramenta(edicaoId: string, posicao: 1 | 2): Promise<string> {
  const { data, error } = await supabase
    .from("nl_ferramentas_semana")
    .insert({
      edicao_id: edicaoId,
      posicao,
      nome: "",
      descricao: "",
      url: "",
      emoji: "",
      cor: "indigo",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export type FerramentaPatch = Partial<
  Pick<Ferramenta, "nome" | "descricao" | "url" | "emoji" | "cor" | "posicao" | "etiqueta" | "cta_rotulo">
>;

export async function actualizarFerramenta(id: string, patch: FerramentaPatch) {
  const { error } = await supabase
    .from("nl_ferramentas_semana")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function removerFerramenta(id: string, edicaoId: string) {
  // Apagar a posição pedida
  const { error: e1 } = await supabase
    .from("nl_ferramentas_semana")
    .delete()
    .eq("id", id);
  if (e1) throw e1;

  // Se sobrar uma na posição 2, promover para posição 1 (evita lacuna)
  const { data: restantes, error: e2 } = await supabase
    .from("nl_ferramentas_semana")
    .select("id, posicao")
    .eq("edicao_id", edicaoId)
    .order("posicao", { ascending: true });
  if (e2) throw e2;
  if ((restantes?.length ?? 0) === 1 && restantes![0].posicao === 2) {
    await supabase
      .from("nl_ferramentas_semana")
      .update({ posicao: 1 })
      .eq("id", restantes![0].id);
  }
}

/**
 * Ensures there is a draft after the last sent edition. Re-checks before
 * creating to avoid duplicates. Returns the new edition number, or null when
 * a valid draft already exists.
 */
export async function garantirEdicaoSeguinte(): Promise<{ criada: number; anterior: number } | null> {
  const ultima = await numeroUltimaEnviada();
  if (ultima === 0) return null;
  const { data, error } = await supabase
    .from("nl_edicoes")
    .select("id")
    .eq("estado", "rascunho")
    .gt("numero", ultima)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return null;
  await criarEdicaoDaSemana("revista");
  return { criada: ultima + 1, anterior: ultima };
}
