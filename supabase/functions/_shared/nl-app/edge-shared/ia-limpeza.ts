// Helpers de limpeza / normalização partilhados pelos dois caminhos de ingestão:
// - Edge Function `processar-noticias` (colagem manual, Deno)
// - Cron RSS em `src/routes/api/public/hooks/curadoria-rss.ts` via `src/lib/ia-extractor.server.ts` (Cloudflare Worker)
// TypeScript puro, sem APIs específicas de Deno ou Node.

/* ─── Categorias ─── */

export const CATEGORIA_MAP: Record<string, string> = {
  "INTELIGÊNCIA ARTIFICIAL": "ia",
  "INTELIGENCIA ARTIFICIAL": "ia",
  "INTELIGÊNCIA ARTIFICIAL & TECNOLOGIA": "ia",
  "INTELIGENCIA ARTIFICIAL & TECNOLOGIA": "ia",
  "GOOGLE": "google",
  "GOOGLE & YOUTUBE": "google",
  "YOUTUBE & VÍDEO": "youtube",
  "YOUTUBE & VIDEO": "youtube",
  "YOUTUBE": "youtube",
  "META": "meta",
  "FACEBOOK": "meta",
  "INSTAGRAM": "meta",
  "WHATSAPP": "meta",
  "WHATSAPP & FACEBOOK": "meta",
  "THREADS": "meta",
  "LINKEDIN": "linkedin",
  "TIKTOK": "tiktok",
  "X": "x",
  "X / TWITTER": "x",
  "X/TWITTER": "x",
  "TWITTER": "x",
  "MEDIA & NEGÓCIOS ONLINE": "media",
  "MEDIA & NEGOCIOS ONLINE": "media",
  "INFLUENCERS & MEDIA": "media",
};

export function mapCategoria(raw: unknown): string {
  if (typeof raw !== "string") return "ia";
  const chave = raw.trim().toUpperCase();
  return CATEGORIA_MAP[chave] ?? "ia";
}

/* ─── Limpeza WhatsApp ─── */

const RE_TELEFONE = /^\s*\+?\d[\d\s().-]{6,}\s*$/;
const RE_HORA = /^\s*\d{1,2}:\d{2}(\s*[APap][Mm])?\s*$/;
const RE_SEPARADOR = /^\s*([=\-_*])\1{2,}\s*$/;
const RE_REACCAO = /^\s*(?:\p{Extended_Pictographic}\uFE0F?)+\s*\d{1,4}\s*$/u;
const RE_CITACAO = /^\s*>+(\s.*|\s*)$/;
const RE_ENCAMINHADA = /^\s*(?:[↪▶➤>»]+\s*)?(?:encaminhada|encaminhado|forwarded)(?:\s+(?:muitas?\s+vezes|many\s+times))?\s*$/i;
const AVISOS_SISTEMA = [
  /afixou uma mensagem/i,
  /^\s*ler mais\s*$/i,
  /mensagem apagada/i,
  /esta mensagem foi editada/i,
  /mudou o assunto/i,
  /entrou no grupo/i,
  /saiu do grupo/i,
  /^\s*administrador\/?a? da comunidade\s*$/i,
  RE_ENCAMINHADA,
];

