// Gera o HTML do email DIGITAL SPRINT — Opção C refinada.
//
// Regras visuais (referência canónica: opcao-C-refinada-edicao-220.html):
//   · Fundo #EEF1F5. Cartões brancos radius 14 com sombra 0 1px 3px rgba(15,23,42,.06).
//   · Space Grotesk em títulos/números; Inter no corpo. Sem fontes serifadas.
//   · Kicker uniforme "ícone + TEXTO" 13/700 #0F172A + subtítulo opcional #94A3B8.
//   · Podcast como cartão preto #18181B (identidade própria).
//   · Contadores/Livro/CTA final como cartões inteiros em gradiente com círculo 56.
//
// Este ficheiro é a ÚNICA fonte do HTML — o preview no editor é um iframe do
// resultado desta função (via preview-edicao) e o envio E-goi consome o mesmo
// output byte a byte.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CATEGORIAS, FONT_CORPO, FONT_TITULO } from "./design-tokens.ts";
import { ajustarDescricao, ajustarDescricaoDestaque } from "./ajustar-descricao.ts";
import { resolverDestinos } from "./resolver-destinos.ts";

/* ─── paleta ─── */
const BG_PAGINA = "#EEF1F5";
const BG_CARTAO = "#FFFFFF";
const INK       = "#0F172A";
const INK_MED   = "#334155";
const INK_SEC   = "#475569";
const TENUE     = "#94A3B8";
const TENUE_2   = "#B0B7C3";
const DIVISOR   = "#F1F5F9";
const PRIMARIA  = "#6366F1";
const SOMBRA    = "box-shadow:0 1px 3px rgba(15,23,42,0.06);";

/* Avatar do Frederico servido via CDN Lovable (URL absoluto para clientes de email). */
const AVATAR_URL = "https://newsletter-digital-sprint.lovable.app/__l5e/assets-v1/cadec3e2-5dd7-4a75-b8dc-14c0202c4200/frederico-avatar.jpg";

/* Gradientes rotativos para os medalhões numerados dos destaques. */
const MEDALHAO_GRADIENTES: string[] = [
  "linear-gradient(135deg,#6366F1,#8B5CF6)",
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#F59E0B,#F97316)",
];

const COR_PERSONALIZADA: Record<string, { borda: string; solid: string; pastel: string; gradiente: string }> = {
  indigo:   { borda: "#C7D2FE", solid: "#4F46E5", pastel: "#EEF2FF", gradiente: "linear-gradient(135deg,#6366F1,#8B5CF6)" },
  verde:    { borda: "#A7F3D0", solid: "#047857", pastel: "#ECFDF5", gradiente: "linear-gradient(135deg,#059669,#10B981)" },
  laranja:  { borda: "#FED7AA", solid: "#C2410C", pastel: "#FFF7ED", gradiente: "linear-gradient(135deg,#F59E0B,#F97316)" },
  cinzento: { borda: "#D1D5DB", solid: "#475569", pastel: "#F3F4F6", gradiente: "linear-gradient(135deg,#475569,#64748B)" },
};
const corPersonalizada = (c: string | null | undefined) => COR_PERSONALIZADA[c ?? "indigo"] ?? COR_PERSONALIZADA.indigo;


/* ─── utilitários ─── */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** Remove emoji/pontuação decorativa do início do título das notícias. */
function limparTitulo(s: string): string {
  const re = /^(?:[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u2300-\u23FF\u2B00-\u2BFF\uFE0F\u200D]+[\s\p{P}]*)+/u;
  return (s ?? "").replace(re, "").trimStart();
}
function fmtData(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}
function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}
function limparCronicaHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<p>/gi, `<p style="margin:14px 0 0 0;font-family:${FONT_CORPO};font-size:15px;line-height:1.7;color:${INK_MED};">`)
    .replace(/<a /gi, `<a style="color:${PRIMARIA};text-decoration:none;" `);
}
function textoParaHtmlBasico(t: string): string {
  return "<p>" + esc(t.trim()).replace(/\n+/g, "</p><p>") + "</p>";
}

/* ─── tipos + carregamento ─── */
export interface DadosEdicao {
  edicao: { id: string; numero: number; assunto: string | null; data_envio_prevista: string | null; bloco_consultoria?: BlocoConsultoria | null; wordpress_post_url?: string | null };
  cronica: { titulo: string | null; conteudo_html: string | null; conteudo: string | null; leituras_recomendadas: string | null } | null;
  episodio: { titulo: string; codigo: string | null; url: string | null } | null;
  noticias: Array<{
    id: string; titulo: string; descricao: string | null; url: string | null;
    categoria: string; destaque: boolean; destino: string; ordem: number; origem?: string | null;
  }>;
  seccoes: Array<{
    id: string; tipo: string; ordem: number; activo: boolean;
    titulo: string | null; texto: string | null;
    texto_botao: string | null; url_botao: string | null; cor: string | null;
  }>;
  ferramentas: Array<{
    posicao: number;
    nome: string | null; descricao: string | null; url: string | null;
    emoji: string | null; cor: string | null;
  }>;
  /** Total de notícias aprovadas na edição (independente do destino email/site). */
  totalAprovadas: number;
}
export interface CarregarOpts { incluirDestinoSite?: boolean }

