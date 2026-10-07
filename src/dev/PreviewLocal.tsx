import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CuradoriaNoticias } from "@/features/curadoria/CuradoriaNoticias";
import { apiLocal } from "./curadoriaLocal";
import { EditorGrafico } from "@/features/editor-grafico/EditorGrafico";
import type { FonteCuradoria } from "@/services/curadoria";
import { normalizarFonte, estruturarSemIa, comporDocumentos, paraPacote } from "../../supabase/functions/_shared/motor/proposta";
import { CONFIG_FORMATOS, type FormatoConteudo } from "../../supabase/functions/_shared/documento-grafico/formatos";
import type { PacoteProva } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { renderizarPaginaPng } from "@/features/editor-grafico/desenho";
import "@/index.css";
import "@/features/motor/estudio.css";
function PreviewLocal() {
  const location = useLocation();
  const [fonte, setFonte] = useState<FonteCuradoria | null>(null);
  const [formato, setFormato] = useState<FormatoConteudo>("carrossel");
  const [pacote, setPacote] = useState<PacoteProva | null>(null);
  const [pagina, setPagina] = useState<"curadoria" | "criar">("curadoria");
  useEffect(() => {
    if (location.pathname !== "/estudio/carrosseis/novo") return;
    const q = new URLSearchParams(location.search); const f = q.get("formato");
    setPagina("criar"); if (f === "post" || f === "story" || f === "carrossel") setFormato(f);
    const id = q.get("noticia"); if (id) apiLocal.ler(id).then(setFonte).catch((e: Error) => toast.error(e.message));
  }, [location.pathname, location.search]);
  if (!import.meta.env.DEV || import.meta.env.MODE !== "offline") return <p>Esta pré-visualização só existe no modo local.</p>;
  const criar = () => {
    if (!fonte) return;
    const f = normalizarFonte(fonte.texto); const p = estruturarSemIa(f, { formato, titulo: fonte.titulo, slides: formato === "carrossel" ? 3 : 1 }, { titulo: fonte.titulo, url: fonte.url }, { cor: "#334155", origem: "neutra" });
    setPacote({ ...paraPacote("local-fixture", p.titulo, p, comporDocumentos(p)), sintetico: true });
  };
  const png = async () => {
    if (!pacote) return;
    try { const m = await carregarMedidor(); const url = await renderizarPaginaPng(pacote, "A", 0, m); const a = document.createElement("a"); a.href = url; a.download = `${formato}-teste.png`; a.click(); } catch (e) { toast.error((e as Error).message); }
  };
  return <TooltipProvider><div className="mc-estudio min-h-screen bg-background text-foreground">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted px-4 py-2 text-xs"><span>Teste local · dados fictícios · Cloud, IA paga e publicações desligados</span>{pacote && <Button variant="outline" size="sm" onClick={() => setPacote(null)}>Voltar à fonte</Button>}</div>
    {pacote ? <EditorGrafico key={pacote.id + formato} pacoteInicial={pacote} chaveLocal={null} titulo={`${CONFIG_FORMATOS[formato].nome} · teste local`} onAlterado={setPacote} menuExtra={<><Button variant="outline" onClick={() => setPacote(null)}>Voltar à fonte</Button><Button variant="outline" onClick={png}>Descarregar PNG de teste</Button></>} /> : <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">Curadoria → conteúdo</h1>
      <ToggleGroup type="single" value={pagina} onValueChange={(v) => { if (v) setPagina(v as typeof pagina); }} className="justify-start"><ToggleGroupItem value="curadoria" className="min-h-11">Curadoria</ToggleGroupItem><ToggleGroupItem value="criar" className="min-h-11">Criar conteúdo</ToggleGroupItem></ToggleGroup>
      {pagina === "curadoria" ? <CuradoriaNoticias api={apiLocal} /> : <>
        <div className="flex flex-wrap items-center gap-3"><span>Formato</span><ToggleGroup type="single" value={formato} onValueChange={(v) => { if (v) setFormato(v as FormatoConteudo); }}>{(["carrossel", "post", "story"] as const).map((f) => <ToggleGroupItem className="min-h-11" key={f} value={f}>{CONFIG_FORMATOS[f].nome}</ToggleGroupItem>)}</ToggleGroup></div>
        <CuradoriaNoticias api={apiLocal} selecionar={setFonte} />
        {fonte && <section className="flex flex-col gap-3 rounded-lg border bg-card p-4"><h2 className="font-semibold">Fonte escolhida: {fonte.titulo}</h2><p className="text-sm text-muted-foreground">{fonte.nivel === "resumo" ? "Só resumo disponível. A peça usa apenas estes factos." : "Texto do artigo disponível."}</p><p>{fonte.texto}</p><Button className="min-h-11 self-start" onClick={criar}>Criar rascunho local · sem IA</Button></section>}
      </>}
    </main>}
  </div><Toaster /></TooltipProvider>;
}
createRoot(document.getElementById("root")!).render(<BrowserRouter><PreviewLocal /></BrowserRouter>);
