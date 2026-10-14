import process from "node:process";
// Cliente único da DeepSeek — usado por todas as funcionalidades de IA da app.
// Server-only: nunca importar deste ficheiro a partir do bundle do browser.
//
// A app é 100% DeepSeek: extracção de notícias, sugestão de assunto,
// encurtar descrições e ranking de fontes IA. Não há chamadas ao Lovable
// AI Gateway (Gemini/OpenAI) em runtime.

import { extrairTokens } from "../edge-shared/custos-ia.ts";

export const MODELO_DEEPSEEK_PADRAO = "deepseek-flash";
export const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";

export type DeepSeekUsage = { cacheHit: number; cacheMiss: number; saida: number };

export type DeepSeekResposta = {
  conteudo: string;
  modelo: string;
  usage: DeepSeekUsage;
};

interface Opcoes {
  modelo?: string;
  responseJson?: boolean;
  temperatura?: number;
}

/**
 * Chama a DeepSeek com um `system` + `user`. Devolve o conteúdo em bruto,
 * o modelo efectivamente usado e os tokens consumidos (para registo em `ia_uso`).
 *
 * Trata:
 *  - 401/403: chave inválida ou sem permissões
 *  - 402:     saldo insuficiente na DeepSeek
 *  - 429:     rate limit — devolve mensagem em pt-PT
 *  - 5xx:     falha transitória — devolve mensagem em pt-PT
 */
export async function chamarDeepSeek(
  system: string,
  user: string,
  opts: Opcoes = {},
): Promise<DeepSeekResposta> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY não está configurada. Adiciona a chave em Definições.");
  }

  const modelo = opts.modelo || MODELO_DEEPSEEK_PADRAO;

  const body: Record<string, unknown> = {
    model: modelo,
    // Non-thinking mode (official toggle) for economical editorial tasks.
    thinking: { type: "disabled" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (opts.responseJson) body.response_format = { type: "json_object" };
  if (typeof opts.temperatura === "number") body.temperature = opts.temperatura;

  let res: Response;
  try {
    res = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Não foi possível contactar a DeepSeek: ${(e as Error).message}`);
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error("DeepSeek recusou a chave (401/403). Verifica DEEPSEEK_API_KEY.");
  }
  if (res.status === 402) {
    throw new Error("Sem saldo na DeepSeek. Recarrega a conta para continuar.");
  }
  if (res.status === 429) {
    throw new Error("A DeepSeek está a limitar pedidos. Tenta novamente daqui a pouco.");
  }
  if (res.status >= 500) {
    const t = await res.text().catch(() => "");
    throw new Error(`DeepSeek temporariamente indisponível (${res.status}): ${t.slice(0, 160)}`);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`DeepSeek falhou (${res.status}): ${t.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
    model?: string;
  };

  const conteudo = json?.choices?.[0]?.message?.content ?? "";
  const usage = extrairTokens(json?.usage);
  return { conteudo, modelo: json?.model || modelo, usage };
}

/** Extrai o primeiro objecto JSON válido de um texto (a DeepSeek por vezes acrescenta prosa). */
export function parseJsonTolerante<T = unknown>(texto: string): T | null {
  if (!texto) return null;
  try { return JSON.parse(texto) as T; } catch { /* tenta extrair */ }
  const m = texto.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}