export type BlocoConsultoria = {
  titulo: string;
  subtitulo: string;
  texto_botao: string;
  url_botao: string;
};
const CONSULTORIA_DEFAULT: BlocoConsultoria = {
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

export async function carregarDadosEdicao(edicaoId: string, opts: CarregarOpts = {}): Promise<DadosEdicao> {
  const sb: SupabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const [edRes, crRes, noRes, seRes, feRes] = await Promise.all([
    sb.from("nl_edicoes").select("id, numero, assunto, data_envio_prevista, episodio_podcast_id, bloco_consultoria, categorias_ocultas_email, wordpress_post_url").eq("id", edicaoId).single(),
    sb.from("nl_cronicas").select("titulo, conteudo_html, conteudo, leituras_recomendadas").eq("edicao_id", edicaoId).maybeSingle(),
    sb.from("nl_noticias").select("id, titulo, descricao, url, categoria, destaque, destino, override_destino, ordem, estado").eq("edicao_id", edicaoId).eq("estado", "aprovada").order("ordem", { ascending: true }),
    sb.from("nl_secoes_edicao").select("*").eq("edicao_id", edicaoId).eq("activo", true).order("ordem", { ascending: true }),
    sb.from("nl_ferramentas_semana").select("posicao, nome, descricao, url, emoji, cor").eq("edicao_id", edicaoId).order("posicao", { ascending: true }),
  ]);
  if (edRes.error) throw new Error("Edição não encontrada");

  let episodio: DadosEdicao["episodio"] = null;
  if (edRes.data.episodio_podcast_id) {
    const ep = await sb.from("nl_episodios_podcast").select("titulo, codigo, url").eq("id", edRes.data.episodio_podcast_id).maybeSingle();
    episodio = ep.data ?? null;
  }
  const todasAprovadas = noRes.data ?? [];

  // Aplica o mesmo resolver que o editor usa em cliente — evita depender de o
  // reconciliador ter escrito `noticias.destino`. Assim, pré-visualização e
  // botão do editor mostram sempre o mesmo estado.
  const catsOcultasRaw = (edRes.data as { categorias_ocultas_email?: unknown }).categorias_ocultas_email;
  const catsOcultas = new Set<string>(
    Array.isArray(catsOcultasRaw)
      ? (catsOcultasRaw as unknown[]).filter((v): v is string => typeof v === "string")
      : [],
  );
  const entradas = todasAprovadas.map((n: {
    id: string; ordem: number | null; categoria: string; destaque: boolean; override_destino: string | null;
  }) => {
    const raw = n.override_destino;
    const override: "auto" | "email" | "site" = raw === "email" || raw === "site" ? raw : "auto";
    return { id: n.id, ordem: n.ordem ?? 0, categoria: n.categoria, destaque: !!n.destaque, override };
  });
  const resolvido = resolverDestinos(entradas, { categoriasOcultas: catsOcultas });

  const noticias = opts.incluirDestinoSite
    ? todasAprovadas
    : todasAprovadas.filter((n: { id: string }) => resolvido.get(n.id)?.destino !== "site");
  return {
    edicao: { ...edRes.data, bloco_consultoria: normalizarConsultoria(edRes.data.bloco_consultoria) },
    cronica: crRes.data ?? null, episodio, noticias,
    totalAprovadas: todasAprovadas.length,
    seccoes: (seRes.data ?? []) as DadosEdicao["seccoes"],
    ferramentas: (feRes.data ?? []) as DadosEdicao["ferramentas"],
  };
}


/* ─── helpers de composição ─── */

// Kicker uniforme "ícone + TEXTO" 13/700 (Categorias, Destaques, Recursos, Ferramenta).
// `subtitulo` aparece 13px #94A3B8 na linha de baixo.
function kicker(icone: string, texto: string, opts: { cor?: string; subtitulo?: string } = {}): string {
  const cor = opts.cor ?? INK;
  const linha1 = `<p style="margin:0 0 4px 4px;font-family:${FONT_TITULO};font-size:13px;font-weight:700;letter-spacing:0.01em;color:${cor};">${icone} ${esc(texto)}</p>`;
  const linha2 = opts.subtitulo
    ? `<p style="margin:0 0 18px 4px;font-family:${FONT_CORPO};font-size:13px;color:${TENUE};">${esc(opts.subtitulo)}</p>`
    : "";
  return linha1 + linha2;
}
// Cartão branco com sombra.
function cartaoBranco(inner: string, padding = "26px 26px", radius = 14, marginBottom = 0): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_CARTAO}" style="background:${BG_CARTAO};border-radius:${radius}px;${marginBottom ? `margin-bottom:${marginBottom}px;` : ""}${SOMBRA}"><tr><td style="padding:${padding};">${inner}</td></tr></table>`;
}
// Círculo 56×56 com fundo transparente sobre gradientes.
function circulo56(emoji: string, fundo: string, marginBottom = 16): string {
  return `<div style="width:56px;height:56px;background:${fundo};border-radius:50%;margin:0 auto ${marginBottom}px auto;text-align:center;line-height:56px;font-size:24px;">${emoji}</div>`;
}

