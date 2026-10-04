// Recovery after a new deploy removes old lazy chunks. Only chunk-load failures qualify;
// at most one automatic reload per window, so a permanently missing file never loops.
export const CHAVE_RECARGA = "recarga-build";
export const JANELA_MS = 5 * 60_000;

const PADROES = [
  /Unable to preload CSS/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading (CSS )?chunk \S+ failed/i,
];

export function eErroDeChunk(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : typeof erro === "string" ? erro : "";
  return PADROES.some((p) => p.test(msg));
}

/** Returns true when a reload was triggered (caller should stop handling the error). */
export function tentarRecarga(armazem: Pick<Storage, "getItem" | "setItem">, recarregar: () => void, agora = Date.now()): boolean {
  const ultima = Number(armazem.getItem(CHAVE_RECARGA) ?? 0);
  if (agora - ultima < JANELA_MS) return false;
  armazem.setItem(CHAVE_RECARGA, String(agora));
  recarregar();
  return true;
}
