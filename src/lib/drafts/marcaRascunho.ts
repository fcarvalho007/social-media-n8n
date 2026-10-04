/** Pure helpers for scoping social drafts by user + project and describing a draft's brand. */

export interface FiltroRascunhos { userId: string; projetoId: string | null }

/** Cache key: a different user or project never shares cached drafts. */
export function chaveRascunhos(f: FiltroRascunhos | null): readonly unknown[] {
  return f ? ["drafts", f.userId, f.projetoId ?? "todos"] : ["drafts", "sem-contexto"];
}

/** Client-side guard mirroring the server filter: team drafts by brand; old drafts without project only under "todos". */
export function pertenceAoFiltro(d: { project_id?: string | null }, f: FiltroRascunhos): boolean {
  return f.projetoId === null || d.project_id === f.projetoId;
}

export interface RascunhoCarregado { user_id: string | null; project_id: string | null }

export interface DescricaoMarca { projeto: string; nota: string; outroAutor: boolean }

export function descreverMarca(
  carregado: RascunhoCarregado | null,
  projetoContexto: string | null,
  nomes: Record<string, string>,
  userId: string | null,
): DescricaoMarca {
  const nome = (id: string | null) => (id ? nomes[id] ?? "projeto indisponível" : "sem projeto");
  if (!carregado) return { projeto: nome(projetoContexto), nota: "projeto escolhido no Estúdio", outroAutor: false };
  return {
    projeto: nome(carregado.project_id),
    nota: "projeto original do rascunho, não muda ao guardar",
    outroAutor: !!carregado.user_id && !!userId && carregado.user_id !== userId,
  };
}
