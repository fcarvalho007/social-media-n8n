/**
 * Local recovery of unsaved editor text, scoped per user + kind + item + project.
 * Protects against loss on internal navigation (BrowserRouter has no blocker).
 * Entries of other users are never read: the key always includes the user id.
 */
export interface Recuperacao<T> { dados: T; guardado_em: string }

const PREFIXO = "estudio:recuperacao";

export function chaveRecuperacao(userId: string, tipo: string, id: string | null | undefined, projeto: string | null | undefined): string {
  return `${PREFIXO}:${userId}:${tipo}:${id || "novo"}:${projeto || "todos"}`;
}

export function guardarRecuperacao<T>(chave: string, dados: T, agora = new Date()): void {
  try { localStorage.setItem(chave, JSON.stringify({ dados, guardado_em: agora.toISOString() } satisfies Recuperacao<T>)); }
  catch { /* storage full or unavailable: nothing else to do */ }
}

export function lerRecuperacao<T>(chave: string, userId: string): Recuperacao<T> | null {
  if (!chave.startsWith(`${PREFIXO}:${userId}:`)) return null;
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return null;
    const v = JSON.parse(raw) as Recuperacao<T>;
    return v && typeof v === "object" && "dados" in v ? v : null;
  } catch { return null; }
}

export function limparRecuperacao(chave: string): void {
  try { localStorage.removeItem(chave); } catch { /* ignore */ }
}

/**
 * Result of a save that may finish after the user kept typing.
 * - If the editor still holds exactly what was sent, adopt the server copy.
 * - Otherwise keep the newer text (merged with server-assigned fields) and stay dirty.
 */
export function aplicarGravacao<T>(enviado: T, atual: T, salvo: T, mesclar: (atual: T, salvo: T) => T, igual: (a: T, b: T) => boolean): { edit: T; base: T; sujo: boolean } {
  if (igual(enviado, atual)) return { edit: salvo, base: salvo, sujo: false };
  return { edit: mesclar(atual, salvo), base: salvo, sujo: true };
}
