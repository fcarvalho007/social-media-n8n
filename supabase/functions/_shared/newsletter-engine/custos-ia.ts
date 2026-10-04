// Cálculo partilhado de custos de chamadas à DeepSeek.
// Preços em USD por 1M tokens, conforme a tabela oficial da DeepSeek.
//
// A DeepSeek pratica duas tarifas: pico e fora de pico (metade do pico).
// Horas de pico: 01:00–04:00 e 06:00–10:00 UTC, de segunda a sexta-feira.
// Todas as restantes horas (e o fim-de-semana) são fora de pico.

export type TarifaModelo = {
  /** USD por 1M tokens de entrada com acerto de cache. */
  cacheHit: number;
  /** USD por 1M tokens de entrada sem acerto de cache. */
  cacheMiss: number;
  /** USD por 1M tokens de saída. */
  saida: number;
};

export type PrecoModelo = {
  pico: TarifaModelo;
  foraPico: TarifaModelo;
};

/** Data a partir da qual esta tabela de preços passou a ser aplicada. */
export const PRECOS_EM_VIGOR_DESDE = "2026-09-10";

/** Preços por 1M tokens (tarifa de pico; fora de pico é metade). */
export const PRECOS_DEEPSEEK: Record<string, PrecoModelo> = {
  "deepseek-flash": {
    pico: { cacheHit: 0.006, cacheMiss: 0.3, saida: 1.2 },
    foraPico: { cacheHit: 0.003, cacheMiss: 0.15, saida: 0.6 },
  },
  "deepseek-v4-pro": {
    pico: { cacheHit: 0.044, cacheMiss: 1.32, saida: 3.96 },
    foraPico: { cacheHit: 0.022, cacheMiss: 0.66, saida: 1.98 },
  },
};

/** Nomes antigos aceites pela DeepSeek, servidos e facturados como o modelo actual. */
export const ALIAS_MODELOS: Record<string, string> = {
  "deepseek-v4-flash": "deepseek-flash",
  "deepseek-v4-flash-vision-exp": "deepseek-flash",
  "deepseek-chat": "deepseek-flash",
  "deepseek-pro": "deepseek-v4-pro",
  "deepseek-v4-pro-0813": "deepseek-v4-pro",
};

/** Devolve o nome canónico do modelo (resolve nomes antigos). */
export function modeloCanonico(modelo: string): string {
  const m = (modelo || "").trim().toLowerCase();
  return ALIAS_MODELOS[m] ?? m;
}

/** Indica se existe tabela de preços para este modelo. */
export function precoConhecido(modelo: string): boolean {
  return Boolean(PRECOS_DEEPSEEK[modeloCanonico(modelo)]);
}

/** Verdadeiro se o instante indicado cai em horário de pico da DeepSeek. */
export function ehHorarioPico(quando: Date): boolean {
  const dia = quando.getUTCDay(); // 0 = domingo, 6 = sábado
  if (dia === 0 || dia === 6) return false;
  const h = quando.getUTCHours();
  return (h >= 1 && h < 4) || (h >= 6 && h < 10);
}

/** Tarifa aplicável a um modelo num dado instante, ou null se o preço for desconhecido. */
export function tarifaAplicavel(modelo: string, quando: Date): TarifaModelo | null {
  const p = PRECOS_DEEPSEEK[modeloCanonico(modelo)];
  if (!p) return null;
  return ehHorarioPico(quando) ? p.pico : p.foraPico;
}

/**
 * Custo em USD de uma chamada.
 * `quando` permite recalcular registos antigos; por omissão usa o instante actual.
 * Modelos sem preço conhecido devolvem 0 — usa `precoConhecido()` para os distinguir.
 */
export function custoUsd(
  modelo: string,
  cacheHit: number,
  cacheMiss: number,
  saida: number,
  quando: Date | string = new Date(),
): number {
  const instante = quando instanceof Date ? quando : new Date(quando);
  const t = tarifaAplicavel(modelo, Number.isNaN(instante.getTime()) ? new Date() : instante);
  if (!t) return 0; // modelo desconhecido — custo não calculável.
  const total =
    (cacheHit * t.cacheHit + cacheMiss * t.cacheMiss + saida * t.saida) / 1e6;
  return Math.round(total * 1e6) / 1e6; // 6 casas decimais (numeric(10,6))
}

// Extrai tokens do bloco `usage` de uma resposta OpenAI-compatible.
// Suporta variantes: DeepSeek (prompt_cache_hit_tokens / prompt_cache_miss_tokens),
// e providers genéricos (prompt_tokens + completion_tokens).
export function extrairTokens(usage: unknown): {
  cacheHit: number;
  cacheMiss: number;
  saida: number;
} {
  const u = (usage ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const cacheHit = num(u.prompt_cache_hit_tokens);
  const cacheMissDirecto = num(u.prompt_cache_miss_tokens);
  const promptTotal = num(u.prompt_tokens);
  const cacheMiss = cacheMissDirecto > 0
    ? cacheMissDirecto
    : Math.max(0, promptTotal - cacheHit);
  const saida = num(u.completion_tokens);
  return { cacheHit, cacheMiss, saida };
}
