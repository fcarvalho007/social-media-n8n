// Pipeline unificado de extração de conteúdo de emails de newsletters.
// Usado pelo webhook CloudMailin e pelo botão "Reprocessar" no editor.
//
// v2: usa `segmentador-email.ts` para produzir blocos TIPADOS, aplica um
// handler dedicado a cada tipo (destaque/breve/ferramenta/link_roundup),
// ignora patrocínios/tutoriais, e devolve um breakdown detalhado.

import {
  limparHtmlNewsletter,
  limparLinhasWhatsApp,
  mapCategoria,
  normalizarUrl,
  dedupPorUrl,
} from "./ia-limpeza.ts";
import { procurarDuplicadosUrl, descreverGemea } from "./dedup-url.ts";
import { motivoTituloLixo, descreverMotivoLixo } from "./ruido-titulo.ts";
import { chaveTitulo, semelhancaTitulos } from "./seleccao-diversa.ts";
import { lerTectos, vagasDiarias, limitarPorCategoria } from "./tectos-curadoria.ts";

import { LIMIAR_REPETICAO_CERTA } from "./deteccao-repeticao.ts";
import { ehLinkRastreio, resolverUrlFinal, resolverFonteArtigo, type FonteEstado } from "./resolver-url.ts";
import { segmentar, priorizar, type BlocoSegmentado } from "./segmentador-email.ts";
import { PROMPT_FERRAMENTA, PROMPT_LINK_ROUNDUP } from "./prompts-extraccao.ts";

type SupabaseAdmin = {
  from: (t: string) => {
    // deno-lint-ignore no-explicit-any
    select: (c: string) => any;
    // deno-lint-ignore no-explicit-any
    insert: (v: unknown) => any;
    // deno-lint-ignore no-explicit-any
    update: (v: unknown) => any;
    // deno-lint-ignore no-explicit-any
    delete: () => any;
  };
};

// deno-lint-ignore no-explicit-any
type ChamarIaExtrator = (
  bloco: string,
  urlManual: string | undefined,
  corpoArtigo?: string,
  // deno-lint-ignore no-explicit-any
) => Promise<{ resultado: any | null }>;

export type MetaEmail = {
  html: string | null;
  plain: string | null;
  assunto: string;
  remetenteLabel: string;
  remetenteEmail: string | null;
  emailRecebidoId: string | null;
};

export type Formato = "curadoria" | "ensaio" | "misto" | "estruturado";

export type MotivoSemResultado =
  | "fonte_inactiva"
  | "sem_html"
  | "sem_blocos"
  | "tudo_duplicado"
  | "ia_sem_resultado"
  | null;

export type ClassificacaoDetalhe = {
  destaques: number;
  breves: number;
  ferramentas: number;
  links: number;
  patrocinios_ignorados: number;
  tutoriais_ignorados: number;
  blocos_total: number;
  budget_ia: number;
  chamadas_ia: number;
  duplicados: number;
  /** Entradas bloqueadas por título praticamente igual a notícia já existente. */
  bloqueadas_repeticao?: number;
  /** Entradas válidas que ficaram de fora por causa do tecto por email/dia. */
  cortadas_por_tecto?: number;
  tecto_email?: number;
  vagas_dia?: number;
  duplicados_detalhe: Array<{ titulo: string; url: string; gemea: string }>;

  descartados: Array<{ titulo: string; motivo: string }>;
  truncado_por_tempo?: boolean;
  motivo_sem_resultado: MotivoSemResultado;
  fonte_id: string | null;
  fonte_nome: string | null;
  processado_em: string;
};

export type ResultadoPipeline = {
  formato: Formato;
  candidatos: number;
  noticias_inseridas: number;
  ferramentas_inseridas: number;
  duplicadas: number;
  erros: number;
  usou_fallback: boolean;
  url_canonico: string | null;
  motivo_sem_resultado: MotivoSemResultado;
  detalhe: ClassificacaoDetalhe;
};

export type OpcoesPipeline = {
  /** Ignora `fontes_curadoria.activa` — usado pelo reprocessamento manual de admin. */
  forcar?: boolean;
};

