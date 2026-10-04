import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ESTADOS_JOB, LIMITES, aceitarFonte, enviarParaEstudioSocial, gerarNovaProposta, guardarCarrossel,
  obterConteudo, retomarJob, validarCarrossel, legendaComLink, type Carrossel, type ConteudoCompleto,
} from "@/services/conteudos";
import { desenharSlide, exportarCarrossel, gerarFicheiros, descarregar } from "@/features/conteudos/exportar";

export default function CarrosselCronica() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [dados, setDados] = useState<ConteudoCompleto | null>(null);
  const [carrossel, setCarrossel] = useState<Carrossel | null>(null);
  const [origemProposta, setOrigemProposta] = useState<"edicao" | "ia_manual">("edicao");
  const [indice, setIndice] = useState(0);
  const [alterado, setAlterado] = useState(false);
  const [acao, setAcao] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<null | "gerar" | "social" | "fonte">(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const carregar = () => obterConteudo(id).then((d) => { setDados(d); setCarrossel(d.conteudo.carrossel); setAlterado(false); }).catch((e: Error) => setErro(e.message));
  useEffect(() => { carregar(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!alterado && !acao) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [alterado, acao]);

  const fonte = dados?.conteudo.fonte;
  useEffect(() => {
    let vivo = true;
    if (canvasRef.current && carrossel && fonte && carrossel.slides[indice]) {
      const c = document.createElement("canvas");
      desenharSlide(c, carrossel, fonte, indice).then(() => {
        if (!vivo || !canvasRef.current) return;
        canvasRef.current.width = c.width; canvasRef.current.height = c.height;
        canvasRef.current.getContext("2d")?.drawImage(c, 0, 0);
        setErro(null);
      }).catch((e: Error) => vivo && setErro(e.message));
    }
    return () => { vivo = false; };
  }, [carrossel, fonte, indice]);

  if (!dados || !fonte) return <div className="p-4 text-sm text-muted-foreground">{erro ?? "A carregar…"}</div>;
  const c = dados.conteudo;
  const fontePorRever = fonte.origem === "historico_actual" && !c.fonte_aceite_em;
  const slide = carrossel?.slides[indice];

  const executar = async (nome: string, f: () => Promise<void>) => {
    setAcao(nome); setErro(null);
    try { await f(); } catch (e) { setErro((e as Error).message); } finally { setAcao(null); }
  };
  const editar = (campo: "titulo" | "texto", v: string) => {
    if (!carrossel) return;
    setCarrossel({ ...carrossel, slides: carrossel.slides.map((s, i) => (i === indice ? { ...s, [campo]: v } : s)) });
    setAlterado(true);
  };
  const editarFontes = (v: string) => {
    if (!carrossel) return;
    const fontes = v.split(/[\s,;]+/).map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0);
    setCarrossel({ ...carrossel, slides: carrossel.slides.map((s, i) => (i === indice ? { ...s, fontes } : s)) });
    setAlterado(true);
  };
  const guardar = () => executar("guardar", async () => {
    if (!carrossel) return;
    validarCarrossel(carrossel, fonte);
    await guardarCarrossel(c.id, c.versao, carrossel, origemProposta);
    toast.success("Rascunho guardado");
    setOrigemProposta("edicao");
    await carregar();
  });
  const gerar = () => executar("gerar", async () => {
    const r = await gerarNovaProposta(c.id);
    setCarrossel(r.carrossel); setIndice(0); setAlterado(true); setOrigemProposta("ia_manual");
    toast.info("Nova proposta pronta. Revê e guarda para a conservar.");
  });
  const enviarSocial = () => executar("social", async () => {
    if (!carrossel || alterado) throw new Error("Guarda o rascunho antes de enviar para o estúdio social.");
    validarCarrossel(carrossel, fonte);
    legendaComLink(carrossel, fonte);
    const { pngs, pdf } = await gerarFicheiros(carrossel, fonte);
    const r = await enviarParaEstudioSocial(c.id, c.versao, fonte.numero, pngs, pdf, !!c.social_draft_id);
    toast.success(r.existente ? "O rascunho social já existia" : "Rascunho criado no estúdio social");
    await carregar();
  });
  const abrirNoSocial = async () => {
    if (!c.social_draft_id) return;
    nav(`/manual-create?draft=${c.social_draft_id}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/estudio/redes-sociais" className="text-xs text-muted-foreground hover:underline">← Redes sociais</Link>
          <h1 className="text-2xl font-semibold">Carrossel da crónica</h1>
          <p className="text-sm text-muted-foreground">Edição #{fonte.numero} · {fonte.titulo}</p>
          <p className="text-xs text-muted-foreground">
            Versão {c.versao}{dados.job ? ` · ${ESTADOS_JOB[dados.job.estado] ?? dados.job.estado}` : ""} ·{" "}
            <a href={fonte.url} target="_blank" rel="noreferrer" className="underline">abrir crónica</a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!acao || fontePorRever} onClick={() => (carrossel ? setConfirmar("gerar") : gerar())}>
            {acao === "gerar" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            {carrossel ? "Gerar nova proposta" : "Gerar proposta"}
          </Button>
          {carrossel && <Button variant="outline" disabled={!!acao || !alterado} onClick={guardar}><Save className="mr-1 h-4 w-4" />{acao === "guardar" ? "A guardar…" : "Guardar"}</Button>}
          {carrossel && (
            <Button disabled={!!acao || alterado || c.versao === 0} onClick={() => setConfirmar("social")}>
              {acao === "social" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}Enviar para o estúdio social
            </Button>
          )}
        </div>
      </header>

      {dados.job?.erro && (
        <Alert>
          <AlertTitle>Estado da preparação automática</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{dados.job.erro}</span>
            {["erro", "aguarda_credencial", "aguarda_confirmacao"].includes(dados.job.estado) && (
              <Button size="sm" variant="outline" disabled={!!acao} onClick={() => executar("retomar", async () => { await retomarJob(dados.job!.id); await carregar(); })}>Retomar</Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {fontePorRever && (
        <Alert>
          <AlertTitle>A crónica integral não foi congelada no envio</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Esta edição é anterior ao novo registo. Será usado o texto atualmente guardado desta mesma edição. Revê os parágrafos abaixo e confirma que correspondem à crónica publicada.</p>
            <Button size="sm" variant="outline" onClick={() => setConfirmar("fonte")}>Rever e confirmar fonte</Button>
          </AlertDescription>
        </Alert>
      )}
      {c.social_draft_id && (
        <Alert>
          <AlertTitle>Rascunho social criado</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>Imagens para Instagram e documento para LinkedIn. Revê e publica no fluxo social habitual.</span>
            <Button size="sm" variant="outline" onClick={abrirNoSocial}>Abrir no estúdio social</Button>
          </AlertDescription>
        </Alert>
      )}
      {erro && <Alert variant="destructive"><AlertTitle>Não foi possível concluir</AlertTitle><AlertDescription>{erro}</AlertDescription></Alert>}

      {!carrossel && (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          Ainda não há proposta. {dados.job ? "A preparação automática continua na fila." : ""} A proposta terá 6 a 8 slides: capa, argumento da crónica e convite à leitura.
        </p>
      )}

      {carrossel && slide && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-2 lg:sticky lg:top-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Slide {indice + 1} de {carrossel.slides.length}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" aria-label="Slide anterior" disabled={indice === 0} onClick={() => setIndice(indice - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button size="icon" variant="outline" aria-label="Slide seguinte" disabled={indice === carrossel.slides.length - 1} onClick={() => setIndice(indice + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
            <canvas ref={canvasRef} className="mx-auto w-full max-w-[420px] rounded-md border" aria-label={`Pré-visualização do slide ${indice + 1}`} />
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" disabled={!!acao} onClick={() => executar("zip", async () => { validarCarrossel(carrossel, fonte); await exportarCarrossel("zip", carrossel, fonte); })}><Download className="mr-1 h-4 w-4" />PNG (ZIP)</Button>
              <Button size="sm" variant="outline" disabled={!!acao} onClick={() => executar("pdf", async () => { validarCarrossel(carrossel, fonte); await exportarCarrossel("pdf", carrossel, fonte); })}><FileText className="mr-1 h-4 w-4" />PDF</Button>
              <Button size="sm" variant="ghost" onClick={() => descarregar(new Blob([JSON.stringify({ fonte, carrossel, versao: c.versao }, null, 2)], { type: "application/json" }), `digitalsprint-${fonte.numero}-carrossel.json`)}>Cópia JSON</Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="titulo">Título ({slide.titulo.length}/{LIMITES.titulo})</Label>
              <Input id="titulo" value={slide.titulo} maxLength={LIMITES.titulo} onChange={(e) => editar("titulo", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="texto">Texto ({slide.texto.length}/{LIMITES.texto})</Label>
              <Textarea id="texto" rows={6} value={slide.texto} maxLength={LIMITES.texto} onChange={(e) => editar("texto", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fontes">Parágrafos de referência</Label>
              <Input id="fontes" value={slide.fontes.join(", ")} onChange={(e) => editarFontes(e.target.value)} placeholder="Ex.: 2, 3" />
              <div className="space-y-1 rounded-md bg-muted p-2 text-xs">
                {slide.fontes.length ? slide.fontes.map((n) => (
                  <p key={n}><Badge variant="outline" className="mr-1">§{n}</Badge>{fonte.paragrafos[n - 1] ?? "Parágrafo inexistente"}</p>
                )) : <p className="text-muted-foreground">Sem referências (só permitido na capa e no último slide).</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="legenda">Legenda ({carrossel.legenda.length}/{LIMITES.legenda}) · o endereço da crónica é acrescentado no fim</Label>
              <Textarea id="legenda" rows={6} value={carrossel.legenda} onChange={(e) => { setCarrossel({ ...carrossel, legenda: e.target.value }); setAlterado(true); }} />
            </div>
            {dados.versoes.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Versões guardadas ({dados.versoes.length})</summary>
                <ul className="mt-1 space-y-0.5">
                  {dados.versoes.map((v) => (
                    <li key={v.versao}>v{v.versao} · {v.origem === "ia_automatica" ? "proposta automática" : v.origem === "ia_manual" ? "nova proposta IA" : "edição"} · {new Date(v.criado_em).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={confirmar !== null} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent className={confirmar === "fonte" ? "max-w-2xl" : undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmar === "gerar" ? "Gerar nova proposta?" : confirmar === "social" ? "Enviar para o estúdio social?" : "Confirmar a fonte histórica"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {confirmar === "gerar" && <p>A geração consome IA. O rascunho guardado só muda quando voltares a guardar.</p>}
                {confirmar === "social" && <p>Será criado um rascunho no fluxo social existente com {carrossel?.slides.length} imagens para Instagram e o documento para LinkedIn. Nada é publicado: revês e publicas depois no estúdio social.</p>}
                {confirmar === "fonte" && (
                  <div className="max-h-[50vh] space-y-2 overflow-y-auto rounded-md border p-2 text-left text-xs">
                    <p className="font-medium">{fonte.titulo}</p>
                    {fonte.paragrafos.map((p, i) => <p key={i}><span className="mr-1 font-mono">§{i + 1}</span>{p}</p>)}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const q = confirmar; setConfirmar(null);
              if (q === "gerar") gerar();
              else if (q === "social") enviarSocial();
              else if (q === "fonte") executar("fonte", async () => { await aceitarFonte(c.id); toast.success("Fonte confirmada"); await carregar(); });
            }}>
              {confirmar === "fonte" ? "Confirmo que corresponde à crónica publicada" : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
