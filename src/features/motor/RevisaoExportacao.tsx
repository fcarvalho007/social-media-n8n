import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ExternalLink, FileDown, Loader2, RotateCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLargura } from "./Estudio";
import { medidasPalco } from "./palco";
import { VerComoLido } from "./VerComoLido";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { carregarImagens } from "@/features/editor-grafico/desenho";
import { NOME_VARIANTE } from "@/features/editor-grafico/EditorGrafico";
import { lerExportacao, pedirExportacao, prepararRascunho, type EstadoExportacao, type TrabalhoCompleto } from "@/services/motor";
import JSZip from "jszip";
import { comMarcaRascunho, notasIlegiveis, paginasComMarcador } from "../../../supabase/functions/_shared/motor/modelos";
import { renderizarPaginaPng } from "@/features/editor-grafico/desenho";
import { ESTILOS } from "../../../supabase/functions/_shared/motor/estilos";
import { nomeVariante, obterPaleta, sistemaDoPacote } from "../../../supabase/functions/_shared/motor/sistema";
import { transbordos, type Medidor, type PacoteProva, type Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

interface Props {
  dados: TrabalhoCompleto;
  pacote: PacoteProva;
  medidor: Medidor | null;
  /** false while local edits are not yet saved as a server version */
  guardado: boolean;
  /** jumps to an earlier step to fix text that does not fit */
  irPara?: (p: "narrativa" | "composicao") => void;
}


export function RevisaoExportacao({ dados, pacote, medidor, guardado, irPara }: Props) {
  const navegar = useNavigate();
  const sisDoc = sistemaDoPacote(pacote);
  const [variante, setVariante] = useState<Variante>(sisDoc?.variante ?? "A");
  const naoCabe = useMemo(() => (medidor ? [...new Set(transbordos(pacote, variante, medidor).map((t) => t.pagina + 1))] : []), [pacote, variante, medidor]);
  const doc = dados.documentos[variante];
  const [estado, setEstado] = useState<EstadoExportacao | null>(null);
  const [aPedir, setAPedir] = useState(false);
  const [revisto, setRevisto] = useState(false);
  const [aPreparar, setAPreparar] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [aTestar, setATestar] = useState(false);
  const [aDescarregar, setADescarregar] = useState<"png" | "pdf" | null>(null);
  const [parado, setParado] = useState(false);
  const ultimoAvanco = useRef<{ chave: string; t: number }>({ chave: "", t: Date.now() });
  const marcador = useMemo(() => paginasComMarcador(pacote.variantes[variante]), [pacote, variante]);
  const notas = useMemo(() => notasIlegiveis(pacote.variantes[variante]), [pacote, variante]);
  // Test draft: rendered in the browser from the same core, every placeholder page carries a red watermark. Never uploaded.
  const rascunhoTeste = async () => {
    if (!medidor) return;
    setATestar(true);
    try {
      const marcado = { ...pacote, variantes: { ...pacote.variantes, [variante]: comMarcaRascunho(pacote.variantes[variante]) } };
      const zip = new JSZip();
      for (let i = 0; i < marcado.variantes[variante].paginas.length; i++) {
        const url = await renderizarPaginaPng(marcado, variante, i, medidor);
        zip.file(`rascunho-teste-${String(i + 1).padStart(2, "0")}.png`, url.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "rascunho-teste-com-marca.zip"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { toast.error((e as Error).message); } finally { setATestar(false); }
  };
  const [palcoRef, palcoW] = useLargura<HTMLDivElement>();
  const [imagens, setImagens] = useState<Record<string, HTMLImageElement>>({});
  useEffect(() => { let vivo = true; carregarImagens(pacote).then((i) => { if (vivo) setImagens(i); }).catch(() => undefined); return () => { vivo = false; }; }, [pacote]);

  const [enviarAoTerminar, setEnviarAoTerminar] = useState(false);
  const preparaRef = useRef<(() => Promise<void>) | null>(null);
  const ler = useCallback(async () => {
    if (!doc) return;
    try { setEstado(await lerExportacao(doc.id, doc.versao)); } catch (e) { toast.error((e as Error).message); }
  }, [doc]);

  useEffect(() => { setEstado(null); setRevisto(false); setDraft(null); void ler(); }, [ler]);

  const emCurso = estado?.exportacao && (estado.exportacao.estado === "pendente" || estado.exportacao.estado === "a_processar");
  useEffect(() => {
    if (!emCurso) return;
    const t = setTimeout(() => void ler(), 3000);
    return () => clearTimeout(t);
  }, [emCurso, estado, ler]);

  // Stall detection: no page progress for 2 minutes while sending → stop waiting and offer a retry.
  useEffect(() => {
    if (!enviarAoTerminar || !estado?.exportacao) return;
    const chave = `${estado.exportacao.estado}:${estado.exportacao.progresso?.paginas_feitas ?? 0}`;
    if (chave !== ultimoAvanco.current.chave) ultimoAvanco.current = { chave, t: Date.now() };
    else if (Date.now() - ultimoAvanco.current.t > 120_000) { setEnviarAoTerminar(false); setParado(true); }
  }, [enviarAoTerminar, estado]);

  useEffect(() => {
    if (!enviarAoTerminar) return;
    if (estado?.exportacao?.estado === "erro") { setEnviarAoTerminar(false); return; }
    if (estado?.exportacao?.estado === "concluido" && guardado && naoCabe.length === 0) { setEnviarAoTerminar(false); preparaRef.current?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enviarAoTerminar, estado, guardado]);
  if (!doc) return <p className="text-sm text-muted-foreground">Esta variante ainda não tem design guardado.</p>;

  const ex = estado?.exportacao;
  const concluido = ex?.estado === "concluido";
  const desta = estado?.rascunhos.find((r) => r.versao === doc.versao);
  const anteriores = estado?.rascunhos.filter((r) => r.versao !== doc.versao) ?? [];
  const draftAtual = draft ?? desta?.draft_id ?? null;

  const exportar = async () => {
    setAPedir(true);
    try { await pedirExportacao(doc.id, doc.versao); await ler(); } catch (e) { toast.error((e as Error).message); } finally { setAPedir(false); }
  };
  const preparar = async () => {
    setAPreparar(true);
    try {
      const r = await prepararRascunho(doc.id, doc.versao, doc.proposta_versao);
      setDraft(r.draft_id);
      navegar(`/manual-create?draft=${r.draft_id}`);
      toast.success(r.existente ? "Este rascunho já existia — rever no Painel social" : "Rascunho preparado — rever no Painel social");
      await ler();
    } catch (e) { toast.error((e as Error).message); } finally { setAPreparar(false); }
  };

  preparaRef.current = preparar;
  // One click: export when needed, then create the social draft as soon as the files are ready.
  const enviar = async () => {
    if (concluido) return preparar();
    setEnviarAoTerminar(true);
    if (!ex || ex.estado === "erro") await exportar();
  };
  const paginas = pacote.variantes[variante].paginas;
  const iPag = Math.min(pagina, paginas.length - 1);
  const aEnviar = enviarAoTerminar || aPreparar;
  const feitas = ex?.progresso?.paginas_feitas ?? 0;
  const total = ex?.paginas ?? paginas.length;
  const fracao = aPreparar || concluido ? 1 : total ? Math.min(0.95, (feitas + 0.3) / (total + 1)) : 0;
  const restante = Math.max(5, Math.round((total - feitas) * 7 + 5));
  const textoProgresso = aPreparar ? "A abrir a criação social…"
    : feitas ? `A preparar slide ${Math.min(feitas + 1, total)} de ${total} · cerca de ${restante} s`
    : `A começar · ${total} slides · cerca de ${restante} s`;

  // Personal downloads: rendered in this browser from the same core (no server, nothing stored).
  const dimensoes = pacote.variantes[variante];
  const multipagina = (dimensoes.formato ?? "carrossel") === "carrossel";
  const descarregarLocal = async (tipo: "png" | "pdf") => {
    if (!medidor) return;
    setADescarregar(tipo);
    try {
      const urls: string[] = [];
      for (let i = 0; i < paginas.length; i++) urls.push(await renderizarPaginaPng(pacote, variante, i, medidor));
      const base = (dados.proposta.conteudo?.titulo || "carrossel").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "carrossel";
      let blob: Blob, nome: string;
      if (tipo === "png") {
        if (!multipagina) { blob = await (await fetch(urls[0])).blob(); nome = `${base}.png`; } else {
        const z = new JSZip();
        urls.forEach((u, i) => z.file(`slide-${String(i + 1).padStart(2, "0")}.png`, u.split(",")[1], { base64: true }));
        blob = await z.generateAsync({ type: "blob" }); nome = `${base}-png.zip`;
        }
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ unit: "px", format: [dimensoes.largura, dimensoes.altura], orientation: "portrait", compress: true, hotfixes: ["px_scaling"] });
        urls.forEach((u, i) => { if (i) pdf.addPage([dimensoes.largura, dimensoes.altura], "portrait"); pdf.addImage(u, "PNG", 0, 0, dimensoes.largura, dimensoes.altura); });
        blob = pdf.output("blob"); nome = `${base}.pdf`;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = nome; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { toast.error((e as Error).message || "Não foi possível criar o ficheiro."); } finally { setADescarregar(null); }
  };

  return (
    <section className="mc-entrar space-y-6" aria-labelledby="t-rev">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 id="t-rev" className="text-2xl font-semibold tracking-tight">Preparar publicação</h1>
        <p className="text-xs text-muted-foreground">Composição v{doc.versao} · narrativa v{doc.proposta_versao}{doc.aprovada_versao === doc.versao ? " · revista e aprovada" : ""}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-center justify-center rounded-[var(--mc-r-lg)] p-4 sm:p-8" style={{ background: "hsl(var(--mc-palco))" }}>
            {medidor ? (
              // The box takes its width from the container (aspect 4:5); the canvas is absolute so it
              // never feeds back into the measured width. Scale is derived from that real width.
              <div ref={palcoRef} className="relative w-full min-w-0 max-w-[420px] overflow-hidden rounded-[var(--mc-r-sm)]" style={{ aspectRatio: `${dimensoes.largura}/${dimensoes.altura}` }}>
                {palcoW > 0 && <div className="absolute left-0 top-0"><PaginaCanvas pacote={pacote} variante={variante} indice={iPag} medidor={medidor} imagens={imagens} escala={medidasPalco(palcoW, dimensoes).escala} /></div>}
              </div>
            ) : <p className="py-24 text-sm text-muted-foreground">A carregar fontes…</p>}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Página anterior" disabled={iPag === 0} onClick={() => setPagina(iPag - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite">Página {iPag + 1} de {paginas.length}</p>
            <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Página seguinte" disabled={iPag >= paginas.length - 1} onClick={() => setPagina(iPag + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          {medidor && (
            <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Páginas">
              {paginas.map((p, i) => (
                <li key={p.id} className="shrink-0">
                  <button type="button" aria-label={`Página ${i + 1}`} aria-current={i === iPag ? "true" : undefined} onClick={() => setPagina(i)}
                    className={cn("mc-trans block w-16 overflow-hidden rounded-[var(--mc-r-sm)] border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", i === iPag ? "border-primary" : "border-transparent opacity-70 hover:opacity-100")}>
                    <PaginaCanvas pacote={pacote} variante={variante} indice={i} medidor={medidor} imagens={imagens} escala={60 / 1080} />
                  </button>
                </li>
              ))}
            </ol>
          )}
          {medidor && <VerComoLido pacote={pacote} variante={variante} indice={iPag} medidor={medidor} imagens={imagens} alt={dados.proposta.conteudo?.alt ?? []} onPagina={setPagina} />}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-medium"><span className="flex h-6 w-6 items-center justify-center rounded-full border border-primary text-xs text-primary">1</span>Escolher composição</h2>
            {sisDoc ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>{ESTILOS.find((e) => e.id === sisDoc.estilo)?.nome} · {nomeVariante(sisDoc.estilo, sisDoc.variante)} · {obterPaleta(sisDoc.paleta).nome}</span>
                {irPara && <Button variant="link" className="h-11 px-1" onClick={() => irPara("composicao")}>Alterar na Composição</Button>}
              </div>
            ) : <>
            <div role="radiogroup" aria-label="Variante" className="grid grid-cols-2 gap-2">
              {(["A", "B"] as const).map((v) => (
                <button key={v} type="button" role="radio" aria-checked={variante === v} disabled={!dados.documentos[v]} onClick={() => { setVariante(v); setPagina(0); }}
                  className={cn("mc-trans flex items-center gap-2 rounded-[var(--mc-r-md)] border p-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", variante === v ? "border-primary bg-primary/10" : "border-input")}>
                  {medidor && <span className="block w-10 shrink-0 overflow-hidden rounded-[var(--mc-r-sm)]"><PaginaCanvas pacote={pacote} variante={v} indice={0} medidor={medidor} imagens={imagens} escala={40 / 1080} /></span>}
                  <span>{NOME_VARIANTE[v]}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">A e B têm o mesmo texto em duas composições. Não são redes sociais nem versões: escolhe a que vais exportar.</p></>}
          </div>

          <div className="space-y-2 rounded-[var(--mc-r-md)] border border-border p-4">
            <h2 className="text-sm font-medium">Para ti <span className="font-normal text-muted-foreground">· opcional</span></h2>
            <p className="text-xs text-muted-foreground">Feitos já neste navegador, com o mesmo desenho. Não cria nada nem envia para as redes.</p>
            {marcador.length > 0 ? (
              <div role="alert" className="space-y-2 text-sm">
                <p className="text-destructive">A página {marcador.join(", ")} ainda mostra «Imagem por escolher».</p>
                <div className="flex flex-wrap gap-2">
                  {irPara && <Button variant="outline" className="h-11" onClick={() => irPara("composicao")}>Escolher imagem</Button>}
                  <Button variant="ghost" className="h-11" disabled={aTestar || !medidor} onClick={rascunhoTeste}>
                    {aTestar ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}Rascunho com marca de água
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11" disabled={!medidor || !!aDescarregar} onClick={() => void descarregarLocal("png")}>
                  {aDescarregar === "png" ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}Descarregar PNG
                </Button>
                {multipagina && <Button variant="outline" className="h-11" disabled={!medidor || !!aDescarregar} onClick={() => void descarregarLocal("pdf")}>
                  {aDescarregar === "pdf" ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}Descarregar PDF
                </Button>}
              </div>
            )}
            {notas.length > 0 && <p className="text-xs text-muted-foreground" role="note">Nota: {notas.length === 1 ? "uma nota manual tem" : `${notas.length} notas manuais têm`} pouco contraste (página {[...new Set(notas.map((n) => n.pagina + 1))].join(", ")}).</p>}
          </div>

          <div className="space-y-3 rounded-[var(--mc-r-md)] border border-border p-4">
            <h2 className="text-sm font-medium">Para as redes sociais</h2>
            {draftAtual ? (
              <div className="space-y-2">
                <p className="text-sm" role="status">Rascunho preparado. Nada foi publicado.</p>
                <p className="text-xs text-muted-foreground">{dimensoes.formato === "story" ? "Story estático para Instagram em 9:16." : multipagina ? "O Instagram recebe as imagens PNG; o LinkedIn recebe o PDF." : "Uma imagem PNG para Instagram e LinkedIn."} Escolhe no Painel social quando publicar.</p>
                <Button asChild className="h-11"><Link to={`/manual-create?draft=${draftAtual}`}><ExternalLink className="mr-1.5 h-4 w-4" />Continuar na criação social</Link></Button>
              </div>
            ) : (
              <>
                {naoCabe.length > 0 && (
                  <div role="alert" className="space-y-2 rounded-[var(--mc-r-md)] border border-destructive/40 p-3 text-sm">
                    <p className="text-destructive">O texto não cabe na página {naoCabe.join(", ")}. Corrige antes de aprovar.</p>
                    {irPara && <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="h-11" onClick={() => irPara("narrativa")}>Encurtar na Narrativa</Button>
                      <Button variant="outline" className="h-11" onClick={() => irPara("composicao")}>Ajustar na Composição</Button>
                    </div>}
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Checkbox id="revisto" className="mt-0.5 h-5 w-5" checked={revisto && naoCabe.length === 0} onCheckedChange={(v) => setRevisto(v === true)} disabled={!guardado || naoCabe.length > 0 || aEnviar} />
                  <Label htmlFor="revisto" className="text-sm font-normal leading-snug">Revi o texto e a composição (v{doc.versao}) e aprovo esta versão.</Label>
                </div>
                {!guardado && <p className="text-xs text-muted-foreground" role="note">À espera que a última alteração fique guardada.</p>}
                <Button className="h-11 w-full" disabled={!revisto || naoCabe.length > 0 || !guardado || aEnviar || marcador.length > 0} onClick={() => void enviar()}>
                  {aEnviar ? <Loader2 className="mr-1.5 h-4 w-4 motion-safe:animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
                  {aEnviar ? "A preparar…" : "Aprovar e preparar rascunho social"}
                </Button>
                {aEnviar && (
                  <div className="space-y-1.5" role="status" aria-live="polite">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${Math.round(fracao * 100)}%` }} /></div>
                    <p className="text-xs text-muted-foreground">{textoProgresso}</p>
                  </div>
                )}
                {(ex?.estado === "erro" || parado) && !aPreparar && (
                  <div role="alert" className="space-y-2 text-sm">
                    <p className="text-destructive">{parado ? "A preparação parou de avançar." : ex?.erro ?? "A preparação falhou."} Nada foi enviado; as páginas já feitas são aproveitadas.</p>
                    <Button variant="outline" className="h-11" onClick={() => { setParado(false); setEnviarAoTerminar(true); void exportar(); }}><RotateCw className="mr-1.5 h-4 w-4" />Tentar novamente</Button>
                  </div>
                )}
                {!aEnviar && <p className="text-xs text-muted-foreground">{multipagina ? "Prepara as imagens e o PDF" : "Prepara a imagem"} no servidor e abre a criação social com a legenda. Nada é publicado sem a tua decisão.</p>}
              </>
            )}
            {anteriores.length > 0 && (
              <ul className="text-xs text-muted-foreground">
                {anteriores.map((r) => <li key={r.draft_id}>Versão anterior v{r.versao}: <Link className="underline" to={`/manual-create?draft=${r.draft_id}`}>abrir rascunho</Link></li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
