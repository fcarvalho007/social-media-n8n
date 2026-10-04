/** Tiny in-app bus: confirmed project mutations notify the global ProjetoContext to reload. */
type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();

export function notificarProjetosAlterados(): void {
  ouvintes.forEach((o) => o());
}

export function ouvirProjetosAlterados(o: Ouvinte): () => void {
  ouvintes.add(o);
  return () => { ouvintes.delete(o); };
}