// Cabeçalho de categoria uniforme entre email e página WordPress:
// quadrado de cor 22×22 com o emoji + nome a negrito na cor da categoria +
// linha divisória fina por baixo, à largura do grupo.
function cabecalhoCategoria(g: { nome: string; emoji: string; accent: string }): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">
    <tr>
      <td valign="middle" width="30" style="padding-right:10px;">
        <table role="presentation" width="22" height="22" cellpadding="0" cellspacing="0" border="0" style="background:${g.accent};border-radius:6px;">
          <tr><td align="center" valign="middle" style="width:22px;height:22px;line-height:22px;text-align:center;font-size:13px;color:#FFFFFF;">${g.emoji}</td></tr>
        </table>
      </td>
      <td valign="middle" style="font-family:${FONT_TITULO};font-size:16px;font-weight:700;color:${g.accent};line-height:1.2;">${esc(g.nome)}</td>
    </tr>
    <tr><td colspan="2" style="padding-top:8px;"><div style="border-top:1px solid ${DIVISOR};font-size:0;line-height:0;">&nbsp;</div></td></tr>
  </table>`;
}

/* ─── blocos ─── */


function blocoHeader(edicao: DadosEdicao["edicao"]): string {
  return `<tr><td style="padding:0 0 20px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${INK}" style="background:${INK};border-radius:16px;">
      <tr><td style="padding:34px 32px 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="left" style="font-family:${FONT_TITULO};font-size:21px;font-weight:700;letter-spacing:0.03em;color:#FFFFFF;">DIGITAL SPRINT</td>
          <td align="right" style="font-family:${FONT_CORPO};font-size:13px;color:${TENUE};">#${edicao.numero} · ${esc(fmtData(edicao.data_envio_prevista))}</td>
        </tr></table>
        <div style="height:3px;width:64px;background:linear-gradient(90deg,#6366F1,#EC4899);border-radius:2px;margin:18px 0 16px 0;font-size:0;line-height:0;">&nbsp;</div>
        <p style="margin:0;font-family:${FONT_CORPO};font-size:15px;line-height:1.55;color:#CBD5E1;">Curadoria semanal de marketing e tecnologia, por <span style="color:#FFFFFF;font-weight:600;">Frederico Carvalho</span>.</p>
      </td></tr>
    </table>
  </td></tr>`;
}

function blocoDestaques(destaques: DadosEdicao["noticias"]): string {
  if (destaques.length === 0) return "";
  const cartoes = destaques.map((n, i) => {
    const grad = MEDALHAO_GRADIENTES[i % MEDALHAO_GRADIENTES.length];
    const isLast = i === destaques.length - 1;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_CARTAO}" style="background:${BG_CARTAO};border-radius:14px;${isLast ? "" : "margin-bottom:12px;"}${SOMBRA}"><tr><td style="padding:24px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" width="52" style="padding-right:16px;">
          <div style="width:38px;height:38px;border-radius:10px;background:${grad};color:#FFFFFF;text-align:center;line-height:38px;font-family:${FONT_TITULO};font-weight:700;font-size:17px;">${i + 1}</div>
        </td>
        <td valign="top">
          <p style="margin:0;font-family:${FONT_TITULO};font-size:19px;font-weight:700;line-height:1.3;color:${INK};">${n.url ? `<a href="${esc(n.url)}" style="color:${INK};text-decoration:none;">${esc(limparTitulo(n.titulo))}</a>` : esc(limparTitulo(n.titulo))}</p>
          ${n.descricao ? `<p style="margin:10px 0 0 0;font-family:${FONT_CORPO};font-size:15px;line-height:1.6;color:${INK_SEC};">${esc(ajustarDescricaoDestaque(n.descricao))}</p>` : ""}
          ${n.url ? `<p style="margin:14px 0 0 0;font-family:${FONT_CORPO};font-size:14px;"><a href="${esc(n.url)}" style="color:${PRIMARIA};font-weight:600;text-decoration:none;">Ler no site →</a><span style="color:${TENUE_2};margin-left:10px;">${esc(hostname(n.url))}</span></p>` : ""}
        </td>
      </tr></table>
    </td></tr></table>`;
  }).join("\n");
  return `<tr><td style="padding:16px 4px 10px 4px;">${kicker("⚡", "DESTAQUES DA SEMANA")}${cartoes}</td></tr>`;
}

