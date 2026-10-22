import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Mail, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apagarPorConcluir, lerRascunhoSocial, listarPorConcluir, type PorConcluir } from "@/services/estudio";

const dataPt = (s: string) => new Date(s).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric" });

export interface EdicaoAberta { numero: number; estado: string }

export function ContinuarOndeFicaste({ projetoId, edicao }: { projetoId: string | null; edicao: EdicaoAberta | null }) {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<"a_carregar" | "pronto" | "erro">("a_carregar");
  const [itens, setItens] = useState<PorConcluir[]>([]);
  const [total, setTotal] = useState(0);
  const [aApagar, setAApagar] = useState<PorConcluir | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let vivo = true;
    setEstado("a_carregar");
    listarPorConcluir(projetoId).then((r) => { if (vivo) { setItens(r.itens); setTotal(r.total); setEstado("pronto"); } }).catch(() => vivo && setEstado("erro"));
    return () => { vivo = false; };
  }, [projetoId, tentativa]);

  const retomar = async (i: PorConcluir) => {
    if (i.tipo === "artigo") return navigate(`/artigos?id=${i.id}`);
    try { sessionStorage.setItem("editDraft", JSON.stringify(await lerRascunhoSocial(i.id))); navigate("/manual-create"); }
    catch (e) { toast.error(`Não foi possível abrir o rascunho: ${(e as Error).message}`); }
  };

  const confirmarApagar = async () => {
    const alvo = aApagar; setAApagar(null);
    if (!alvo) return;
    const antes = itens;
    setItens((l) => l.filter((x) => x.id !== alvo.id)); setTotal((n) => Math.max(0, n - 1));
    try { await apagarPorConcluir(alvo); toast.success("Rascunho apagado"); }
    catch (e) { setItens(antes); setTotal((n) => n + 1); toast.error(`Não foi apagado: ${(e as Error).message}`); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="continuar" className="text-lg font-semibold tracking-tight">Continuar onde ficaste</h2>
        {total > 0 && <span className="text-xs text-muted-foreground">{total} por acabar</span>}
      </div>

      {edicao && (
        <div className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary"><Mail className="size-4" aria-hidden /></span>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">Newsletter · edição #{edicao.numero}</div><div className="text-xs text-muted-foreground">{edicao.estado}</div></div>
          <Button asChild size="sm" variant="outline"><Link to="/newsletter">Retomar</Link></Button>
        </div>
      )}

      {estado === "a_carregar" && <Skeleton className="h-28 w-full" />}
      {estado === "erro" && <p className="text-sm text-muted-foreground">Não foi possível carregar os rascunhos. <button className="underline" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</button></p>}
      {estado === "pronto" && itens.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <span>Não há nada por acabar. Começa pela Curadoria.</span>
          <Button asChild size="sm"><Link to="/curadoria">Abrir Curadoria</Link></Button>
        </div>
      )}
      {estado === "pronto" && itens.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2" aria-label="Rascunhos por acabar">
          {itens.map((i) => (
            <li key={`${i.tipo}-${i.id}`} className="group flex items-center gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:border-primary/40">
              {i.miniatura
                ? <img src={i.miniatura} alt="" loading="lazy" className="size-10 shrink-0 rounded-md object-cover" />
                : <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">{i.tipo === "artigo" ? <FileText className="size-4" aria-hidden /> : <PlusCircle className="size-4" aria-hidden />}</span>}
              <button type="button" onClick={() => retomar(i)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                <div className="truncate text-sm font-medium">{i.titulo}</div>
                <div className="truncate text-xs text-muted-foreground">{i.etapa} · {dataPt(i.atualizado)}</div>
              </button>
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => retomar(i)}>Retomar</Button>
              <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Apagar rascunho: ${i.titulo}`} onClick={() => setAApagar(i)}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      {estado === "pronto" && total > itens.length && (
        <div className="flex gap-3 text-xs"><Link className="text-primary hover:underline" to="/drafts">Ver todos os rascunhos sociais</Link><Link className="text-primary hover:underline" to="/artigos">Ver artigos</Link></div>
      )}

      <AlertDialog open={!!aApagar} onOpenChange={(o) => !o && setAApagar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este rascunho?</AlertDialogTitle>
            <AlertDialogDescription>«{aApagar?.titulo}» será apagado. Não é possível desfazer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarApagar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