function pareceLinhaDeNome(l: string): boolean {
  const t = l.trim();
  if (t.length === 0 || t.length >= 40) return false;
  if (/https?:\/\//i.test(t)) return false;
  if (/[.@\/]/.test(t)) return false;
  if (/\d/.test(t)) return false;
  return /^[\p{L}][\p{L}\s'’.-]*$/u.test(t);
}

export function limparLinhasWhatsApp(texto: string): string {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");
  const contagem = new Map<string, number>();
  for (const l of linhas) {
    if (pareceLinhaDeNome(l)) {
      const k = l.trim();
      contagem.set(k, (contagem.get(k) ?? 0) + 1);
    }
  }
  const nomesRepetidos = new Set(
    Array.from(contagem.entries()).filter(([, n]) => n >= 3).map(([k]) => k),
  );
  const filtradas: string[] = [];
  for (const raw of linhas) {
    const l = raw.trimEnd();
    const t = l.trim();
    if (t.length === 0) { filtradas.push(""); continue; }
    if (RE_TELEFONE.test(t)) continue;
    if (RE_HORA.test(t)) continue;
    if (RE_SEPARADOR.test(t)) continue;
    if (RE_REACCAO.test(t)) continue;
    if (RE_CITACAO.test(t)) continue;
    if (AVISOS_SISTEMA.some((r) => r.test(t))) continue;
    if (nomesRepetidos.has(t)) continue;
    filtradas.push(l);
  }
  return filtradas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ─── Segmentação de exportações WhatsApp ─── */

// Cabeçalho de mensagem WhatsApp. Aceita:
//   - iOS/Web:   `[23:40, 23/07/2026] +44 7498 962191:`
//   - iOS/Web:   `[23:40, 23/07/2026]` (sem remetente)
//   - Android:   `23/07/2026, 23:40 - Nome:`
//   - Android:   `23/07/2026, 23:40 - +44 7498 962191:`
// Segundos e AM/PM opcionais. Separador de data `/`, `.` ou `-`.
// Remetente pode ser número (`+44 ...`), nome (`Frederico Carvalho`) ou `~alcunha`.
export const RE_CABECALHO_WHATSAPP =
  /^\s*(?:\[\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?\s*[,\s]\s*\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\s*\]|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\s*[,\s]\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?\s*[-–—])(?:\s*(?:~\s*)?[^:\n]{1,80}:)?\s*/gm;

const RE_SEPARADOR_RIGIDO = /^\s*(?:={3,}|-{3,}|_{3,}|\*{3,})\s*$/gm;

/**
 * Se o texto tiver ≥ 1 cabeçalho WhatsApp, devolve uma mensagem por corte,
 * com o cabeçalho removido e quebras internas preservadas. Além disso,
 * dentro de cada mensagem, quebra em separadores rígidos (=== / --- / ___).
 * Caso contrário, devolve null — o chamador mantém o fluxo genérico.
 */
export function segmentarMensagensWhatsApp(texto: string): string[] | null {
  if (!texto) return null;
  const limpo = limparLinhasWhatsApp(texto);
  const re = new RegExp(RE_CABECALHO_WHATSAPP.source, "gm");
  const matches: Array<{ index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(limpo)) !== null) {
    matches.push({ index: m.index, length: m[0].length });
    if (m.index === re.lastIndex) re.lastIndex += 1;
  }
  if (matches.length === 0) return null;

  const mensagens: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const inicio = matches[i].index + matches[i].length;
    const fim = i + 1 < matches.length ? matches[i + 1].index : limpo.length;
    const bruto = limpo.slice(inicio, fim).trim();
    if (!bruto) continue;
    // Separadores rígidos dentro da mesma mensagem = várias notícias.
    const sub = bruto
      .split(new RegExp(RE_SEPARADOR_RIGIDO.source, "gm"))
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of sub) mensagens.push(s);
  }

  return mensagens.filter((b) => b.replace(/[^\p{L}\p{N}]/gu, "").length >= 20);
}

/* ─── Segmentação de texto COPIADO do WhatsApp Web / Comunidades ─── */

// Formato de copy-paste (diferente da exportação .txt):
//   Comunicados
//   Ontem
//   Matt Navarra+44 7714 337072      <- remetente: nome colado ao telefone
//   Administrador/a da comunidade
//   <cartão de pré-visualização: título / descrição / domínio>
//   <corpo real da mensagem + bullets>
//   https://...
//   18:15                            <- hora no FIM da mensagem

