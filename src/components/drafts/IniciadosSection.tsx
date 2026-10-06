import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Layers, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDrafts, type Draft } from "@/hooks/useDrafts";
import { useProjeto } from "@/contexts/ProjetoContext";
import { eliminarTrabalhos, listarTrabalhos, type TrabalhoResumo } from "@/services/motor";
import { supabase } from "@/integrations/supabase/client";

type Iniciado =
  | { chave: `social:${string}`; tipo: "social"; id: string; titulo: string; detalhe: string; atualizado: string; projectId: string | null; draft: Draft }
  | { chave: `carrossel:${string}`; tipo: "carrossel"; id: string; titulo: string; detalhe: string; atualizado: string; projectId: string; trabalho: TrabalhoResumo };

const ESTADO_CARROSSEL: Record<string, string> = {
  pendente: "Na fila", a_processar: "A preparar", erro: "Com erro",
  desconhecido: "Resultado incerto", cancelado: "Cancelado",
};

const resumo = (texto: string | null) => texto?.trim() || "Rascunho sem legenda";
const dataPt = (data: string) => new Date(data).toLocaleString("pt-PT", {
  timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export function IniciadosSection() {
  const navigate = useNavigate();
  const { projetoId, projetos, estado: estadoProjeto } = useProjeto();
  const { allDrafts, isLoading: rascunhosACarregar, error: erroRascunhos, refetch: recarregarRascunhos } = useDrafts();
  const [trabalhos, setTrabalhos] = useState<TrabalhoResumo[]>([]);
  const [trabalhosACarregar, setTrabalhosACarregar] = useState(true);
  const [erroTrabalhos, setErroTrabalhos] = useState<string | null>(null);
  const [pesquisa, setPesquisa] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  const [aEliminar, setAEliminar] = useState(false);

  const carregarTrabalhos = useCallback(async () => {
    setTrabalhosACarregar(true);
    setErroTrabalhos(null);
    try {
      const lista = await listarTrabalhos(projetoId);
      setTrabalhos(lista.filter((item) => item.estado !== "concluido"));
    } catch (error) {
      setErroTrabalhos(error instanceof Error ? error.message : "Não foi possível carregar os carrosséis iniciados.");
    } finally {
      setTrabalhosACarregar(false);
    }
  }, [projetoId]);

  useEffect(() => {
    if (estadoProjeto !== "pronto") return;
    setSelecionados(new Set());
    void carregarTrabalhos();
  }, [carregarTrabalhos, estadoProjeto]);

  const nomesProjetos = useMemo(() => new Map(projetos.map((projeto) => [projeto.id, projeto.name])), [projetos]);
  const nomeProjeto = useCallback((id: string | null) => nomesProjetos.get(id ?? "") ?? (id ? "Projeto" : "Sem marca"), [nomesProjetos]);
  const itens = useMemo<Iniciado[]>(() => [
    ...allDrafts.map((draft) => ({
      chave: `social:${draft.id}` as const, tipo: "social" as const, id: draft.id,
      titulo: resumo(draft.caption), detalhe: "Publicação social", atualizado: draft.updated_at || draft.created_at,
      projectId: draft.project_id ?? null, draft,
    })),
    ...trabalhos.map((trabalho) => ({
      chave: `carrossel:${trabalho.id}` as const, tipo: "carrossel" as const, id: trabalho.id,
      titulo: trabalho.titulo || "Carrossel sem título", detalhe: ESTADO_CARROSSEL[trabalho.estado] ?? trabalho.estado,
      atualizado: trabalho.actualizado_em || trabalho.criado_em, projectId: trabalho.project_id, trabalho,
    })),
  ].sort((a, b) => new Date(b.atualizado).getTime() - new Date(a.atualizado).getTime()), [allDrafts, trabalhos]);

  const visiveis = useMemo(() => {
    const termo = pesquisa.trim().toLocaleLowerCase("pt-PT");
    return termo ? itens.filter((item) => `${item.titulo} ${item.detalhe} ${nomeProjeto(item.projectId)}`.toLocaleLowerCase("pt-PT").includes(termo)) : itens;
  }, [itens, pesquisa, nomeProjeto]);

  const selecionar = (chave: string, ativo: boolean) => setSelecionados((atuais) => {
    const seguintes = new Set(atuais);
    if (ativo) seguintes.add(chave); else seguintes.delete(chave);
    return seguintes;
  });
  const todosVisiveis = visiveis.length > 0 && visiveis.every((item) => selecionados.has(item.chave));
  const selecionarTodos = (ativo: boolean) => setSelecionados((atuais) => {
    const seguintes = new Set(atuais);
    visiveis.forEach((item) => ativo ? seguintes.add(item.chave) : seguintes.delete(item.chave));
    return seguintes;
  });

  const retomar = (item: Iniciado) => {
    if (item.tipo === "carrossel") {
      navigate(`/estudio/carrosseis/${item.id}`);
      return;
    }
    sessionStorage.setItem("editDraft", JSON.stringify(item.draft));
    navigate("/manual-create");
  };

  const eliminar = async () => {
    const escolhidos = itens.filter((item) => selecionados.has(item.chave));
    const rascunhos = escolhidos.filter((item) => item.tipo === "social").map((item) => item.id);
    const carrosseis = escolhidos.filter((item) => item.tipo === "carrossel").map((item) => item.id);
    setAEliminar(true);
    try {
      if (rascunhos.length > 0) {
        const { error } = await supabase.from("posts_drafts").delete().in("id", rascunhos);
        if (error) throw new Error("Não foi possível eliminar os rascunhos sociais.");
      }
      if (carrosseis.length > 0) await eliminarTrabalhos(carrosseis);
      await Promise.all([recarregarRascunhos(), carregarTrabalhos()]);
      setSelecionados(new Set());
      setConfirmar(false);
      toast.success(`${escolhidos.length} ${escolhidos.length === 1 ? "trabalho eliminado" : "trabalhos eliminados"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a eliminação.");
    } finally {
      setAEliminar(false);
    }
  };

  const aCarregar = rascunhosACarregar || trabalhosACarregar || estadoProjeto !== "pronto";
  const temErro = erroRascunhos || erroTrabalhos;

  return (
    <section className="space-y-3 border-t border-border pt-6" aria-labelledby="iniciados-titulo">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="iniciados-titulo" className="text-lg font-semibold">Iniciados</h2>
          <p className="text-sm text-muted-foreground">Retome ou elimine trabalhos que ainda não foram concluídos.</p>
        </div>
        {itens.length > 0 && <span className="text-sm tabular-nums text-muted-foreground">{itens.length} {itens.length === 1 ? "trabalho" : "trabalhos"}</span>}
      </div>

      {!aCarregar && itens.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={pesquisa} onChange={(event) => setPesquisa(event.target.value)} placeholder="Pesquisar trabalhos iniciados" className="pl-9" />
          </div>
          <label className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm">
            <Checkbox checked={todosVisiveis} onCheckedChange={(checked) => selecionarTodos(checked === true)} />
            Selecionar visíveis
          </label>
          {selecionados.size > 0 && <Button variant="destructive" onClick={() => setConfirmar(true)}><Trash2 className="mr-2 h-4 w-4" />Eliminar ({selecionados.size})</Button>}
        </div>
      )}

      {aCarregar && <p className="flex items-center py-4 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A carregar trabalhos iniciados…</p>}
      {!aCarregar && temErro && <p role="alert" className="text-sm text-destructive">Não foi possível carregar todos os trabalhos. Tente atualizar a página.</p>}
      {!aCarregar && !temErro && itens.length === 0 && <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Não há trabalhos iniciados.</p>}
      {!aCarregar && itens.length > 0 && visiveis.length === 0 && <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Nenhum trabalho corresponde à pesquisa.</p>}

      {visiveis.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {visiveis.map((item) => (
            <li key={item.chave} className="flex items-center gap-3 p-3 sm:p-4">
              <Checkbox checked={selecionados.has(item.chave)} onCheckedChange={(checked) => selecionar(item.chave, checked === true)} aria-label={`Selecionar ${item.titulo}`} />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {item.tipo === "carrossel" ? <Layers className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{item.detalhe} · {nomeProjeto(item.projectId)} · {dataPt(item.atualizado)}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => retomar(item)}>Retomar</Button>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => { setSelecionados(new Set([item.chave])); setConfirmar(true); }} aria-label={`Eliminar ${item.titulo}`}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={confirmar} onOpenChange={(aberto) => !aEliminar && setConfirmar(aberto)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>{selecionados.size === 1 ? "O trabalho selecionado" : `Os ${selecionados.size} trabalhos selecionados`} e o respetivo histórico criativo serão eliminados. Os custos já registados e as imagens da biblioteca serão mantidos. Esta ação não pode ser anulada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={aEliminar}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={aEliminar} onClick={(event) => { event.preventDefault(); void eliminar(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{aEliminar ? "A eliminar…" : "Eliminar definitivamente"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}