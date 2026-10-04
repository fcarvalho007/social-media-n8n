import { Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useProjeto } from "@/contexts/ProjetoContext";
import { descreverMarca, type RascunhoCarregado } from "@/lib/drafts/marcaRascunho";

/** One-line explanation of which brand/project the social draft belongs to. */
export function MarcaDoRascunho({ carregado }: { carregado: RascunhoCarregado | null }) {
  const { user } = useAuth();
  const ctx = useProjeto();
  if (ctx.estado !== "pronto") return null;
  const nomes = Object.fromEntries(ctx.projetos.map((p) => [p.id, p.name]));
  const m = descreverMarca(carregado, ctx.projetoId, nomes, user?.id ?? null);
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-live="polite">
      <Tag className="h-3.5 w-3.5" aria-hidden />
      <span>Este rascunho fica em: <strong className="text-foreground">{m.projeto}</strong> ({m.nota})</span>
      {m.outroAutor && <span>· Autor: outro membro da equipa · a autoria mantém-se</span>}
    </p>
  );
}