/** Acima deste valor de similaridade de título tratamos como possível repetição. */
export const LIMIAR_TITULO_PARECIDO = 0.55;

function detalheVazio(): ClassificacaoDetalhe {
  return {
    destaques: 0, breves: 0, ferramentas: 0, links: 0,
    patrocinios_ignorados: 0, tutoriais_ignorados: 0,
    blocos_total: 0, budget_ia: BUDGET_IA_POR_EMAIL, chamadas_ia: 0,
    duplicados: 0, duplicados_detalhe: [], descartados: [], truncado_por_tempo: false,
    motivo_sem_resultado: null,
    fonte_id: null, fonte_nome: null,
    processado_em: new Date().toISOString(),
  };
}

// Partes locais genéricas que dão nomes de fonte inúteis ("mail", "hello", …).
const LOCAIS_GENERICOS = new Set([
  "mail", "email", "e-mail", "hello", "hi", "news", "newsletter", "info",
  "noreply", "no-reply", "donotreply", "do-not-reply", "contact", "team",
  "support", "updates", "notifications", "digest", "daily", "weekly",
]);

function nomeLegivelDominio(dominio: string): string {
  const base = dominio.replace(/^(mail|email|news|smtp|send|link|e)\./i, "");
  const raiz = base.split(".")[0] ?? base;
  return raiz.charAt(0).toUpperCase() + raiz.slice(1);
}

