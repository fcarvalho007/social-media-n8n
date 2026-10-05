// Direct DeepSeek client for every runtime text feature (no Lovable AI Gateway, no fallback).
// Pure fetch + env lookup through globalThis so Vitest can exercise it without Deno.
// Thinking mode is disabled explicitly (official OpenAI-format toggle) for normal editorial tasks.
export const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
export const MODELO_DEEPSEEK = "deepseek-flash";
export const ERRO_SEM_CHAVE = "A DeepSeek não está configurada no servidor (DEEPSEEK_API_KEY em falta).";

type EnvLike = { Deno?: { env: { get(k: string): string | undefined } }; process?: { env: Record<string, string | undefined> } };
export function chaveDeepSeek(): string | undefined {
  const g = globalThis as unknown as EnvLike;
  return g.Deno?.env.get("DEEPSEEK_API_KEY") ?? g.process?.env?.DEEPSEEK_API_KEY;
}

export interface PedidoDeepSeek {
  sistema: string;
  utilizador: string;
  json?: boolean;
  stream?: boolean;
  modelo?: string;
  temperatura?: number;
  maxTokens?: number;
}

export function corpoDeepSeek(p: PedidoDeepSeek): Record<string, unknown> {
  const corpo: Record<string, unknown> = {
    model: p.modelo || MODELO_DEEPSEEK,
    thinking: { type: "disabled" },
    messages: [{ role: "system", content: p.sistema }, { role: "user", content: p.utilizador }],
  };
  if (p.json) corpo.response_format = { type: "json_object" };
  if (p.stream) { corpo.stream = true; corpo.stream_options = { include_usage: true }; }
  if (typeof p.temperatura === "number") corpo.temperature = p.temperatura;
  if (typeof p.maxTokens === "number") corpo.max_tokens = p.maxTokens;
  return corpo;
}

export class ErroDeepSeek extends Error {
  constructor(public status: number, mensagem: string) { super(mensagem); }
}

export function mensagemStatus(status: number): string {
  if (status === 401 || status === 403) return "A DeepSeek recusou a chave configurada.";
  if (status === 402) return "Sem saldo na DeepSeek. Recarrega a conta para continuar.";
  if (status === 429) return "A DeepSeek está a limitar pedidos. Tenta novamente daqui a pouco.";
  if (status >= 500) return "A DeepSeek está temporariamente indisponível.";
  return "O pedido à DeepSeek foi recusado por ser inválido.";
}

/** Non-streaming call for short assistant tasks. Throws ErroDeepSeek with a pt-PT message. */
export async function textoDeepSeek(p: PedidoDeepSeek, f: typeof fetch = fetch): Promise<{ texto: string; tokens: number | null; modelo: string }> {
  const chave = chaveDeepSeek();
  if (!chave) throw new ErroDeepSeek(503, ERRO_SEM_CHAVE);
  const r = await f(DEEPSEEK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${chave}` },
    body: JSON.stringify(corpoDeepSeek({ ...p, stream: false })),
  });
  if (!r.ok) { await r.text().catch(() => ""); throw new ErroDeepSeek(r.status, mensagemStatus(r.status)); }
  const j = await r.json() as { choices?: { message?: { content?: string } }[]; usage?: { total_tokens?: number }; model?: string };
  return { texto: String(j.choices?.[0]?.message?.content ?? "").trim(), tokens: j.usage?.total_tokens ?? null, modelo: j.model || p.modelo || MODELO_DEEPSEEK };
}

export function limparJson(texto: string): string {
  return texto.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}
