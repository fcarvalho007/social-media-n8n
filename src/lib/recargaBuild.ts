// Recovery after a new deploy removes old lazy chunks. Only chunk-load failures qualify.
// Exactly ONE automatic reload per identified failure (asset path, which carries the build hash),
// remembered persistently: a second failure of the same asset never reloads again (no time window),
// so a permanently missing file can never loop. A new build has new asset names and gets its own single try.
export const CHAVE_RECARGA = "recarga-build-v2";
const MAX_ASSINATURAS = 50;

const PADROES = [
  /Unable to preload CSS/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading (CSS )?chunk \S+ failed/i,
];

function mensagem(erro: unknown): string {
  return erro instanceof Error ? erro.message : typeof erro === "string" ? erro : "";
}

export function eErroDeChunk(erro: unknown): boolean {
  const msg = mensagem(erro);
  return PADROES.some((p) => p.test(msg));
}

/** Stable id of the failure: the asset path when present, otherwise the message. */
export function assinaturaErro(erro: unknown): string {
  const msg = mensagem(erro);
  const m = msg.match(/\/?assets\/[^\s'"`)]+|https?:\/\/[^\s'"`)]+/i);
  return (m ? m[0] : msg).slice(0, 300);
}

function lerLista(armazem: Pick<Storage, "getItem">): string[] {
  try {
    const v = JSON.parse(armazem.getItem(CHAVE_RECARGA) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Returns true when a reload was triggered. False means: already tried once, show manual recovery. */
export function tentarRecarga(armazem: Pick<Storage, "getItem" | "setItem">, recarregar: () => void, erro: unknown): boolean {
  const id = assinaturaErro(erro);
  const lista = lerLista(armazem);
  if (lista.includes(id)) return false;
  try {
    armazem.setItem(CHAVE_RECARGA, JSON.stringify([...lista, id].slice(-MAX_ASSINATURAS)));
  } catch {
    return false; // cannot persist the guard -> never auto-reload
  }
  recarregar();
  return true;
}
