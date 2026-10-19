import { CabecalhoPagina } from '@/components/CabecalhoPagina';
import { EditorVisualArtigo } from '@/features/seo/EditorVisualArtigo';
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { DOCUMENTOS_DISPONIVEL } from '@/features/documentos/modelo';
import { lerArtigoAcervo, lerFonteAcervo } from '@/features/documentos/transferencia';
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
import { useAuth } from "@/contexts/AuthContext";
import { aplicarGravacao, chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao, type Recuperacao } from "@/lib/recuperacaoLocal";
import { apagarArtigo, guardarArtigo, listarArtigos, type Artigo } from "@/services/estudio";

import { TextosPlano } from "@/features/seo/TextosPlano";
import { NavegacaoArtigos } from "@/features/seo/ComponentesSeo";

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
  const gravacaoEmCurso = useRef(false);
  const [aApagar, setAApagar] = useState(false);
  const eliminacaoEmCurso = useRef(false);
  const ocupado = aGuardar || aApagar;
  const [erroGuardar, setErroGuardar] = useState<string | null>(null);
  const [pendente, setPendente] = useState<null | { tipo: "trocar"; alvo: Edit } | { tipo: "apagar"; artigo: Artigo }>(null);
  const sujo = !igual(edit, base);
  const { user } = useAuth();
  const location = useLocation();
  const fonteAcervo = DOCUMENTOS_DISPONIVEL ? (lerFonteAcervo(location.state, user?.id)??lerArtigoAcervo(location.state,user?.id)) : null;
  const [acervoImportado, setAcervoImportado] = useState(false);
  const editRef = useRef(edit);
  editRef.current = edit;
  const chave = user ? chaveRecuperacao(user.id, "artigo", edit.id, ctx.projetoId) : null;
  const [oferta, setOferta] = useState<Recuperacao<Edit> | null>(null);

  // Keep a local, per-user recovery copy while there are unsaved changes (internal navigation safety).
  // Written synchronously on every change (no debounce) and flushed on unmount with the latest text.
  const sujoRef = useRef(sujo); sujoRef.current = sujo;
  const chaveRef = useRef(chave); chaveRef.current = chave;
  useEffect(() => {
    if (sujo && chave) guardarRecuperacao(chave, edit);
  }, [sujo, chave, edit]);
  useEffect(() => () => {
    if (sujoRef.current && chaveRef.current) guardarRecuperacao(chaveRef.current, editRef.current);
  }, []);
  // Offer to restore text left unsaved for this user + article + project.
  useEffect(() => {
    if (sujo || !chave || !user) { if (!sujo) setOferta(null); return; }
    const r = lerRecuperacao<Edit>(chave, user.id);
    setOferta(r && !igual(r.dados, base) ? r : null);
  }, [chave, base]); // eslint-disable-line react-hooks/exhaustive-deps

  // New article: apply the context project once loaded, only while nothing was edited.
  useEffect(() => {
    if (ctx.estado !== "pronto") return;
    const e = editRef.current;
    if (!e.id && igual(e, base) && !e.titulo && !e.resumo && !e.corpo && e.project_id !== ctx.projetoId) {
      const n = { ...e, project_id: ctx.projetoId }; setEdit(n); setBase(n);
    }
  }, [ctx.estado, ctx.projetoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const seq = useRef(0);
  const carregar = useCallback(async () => {
    const meu = ++seq.current;
    setLista((l) => ({ ...l, fase: l.artigos.length ? "pronto" : "a_carregar", erro: undefined }));
    try { const artigos = await listarArtigos(ctx.projetoId); if (meu === seq.current) setLista({ fase: "pronto", artigos }); }
    catch (e) { if (meu === seq.current) setLista({ fase: "erro", artigos: [], erro: (e as Error).message }); }
  }, [ctx.projetoId]);
  useEffect(() => { if (ctx.estado === "pronto") carregar(); }, [ctx.estado, carregar]);

  // Open ?id= from the Studio continuity summary.
  useEffect(() => {
    const id = params.get("id");
    const a = id ? lista.artigos.find((x) => x.id === id) : undefined;
    if (!gravacaoEmCurso.current && !eliminacaoEmCurso.current && a && !sujo && edit.id !== a.id) { const e = deArtigo(a); setEdit(e); setBase(e); }
  }, [params, lista.artigos, ocupado]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sujo) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [sujo]);

  const abrir = (alvo: Edit) => {
    if (gravacaoEmCurso.current || eliminacaoEmCurso.current) return;
    if (sujo) return setPendente({ tipo: "trocar", alvo });
    setEdit(alvo); setBase(alvo); setErroGuardar(null);
    setParams(alvo.id ? { id: alvo.id } : {}, { replace: true });
  };

  const guardar = async () => {
    if (gravacaoEmCurso.current || eliminacaoEmCurso.current) return;
    if (!edit.titulo.trim()) { setErroGuardar("Indica um título."); return; }
    gravacaoEmCurso.current = true;
    setAGuardar(true); setErroGuardar(null);
    const enviado = { ...edit, titulo: edit.titulo.trim() };
    const chaveAntes = chave;
    try {
      const salvo = deArtigo(await guardarArtigo(enviado));
      // Text typed while saving is kept and stays unsaved; recovery is cleared only once confirmed.
      const r = aplicarGravacao(enviado, editRef.current, salvo, (a, sv) => ({ ...a, id: sv.id }), igual);
      setEdit(r.edit); setBase(r.base);
      if (chaveAntes) limparRecuperacao(chaveAntes);
      // Newer text typed during the save keeps its recovery copy under the saved article's key.
      if (r.sujo && user) guardarRecuperacao(chaveRecuperacao(user.id, "artigo", r.edit.id, ctx.projetoId), r.edit);
      setParams({ id: salvo.id! }, { replace: true });
      toast.success("Rascunho guardado");
      carregar();
    } catch (e) { setErroGuardar(`Não foi guardado — o texto continua no editor. ${(e as Error).message}`); }
    finally { gravacaoEmCurso.current = false; setAGuardar(false); }
  };

  const confirmarApagar = async (a: Artigo) => {
    if (gravacaoEmCurso.current || eliminacaoEmCurso.current) return;
    eliminacaoEmCurso.current = true; setAApagar(true);
    try {
      await apagarArtigo(a.id);
      toast.success("Rascunho apagado");
      if (editRef.current.id === a.id) { const n = novo(); setEdit(n); setBase(n); setParams({}, { replace: true }); }
      carregar();
    } catch (e) { toast.error(`Não foi apagado: ${(e as Error).message}`); }
    finally { eliminacaoEmCurso.current = false; setAApagar(false); }
  };

  const nomeProjeto = (id: string | null) => ctx.projetos.find((p) => p.id === id)?.name ?? "Sem projeto";

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-7xl grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <CabecalhoPagina className="col-span-full" titulo="Rascunhos livres" descricao={`${ctx.projeto ? `Projeto ${ctx.projeto.name}` : "Todos os projetos"} · só rascunhos, nada é publicado`}/>
      <NavegacaoArtigos />
      <div className="flex min-w-0 flex-col gap-4">
        {fonteAcervo && !acervoImportado && <Alert><AlertTitle>Fonte do acervo disponível</AlertTitle><AlertDescription><p className="my-2 break-words">{fonteAcervo.titulo}. O texto e as referências serão colocados num novo rascunho para trabalhar.</p><Button size="sm" disabled={sujo || ocupado || !!oferta || ctx.projetoId !== fonteAcervo.projetoId} onClick={() => { const n = { titulo: fonteAcervo.titulo, resumo: '', corpo: fonteAcervo.artigo, project_id: fonteAcervo.projetoId }; setEdit(n); setBase({ ...n, titulo: '', corpo: '' }); setParams({}, { replace: true }); setAcervoImportado(true); }}>Carregar excertos no rascunho</Button>{(sujo || oferta) && <p className="mt-2">Guarda ou resolve o rascunho anterior antes de carregar a fonte.</p>}</AlertDescription></Alert>}
        <Button variant="outline" className="min-h-11" disabled={ocupado} onClick={() => abrir(novo())}><Plus className="mr-1 h-4 w-4" />Novo rascunho</Button>
        <TextosPlano />
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
                <button disabled={ocupado} className="min-w-0 flex-1 text-left text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60" onClick={() => abrir(deArtigo(a))}>
                  <span className="block truncate font-medium">{a.titulo}</span>
                  <span className="block text-xs text-muted-foreground">{nomeProjeto(a.project_id)} · {dataPt(a.updated_at)}</span>
                </button>
                <Button variant="ghost" size="sm" aria-label={`Apagar ${a.titulo}`} disabled={ocupado} onClick={() => { if (!gravacaoEmCurso.current && !eliminacaoEmCurso.current) setPendente({ tipo: "apagar", artigo: a }); }}>Apagar</Button>
              </li>
            ))}
            {lista.artigos.length === 0 && <li className="p-2 text-sm text-muted-foreground">Sem rascunhos{ctx.projeto ? " neste projeto" : ""}.</li>}
          </ul>
        )}
      </div>

      <form className="flex min-w-0 flex-col gap-3" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={sujo ? "text-destructive" : "text-muted-foreground"}>
            {aApagar ? "A apagar…" : aGuardar ? "A guardar…" : sujo ? "Alterações por guardar" : edit.id ? "Guardado" : "Rascunho novo"}
          </span>
        </div>
        <div className="space-y-1">
          <Label htmlFor="art-projeto">Projeto</Label>
          <Select disabled={aApagar} value={edit.project_id ?? SEM} onValueChange={(v) => setEdit({ ...edit, project_id: v === SEM ? null : v })}>
            <SelectTrigger id="art-projeto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SEM}>Sem projeto</SelectItem>
              {ctx.projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="art-titulo">Título</Label>
          <Input disabled={aApagar} id="art-titulo" value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="art-resumo">Resumo</Label>
          <Textarea disabled={aApagar} id="art-resumo" rows={3} value={edit.resumo} onChange={(e) => setEdit({ ...edit, resumo: e.target.value })} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Texto do artigo</p>
          <fieldset disabled={aApagar}><EditorVisualArtigo disabled={aApagar} valor={edit.corpo} onChange={corpo=>setEdit(e=>({...e,corpo}))}/></fieldset>
        </div>
        {oferta && (
          <Alert>
            <AlertTitle>Há texto não guardado de {dataPt(oferta.guardado_em)}</AlertTitle>
            <AlertDescription className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={aApagar} onClick={() => { setEdit({ ...oferta.dados, id: edit.id }); setOferta(null); }}>Restaurar</Button>
              <Button type="button" size="sm" variant="outline" disabled={aApagar} onClick={() => { if (chave) limparRecuperacao(chave); setOferta(null); }}>Descartar</Button>
            </AlertDescription>
          </Alert>
        )}
        {erroGuardar && <p role="alert" className="text-sm text-destructive">{erroGuardar}</p>}
        {aGuardar && <p className="text-xs text-muted-foreground" role="status">Podes continuar a escrever. Abre outro rascunho quando a gravação terminar.</p>}
        {aApagar && <p className="text-xs text-muted-foreground" role="status">A aguardar a confirmação da eliminação. O editor fica disponível quando terminar.</p>}
        <Button type="submit" disabled={ocupado || (!sujo && !!edit.id)}>
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
            <AlertDialogAction disabled={ocupado} onClick={() => {
              if (gravacaoEmCurso.current || eliminacaoEmCurso.current) return;
              const p = pendente; setPendente(null);
              if (!p) return;
              if (p.tipo === "apagar") confirmarApagar(p.artigo);
              else { if (chave) limparRecuperacao(chave); setEdit(p.alvo); setBase(p.alvo); setErroGuardar(null); setParams(p.alvo.id ? { id: p.alvo.id } : {}, { replace: true }); }
            }}>{pendente?.tipo === "apagar" ? "Apagar" : "Descartar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