// Linha de remetente: nome (curto, sem URL) imediatamente seguido de telefone.
const RE_REMETENTE_COPIADO = /^\s*([^\d+@]{2,60}?)\s*\+\d[\d\s().-]{6,}\s*$/;
const RE_MARCADOR_COMUNIDADE = /^\s*administrador\/?a?\s+da\s+comunidade\s*$/i;
const RE_PREAMBULO = /^\s*(comunicados|an[uú]ncios|ontem|hoje|yesterday|today|ler mais|read more|segunda-feira|ter[cç]a-feira|quarta-feira|quinta-feira|sexta-feira|s[aá]bado|domingo)\s*$/i;
const RE_HORA_ISOLADA = /^\s*\d{1,2}:\d{2}(\s*[APap][Mm])?\s*$/;
const RE_DOMINIO_NU = /^\s*(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\/?\s*$/i;

function hostDeUrl(u: string): string | null {
  const m = u.match(/https?:\/\/([^\s<>"')/]+)/i);
  return m ? m[1].toLowerCase().replace(/^www\./, "") : null;
}

/**
 * Remove o cartão de pré-visualização de link que o WhatsApp cola antes do
 * corpo da mensagem. O cartão termina numa linha com o domínio nu
 * (`www.404media.co`); só o removemos se o corpo seguinte tiver um URL do
 * mesmo domínio e ainda sobrar texto suficiente.
 */
export function removerCartaoPreview(mensagem: string): string {
  const linhas = mensagem.split("\n");
  for (let i = 0; i < Math.min(linhas.length, 8); i++) {
    const m = linhas[i].match(RE_DOMINIO_NU);
    if (!m) continue;
    const resto = linhas.slice(i + 1).join("\n").trim();
    const host = hostDeUrl(resto);
    const dominio = m[1].toLowerCase().replace(/^www\./, "");
    if (host && (host === dominio || host.endsWith(`.${dominio}`) || dominio.endsWith(`.${host}`))) {
      if (resto.replace(/[^\p{L}\p{N}]/gu, "").length >= 40) return resto;
    }
    break;
  }
  return mensagem.trim();
}

/**
 * Segmenta texto copiado da interface do WhatsApp. Devolve uma mensagem por
 * remetente detectado, sem cabeçalhos, sem preâmbulo de ecrã, sem hora final
 * e sem cartão de pré-visualização. Devolve null quando o formato não é
 * reconhecido (menos de 2 marcadores), para não afectar colagens normais.
 */
export function segmentarWhatsAppCopiado(texto: string): string[] | null {
  if (!texto) return null;
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n");

  const cortes: number[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const t = linhas[i].trim();
    if (!t) continue;
    if (RE_REMETENTE_COPIADO.test(t)) cortes.push(i);
    else if (RE_MARCADOR_COMUNIDADE.test(t) && (cortes.length === 0 || i - cortes[cortes.length - 1] > 3)) {
      cortes.push(i);
    }
  }
  if (cortes.length < 2) return null;

  const mensagens: string[] = [];
  for (let c = 0; c < cortes.length; c++) {
    const inicio = cortes[c] + 1;
    const fim = c + 1 < cortes.length ? cortes[c + 1] : linhas.length;
    const uteis: string[] = [];
    for (const raw of linhas.slice(inicio, fim)) {
      const t = raw.trim();
      if (RE_MARCADOR_COMUNIDADE.test(t)) continue;
      if (RE_PREAMBULO.test(t)) continue;
      if (RE_HORA_ISOLADA.test(t)) continue;
      if (RE_TELEFONE.test(t)) continue;
      if (RE_REACCAO.test(t)) continue;
      uteis.push(raw.trimEnd());
    }
    const bruto = uteis.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!bruto) continue;
    const sub = bruto
      .split(new RegExp(RE_SEPARADOR_RIGIDO.source, "gm"))
      .map((s) => removerCartaoPreview(s.trim()))
      .filter(Boolean);
    for (const s of sub) mensagens.push(s);
  }

  const finais = mensagens.filter((b) => b.replace(/[^\p{L}\p{N}]/gu, "").length >= 20);
  return finais.length > 0 ? finais : null;
}



/* ─── Normalização de URL ─── */

export const PARAMS_TRACKING = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "fbclid", "gclid", "gbraid", "wbraid", "msclkid", "mc_cid", "mc_eid",
  "ref", "ref_src", "ref_url", "igshid", "mkt_tok", "vero_id", "vero_conv",
  "_hsenc", "_hsmi", "hsctatracking", "ck_subscriber_id", "sc_src", "sc_eh",
  "sc_customer", "sc_llid", "sc_uid", "oly_enc_id", "oly_anon_id", "spm",
  "trk", "trkcampaign", "cmpid", "campaign_id", "email_token", "userid",
]);

export function normalizarUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    u.hash = "";
    const params = Array.from(u.searchParams.keys());
    for (const k of params) {
      if (PARAMS_TRACKING.has(k.toLowerCase())) u.searchParams.delete(k);
    }
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    const qs = u.searchParams.toString();
    return `${u.protocol}//${u.hostname}${path}${qs ? `?${qs}` : ""}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/* ─── Desembrulhar URLs "wrapper" ─── */

// Wrappers que embutem o URL original no pathname. Devolvemos o interior:
//   removepaywalls.com/https://real.com/x  → https://real.com/x
//   12ft.io/https://real.com/x             → https://real.com/x
// Wrappers que só têm um slug curto (archive.is/5bJOd) mantêm-se — o URL
// real só se recupera com HTTP, e isso fica para outra iteração; devolvemos
// o URL original inalterado.
export function desembrulharUrl(url: string): string {
  if (!url) return url;
  const s = url.trim();
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "removepaywalls.com" || host === "12ft.io") {
      // O caminho é literalmente o URL original com barras — não codificado.
      const inner = s.replace(/^https?:\/\/(?:www\.)?(?:removepaywalls\.com|12ft\.io)\//i, "");
      if (/^https?:\/\//i.test(inner)) return inner;
    }
  } catch { /* devolver original em baixo */ }
  return s;
}

/* ─── Dedupe por URL normalizado ─── */

/**
 * Devolve o subconjunto de `items` cujo URL (após normalização) ainda não apareceu.
 * O `Set` opcional `jaVistos` é modificado em-place para partilhar estado entre chamadas
 * (ex.: URLs já existentes na BD + URLs repetidos entre feeds).
 */
export function dedupPorUrl<T>(
  items: T[],
  getUrl: (item: T) => string | null | undefined,
  jaVistos: Set<string> = new Set(),
): T[] {
  const out: T[] = [];
  for (const it of items) {
    const raw = getUrl(it);
    if (!raw) continue;
    const k = normalizarUrl(raw);
    if (jaVistos.has(k)) continue;
    jaVistos.add(k);
    out.push(it);
  }
  return out;
}

/* ─── Limpeza de HTML de newsletter (email) ─── */

const RODAPE_PATTERNS = [
  /unsubscribe/i,
  /cancelar\s+(a\s+)?subscri[cç][aã]o/i,
  /view\s+(this\s+email\s+)?in\s+(your\s+)?browser/i,
  /ver\s+(no|em)\s+browser/i,
  /manage\s+(your\s+)?preferences?/i,
  /preferences?\s+de\s+email/i,
  /update\s+(your\s+)?preferences?/i,
  /remover\s+da\s+lista/i,
  /forwarded\s+this\s+email/i,
  /you\s+are\s+receiving\s+this/i,
  /recebeste\s+este\s+email/i,
  /©\s*\d{4}/,
];

/**
 * Converte HTML de newsletter em texto estruturado para o extractor.
 * - Descarta <style>, <script>, comentários e pixels de rastreio (1x1).
 * - Preserva parágrafos, títulos e listas.
 * - Colapsa <a> para «texto (url)».
 * - Remove blocos com padrões de rodapé (unsubscribe, view in browser, etc.).
 */
export function limparHtmlNewsletter(html: string): string {
  let s = html;
  // Remover comentários, style, script
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<style\b[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<head\b[\s\S]*?<\/head>/gi, "");
  // Pixels 1x1 de rastreio
  s = s.replace(/<img\b[^>]*(?:width=["']?1["']?|height=["']?1["']?)[^>]*>/gi, "");
  // Restantes imagens: descartar (não trazem valor factual)
  s = s.replace(/<img\b[^>]*>/gi, "");
  // Links -> «texto (href)»
  s = s.replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, txt) => {
    const t = String(txt).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const h = String(href).trim();
    if (!h || h.startsWith("mailto:") || h.startsWith("#")) return t;
    if (!t || t === h) return h;
    return `${t} (${h})`;
  });
  // Quebras/parágrafos/títulos/listas -> newlines
  s = s.replace(/<\s*br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|section|article|tr|td|th|table)>/gi, "\n\n");
  s = s.replace(/<\/(h[1-6])>/gi, "\n\n");
  s = s.replace(/<li\b[^>]*>/gi, "- ");
  s = s.replace(/<\/li>/gi, "\n");
  // Remover todas as restantes tags
  s = s.replace(/<[^>]+>/g, "");
  // Decodificar entidades HTML básicas
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  // Normalizar whitespace
  s = s.replace(/[ \t]+/g, " ").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  // Filtrar blocos com padrões de rodapé
  const blocos = s.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const uteis = blocos.filter((b) => {
    if (b.length < 20) return false;
    return !RODAPE_PATTERNS.some((re) => re.test(b));
  });
  return uteis.join("\n\n");
}

/**
 * Extrai "Nome" e "email@dominio" de um cabeçalho From típico.
 * Aceita `Nome <email>`, `"Nome" <email>`, ou só `email`.
 */
export function parseFrom(from: string | undefined | null): { nome: string | null; email: string | null } {
  if (!from || typeof from !== "string") return { nome: null, email: null };
  const s = from.trim();
  const m = s.match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>\s*$/);
  if (m) return { nome: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  if (/^[^\s@]+@[^\s@]+$/.test(s)) return { nome: null, email: s.toLowerCase() };
  return { nome: s || null, email: null };
}
