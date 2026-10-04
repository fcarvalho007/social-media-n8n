import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProjeto } from "@/contexts/ProjetoContext";
import { apagarArtigo, guardarArtigo, listarArtigos, type Artigo } from "@/services/estudio";

type Edit = { id?: string; titulo: string; resumo: string; corpo: string; project_id: string | null };
const SEM = "__sem__";
const deArtigo = (a: Artigo): Edit => ({ id: a.id, titulo: a.titulo, resumo: a.resumo ?? "", corpo: a.corpo ?? "", project_id: a.project_id });
const igual = (a: Edit, b: Edit) => a.titulo === b.titulo && a.resumo === b.resumo && a.corpo === b.corpo && a.project_id === b.project_id;
const dataPt = (s: string) => new Date(s).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", dateStyle: "short", timeStyle: "short" });

export default function Artigos() {
  const ctx = useProjeto();
  const [params, setParams] = useSearchParams();
  const novo = useCallback((): Edit => ({ titulo: "", resumo: "", corpo: "", project_id: ctx.projetoId }), [ctx.projetoId]);
  const [lista, setLista] = useState<{ fase: "a_carregar" | "pronto" | "erro"; artigos: Artigo[]; erro?: string }>({ fase: "a_carregar", artigos: [] });
  const [edit, setEdit] = useState<Edit>(novo);
  const [base, setBase] = useState<Edit>(novo);
  const [aGuardar, setAGuardar] = useState(false);
  const [erroGuardar, setErroGuardar] = useState<string | null>(null);
  const [pendente, setPendente] = useState<null | { tipo: "trocar"; alvo: Edit } | { tipo: "apagar"; artigo: Artigo }>(null);
  const sujo = !igual(edit, base);

  const carregar = useCallback(async () => {
    setLista((l) => ({ ...l, fase: l.artigos.length ? "pronto" : "a_carregar", erro: undefined }));
    try { setLista({ fase: "pronto", artigos: await listarArtigos(ctx.projetoId) }); }
    catch (e) { setLista({ fase: "erro", artigos: [], erro: (e as Error).message }); }
  }, [ctx.projetoId]);
  useEffect(() => { if (ctx.estado === "pronto") carregar(); }, [ctx.estado, carregar]);

  // Open ?id= from the Studio continuity summary.
  useEffect(() => {
    const id = params.get("id");
    const a = id ? lista.artigos.find((x) => x.id === id) : undefined;
    if (a && !sujo && edit.id !== a.id) { const e = deArtigo(a); setEdit(e); setBase(e); }
  }, [params, lista.artigos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sujo) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [sujo]);

  const abrir = (alvo: Edit) => {
    if (sujo) return setPendente({ tipo: "trocar", alvo });
    setEdit(alvo); setBase(alvo); setErroGuardar(null);
    setParams(alvo.id ? { id: alvo.id } : {}, { replace: true });
  };

  const guardar = async () => {
    if (!edit.titulo.trim()) { setErroGuardar("Indica um título."); return; }
    setAGuardar(true); setErroGuardar(null);
    try {
      const salvo = deArtigo(await guardarArtigo({ ...edit, titulo: edit.titulo.trim() }));
      setEdit(salvo); setBase(salvo);
      setParams({ id: salvo.id! }, { replace: true });
      toast.success("Rascunho guardado");
      carregar();
    } catch (e) { setErroGuardar(`Não foi guardado — o texto continua no editor. ${(e as Error).message}`); }
    finally { setAGuardar(false); }
  };

  const confirmarApagar = async (a: Artigo) => {
    try {
      await apagarArtigo(a.id);
      toast.success("Rascunho apagado");
      if (edit.id === a.id) { const n = novo(); setEdit(n); setBase(n); setParams({}, { replace: true }); }
      carregar();
    } catch (e) { toast.error(`Não foi apagado: ${(e as Error).message}`); }
  };

  const nomeProjeto = (id: string | null) => ctx.projetos.find((p) => p.id === id)?.name ?? "Sem projeto";

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-[1fr_2fr]">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Artigos</h1>
        <p className="text-xs text-muted-foreground">{ctx.projeto ? `Projeto ${ctx.projeto.name}` : "Todos os projetos"} · só rascunhos, nada é publicado</p>
        <Button variant="outline" size="sm" onClick={() => abrir(novo())}><Plus className="mr-1 h-4 w-4" />Novo rascunho</Button>
        {lista.fase === "a_carregar" && <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</div>}
        {lista.fase === "erro" && (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar</AlertTitle>
            <AlertDescription className="space-y-2"><p>{lista.erro}</p><Button size="sm" variant="outline" onClick={carregar}>Tentar de novo</Button></AlertDescription>
          </Alert>
        )}
        {lista.fase === "pronto" && (
          <ul className="divide-y rounded-md border">
            {lista.artigos.map((a) => (
              <li key={a.id} className={`flex items-center justify-between gap-2 p-2 ${edit.id === a.id ? "bg-muted" : ""}`}>
                <button className="min-w-0 flex-1 text-left text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => abrir(deArtigo(a))}>
                  <span className="block truncate font-medium">{a.titulo}</span>
                  <span className="block text-xs text-muted-foreground">{nomeProjeto(a.project_id)} · {dataPt(a.updated_at)}</span>
                </button>
                <Button variant="ghost" size="sm" aria-label={`Apagar ${a.titulo}`} onClick={() => setPendente({ tipo: "apagar", artigo: a })}>Apagar</Button>
              </li>
            ))}
            {lista.artigos.length === 0 && <li className="p-2 text-sm text-muted-foreground">Sem rascunhos{ctx.projeto ? " neste projeto" : ""}.</li>}
          </ul>
        )}
      </div>

      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={sujo ? "text-destructive" : "text-muted-foreground"}>
            {aGuardar ? "A guardar…" : sujo ? "Alterações por guardar" : edit.id ? "Guardado" : "Rascunho novo"}
          </span>
        </div>
        <div className="space-y-1">
          <Label htmlFor="art-projeto">Projeto</Label>
          <Select value={edit.project_id ?? SEM} onValueChange={(v) => setEdit({ ...edit, project_id: v === SEM ? null : v })}>
            <SelectTrigger id="art-projeto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM}>Sem projeto</SelectItem>
              {ctx.projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="art-titulo">Título</Label>
          <Input id="art-titulo" value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="art-resumo">Resumo</Label>
          <Textarea id="art-resumo" rows={3} value={edit.resumo} onChange={(e) => setEdit({ ...edit, resumo: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="art-corpo">Texto do artigo</Label>
          <Textarea id="art-corpo" rows={18} value={edit.corpo} onChange={(e) => setEdit({ ...edit, corpo: e.target.value })} />
        </div>
        {erroGuardar && <p role="alert" className="text-sm text-destructive">{erroGuardar}</p>}
        <Button type="submit" disabled={aGuardar || (!sujo && !!edit.id)}>
          {aGuardar && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Guardar rascunho
        </Button>
      </form>

      <AlertDialog open={!!pendente} onOpenChange={(o) => !o && setPendente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendente?.tipo === "apagar" ? "Apagar este rascunho?" : "Descartar alterações por guardar?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendente?.tipo === "apagar"
                ? `«${pendente.artigo.titulo}» é apagado de forma definitiva e não pode ser recuperado.`
                : "O texto alterado no editor perde-se se continuares sem guardar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const p = pendente; setPendente(null);
              if (!p) return;
              if (p.tipo === "apagar") confirmarApagar(p.artigo);
              else { setEdit(p.alvo); setBase(p.alvo); setErroGuardar(null); setParams(p.alvo.id ? { id: p.alvo.id } : {}, { replace: true }); }
            }}>{pendente?.tipo === "apagar" ? "Apagar" : "Descartar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
