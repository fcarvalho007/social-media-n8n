import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao, type Recuperacao } from "@/lib/recuperacaoLocal";
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
  const [erroPreview, setErroPreview] = useState<string | null>(null);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [sairPendente, setSairPendente] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<null | "gerar" | "social" | "fonte">(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { user } = useAuth();
  const carrosselRef = useRef(carrossel);
  carrosselRef.current = carrossel;
  const chave = user && id ? chaveRecuperacao(user.id, "carrossel", id, null) : null;
  const [oferta, setOferta] = useState<Recuperacao<Carrossel> | null>(null);
  useEffect(() => {
    if (!alterado || !chave || !carrossel) return;
    const t = setTimeout(() => guardarRecuperacao(chave, carrossel), 300);
    return () => clearTimeout(t);
  }, [alterado, chave, carrossel]);
  const servidor = dados?.conteudo.carrossel;
  useEffect(() => {
    if (!chave || !user || alterado || !servidor) return;
    const r = lerRecuperacao<Carrossel>(chave, user.id);
    setOferta(r && JSON.stringify(r.dados) !== JSON.stringify(servidor) ? r : null);
  }, [chave, servidor]); // eslint-disable-line react-hooks/exhaustive-deps

  // substituir=false keeps the editor text (used after failures/refresh with local edits).
  const carregar = (substituir = true) => obterConteudo(id).then((d) => {
    setDados(d); setErroCarregar(null);
    if (substituir) { setCarrossel(d.conteudo.carrossel); setAlterado(false); }
  }).catch((e: Error) => setErroCarregar(e.message));
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
        setErroPreview(null);
      }).catch((e: Error) => vivo && setErroPreview(e.message));
    }
    return () => { vivo = false; };
  }, [carrossel, fonte, indice]);

  if (!dados || !fonte) {
    if (erroCarregar) return (
      <div className="mx-auto max-w-xl space-y-2 p-4">
        <Alert variant="destructive"><AlertTitle>Não foi possível abrir o carrossel</AlertTitle><AlertDescription>{erroCarregar}</AlertDescription></Alert>
        <Button variant="outline" onClick={() => carregar()}>Tentar de novo</Button>
      </div>
    );
    return <div className="p-4 text-sm text-muted-foreground">A carregar…</div>;
  }
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
    const enviado = JSON.stringify(carrossel);
    try {
      await guardarCarrossel(c.id, c.versao, carrossel, origemProposta);
    } catch (e) {
      // Text stays in the editor; refresh metadata only so the user sees the newer server version.
      await carregar(false);
      throw new Error(`Não foi guardado — o teu texto continua no editor. ${(e as Error).message}`);
    }
    toast.success("Carrossel guardado");
    setOrigemProposta("edicao");
    if (chave) limparRecuperacao(chave);
    // Edits made while saving are kept (still unsaved); only identical text adopts the server copy.
    const semNovas = JSON.stringify(carrosselRef.current) === enviado;
    await carregar(semNovas);
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
    toast.success(r.existente ? "O rascunho social desta versão já existia" : c.social_draft_id ? "Rascunho social atualizado" : "Rascunho social criado");
    nav(`/manual-create?draft=${r.draft_id}`);
  });
  const abrirNoSocial = async () => {
    if (!c.social_draft_id) return;
    nav(`/manual-create?draft=${c.social_draft_id}`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/estudio/redes-sociais" className="text-xs text-muted-foreground hover:underline"
            onClick={(e) => { if (alterado) { e.preventDefault(); setSairPendente("/estudio/redes-sociais"); } }}>← Carrosséis</Link>
          <h1 className="text-2xl font-semibold">Carrossel da crónica</h1>
          <p className="text-sm text-muted-foreground">Edição #{fonte.numero} · {fonte.titulo}</p>
          <p className="text-xs text-muted-foreground">
            <span className={alterado ? "font-medium text-destructive" : ""}>{alterado ? "Alterações por guardar" : c.versao ? "Guardado" : "Sem versão guardada"}</span> · Versão {c.versao}{dados.job ? ` · ${ESTADOS_JOB[dados.job.estado] ?? dados.job.estado}` : ""} ·{" "}
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
              {acao === "social" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}{c.social_draft_id ? "Atualizar rascunho social" : "Criar rascunho social"}
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
              <Button size="sm" variant="outline" disabled={!!acao} onClick={() => executar("retomar", async () => { await retomarJob(dados.job!.id); await carregar(!alterado); })}>Retomar</Button>
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
            <Button size="sm" variant="outline" onClick={abrirNoSocial}>Abrir revisão do rascunho</Button>
          </AlertDescription>
        </Alert>
      )}
      {erro && <Alert variant="destructive"><AlertTitle>Não foi possível concluir</AlertTitle><AlertDescription>{erro}</AlertDescription></Alert>}
      {oferta && (
        <Alert>
          <AlertTitle>Há alterações não guardadas de {new Date(oferta.guardado_em).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", dateStyle: "short", timeStyle: "short" })}</AlertTitle>
          <AlertDescription className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { setCarrossel(oferta.dados); setAlterado(true); setOferta(null); }}>Restaurar</Button>
            <Button size="sm" variant="outline" onClick={() => { if (chave) limparRecuperacao(chave); setOferta(null); }}>Descartar</Button>
          </AlertDescription>
        </Alert>
      )}
      {erroCarregar && <Alert variant="destructive"><AlertTitle>Falha ao atualizar dados do servidor</AlertTitle><AlertDescription>{erroCarregar}</AlertDescription></Alert>}

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
            {erroPreview && <p role="alert" className="text-xs text-destructive">Pré-visualização indisponível: {erroPreview}</p>}
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

      <AlertDialog open={!!sairPendente} onOpenChange={(o) => !o && setSairPendente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem guardar?</AlertDialogTitle>
            <AlertDialogDescription>As alterações ao carrossel perdem-se.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ficar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const d = sairPendente; setSairPendente(null); setAlterado(false); if (chave) limparRecuperacao(chave); if (d) nav(d); }}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmar !== null} onOpenChange={(o) => !o && setConfirmar(null)}>
        <AlertDialogContent className={confirmar === "fonte" ? "max-w-2xl" : undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmar === "gerar" ? "Gerar nova proposta?" : confirmar === "social" ? (c.social_draft_id ? "Atualizar o rascunho social?" : "Criar rascunho social?") : "Confirmar a fonte histórica"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {confirmar === "gerar" && <p>A geração consome IA. O rascunho guardado só muda quando voltares a guardar.</p>}
                {confirmar === "social" && <p>Será criado um rascunho no fluxo social existente com {carrossel?.slides.length} imagens para Instagram e o documento para LinkedIn. Nada é publicado: a seguir abre-se a revisão do rascunho no estúdio social.</p>}
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
