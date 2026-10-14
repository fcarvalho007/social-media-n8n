// Leitura do texto real de um artigo. Server-only.
//
// Usado antes da chamada à IA para que a descrição (e «A minha leitura»)
// tenham material próprio em vez de reformularem o título. Nunca lança:
// quando o site bloqueia, demora ou não tem corpo utilizável, devolve "".

const UA = "DigitalSprintBot/1.0 (+leitor-de-artigos)";
const TIMEOUT_MS = 8000;
export const MAX_CORPO = 8000;

function decodificar(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function limpar(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|iframe|form|nav|aside|header|footer)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function texto(html: string): string {
  return decodificar(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Extrai o corpo do artigo a partir do HTML de uma página. */
export function extrairCorpoArtigo(html: string): string {
  const limpo = limpar(html);

  // 1) <article> — o contentor mais comum em sites editoriais.
  const artigos = Array.from(limpo.matchAll(/<article\b[\s\S]*?<\/article>/gi)).map((m) => m[0]);
  const candidatos: string[] = [];
  for (const a of artigos) candidatos.push(a);
  // 2) Fallback: a página toda (já sem navegação/rodapé).
  candidatos.push(limpo);

  for (const bloco of candidatos) {
    const paragrafos = Array.from(bloco.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
      .map((m) => texto(m[1] ?? ""))
      .filter((p) => p.length >= 60 && !/^(subscreve|assina|partilha|cookies?|publicidade)\b/i.test(p));
    if (paragrafos.length >= 2) {
      const corpo = paragrafos.join("\n\n");
      if (corpo.length >= 200) return corpo.slice(0, MAX_CORPO);
    }
  }

  // 3) Último recurso: descrição social, melhor que nada.
  const og = limpo.match(
    /<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]+content=["']([^"']+)["']/i,
  );
  return og ? decodificar(og[1] ?? "").trim().slice(0, MAX_CORPO) : "";
}

export interface ArtigoLido {
  corpo: string;
  ok: boolean;
  motivo?: string;
}

/**
 * Vai buscar a página e devolve o corpo do artigo. Limite de tempo curto:
 * uma fonte lenta nunca pode travar o processamento de um lote.
 */
export async function lerArtigo(url: string | null | undefined): Promise<ArtigoLido> {
  const alvo = (url ?? "").trim();
  if (!/^https?:\/\//i.test(alvo)) return { corpo: "", ok: false, motivo: "sem url" };

  const controlador = new AbortController();
  const relogio = setTimeout(() => controlador.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(alvo, {
      redirect: "follow",
      signal: controlador.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
      },
    });
    if (!resp.ok) return { corpo: "", ok: false, motivo: `HTTP ${resp.status}` };
    const tipo = resp.headers.get("content-type") ?? "";
    if (tipo && !/text\/html|application\/xhtml/i.test(tipo)) {
      return { corpo: "", ok: false, motivo: "não é HTML" };
    }
    const html = await resp.text();
    const corpo = extrairCorpoArtigo(html);
    return corpo ? { corpo, ok: true } : { corpo: "", ok: false, motivo: "sem corpo utilizável" };
  } catch (e) {
    return { corpo: "", ok: false, motivo: (e as Error).name === "AbortError" ? "tempo esgotado" : (e as Error).message };
  } finally {
    clearTimeout(relogio);
  }
}
