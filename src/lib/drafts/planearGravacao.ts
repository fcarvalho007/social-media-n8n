/**
 * Decides how a social draft is persisted.
 * - Existing draft: never touch authorship (user_id), project_id or origin fields.
 * - New draft: apply the currently chosen Studio project (resolved lazily).
 * - A draft requested via ?draft= that has not finished loading must not be
 *   saved as a new draft under the current brand.
 */
const CAMPOS_PROTEGIDOS = ['user_id', 'project_id', 'origem', 'origem_id', 'conteudo_id', 'id', 'created_at'] as const;

export type PlanoGravacao<T> =
  | { tipo: 'atualizar'; id: string; campos: Omit<T, (typeof CAMPOS_PROTEGIDOS)[number]> }
  | { tipo: 'criar'; campos: T; projeto: () => Promise<string | null> }
  | { tipo: 'aguardar' };

export function planearGravacaoRascunho<T extends object>(
  dados: T,
  idExistente: string | null,
  rascunhoPedido: string | null,
  projetoAtual: () => Promise<string | null>,
): PlanoGravacao<T> {
  if (idExistente) {
    const campos: Record<string, unknown> = { ...dados };
    for (const c of CAMPOS_PROTEGIDOS) delete campos[c];
    return { tipo: 'atualizar', id: idExistente, campos: campos as Omit<T, (typeof CAMPOS_PROTEGIDOS)[number]> };
  }
  if (rascunhoPedido) return { tipo: 'aguardar' };
  return { tipo: 'criar', campos: dados, projeto: projetoAtual };
}