function blocoContadores(total: number, naNews: number, url: string): string {
  const inner = `
    ${circulo56("📊", "rgba(255,255,255,0.18)")}
    <p style="margin:0;font-family:${FONT_TITULO};font-size:20px;font-weight:700;line-height:1.3;color:#FFFFFF;">${total} atualidades esta semana</p>
    <p style="margin:8px 0 18px 0;font-family:${FONT_CORPO};font-size:14.5px;line-height:1.55;color:rgba(255,255,255,0.92);">Newsletter com as <strong>${naNews}</strong> mais relevantes.</p>
    <a href="${esc(url)}" style="display:inline-block;font-family:${FONT_CORPO};font-size:14px;font-weight:700;color:#065F46;background:#FFFFFF;text-decoration:none;padding:12px 26px;border-radius:10px;">Ver Todas Online →</a>`;
  return `<tr><td style="padding:10px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#059669,#10B981);border-radius:14px;">
      <tr><td align="center" style="padding:30px 24px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}

function cronicaComoHtml(c: DadosEdicao["cronica"]): string {
  const html = (c?.conteudo_html ?? "").trim();
  if (html) return html;
  const txt = (c?.conteudo ?? "").trim();
  return txt ? textoParaHtmlBasico(txt) : "";
}

function blocoCronica(cronica: DadosEdicao["cronica"]): string {
  if (!cronica) return "";
  const html = cronicaComoHtml(cronica);
  if (!html.replace(/<[^>]+>/g, "").trim()) return "";
  const titulo = (cronica.titulo ?? "").trim();
  const leituras = (cronica.leituras_recomendadas ?? "").trim();
  const leiturasHtml = leituras ? `
    <div style="border-top:1px solid ${DIVISOR};margin:22px 0 16px 0;font-size:0;line-height:0;">&nbsp;</div>
    <p style="margin:0 0 12px 0;font-family:${FONT_CORPO};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${TENUE};">Leituras recomendadas</p>
    <div style="font-family:${FONT_CORPO};font-size:14.5px;line-height:1.55;color:${INK};">
      ${leituras.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
        let titulo = "";
        let url = "";
        // 1) Markdown [Título](url)
        const md = l.match(/^\[(.+?)\]\((https?:\/\/\S+?)\)\s*$/);
        if (md) { titulo = md[1].trim(); url = md[2].trim(); }
        // 2) «Título - url», «Título — url», «Título | url» (deixa cair `:` para não partir títulos com dois-pontos)
        if (!url) {
          const misto = l.match(/^(.+?)\s*[\-—–|]\s*(https?:\/\/\S+)\s*$/);
          if (misto) { titulo = misto[1].trim(); url = misto[2].trim(); }
        }
        // 3) URL isolado — usa o domínio como título
        if (!url) {
          const uOnly = l.match(/^(https?:\/\/\S+)\s*$/);
          if (uOnly) { url = uOnly[1].trim(); titulo = hostname(url); }
        }
        // 4) Texto com URL algures no meio — extrai o URL, resto é título
        if (!url) {
          const inline = l.match(/(https?:\/\/\S+)/);
          if (inline) {
            url = inline[1].trim();
            titulo = l.replace(inline[1], "").replace(/[\-—–|:·•]\s*$/, "").trim() || hostname(url);
          }
        }
        // 5) Sem URL — texto plano
        if (!url) {
          return `<div style="margin-bottom:12px;">${esc(l)}</div>`;
        }
        // Limpa prefixos de numeração ("1. ", "2) ", "- ")
        titulo = titulo.replace(/^\s*(?:\d+[.)]\s*|[-•]\s*)/, "").trim();
        if (!titulo) titulo = hostname(url);
        return `<div style="margin-bottom:12px;">
          <span style="color:${INK};font-weight:500;">${esc(titulo)}</span>
          <span style="color:${TENUE_2};margin:0 6px;">·</span>
          <a href="${esc(url)}" style="color:${PRIMARIA};font-weight:600;text-decoration:none;font-size:13px;white-space:nowrap;">Ver fonte →</a>
        </div>`;
      }).join("")}
    </div>` : "";

  // Cabeçalho editorial: fotografia real + nome + kicker roxo.
  const cabecalho = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding-right:14px;">
        <img src="${AVATAR_URL}" width="52" height="52" alt="Frederico Carvalho" style="display:block;width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:center 22%;border:2px solid #FFFFFF;box-shadow:0 2px 6px rgba(15,23,42,0.12);" />
      </td>
      <td valign="middle">
        <p style="margin:0;font-family:${FONT_TITULO};font-size:14px;font-weight:700;color:${INK};">Frederico Carvalho</p>
        <p style="margin:2px 0 0 0;font-family:${FONT_CORPO};font-size:12px;color:${PRIMARIA};font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">A crónica desta semana</p>
      </td>
    </tr></table>`;
  const inner = `
    ${cabecalho}
    ${titulo ? `<h2 style="margin:26px 0 0 0;font-family:${FONT_TITULO};font-size:30px;font-weight:700;line-height:1.12;letter-spacing:-0.02em;color:${INK};">${esc(titulo)}</h2>` : ""}
    <div>${limparCronicaHtml(html)}</div>
    ${leiturasHtml}`;
  // Cartão dedicado: faixa de gradiente no topo + sombra roxa suave (única no documento).
  return `<tr><td style="padding:4px 4px 8px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_CARTAO}" style="background:${BG_CARTAO};border-radius:14px;box-shadow:0 4px 16px rgba(79,70,229,0.10);overflow:hidden;">
      <tr><td style="height:4px;background:linear-gradient(90deg,#6366F1,#8B5CF6,#EC4899);font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:30px 28px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}

function blocoPodcast(ep: DadosEdicao["episodio"]): string {
  if (!ep) return "";
  const inner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top" width="72" style="padding-right:18px;">
        <table role="presentation" width="56" height="56" cellpadding="0" cellspacing="0" border="0" style="background:#FFCC00;border-radius:50%;box-shadow:0 2px 8px rgba(255,204,0,0.35);"><tr><td align="center" valign="middle" style="width:56px;height:56px;font-size:26px;line-height:56px;text-align:center;color:#18181B;">🎧</td></tr></table>
      </td>
      <td valign="top">
        <div style="margin:2px 0 0 0;font-family:${FONT_CORPO};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#FFCC00;">Podcast semanal · RFM</div>
        <div style="margin:6px 0 0 0;font-family:${FONT_TITULO};font-size:17px;font-weight:700;line-height:1.35;color:#FFFFFF;">${esc(ep.titulo)}</div>
        ${ep.codigo ? `<div style="margin:4px 0 0 0;font-family:${FONT_CORPO};font-size:12px;color:#A1A1AA;">${esc(ep.codigo)}</div>` : ""}
      </td>
    </tr></table>
    ${ep.url ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr><td align="center" style="border-top:1px solid rgba(255,255,255,0.14);padding-top:18px;">
      <a href="${esc(ep.url)}" style="display:inline-block;font-family:${FONT_CORPO};font-size:14px;font-weight:700;color:#18181B;background:#FFCC00;text-decoration:none;padding:12px 28px;border-radius:10px;">▶&nbsp; Ouvir episódio</a>
    </td></tr></table>` : ""}`;
  return `<tr><td style="padding:10px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#7F1D1D;background-image:linear-gradient(135deg,#111014 0%,#5B1114 55%,#B91C1C 100%);border-radius:14px;">
      <tr><td style="padding:26px 26px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}