/** Deriva um nome apresentável para a fonte a partir do label e do endereço. */
export function derivarNomeFonte(remetenteLabel: string | null, emailLower: string): string {
  const limpo = (remetenteLabel ?? "").replace(/\s*<[^>]+>\s*$/, "").trim();
  const local = (emailLower.split("@")[0] ?? "").toLowerCase();
  const dominio = emailLower.split("@")[1] ?? "";
  if (limpo && limpo.toLowerCase() !== emailLower && !LOCAIS_GENERICOS.has(limpo.toLowerCase())) {
    return limpo;
  }
  if (local && !LOCAIS_GENERICOS.has(local)) {
    return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return dominio ? nomeLegivelDominio(dominio) : (local || "Fonte");
}


// Máximo de chamadas ao DeepSeek por email (segurança de custo).
const BUDGET_IA_POR_EMAIL = 25;

// Chamadas de IA em paralelo por lote e tecto de tempo para a fase de
// extracção — o pedido do webhook tem de terminar dentro do seu limite.
const CONCORRENCIA_IA = 6;
const LIMITE_MS_EXTRACCAO = 45_000;

// ---------- Helpers de HTML herdados ----------

const REGEX_LINK_UTIL = /<a\s+[^>]*href=["'](https?:\/\/[^"'#\s]+)["'][^>]*>/gi;
const PADROES_LIXO = /(unsubscribe|opt-?out|preferences|update.profile|privacy|terms|beehiiv\.com\/subscribe|list-manage|utm_medium=email&utm_source=footer|facebook\.com|twitter\.com|x\.com\/|linkedin\.com|instagram\.com|youtube\.com\/channel|tiktok\.com|mailto:|\.png|\.jpg|\.gif|beacon|track|open\?)/i;

function extrairUrlsExternos(html: string, dominioRemetente: string | null): string[] {
  const urls: string[] = [];
  const vistos = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(REGEX_LINK_UTIL);
  while ((match = re.exec(html)) !== null) {
    const url = match[1];
    if (PADROES_LIXO.test(url)) continue;
    if (dominioRemetente && url.toLowerCase().includes(dominioRemetente)) continue;
    const norm = normalizarUrl(url);
    if (vistos.has(norm)) continue;
    vistos.add(norm);
    urls.push(url);
  }
  return urls;
}

function extrairCanonico(html: string | null, remetenteEmail: string | null): string | null {
  if (!html) return null;
  const canonMatch = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  if (canonMatch) return canonMatch[1];
  const inicio = html.slice(0, Math.floor(html.length * 0.6));
  const dominio = remetenteEmail ? (remetenteEmail.split("@")[1] ?? "").toLowerCase() : null;
  const urls = extrairUrlsExternos(inicio, dominio);
  return urls[0] ?? null;
}

// ---------- Extractores por tipo ----------

async function extrairFerramenta(
  bloco: BlocoSegmentado,
  chamarDeepSeek: (sistema: string, user: string) => Promise<string | null>,
): Promise<{ nome: string; url: string; descricao: string; categoria: string } | null> {
  const conteudo = `Bloco:\n${bloco.corpo}\n\nurl_sugerido: ${bloco.url ?? ""}`;
  const raw = await chamarDeepSeek(PROMPT_FERRAMENTA, conteudo);
  if (!raw) return null;
  try {
    const j = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    const nome = typeof j.nome === "string" ? j.nome.trim() : "";
    const url = typeof j.url === "string" && /^https?:\/\//i.test(j.url)
      ? j.url
      : (bloco.url && /^https?:\/\//i.test(bloco.url) ? bloco.url : "");
    const descricao = typeof j.descricao === "string" ? j.descricao.trim() : "";
    const categoria = typeof j.categoria === "string" ? j.categoria.trim() : "Outro";
    if (!nome || !url) return null;
    return { nome: nome.slice(0, 120), url, descricao: descricao.slice(0, 200), categoria };
  } catch {
    return null;
  }
}

async function extrairLinkRoundup(
  bloco: BlocoSegmentado,
  chamarDeepSeek: (sistema: string, user: string) => Promise<string | null>,
): Promise<{ titulo: string; descricao: string; url: string; categoria: string } | null> {
  if (!bloco.url) return null;
  const raw = await chamarDeepSeek(PROMPT_LINK_ROUNDUP, `Bloco:\n${bloco.corpo}\n\nurl: ${bloco.url}`);
  if (!raw) return null;
  try {
    const j = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    const titulo = typeof j.titulo === "string" ? j.titulo.trim() : "";
    const descricao = typeof j.descricao === "string" ? j.descricao.trim() : "";
    const categoria = typeof j.categoria === "string" ? j.categoria.trim() : "";
    if (!titulo) return null;
    return {
      titulo: titulo.slice(0, 200),
      descricao: descricao.slice(0, 300),
      url: bloco.url,
      categoria: mapCategoria(categoria),
    };
  } catch {
    return null;
  }
}

// ---------- Pipeline ----------

export async function processarEmailComPipeline(
  supabaseAdmin: SupabaseAdmin,
  meta: MetaEmail,
  deps: {
    chamarIaExtrator: ChamarIaExtrator;
    chamarDeepSeek: (sistema: string, user: string) => Promise<string | null>;
    /**
     * Opcional: lê o texto do artigo original para a IA ter material próprio.
     * Nunca lança — devolve "" quando não é possível.
     */
    lerCorpoArtigo?: (url: string) => Promise<string>;
    /**
     * Opcional: reescreve a descrição quando esta se limita a repetir o
     * título. Recebe o material do email como contexto factual.
     */
    corrigirDescricao?: (
      args: { titulo: string; descricao: string; corpo?: string },
    ) => Promise<string>;
  },

  opcoes: OpcoesPipeline = {},
): Promise<ResultadoPipeline> {
  // 0) Verificar fonte activa
  const emailLower = meta.remetenteEmail ? meta.remetenteEmail.toLowerCase() : null;
  let fonteId: string | null = null;
  let fonteNome: string | null = null;
  let fonteExiste = false;

  /** Grava sempre o breakdown no email — nunca falhar em silêncio. */
  const gravarDetalhe = async (d: ClassificacaoDetalhe) => {
    if (!meta.emailRecebidoId) return;
    // deno-lint-ignore no-explicit-any
    await (supabaseAdmin as any)
      .from("nl_emails_recebidos")
      .update({ classificacao_detalhe: d })
      .eq("id", meta.emailRecebidoId);
  };

  if (emailLower) {
    // deno-lint-ignore no-explicit-any
    const { data: fRow } = await (supabaseAdmin as any)
      .from("nl_fontes_curadoria")
      .select("id, activa, nome")
      .eq("tipo", "newsletter")
      .eq("remetente_email", emailLower)
      .maybeSingle();
    if (fRow) {
      fonteExiste = true;
      fonteId = fRow.id;
      fonteNome = fRow.nome ?? null;
      if (!fRow.activa && !opcoes.forcar) {
        const d: ClassificacaoDetalhe = {
          ...detalheVazio(),
          motivo_sem_resultado: "fonte_inactiva",
          fonte_id: fonteId,
          fonte_nome: fonteNome,
        };
        await gravarDetalhe(d);
        // deno-lint-ignore no-explicit-any
        await (supabaseAdmin as any).from("nl_audit_log").insert({
          quem: "sistema · pipeline",
          accao: "email_ignorado_fonte_inactiva",
          detalhe: {
            email_recebido_id: meta.emailRecebidoId,
            remetente: emailLower,
            fonte_id: fonteId,
            fonte_nome: fonteNome,
            assunto: meta.assunto ?? null,
          },
        });
        return {
          formato: "estruturado", candidatos: 0, noticias_inseridas: 0,
          ferramentas_inseridas: 0, duplicadas: 0, erros: 0, usou_fallback: false, url_canonico: null,
          motivo_sem_resultado: "fonte_inactiva",
          detalhe: d,
        };
      }
    }
  }

  const urlCanonico = extrairCanonico(meta.html, meta.remetenteEmail);

  // 1) Segmentar (só se houver HTML). Sem HTML, cai no fluxo antigo simples.
  const blocosCru = meta.html ? segmentar(meta.html) : [];
  const blocos = priorizar(blocosCru);

  const detalhe: ClassificacaoDetalhe = {
    ...detalheVazio(),
    destaques: blocos.filter((b) => b.tipo === "destaque").length,
    breves: blocos.filter((b) => b.tipo === "breve").length,
    ferramentas: blocos.filter((b) => b.tipo === "ferramenta_bullet").length,
    links: blocos.filter((b) => b.tipo === "link_roundup").length,
    patrocinios_ignorados: blocos.filter((b) => b.tipo === "patrocinio").length,
    tutoriais_ignorados: blocos.filter((b) => b.tipo === "tutorial").length,
    blocos_total: blocos.length,
    fonte_id: fonteId,
    fonte_nome: fonteNome,
  };


  type Candidato = {
    titulo: string;
    descricao: string;
    url: string;
    categoria: string;
    corpoArtigo?: string;
  };

  // Leitura do artigo original: limitada por email para não esticar o tempo
  // de processamento nem multiplicar pedidos a sites terceiros.
  const BUDGET_LEITURAS_POR_EMAIL = 12;
  let leiturasFeitas = 0;
  const lerCorpo = async (url: string | null | undefined): Promise<string> => {
    if (!deps.lerCorpoArtigo || !url || !/^https?:\/\//i.test(url)) return "";
    if (leiturasFeitas >= BUDGET_LEITURAS_POR_EMAIL) return "";
    leiturasFeitas += 1;
    try {
      return (await deps.lerCorpoArtigo(url)) || "";
    } catch {
      return "";
    }
  };
  const candidatos: Candidato[] = [];
  const ferramentasCandidatas: { nome: string; url: string; descricao: string; categoria: string }[] = [];
  const titulosVistos = new Set<string>();
  const urlsVistos = new Set<string>();
  let erros = 0;
  let usouFallback = false;

  const normTitulo = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().slice(0, 60);

  // Rodapés administrativos, páginas institucionais e blocos de patrocínio:
  // a lista vive em `ruido-titulo.ts` e é partilhada com o RSS e a colagem.


  /** Similaridade simples por palavras (Jaccard) para apanhar o mesmo assunto. */
  function similaridade(a: string, b: string): number {
    const pa = new Set(a.split(" ").filter((w) => w.length > 3));
    const pb = new Set(b.split(" ").filter((w) => w.length > 3));
    if (pa.size === 0 || pb.size === 0) return 0;
    let comuns = 0;
    for (const w of pa) if (pb.has(w)) comuns++;
    return comuns / Math.min(pa.size, pb.size);
  }

  const descartados: Array<{ titulo: string; motivo: string }> = [];

  function adicionarCandidato(c: Candidato) {
    const nt = normTitulo(c.titulo);
    const nu = normalizarUrl(c.url);
    if (!c.titulo.trim()) return false;
    const motivoLixo = motivoTituloLixo(c.titulo, c.descricao, c.url);
    if (motivoLixo) {
      descartados.push({ titulo: c.titulo.slice(0, 90), motivo: descreverMotivoLixo(motivoLixo) });
      return false;
    }
    if (titulosVistos.has(nt) || urlsVistos.has(nu)) {
      descartados.push({ titulo: c.titulo.slice(0, 90), motivo: "repetido_no_email" });
      return false;
    }
    // Mesmo assunto escrito de outra maneira (índice do topo vs. artigo).
    for (const visto of titulosVistos) {
      if (similaridade(nt, visto) >= 0.7) {
        descartados.push({ titulo: c.titulo.slice(0, 90), motivo: "assunto_repetido_no_email" });
        return false;
      }
    }
    titulosVistos.add(nt);
    urlsVistos.add(nu);
    candidatos.push(c);
    return true;
  }

  // 2) Processar blocos em lotes concorrentes, com limite de tempo global.
  //    Sequencialmente, um email grande esgotava o tempo do pedido e perdia-se
  //    tudo; em lotes o trabalho cabe no pedido e o que já foi extraído fica.
  //    Numa retoma (email cortado por tempo numa corrida anterior), os blocos
  //    já convertidos em notícias são saltados para o trabalho avançar.
  const jaExtraidos = new Set<string>();
  if (meta.emailRecebidoId) {
    // deno-lint-ignore no-explicit-any
    const { data: jaLa } = await (supabaseAdmin as any)
      .from("nl_noticias")
      .select("url, fonte_url_original")
      .eq("email_recebido_id", meta.emailRecebidoId);
    for (const r of (jaLa ?? []) as Array<{ url: string | null; fonte_url_original: string | null }>) {
      if (r.url) jaExtraidos.add(normalizarUrl(r.url));
      if (r.fonte_url_original) jaExtraidos.add(normalizarUrl(r.fonte_url_original));
    }
  }

  const uteis = blocos.filter((b) =>
    b.tipo !== "patrocinio" && b.tipo !== "tutorial" && b.tipo !== "meta"
    && !(b.url && jaExtraidos.has(normalizarUrl(b.url))));
  const inicio = Date.now();
  const expirou = () => Date.now() - inicio > LIMITE_MS_EXTRACCAO;
  let truncadoPorTempo = false;

  type Extraido =
    | { kind: "ferramenta"; valor: { nome: string; url: string; descricao: string; categoria: string } }
    | { kind: "candidato"; valor: Candidato }
    | null;

  const processarBloco = async (b: BlocoSegmentado): Promise<Extraido> => {
    if (b.tipo === "ferramenta_bullet") {
      const ferr = await extrairFerramenta(b, deps.chamarDeepSeek);
      return ferr ? { kind: "ferramenta", valor: ferr } : null;
    }
    if (b.tipo === "link_roundup") {
      const r = await extrairLinkRoundup(b, deps.chamarDeepSeek);
      return r ? { kind: "candidato", valor: r } : null;
    }
    // destaque OU breve → extractor factual normal.
    // Lê primeiro o artigo original: sem material próprio, a descrição
    // limita-se a reescrever o título do email.
    const urlBloco = b.url ?? urlCanonico ?? undefined;
    const corpoArtigo = await lerCorpo(urlBloco);
    const { resultado } = await deps.chamarIaExtrator(b.corpo, urlBloco, corpoArtigo || undefined);
    if (!resultado) return null;
    const url = typeof resultado.url === "string" && /^https?:\/\//i.test(resultado.url)
      ? resultado.url
      : (b.url ?? "");
    const titulo = typeof resultado.titulo === "string" ? resultado.titulo.trim() : "";
    let descricao = typeof resultado.descricao === "string" ? resultado.descricao.trim() : "";
    if (!titulo || !url) return null;
    if (deps.corrigirDescricao) {
      try {
        descricao = await deps.corrigirDescricao({
          titulo,
          descricao,
          corpo: corpoArtigo || b.corpo,
        });
      } catch { /* mantém a descrição; fica assinalada no editor */ }
    }
    return {
      kind: "candidato",
      valor: {
        titulo: titulo.slice(0, 240),
        descricao,
        url,
        categoria: mapCategoria(resultado.categoria),
        corpoArtigo: corpoArtigo || undefined,
      },
    };


  };

  for (let i = 0; i < uteis.length; i += CONCORRENCIA_IA) {
    if (detalhe.chamadas_ia >= BUDGET_IA_POR_EMAIL) break;
    if (expirou()) { truncadoPorTempo = true; break; }
    const lote = uteis.slice(i, i + CONCORRENCIA_IA)
      .slice(0, Math.max(0, BUDGET_IA_POR_EMAIL - detalhe.chamadas_ia));
    if (lote.length === 0) break;
    detalhe.chamadas_ia += lote.length;
    const resultados = await Promise.all(
      lote.map((b) => processarBloco(b).catch(() => { erros++; return null as Extraido; })),
    );
    for (const r of resultados) {
      if (!r) continue;
      if (r.kind === "ferramenta") ferramentasCandidatas.push(r.valor);
      else adicionarCandidato(r.valor);
    }
  }
  detalhe.truncado_por_tempo = truncadoPorTempo;


  // 3) Fallback: sem HTML útil ou sem blocos → tenta corpo inteiro como 1 notícia
  const corpoLimpo = meta.html
    ? limparHtmlNewsletter(meta.html)
    : (meta.plain ? limparLinhasWhatsApp(meta.plain) : "");

  if (candidatos.length === 0 && ferramentasCandidatas.length === 0 && corpoLimpo.length >= 400) {
    usouFallback = true;
    const urlFallback = urlCanonico ?? "";
    try {
      detalhe.chamadas_ia++;
      const corpoArtigoFallback = await lerCorpo(urlFallback);
      const { resultado } = await deps.chamarIaExtrator(
        corpoLimpo.slice(0, 6000),
        urlFallback || undefined,
        corpoArtigoFallback || undefined,
      );
      if (resultado) {
        const url = typeof resultado.url === "string" && /^https?:\/\//i.test(resultado.url) ? resultado.url : urlFallback;
        const titulo = (typeof resultado.titulo === "string" ? resultado.titulo.trim() : "") || meta.assunto.slice(0, 200);
        let descricao = typeof resultado.descricao === "string" ? resultado.descricao.trim() : "";
        if (titulo && url) {
          if (deps.corrigirDescricao) {
            try {
              descricao = await deps.corrigirDescricao({
                titulo,
                descricao,
                corpo: corpoArtigoFallback || corpoLimpo.slice(0, 6000),
              });
            } catch { /* mantém a descrição */ }
          }
          adicionarCandidato({
            titulo: titulo.slice(0, 240),
            descricao,
            url,
            categoria: mapCategoria(resultado.categoria),
            corpoArtigo: corpoArtigoFallback || undefined,
          });
        }


      }
    } catch { /* noop */ }
  }

  // 3.5) Resolver links de rastreio (beehiiv, Substack, …) para o URL real.
  //      Sequencial e best-effort: nunca bloqueia a extracção.
  const urlsFinais = new Set<string>();
  const fonteInfo = new Map<string, { estado: FonteEstado; urlOriginal: string | null }>();
  for (const c of candidatos) {
    if (!c.url) continue;
    const r = await resolverFonteArtigo({ titulo: c.titulo, descricao: c.descricao, url: c.url });
    if (r.url && r.url !== c.url && !urlsFinais.has(normalizarUrl(r.url))) {
      c.url = r.url;
    }
    fonteInfo.set(c.url, { estado: r.estado, urlOriginal: r.urlOriginal });
    urlsFinais.add(normalizarUrl(c.url));
  }
  for (const f of ferramentasCandidatas) {
    if (!f.url || !ehLinkRastreio(f.url)) continue;
    f.url = await resolverUrlFinal(f.url);
  }

  // 4) Dedup contra a BD (por URL normalizado — ignora www/tracking)
  const urlsCand = Array.from(new Set(candidatos.map((c) => c.url)));
  const jaVistos = new Set<string>();
  const gemeasUrl = await procurarDuplicadosUrl(supabaseAdmin, urlsCand);
  for (const k of gemeasUrl.keys()) jaVistos.add(k);
  const duplicadosDetalhe = candidatos
    .filter((c) => c.url && gemeasUrl.has(normalizarUrl(c.url)))
    .slice(0, 10)
    .map((c) => ({ titulo: c.titulo, url: c.url, gemea: descreverGemea(gemeasUrl.get(normalizarUrl(c.url))!) }));
  const antes = candidatos.length;
  const semUrlRepetido = dedupPorUrl(candidatos, (c) => c.url, jaVistos);

  // Títulos praticamente iguais dentro do mesmo email/corrida.
  const titulosCorrida: string[] = [];
  const novos = semUrlRepetido.filter((c) => {
    const k = chaveTitulo(c.titulo);
    if (!k) return false;
    if (titulosCorrida.some((t) => t === k || semelhancaTitulos(t, k) >= 0.8)) return false;
    titulosCorrida.push(k);
    return true;
  });
  const duplicadas = antes - novos.length;

  // 4.5) Tectos: um email não pode ocupar a fila inteira, e o total diário de
  //      entradas automáticas é limitado pela configuração.
  const tectos = await lerTectos(supabaseAdmin);
  const vagasDia = await vagasDiarias(supabaseAdmin, tectos, "email");
  const tectoEfectivo = Math.min(tectos.maxPorEmail, vagasDia);
  const { mantidos: dentroDoTecto, cortados: foraDoTecto } = limitarPorCategoria(
    novos,
    (c) => c.categoria,
    tectoEfectivo,
    tectos.maxPorCategoria,
  );
  detalhe.cortadas_por_tecto = foraDoTecto.length;
  detalhe.tecto_email = tectoEfectivo;
  detalhe.vagas_dia = vagasDia;

  // 5) Inserir notícias
  //    Fase 1 de repetição (pg_trgm, grátis): título praticamente igual a algo
  //    já existente → não entra; parecido → entra marcado.
  let inseridasN = 0;
  let bloqueadasRepeticao = 0;
  for (const c of dentroDoTecto) {

    let repeticaoDe: string | null = null;
    let repeticaoScore: number | null = null;
    let repetida = false;
    try {
      // deno-lint-ignore no-explicit-any
      const { data: cands } = await (supabaseAdmin as any).rpc(
        "encontrar_candidatos_repeticao",
        { _titulo: c.titulo, _categoria: c.categoria },
      );
      const melhor = (cands ?? [])[0];
      if (melhor && typeof melhor.score === "number" && melhor.score >= LIMIAR_TITULO_PARECIDO) {
        repeticaoDe = melhor.id;
        repeticaoScore = melhor.score;
        if (melhor.score >= LIMIAR_REPETICAO_CERTA) repetida = true;
      }
    } catch { /* nunca bloqueia a inserção */ }
    if (repetida) { bloqueadasRepeticao += 1; continue; }


    // deno-lint-ignore no-explicit-any
    const { error } = await (supabaseAdmin as any).from("nl_noticias").insert({
      repeticao_de: repeticaoDe,
      repeticao_score: repeticaoScore,
      repeticao_verificada_em: new Date().toISOString(),
      titulo: c.titulo,
      descricao: c.descricao,
      url: c.url,
      categoria: c.categoria,
      origem: usouFallback ? "email_newsletter_fallback" : "email_newsletter",
      estado: "pendente",
      destino: "news",
      destaque: false,
      ordem: 0,
      edicao_id: null,
      email_remetente: meta.remetenteLabel,
      email_assunto: meta.assunto || null,
      email_recebido_id: meta.emailRecebidoId,
      fonte_id: fonteId,
      fonte_estado: fonteInfo.get(c.url)?.estado ?? "ok",
      fonte_url_original: fonteInfo.get(c.url)?.urlOriginal ?? null,
      corpo_artigo: c.corpoArtigo ?? null,
    });
    if (!error) inseridasN += 1;
  }

  // 6) Inserir ferramentas
  let inseridasF = 0;
  for (const f of ferramentasCandidatas) {
    // deno-lint-ignore no-explicit-any
    const { error } = await (supabaseAdmin as any).from("nl_ferramentas_sugeridas").insert({
      nome: f.nome,
      url: f.url,
      descricao: f.descricao,
      categoria: f.categoria,
      fonte_email_id: meta.emailRecebidoId,
      remetente: meta.remetenteLabel,
      assunto_origem: meta.assunto || null,
      estado: "pendente",
    });
    if (!error) inseridasF += 1;
  }

  // Actualizar "última recolha" na fonte
  if (fonteExiste && fonteId && (inseridasN > 0 || inseridasF > 0)) {
    // deno-lint-ignore no-explicit-any
    await (supabaseAdmin as any)
      .from("nl_fontes_curadoria")
      .update({ ultima_recolha: new Date().toISOString() })
      .eq("id", fonteId);
  }

  // 7) Autopopular fonte
  if (!fonteExiste && emailLower && (inseridasN > 0 || inseridasF > 0)) {
    const nomeRemetente = derivarNomeFonte(meta.remetenteLabel ?? null, emailLower);
    const dominio = emailLower.split("@")[1] ?? null;
    // deno-lint-ignore no-explicit-any
    const { data: novaF } = await (supabaseAdmin as any)
      .from("nl_fontes_curadoria")
      .insert({
        nome: nomeRemetente,
        url_feed: `mailto:${emailLower}`,
        activa: true,
        tipo: "newsletter",
        url_listagem: null,
        remetente_email: emailLower,
        remetente_dominio: dominio,
      })
      .select("id")
      .maybeSingle();
    if (novaF?.id) {
      fonteId = novaF.id;
      fonteNome = nomeRemetente;
      if (meta.emailRecebidoId) {
        // deno-lint-ignore no-explicit-any
        await (supabaseAdmin as any)
          .from("nl_noticias")
          .update({ fonte_id: fonteId })
          .eq("email_recebido_id", meta.emailRecebidoId)
          .is("fonte_id", null);
      }
    }
  }

  // 8) Motivo explícito quando não entrou nada — nunca falhar em silêncio.
  let motivo: MotivoSemResultado = null;
  if (inseridasN === 0 && inseridasF === 0) {
    if (!meta.html && !corpoLimpo) motivo = "sem_html";
    else if (blocos.length === 0) motivo = "sem_blocos";
    else if (antes > 0 && duplicadas === antes) motivo = "tudo_duplicado";
    else motivo = "ia_sem_resultado";
  }
  detalhe.duplicados = duplicadas + bloqueadasRepeticao;
  detalhe.bloqueadas_repeticao = bloqueadasRepeticao;
  detalhe.duplicados_detalhe = duplicadosDetalhe;
  detalhe.descartados = descartados.slice(0, 20);
  detalhe.motivo_sem_resultado = motivo;
  detalhe.fonte_id = fonteId;
  detalhe.fonte_nome = fonteNome;
  detalhe.processado_em = new Date().toISOString();

  // 9) Guardar breakdown no email
  await gravarDetalhe(detalhe);

  const formato: Formato = blocos.length === 0
    ? (corpoLimpo.length >= 600 ? "ensaio" : "curadoria")
    : "estruturado";

  return {
    formato,
    candidatos: antes,
    noticias_inseridas: inseridasN,
    ferramentas_inseridas: inseridasF,
    duplicadas,
    erros,
    usou_fallback: usouFallback,
    url_canonico: urlCanonico,
    motivo_sem_resultado: motivo,
    detalhe,
  };
}

