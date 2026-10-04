import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, Mail, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjeto } from "@/contexts/ProjetoContext";
import type { Identidade } from "@/services/estudio";

/** The newsletter identity (DIGITALSPRINT) is the only editorial identity of type "newsletter". */
export function identidadeNewsletter(ids: Identidade[]): Identidade | null {
  return ids.find((i) => i.tipo === "newsletter") ?? null;
}

export type DecisaoFronteira =
  | { tipo: "mostrar"; projetoDono: string | null }
  | { tipo: "outro_projeto"; projetoDono: string | null }
  | { tipo: "sem_identidade" };

/** Pure decision: never show the newsletter as belonging to an unrelated project. */
export function decidirFronteira(identidade: Identidade | null, projetoEscolhido: string | null): DecisaoFronteira {
  if (!identidade) return { tipo: "sem_identidade" };
  if (projetoEscolhido === null || identidade.project_id === projetoEscolhido) return { tipo: "mostrar", projetoDono: identidade.project_id };
  return { tipo: "outro_projeto", projetoDono: identidade.project_id };
}

/**
 * Boundary around the ported newsletter module (kept outside generated files).
 * Explains the DIGITALSPRINT identity and keeps the Studio project choice coherent.
 */
export function FronteiraProjetoNewsletter({ children }: { children: ReactNode }) {
  const ctx = useProjeto();
  const { pathname } = useLocation();
  const [aMudar, setAMudar] = useState(false);

  // Admin migration is not brand-scoped.
  if (pathname.startsWith("/newsletter/migracao")) return <>{children}</>;

  if (ctx.estado === "a_carregar") return <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-40 w-full" /></div>;
  if (ctx.estado === "erro") {
    return (
      <div className="mx-auto max-w-xl p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível confirmar o projeto da newsletter</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{ctx.erro}</span>
            <Button size="sm" variant="outline" onClick={ctx.recarregar}><RefreshCw className="mr-1 h-4 w-4" />Tentar de novo</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const ident = identidadeNewsletter(ctx.identidades);
  const d = decidirFronteira(ident, ctx.projetoId);
  const nome = (id: string | null) => ctx.projetos.find((p) => p.id === id)?.name ?? null;
  const mudar = async (id: string | null) => {
    setAMudar(true);
    try { await ctx.escolher(id); } catch (e) { toast.error(`A escolha não foi guardada: ${(e as Error).message}`); }
    finally { setAMudar(false); }
  };

  if (d.tipo === "sem_identidade") {
    return (
      <div className="mx-auto max-w-xl p-4">
        <Alert><AlertTitle>Identidade da newsletter não encontrada</AlertTitle>
          <AlertDescription>A newsletter DIGITALSPRINT ainda não está registada como identidade do Estúdio. Um administrador pode associá-la na <Link to="/" className="underline">página inicial</Link>.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (d.tipo === "outro_projeto") {
    const dono = nome(d.projetoDono);
    return (
      <div className="mx-auto max-w-xl space-y-3 p-4">
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertTitle>A newsletter {ident?.nome} não pertence a {ctx.projeto?.name ?? "este projeto"}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{dono ? `Pertence ao projeto ${dono}.` : "Ainda não está associada a nenhum projeto."} Para não a mostrar sob outra marca, escolhe o projeto dela ou todos os projetos.</p>
            <div className="flex flex-wrap gap-2">
              {d.projetoDono && dono && <Button size="sm" disabled={aMudar} onClick={() => mudar(d.projetoDono)}>Mudar para {dono}</Button>}
              <Button size="sm" variant="outline" disabled={aMudar} onClick={() => mudar(null)}>Ver todos os projetos</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const dono = nome(d.projetoDono);
  return (
    <>
      <p className="border-b px-4 py-1 text-xs text-muted-foreground">
        Newsletter {ident?.nome} · {dono ? `projeto ${dono}` : "sem projeto associado"}{ctx.projetoId === null ? " · a ver todos os projetos" : ""}
      </p>
      {children}
    </>
  );
}