function blocoCategorias(naNews: DadosEdicao["noticias"]): string {
  // Os destaques já aparecem em cima no bloco "⚡ Destaques da Semana" — não
  // os repetimos aqui. O bloco da categoria mostra apenas as notícias
  // "regulares" (pins de email + auto até 2/categoria), tal como o editor.
  const grupos = CATEGORIAS
    .map((c) => ({ ...c, itens: naNews.filter((n) => !n.destaque && n.categoria === c.id) }))
    .filter((g) => g.itens.length);

  if (grupos.length === 0) return "";
  const gruposHtml = grupos.map((g, gi) => {
    const itens = g.itens.map((n, ni) => `
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_CARTAO}" style="background:${BG_CARTAO};border-radius:12px;${ni === g.itens.length - 1 ? "" : "margin-bottom:10px;"}${SOMBRA}"><tr><td style="padding:18px 20px;">
          <p style="margin:0;font-family:${FONT_TITULO};font-size:17px;font-weight:600;line-height:1.35;color:${INK};">${n.url ? `<a href="${esc(n.url)}" style="color:${INK};text-decoration:none;">${esc(limparTitulo(n.titulo))}</a>` : esc(limparTitulo(n.titulo))}</p>
          ${n.descricao ? `<p style="margin:7px 0 0 0;font-family:${FONT_CORPO};font-size:14.5px;line-height:1.6;color:${INK_SEC};">${esc(ajustarDescricao(n.descricao))}</p>` : ""}
          ${n.url ? `<p style="margin:10px 0 0 0;font-family:${FONT_CORPO};font-size:13px;"><a href="${esc(n.url)}" style="color:${PRIMARIA};font-weight:600;text-decoration:none;">Ler no site →</a><span style="color:${TENUE_2};margin-left:8px;">${esc(hostname(n.url))}</span></p>` : ""}
        </td></tr></table>
      </td></tr>`).join("");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${gi === grupos.length - 1 ? "" : "margin-bottom:28px;"}">
      <tr><td>${cabecalhoCategoria(g)}</td></tr>
      ${itens}
    </table>`;
  }).join("\n");
  return `<tr><td style="padding:10px 4px;">${kicker("📰", "CATEGORIAS", { subtitulo: "Breve resumo da atualidade" })}${gruposHtml}</td></tr>`;
}

// Ferramenta da semana — painel com 1 ou 2 cartões brancos sobre fundo lilás
// claro. Devolve "" quando não há nenhuma ferramenta preenchida (secção
// omitida do email mesmo com o toggle da Estrutura activo).
function blocoFerramentasSemana(fs: DadosEdicao["ferramentas"]): string {
  const preenchidas = (fs ?? []).filter((f) =>
    (f.nome ?? "").trim() || (f.descricao ?? "").trim() || (f.url ?? "").trim()
  );
  if (preenchidas.length === 0) return "";

  const cartao = (f: DadosEdicao["ferramentas"][number], isFirst: boolean): string => {
    const cp = corPersonalizada(f.cor);
    const emoji = (f.emoji ?? "").trim() || "✨";
    const nome = (f.nome ?? "").trim();
    const desc = (f.descricao ?? "").trim();
    const url = (f.url ?? "").trim();
    const nomeHtml = nome
      ? `<p style="margin:0;font-family:${FONT_TITULO};font-size:17px;font-weight:700;color:${INK};line-height:1.3;">${esc(nome)}</p>`
      : "";
    const descHtml = desc
      ? `<p style="margin:8px 0 0 0;font-family:${FONT_CORPO};font-size:14px;line-height:1.55;color:${INK_SEC};">${esc(desc)}</p>`
      : "";
    const linkExp = url
      ? `<p style="margin:14px 0 0 0;"><a href="${esc(url)}" style="font-family:${FONT_CORPO};font-size:13px;font-weight:600;color:${PRIMARIA};text-decoration:none;">Experimentar →</a></p>`
      : "";
    const classe = isFirst ? "ds-tool-card-first" : "";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_CARTAO}" class="${classe}" style="background:${BG_CARTAO};border-radius:12px;${SOMBRA}"><tr><td style="padding:0;">
      <div style="height:4px;background:${cp.gradiente};border-radius:12px 12px 0 0;font-size:0;line-height:0;">&nbsp;</div>
      <div style="padding:20px 20px 22px 20px;">
        <div style="width:44px;height:44px;border-radius:11px;background:${cp.gradiente};text-align:center;line-height:44px;font-size:20px;margin-bottom:14px;color:#FFFFFF;">${emoji}</div>
        ${nomeHtml}
        ${descHtml}
        ${linkExp}
      </div>
    </td></tr></table>`;
  };

  let corpo: string;
  if (preenchidas.length === 1) {
    corpo = cartao(preenchidas[0], false);
  } else {
    corpo = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="ds-tool-col" valign="top" width="50%" style="padding-right:8px;">${cartao(preenchidas[0], true)}</td>
      <td class="ds-tool-col" valign="top" width="50%" style="padding-left:8px;">${cartao(preenchidas[1], false)}</td>
    </tr></table>`;
  }

  const inner = `${kicker("🛠️", "FERRAMENTA DA SEMANA", { cor: "#4338CA" })}
    ${corpo}`;
  return `<tr><td style="padding:10px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F5F3FF" style="background:#F5F3FF;border:1px solid #E4DEFB;border-radius:16px;">
      <tr><td style="padding:22px 18px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}


function blocoLivro(): string {
  const inner = `
    ${circulo56("📖", "rgba(255,255,255,0.2)")}
    <span style="font-family:${FONT_CORPO};font-size:11px;letter-spacing:0.14em;font-weight:700;color:rgba(255,255,255,0.9);text-transform:uppercase;">Bestseller · 2ª edição · 2025</span>
    <p style="margin:8px 0 0 0;font-family:${FONT_TITULO};font-size:20px;font-weight:700;line-height:1.3;color:#FFFFFF;">Guia Essencial de SEO</p>
    <p style="margin:8px 0 0 0;font-family:${FONT_CORPO};font-size:14.5px;line-height:1.55;color:rgba(255,255,255,0.92);">Técnicas avançadas para dominar os resultados de pesquisa.</p>
    <p style="margin:18px 0 0 0;"><a href="#" style="display:inline-block;font-family:${FONT_CORPO};font-size:14px;font-weight:700;color:#C2410C;background:#FFFFFF;text-decoration:none;padding:12px 26px;border-radius:10px;">📚 Adquirir na FNAC →</a></p>`;
  return `<tr><td style="padding:10px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#C2410C,#F97316);border-radius:14px;">
      <tr><td align="center" style="padding:30px 26px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}

function blocoConsultoria(c: BlocoConsultoria): string {
  const url = c.url_botao && c.url_botao.trim() ? c.url_botao : "#";
  const inner = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top" width="72" style="padding-right:18px;">
        <table role="presentation" width="56" height="56" cellpadding="0" cellspacing="0" border="0" style="background:#E7B84B;border-radius:50%;box-shadow:0 2px 8px rgba(231,184,75,0.35);"><tr><td align="center" valign="middle" style="width:56px;height:56px;font-size:26px;line-height:56px;text-align:center;color:#1A1206;">💬</td></tr></table>
      </td>
      <td valign="top">
        <div style="margin:2px 0 0 0;font-family:${FONT_CORPO};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#E7B84B;">Consultoria</div>
        <div style="margin:6px 0 0 0;font-family:${FONT_TITULO};font-size:17px;font-weight:700;line-height:1.35;color:#FFFFFF;">${esc(c.titulo)}</div>
        <div style="margin:8px 0 0 0;font-family:${FONT_CORPO};font-size:14px;line-height:1.55;color:rgba(255,255,255,0.82);">${esc(c.subtitulo)}</div>
      </td>
    </tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;"><tr><td align="center" style="border-top:1px solid rgba(231,184,75,0.22);padding-top:18px;">
      <a href="${esc(url)}" style="display:inline-block;font-family:${FONT_CORPO};font-size:14px;font-weight:700;color:#1A1206;background:#E7B84B;text-decoration:none;padding:12px 28px;border-radius:10px;">${esc(c.texto_botao)} →</a>
    </td></tr></table>`;
  return `<tr><td style="padding:10px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0B0906;background-image:linear-gradient(135deg,#0B0906 0%,#1C1408 60%,#3A2A0C 100%);border-radius:14px;border:1px solid rgba(231,184,75,0.38);">
      <tr><td style="padding:26px 26px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}


function blocoRecursos(): string {
  // Cada linha usa layout de 3 colunas: ícone, título+subtítulo (empilhados),
  // CTA à direita com nowrap. Empilhar em coluna evita as quebras sujas do
  // "título · subtítulo" inline em ecrãs estreitos (mobile Gmail).
  const linhas: Array<{ icone: string; titulo: string; subtitulo?: string; ctaHtml: string }> = [
    {
      icone: "📚",
      titulo: "Cursos",
      subtitulo: "Marketing digital prático",
      ctaHtml: `<a href="https://aulas.fredericocarvalho.pt/" target="_blank" rel="noopener" style="color:${PRIMARIA};text-decoration:none;">Explorar →</a>`,
    },
    {
      icone: "🔍",
      titulo: "Auditoria",
      subtitulo: "Análise profunda",
      ctaHtml: `<a href="https://fredericocarvalho.pt/auditoria-digital" target="_blank" rel="noopener" style="color:${PRIMARIA};text-decoration:none;">Solicitar →</a>`,
    },
    {
      icone: "📱",
      titulo: "Social Media",
      subtitulo: "",
      ctaHtml: `<a href="https://www.instagram.com/frederico.m.carvalho/" target="_blank" rel="noopener" style="color:${PRIMARIA};text-decoration:none;">Instagram</a> <span style="color:${TENUE};">·</span> <a href="https://www.linkedin.com/in/fredcarvalho/" target="_blank" rel="noopener" style="color:${PRIMARIA};text-decoration:none;">LinkedIn</a>`,
    },
  ];
  const rows = linhas.map((l, i) => {
    const border = i === 0 ? "" : `border-top:1px solid ${DIVISOR};`;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="top" width="32" style="${border}padding:14px 10px 14px 0;font-family:${FONT_CORPO};font-size:17px;line-height:1.3;">${l.icone}</td>
      <td valign="top" style="${border}padding:14px 8px 14px 0;">
        <p style="margin:0;font-family:${FONT_TITULO};font-size:15px;font-weight:700;line-height:1.35;color:${INK};">${esc(l.titulo)}</p>
        ${l.subtitulo ? `<p style="margin:2px 0 0 0;font-family:${FONT_CORPO};font-size:13px;line-height:1.4;color:${TENUE};">${esc(l.subtitulo)}</p>` : ""}
      </td>
      <td valign="top" align="right" style="${border}padding:14px 0;font-family:${FONT_CORPO};font-size:13px;font-weight:700;white-space:nowrap;">${l.ctaHtml}</td>
    </tr></table>`;
  }).join("");

  const inner = `<p style="margin:0 0 14px 0;font-family:${FONT_TITULO};font-size:13px;font-weight:700;letter-spacing:0.01em;color:${INK};">🛠️ RECURSOS PREMIUM</p>${rows}`;
  return `<tr><td style="padding:10px 4px;">${cartaoBranco(inner, "22px 24px")}</td></tr>`;
}

function blocoPersonalizada(s: DadosEdicao["seccoes"][number]): string {
  const c = corPersonalizada(s.cor);
  const inner = `
    ${s.titulo ? `<p style="margin:0 0 10px 0;font-family:${FONT_CORPO};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${c.solid};">${esc(s.titulo)}</p>` : ""}
    ${s.texto ? `<p style="margin:0;font-family:${FONT_CORPO};font-size:15px;line-height:1.7;color:${INK};white-space:pre-wrap;">${esc(s.texto)}</p>` : ""}
    ${s.texto_botao && s.url_botao ? `<p style="margin:16px 0 0 0;"><a href="${esc(s.url_botao)}" style="display:inline-block;background:${c.solid};color:#FFFFFF;font-family:${FONT_CORPO};font-size:13px;font-weight:700;padding:12px 22px;border-radius:10px;text-decoration:none;">${esc(s.texto_botao)} →</a></p>` : ""}`;
  return `<tr><td style="padding:10px 4px;">${cartaoBranco(inner, "24px 24px")}</td></tr>`;
}

function blocoCta(total: number, url: string): string {
  const inner = `
    ${circulo56("🚀", "rgba(255,255,255,0.16)")}
    <p style="margin:0;font-family:${FONT_TITULO};font-size:20px;font-weight:700;line-height:1.3;color:#FFFFFF;">Descobrir Muito Mais</p>
    <p style="margin:8px 0 0 0;font-family:${FONT_CORPO};font-size:14.5px;line-height:1.55;color:rgba(255,255,255,0.9);">Explorar todas as <strong>${total}</strong> atualidades desta semana.</p>
    <p style="margin:18px 0 0 0;"><a href="${esc(url)}" style="display:inline-block;font-family:${FONT_CORPO};font-size:14px;font-weight:700;color:#4338CA;background:#FFFFFF;text-decoration:none;padding:12px 26px;border-radius:10px;">📖 Ver Página Completa →</a></p>`;
  return `<tr><td style="padding:10px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#4338CA,#6366F1);border-radius:14px;">
      <tr><td align="center" style="padding:32px 26px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}

function blocoFooter(edicao: DadosEdicao["edicao"]): string {
  const inner = `
    <p style="margin:0;font-family:${FONT_TITULO};font-size:17px;font-weight:700;color:${INK};">Chega ao fim mais uma edição</p>
    <p style="margin:8px 0 0 0;font-family:${FONT_CORPO};font-size:15px;line-height:1.6;color:${INK_SEC};">Curadoria prática para decisões melhores no marketing e tecnologia.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px auto 0 auto;" bgcolor="#F5F3FF"><tr><td style="background:#F5F3FF;border-radius:10px;padding:14px 20px;">
      <span style="font-family:${FONT_CORPO};font-size:13.5px;font-weight:600;color:#4F46E5;">💡 Estar informado já é meio caminho para fazer melhor</span>
    </td></tr></table>
    <div style="border-top:1px solid ${DIVISOR};margin:26px 0 20px 0;font-size:0;line-height:0;">&nbsp;</div>
    <p style="margin:0;font-family:${FONT_TITULO};font-size:15px;font-weight:700;color:${INK};">Frederico Carvalho</p>
    <p style="margin:6px 0 0 0;font-family:${FONT_CORPO};font-size:13px;color:${TENUE};"><a href="mailto:frederico.carvalho@digitalfc.pt" style="color:${TENUE};text-decoration:none;">frederico.carvalho@digitalfc.pt</a></p>
    <p style="margin:18px 0 0 0;font-family:${FONT_CORPO};font-size:11px;color:${TENUE_2};letter-spacing:0.1em;text-transform:uppercase;font-weight:700;">Digital Sprint · #${edicao.numero} · ${esc(fmtData(edicao.data_envio_prevista))}</p>
    <p style="margin:8px 0 0 0;font-family:${FONT_CORPO};font-size:10.5px;color:#CBD5E1;">esta newsletter foi produzida com o apoio de inteligência artificial.</p>`;
  return `<tr><td style="padding:10px 4px;">${cartaoBranco(`<div style="text-align:center;">${inner}</div>`, "34px 24px")}</td></tr>`;
}

/* ─── montagem ─── */

export function montarHtml(d: DadosEdicao): string {
  const destaques = d.noticias.filter((n) => n.destaque);
  const naNews = d.noticias;
  const urlPagina = d.edicao.wordpress_post_url?.trim() || "https://digitalsprint.pt";
  const partes: string[] = [blocoHeader(d.edicao)];

  // Ordem editorial fixa (independente da ordem em `secoes_edicao`):
  //  1) destaques  2) contadores  3) crónica  4) consultoria (só se houver crónica)
  //  5) podcast    6) restantes pela ordem definida no editor
  const temCronica = !!(d.cronica && (d.cronica.conteudo_html?.trim() || d.cronica.conteudo?.trim()));
  const PRIORIDADE: Record<string, number> = {
    destaques: 1, contadores: 2, cronica: 3, consultoria: 4, podcast: 5,
  };
  const seccoesOrdenadas = [...d.seccoes]
    .filter((s) => s.tipo !== "consultoria" || temCronica)
    .sort((a, b) => {
      const pa = PRIORIDADE[a.tipo] ?? 100 + a.ordem;
      const pb = PRIORIDADE[b.tipo] ?? 100 + b.ordem;
      return pa - pb;
    });

  for (const s of seccoesOrdenadas) {
    let b = "";
    switch (s.tipo) {
      case "destaques":
        b = blocoDestaques(destaques); break;
      case "contadores":
        b = blocoContadores(d.totalAprovadas, naNews.length, urlPagina); break;
      case "cronica":
        b = blocoCronica(d.cronica); break;
      case "consultoria":
        b = blocoConsultoria(normalizarConsultoria(d.edicao.bloco_consultoria)); break;
      case "podcast":
        b = blocoPodcast(d.episodio); break;
      case "categorias":
        b = blocoCategorias(naNews); break;
      case "ferramentas_semana":
        b = blocoFerramentasSemana(d.ferramentas); break;
      case "livro":
        b = blocoLivro(); break;
      case "recursos":
        b = blocoRecursos(); break;
      case "personalizada":
        b = blocoPersonalizada(s); break;
    }
    if (b) partes.push(b);
  }
  partes.push(blocoCta(naNews.length, urlPagina));
  partes.push(blocoFooter(d.edicao));

  return `<!doctype html>
<html lang="pt-PT"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(d.edicao.assunto ?? `DIGITAL SPRINT #${d.edicao.numero}`)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Empilhar a Ferramenta da Semana em ecrãs pequenos — restantes secções já são fluidas por natureza */
  @media only screen and (max-width:480px) {
    .ds-tool-col { display:block !important; width:100% !important; max-width:100% !important; padding-left:0 !important; padding-right:0 !important; }
    .ds-tool-card-first { margin-bottom:12px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BG_PAGINA};font-family:${FONT_CORPO};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_PAGINA}" style="background:${BG_PAGINA};"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
${partes.join("\n")}
</table></td></tr></table>
</body></html>`;
}

export async function gerarHtmlNewsletter(edicaoId: string): Promise<{ html: string; dados: DadosEdicao }> {
  const dados = await carregarDadosEdicao(edicaoId);
  return { html: montarHtml(dados), dados };
}

/* ─── exports partilhados com gerar-html-wordpress.ts ───
 * O WordPress compõe a partir dos mesmos blocos para garantir paridade
 * visual 1:1 com o email. Alterações aqui reflectem-se nos dois canais.
 */
export {
  BG_PAGINA, BG_CARTAO, INK, INK_MED, INK_SEC, TENUE, TENUE_2, DIVISOR, PRIMARIA, SOMBRA,
  MEDALHAO_GRADIENTES, AVATAR_URL,
  esc, limparTitulo, fmtData, hostname, limparCronicaHtml,
  kicker, cartaoBranco, circulo56, cabecalhoCategoria,
  blocoHeader, blocoDestaques, blocoContadores, blocoCronica, blocoPodcast,
  blocoConsultoria, blocoLivro, blocoRecursos, blocoFerramentasSemana, blocoPersonalizada,
};

