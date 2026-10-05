import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CloudOff, History, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useProjeto } from "@/contexts/ProjetoContext";
import { chaveRecuperacao, guardarRecuperacao, limparRecuperacao } from "@/lib/recuperacaoLocal";
import type { ComposicaoImagem } from "../../supabase/functions/_shared/motor/imagem";
import { abrirTrabalho, acordarFila, lerAssets, ConflitoVersao, gravarEdicao, lerVersao, listarVersoes, retomarTrabalho, criarTrabalho, lerSistemaVisual, lerComposicoes, type TrabalhoCompleto, type VersaoDoc } from "@/services/motor";
import { EditorGrafico } from "@/features/editor-grafico/EditorGrafico";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { aplicarResultado, calcularGravacao, type Extras, type Gravado } from "@/features/motor/gravacao";
import { colisoes, layoutTexto, resolverTexto, type Medidor, type PacoteProva, type Variante } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { normalizarFonte, paraPacote, type PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";
import { dataPt, NOME_ESTADO } from "./Carrosseis";
import { PainelEstruturas } from "@/features/motor/PainelEstruturas";
import { RevisaoExportacao } from "@/features/motor/RevisaoExportacao";
import { SeletorImagens } from "@/features/motor/SeletorImagens";
import { assetsReferidos } from "../../supabase/functions/_shared/motor/fontes";
import type { Asset } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { BarraAcoes, Cabecalho, Etapas, Grupo, PAPEL, Quadro, type Etapa } from "@/features/motor/Estudio";
import { cn } from "@/lib/utils";
import { deveRecarregarRevisao } from "@/features/motor/revisaoRecarga";
import type { SistemaVisual } from "../../supabase/functions/_shared/motor/sistema";
import { PassoDesign } from "@/features/motor/PassoDesign";
import { consultarLeitura, type Conselho } from "../../supabase/functions/_shared/motor/leitura";

type Passo = Etapa;
type EstadoGravacao = "guardado" | "a_guardar" | "local" | "conflito";
const POLL_MS = 3000;
const POLL_MAX = 100;
const ATRASO_GRAVACAO = 1200;

function EstadoChip({ estado }: { estado: EstadoGravacao }) {
  const m = {
    guardado: { i: <Check className="h-3.5 w-3.5" />, t: "Guardado", c: "text-muted-foreground" },
    a_guardar: { i: <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />, t: "A guardar", c: "text-muted-foreground" },
    local: { i: <CloudOff className="h-3.5 w-3.5" />, t: "Só neste dispositivo", c: "text-destructive" },
    conflito: { i: <AlertTriangle className="h-3.5 w-3.5" />, t: "Conflito", c: "text-destructive" },
  }[estado];
  return <span role="status" aria-live="polite" className={`inline-flex items-center gap-1 whitespace-nowrap text-xs ${m.c}`}>{m.i}{m.t}</span>;
}

function gravadoDe(d: TrabalhoCompleto): Gravado | null {
  const c = d.proposta.conteudo;
  if (!c || !d.documentos.A || !d.documentos.B) return null;
  return {
    propostaVersao: d.proposta.versao, conteudo: c,
    docs: { A: { versao: d.documentos.A.versao, documento: d.documentos.A.documento }, B: { versao: d.documentos.B.versao, documento: d.documentos.B.documento } },
  };
}

export default function CarrosselTrabalho() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { projetoId } = useProjeto();
  const { user } = useAuth();
  const [dados, setDados] = useState<TrabalhoCompleto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [passo, setPasso] = useState<Passo>("narrativa");
  const [gravado, setGravado] = useState<Gravado | null>(null);
  const [pacote, setPacote] = useState<PacoteProva | null>(null);
  const [extras, setExtras] = useState<Extras>({ legenda: "", alt: [] });
  const [revisao, setRevisao] = useState(0);
  const [estadoG, setEstadoG] = useState<EstadoGravacao>("guardado");
  const [conflito, setConflito] = useState<{ servidor: TrabalhoCompleto | null } | null>(null);
  const [medidor, setMedidor] = useState<Medidor | null>(null);
  const [versoes, setVersoes] = useState<{ variante: Variante; lista: VersaoDoc[] } | null>(null);
  const [vendoVersao, setVendoVersao] = useState<{ versao: number; pacote: PacoteProva; variante: Variante } | null>(null);
  const [polls, setPolls] = useState(0);
  const [slideSel, setSlideSel] = useState(0);
  const [designInicio, setDesignInicio] = useState<{ variante: Variante; pagina: number } | null>(null);
  // Package before the last Design change: reverting saves it again as a NEW version (same CAS path).
  const [antesDesign, setAntesDesign] = useState<PacoteProva | null>(null);
  // Design change awaiting CAS confirmation: success is only claimed once the save reports "guardado".
  const [alteracaoDesign, setAlteracaoDesign] = useState<null | { tipo: "aplicar" | "reverter"; confirmada: boolean }>(null);
  const passoDecidido = useRef(false);
  const assetsCache = useRef<Record<string, Asset>>({});
  const [assetsFalha, setAssetsFalha] = useState<string[]>([]);
  const [seletor, setSeletor] = useState(false);
  const resolverSeletor = useRef<((r: { asset: Asset; nome: string } | null) => void) | null>(null);

  const chave = user && dados ? chaveRecuperacao(user.id, "carrossel", id, dados.trabalho.project_id) : null;

  const carregar = useCallback(async () => {
    try {
      const d = await abrirTrabalho(id);
      setDados(d);
      const g = gravadoDe(d);
      if (!passoDecidido.current) {
        passoDecidido.current = true;
        const aprovado = (["A", "B"] as const).some((v) => d.documentos[v] && d.documentos[v]!.aprovada_versao === d.documentos[v]!.versao);
        setPasso(g ? (aprovado ? "revisao" : "narrativa") : "fonte");
      }
      if (g) {
        setGravado(g);
        // Image layers resolve to verified bytes of this project's assets; failures are shown, never hidden.
        const ids = assetsReferidos([g.docs.A.documento, g.docs.B.documento]);
        const faltam = ids.filter((x) => !assetsCache.current[x]);
        let falhas: string[] = [];
        if (faltam.length) {
          try { const r = await lerAssets(d.trabalho.project_id, faltam); Object.assign(assetsCache.current, r.assets); falhas = r.falhas; }
          catch { falhas = faltam; }
        }
        setAssetsFalha(falhas);
        const assets = Object.fromEntries(ids.filter((x) => assetsCache.current[x]).map((x) => [x, assetsCache.current[x]]));
        let base = paraPacote(id, d.trabalho.titulo ?? "Carrossel", g.conteudo, { A: g.docs.A.documento, B: g.docs.B.documento });
        // One-way legacy migration: older works kept the visual system / image choices in side tables.
        // They are copied into the document once; from then on the document is the only source of truth.
        if (!base.variantes.A.sistema && !base.variantes.B.sistema) {
          const [sl, cl] = await Promise.all([lerSistemaVisual(id).catch(() => null), lerComposicoes(id).catch(() => null)]);
          base = migrarLegado(base, sl?.sistema ?? null, cl?.mapa ?? {});
        }
        setPacote(falhas.length ? base : { ...base, assets });
        setExtras({ legenda: g.conteudo.legenda, alt: g.conteudo.alt });
        setRevisao((r) => r + 1);
        setEstadoG("guardado");
      }
      return d;
    } catch (e) {
      setErro((e as Error).message);
      return null;
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { carregarMedidor().then(setMedidor).catch(() => undefined); }, []);

  // Poll while the server-side worker is busy; leaving the page never stops the job.
  const emCurso = dados && (dados.trabalho.estado === "pendente" || dados.trabalho.estado === "a_processar");
  useEffect(() => {
    if (!emCurso || polls >= POLL_MAX) return;
    const t = setTimeout(async () => { await carregar(); setPolls((n) => n + 1); }, POLL_MS);
    return () => clearTimeout(t);
  }, [emCurso, polls, carregar]);
  useEffect(() => { if (emCurso && polls === 0) acordarFila().catch(() => undefined); }, [emCurso, polls]);

  // ---------- autosave ----------
  const emVoo = useRef(false);
  const pendente = useRef(false);
  const estadoRef = useRef({ gravado, pacote, extras });
  estadoRef.current = { gravado, pacote, extras };

  const gravar = useCallback(async (forcarSobre?: TrabalhoCompleto) => {
    const { gravado: g0, pacote: p, extras: x } = estadoRef.current;
    if (!g0 || !p || !dados) return;
    const g = forcarSobre ? gravadoDe(forcarSobre) ?? g0 : g0;
    const pedido = calcularGravacao(g, p, x);
    if (!pedido) { setEstadoG("guardado"); return; }
    if (emVoo.current) { pendente.current = true; return; }
    emVoo.current = true;
    setEstadoG("a_guardar");
    try {
      const r = await gravarEdicao({ proposta_id: dados.proposta.id, proposta_versao: g.propostaVersao, ...pedido });
      const novo = aplicarResultado(g, pedido, r);
      setGravado(novo);
      estadoRef.current.gravado = novo;
      if (chave) { limparRecuperacao(chave); limparRecuperacao(`${chave}:extras`); }
      const aindaSujo = calcularGravacao(novo, estadoRef.current.pacote!, estadoRef.current.extras);
      setEstadoG(aindaSujo ? "a_guardar" : "guardado");
      if (aindaSujo) pendente.current = true;
    } catch (e) {
      if (e instanceof ConflitoVersao) { setEstadoG("conflito"); setConflito({ servidor: null }); }
      else { setEstadoG("local"); toast.error(`${(e as Error).message} As alterações ficaram só neste dispositivo.`); }
    } finally {
      emVoo.current = false;
      if (pendente.current) { pendente.current = false; setTimeout(() => gravar(), 300); }
    }
  }, [dados, chave]);

  useEffect(() => {
    if (!gravado || !pacote || estadoG === "conflito") return;
    if (!calcularGravacao(gravado, pacote, extras)) return;
    if (chave) guardarRecuperacao(`${chave}:extras`, extras);
    setEstadoG((s) => (s === "local" ? s : "a_guardar"));
    const t = setTimeout(() => gravar(), ATRASO_GRAVACAO);
    return () => clearTimeout(t);
  }, [pacote, extras]); // eslint-disable-line react-hooks/exhaustive-deps

  // Review reads versions from the server: refresh once a pending save settles while on that step.
  const passoRef = useRef(passo); passoRef.current = passo;
  const estadoAnt = useRef(estadoG);
  useEffect(() => {
    if (deveRecarregarRevisao(estadoAnt.current, estadoG, passoRef.current)) void carregar();
    estadoAnt.current = estadoG;
  }, [estadoG]); // eslint-disable-line react-hooks/exhaustive-deps

  const viuAGuardar = useRef(false);
  useEffect(() => {
    if (!alteracaoDesign || alteracaoDesign.confirmada) { viuAGuardar.current = false; return; }
    if (estadoG === "a_guardar") viuAGuardar.current = true;
    else if (estadoG === "guardado" && viuAGuardar.current) {
      viuAGuardar.current = false;
      setAlteracaoDesign({ ...alteracaoDesign, confirmada: true });
      toast.success(alteracaoDesign.tipo === "reverter" ? "Reversão gravada como nova versão" : "Alteração gravada como nova versão");
    } else if (estadoG === "conflito" || estadoG === "local") viuAGuardar.current = false;
  }, [estadoG, alteracaoDesign]);

  const alterarSlide = (sid: string, campo: "titulo" | "texto", valor: string) => {
    setPacote((p) => p && ({ ...p, conteudo: { slides: p.conteudo.slides.map((s) => (s.id === sid ? { ...s, [campo]: valor } : s)) } }));
    setRevisao((r) => r + 1);
  };

  // ---------- framework proposal accept (explicit; composition kept, new version) ----------
  const aceitarEstrutura = async (conteudo: PropostaEditorial) => {
    const g = estadoRef.current.gravado;
    if (!g || !dados) throw new Error("O carrossel ainda não carregou.");
    if (estadoG !== "guardado") throw new Error("Há alterações por gravar. Espera por «Guardado» e tenta de novo.");
    await gravarEdicao({
      proposta_id: dados.proposta.id, proposta_versao: g.propostaVersao, conteudo,
      documentos: { A: { versao_esperada: g.docs.A.versao, documento: g.docs.A.documento }, B: { versao_esperada: g.docs.B.versao, documento: g.docs.B.documento } },
    });
    await carregar();
  };

  // ---------- conflict ----------
  const verServidor = async () => setConflito({ servidor: await abrirTrabalho(id) });
  const manterMinha = async () => {
    const s = conflito?.servidor ?? await abrirTrabalho(id);
    setConflito(null);
    setEstadoG("a_guardar");
    await gravar(s);
    const g = gravadoDe(s);
    if (g && estadoRef.current.gravado && estadoRef.current.gravado.propostaVersao < g.propostaVersao) setGravado(g);
  };
  const usarServidor = async () => {
    if (chave && pacote) guardarRecuperacao(`${chave}:conflito`, { pacote, extras });
    setConflito(null);
    await carregar();
    toast.success("Versão do servidor aberta. A tua cópia ficou guardada neste dispositivo.");
  };

  // ---------- versions (read-only) ----------
  const abrirVersoes = async (variante: Variante) => {
    const d = dados?.documentos[variante];
    if (!d) return;
    setVersoes({ variante, lista: await listarVersoes(d.id) });
  };
  const verVersao = async (variante: Variante, versao: number) => {
    if (!dados) return;
    const d = dados.documentos[variante]!;
    const r = await lerVersao(d.id, versao, dados.proposta.id);
    const docs = { A: r.documento, B: r.documento } as Record<Variante, typeof r.documento>;
    docs[variante] = r.documento;
    setVendoVersao({ versao, variante, pacote: paraPacote(id, "versão", r.conteudo, docs) });
  };

  // ---------- overflow notices (never hidden, never shrunk) ----------
  const avisos = useMemo(() => {
    if (!medidor || !pacote) return [] as string[];
    const out: string[] = [];
    for (const v of ["A", "B"] as const) {
      pacote.variantes[v].paginas.forEach((pg, i) => {
        for (const c of pg.camadas) {
          if (c.tipo !== "texto") continue;
          if (layoutTexto(resolverTexto(c, pacote.conteudo), c.estilo, c.w, c.h, medidor).cortado) out.push(`Variante ${v}, página ${i + 1}: o texto não cabe (${c.ref?.endsWith("titulo") ? "título" : "texto"}).`);
        }
      });
      for (const k of colisoes(pacote, v, medidor)) out.push(`Variante ${v}, página ${k.pagina + 1}: o ${k.a} toca no ${k.b}. Afasta as caixas.`);
    }
    return out;
  }, [medidor, pacote]);

  // Reading consultant: deterministic editorial guidance; never edits the narrative by itself.
  const conselhos = useMemo<Conselho[]>(() => {
    if (!pacote || !gravado) return [];
    const papel = new Map(gravado.conteudo.slides.map((x) => [x.id, x.papel]));
    return consultarLeitura(pacote.conteudo.slides.map((x) => ({ id: x.id, papel: papel.get(x.id) ?? "", titulo: x.titulo, texto: x.texto })));
  }, [pacote, gravado]);

  const [designPendente, setDesignPendente] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const passoAnterior = useRef(passo);
  // Explicit step changes only: reset the step container scroll and move focus to the step heading.
  useEffect(() => {
    if (passoAnterior.current === passo) return;
    passoAnterior.current = passo;
    const m = mainRef.current;
    if (!m) return;
    m.scrollTop = 0;
    const h = m.querySelector<HTMLElement>("h1, h2");
    if (h) { if (!h.hasAttribute("tabindex")) { h.setAttribute("tabindex", "-1"); h.classList.add("outline-none"); } h.focus({ preventScroll: true }); }
  }, [passo]);
  if (erro) return <Quadro><div className="mx-auto max-w-xl p-6"><p role="alert" className="text-sm text-destructive">{erro}</p><Link className="mt-2 inline-flex min-h-11 items-center text-sm underline" to="/estudio/carrosseis">Voltar aos carrosséis</Link></div></Quadro>;
  if (!dados) return <Quadro><p className="flex items-center p-6 text-sm text-muted-foreground" role="status"><Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A abrir…</p></Quadro>;

  const t = dados.trabalho;
  const prop = dados.proposta.conteudo;
  const fonte = normalizarFonte(dados.fonte.texto);
  const pronto = !!(gravado && pacote);
  const nome = t.titulo || prop?.titulo || "Carrossel";
  const disponiveis: Etapa[] = pronto ? ["fonte", "narrativa", "composicao", "revisao"] : ["fonte"];
  const irPara = (p: Etapa) => { setPasso(p); if (p === "revisao" && estadoG === "guardado") void carregar(); };

  const totalAvisos = avisos.length + conselhos.length;
  const avisoBadge = totalAvisos > 0 && (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 text-destructive lg:h-9"><AlertTriangle className="mr-1 h-3.5 w-3.5" />{totalAvisos} {totalAvisos === 1 ? "aviso" : "avisos"}</Button>
      </PopoverTrigger>
      <PopoverContent className="mc-estudio w-80 text-sm">
        {avisos.length > 0 && <>
          <p className="mb-2 font-medium">Texto que não cabe</p>
          <ul className="space-y-1 text-xs">{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          <p className="mt-2 text-xs text-muted-foreground">O texto não é reduzido automaticamente. Encurta-o na narrativa ou aumenta a caixa na composição.</p>
        </>}
        {conselhos.length > 0 && <div className={cn(avisos.length > 0 && "mt-3 border-t border-border pt-3")}>
          <p className="mb-1 font-medium">Leitura</p>
          <p className="mb-2 text-xs text-muted-foreground">Orientação editorial para leitura no telemóvel, calculada sem IA. Não é uma previsão de desempenho.</p>
          <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">{conselhos.map((c) => (
            <li key={`${c.slideId}-${c.tipo}`}>
              <span className="font-medium">Slide {c.slide + 1}:</span> {c.problema} {c.acao}
              <button type="button" className="ml-1 inline-flex min-h-8 items-center underline" onClick={() => { setSlideSel(c.slide); setPasso("narrativa"); }}>Editar slide {c.slide + 1}</button>
            </li>
          ))}</ul>
        </div>}
      </PopoverContent>
    </Popover>
  );

  const dialogos = (
    <>
      <Dialog open={!!conflito} onOpenChange={() => undefined}>
        <DialogContent className="mc-estudio max-h-[90vh] max-w-3xl overflow-y-auto" onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Outra sessão gravou alterações</DialogTitle>
            <DialogDescription>Nada foi substituído. Escolhe como continuar; a tua versão continua guardada neste dispositivo.</DialogDescription>
          </DialogHeader>
          {conflito?.servidor?.proposta.conteudo && pacote && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div><h3 className="mb-1 font-medium">A tua versão</h3><ol className="space-y-1">{pacote.conteudo.slides.map((s) => <li key={s.id} className="rounded bg-muted p-2"><strong>{s.titulo}</strong><br />{s.texto}</li>)}</ol></div>
              <div><h3 className="mb-1 font-medium">No servidor (proposta v{conflito.servidor.proposta.versao})</h3><ol className="space-y-1">{conflito.servidor.proposta.conteudo.slides.map((s) => <li key={s.id} className="rounded bg-muted p-2"><strong>{s.titulo}</strong><br />{s.texto}</li>)}</ol></div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {!conflito?.servidor && <Button variant="outline" className="h-11" onClick={verServidor}>Comparar</Button>}
            <Button variant="outline" className="h-11" onClick={usarServidor}>Usar a do servidor</Button>
            <Button className="h-11" onClick={manterMinha}>Gravar a minha como nova versão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!versoes} onOpenChange={(o) => { if (!o) { setVersoes(null); setVendoVersao(null); } }}>
        <DialogContent className="mc-estudio max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Versões da variante {versoes?.variante}</DialogTitle>
            <DialogDescription>Só leitura. Versões antigas nunca são alteradas.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {versoes?.lista.map((v) => (
              <Button key={v.versao} size="sm" className="h-11" variant={vendoVersao?.versao === v.versao ? "secondary" : "outline"} onClick={() => verVersao(versoes.variante, v.versao)}>
                v{v.versao} · {dataPt(v.criado_em)}
              </Button>
            ))}
          </div>
          {vendoVersao && medidor && (
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`Versão ${vendoVersao.versao}`}>
              {vendoVersao.pacote.variantes[vendoVersao.variante].paginas.map((p, i) => (
                <li key={p.id} className="overflow-hidden rounded border border-border"><PaginaCanvas pacote={vendoVersao.pacote} variante={vendoVersao.variante} indice={i} medidor={medidor} imagens={{}} escala={0.18} /></li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  if (assetsFalha.length && dados) {
    return (
      <Quadro>
        <Cabecalho voltarPara="/estudio/carrosseis" titulo={dados.trabalho.titulo ?? "Carrossel"} />
        <main className="mx-auto w-full max-w-xl space-y-3 px-4 py-10" role="alert">
          <h1 className="text-xl font-semibold">Uma imagem do design não está disponível</h1>
          <p className="text-sm text-muted-foreground">O design usa {assetsFalha.length === 1 ? "uma imagem que" : `${assetsFalha.length} imagens que`} já não pode{assetsFalha.length === 1 ? "" : "m"} ser lida{assetsFalha.length === 1 ? "" : "s"} (removida ou de outro projeto). Para não exportar arte incompleta, o editor não abre sem ela. O texto e as versões continuam guardados.</p>
          <div className="flex gap-2"><Button className="h-11" onClick={() => { assetsCache.current = {}; carregar(); }}><RotateCw className="mr-1.5 h-4 w-4" />Tentar de novo</Button><Button asChild variant="ghost" className="h-11"><Link to="/estudio/carrosseis">Voltar</Link></Button></div>
        </main>
      </Quadro>
    );
  }

  if (passo === "composicao" && pacote && chave !== undefined) {
    return (
      <Quadro className="h-dvh min-h-0 overflow-hidden">
        <EditorGrafico key={`${id}-${revisao}`} pacoteInicial={pacote} chaveLocal={chave} real projectId={dados!.trabalho.project_id}
          medidorSistema={medidor ?? undefined}
          titulo={<span className="truncate">{nome}</span>}
          faixaTopo={
            <div className="flex items-center gap-2 border-b border-border px-2 py-1 sm:px-4">
              <Button asChild variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Voltar aos carrosséis"><Link to="/estudio/carrosseis"><ArrowLeft className="h-4 w-4" /></Link></Button>
              <div className="min-w-0 flex-1"><Etapas atual="composicao" disponiveis={disponiveis} onIr={irPara} compacto /></div>
              <Button size="icon" className="h-11 w-11 shrink-0 md:hidden" aria-label="Ir para a etapa 5, Preparar publicação" title="Preparar publicação" onClick={() => irPara("revisao")}><ArrowRight className="h-4 w-4" /></Button>
              <Button className="hidden h-11 shrink-0 md:inline-flex" onClick={() => irPara("revisao")}>Preparar publicação<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            </div>
          }
          estadoGravacao={<div className="flex items-center gap-2">{avisoBadge}<EstadoChip estado={estadoG} /></div>}
          menuExtra={<><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => abrirVersoes("A")}><History className="mr-2 h-4 w-4" />Versões da variante A</DropdownMenuItem><DropdownMenuItem onSelect={() => abrirVersoes("B")}><History className="mr-2 h-4 w-4" />Versões da variante B</DropdownMenuItem></>}
          pedirImagem={() => new Promise((res) => { resolverSeletor.current = res; setSeletor(true); })}
          onAlterado={(p) => setPacote(p)} />
        <SeletorImagens projectId={dados!.trabalho.project_id} aberto={seletor} onFechar={(r) => { setSeletor(false); resolverSeletor.current?.(r); resolverSeletor.current = null; }} />
        {dialogos}
      </Quadro>
    );
  }

  const slides = pacote?.conteudo.slides ?? [];
  const iSel = Math.min(slideSel, Math.max(0, slides.length - 1));
  const sSel = slides[iSel];
  const psSel = sSel && prop ? prop.slides.find((x) => x.id === sSel.id) : undefined;

  return (
    <Quadro>
      <Cabecalho voltarPara="/estudio/carrosseis" titulo={nome}
        sub={<>{dataPt(t.criado_em)} · {NOME_ESTADO[t.estado]}{t.modelo === "simulado-demo" ? " · Simulada · sem chamada IA" : <>{prop?.demonstracao && " · Demonstração"}{prop && ` · ${prop.metodo === "ia" ? "IA" : prop.metodo === "demonstracao" ? "fornecedor simulado" : "sem IA"}`}</>}</>}
        direita={pronto && <><span className="hidden sm:inline">{avisoBadge}</span><EstadoChip estado={estadoG} /></>}
        etapas={<Etapas atual={passo} disponiveis={disponiveis} onIr={irPara} compacto />} />

      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        {projetoId && t.project_id !== projetoId && (
          <p className="mb-4 rounded-[var(--mc-r-md)] border border-border px-3 py-2 text-xs text-muted-foreground" role="note">Este carrossel pertence a outro projeto, diferente do que está escolhido em «Marca / projeto».</p>
        )}
        {emCurso && (
          <div className="mc-entrar mx-auto max-w-xl py-16 text-center" role="status">
            <Loader2 className="mx-auto mb-4 h-6 w-6 text-primary motion-safe:animate-spin" aria-hidden />
            <p className="text-lg font-medium">{t.estado === "pendente" ? "Na fila" : t.etapa === "documento" ? "A compor as variantes A e B" : "A preparar a narrativa"}</p>
            <ol className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground" aria-label="Etapas do servidor">
              {[["proposta", "Narrativa"], ["documento", "Composição"]].map(([k, n]) => {
                const feita = dados.etapas.some((e) => e.etapa === k && e.estado === "concluida");
                return <li key={k} className={cn(feita && "text-primary")}>{feita ? "✓ " : ""}{n}</li>;
              })}
            </ol>
            <p className="mt-4 text-sm text-muted-foreground">Podes sair desta página; o trabalho continua.</p>
          </div>
        )}
        {(t.estado === "erro" || t.estado === "desconhecido") && (
          <div className="mx-auto mb-6 max-w-2xl rounded-[var(--mc-r-lg)] border border-destructive/60 p-4 text-sm" role="alert">
            <p className="font-medium">{t.estado === "erro" ? "O trabalho parou." : "Não se sabe se a IA chegou a responder. O pedido conta para o limite e não é repetido automaticamente, para não gastar duas vezes."}</p>
            {t.erro && <p className="mt-1 text-muted-foreground">{t.erro}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {t.estado === "erro" && <Button size="sm" variant="outline" className="h-11" onClick={async () => { try { await retomarTrabalho(id); setPolls(0); await carregar(); } catch (e) { toast.error((e as Error).message); } }}><RotateCw className="mr-1.5 h-4 w-4" />Tentar de novo</Button>}
              <Button size="sm" variant="outline" className="h-11" onClick={async () => {
                try {
                  const b = (t as unknown as { brief?: { slides?: number; objetivo?: string; tom?: string; titulo?: string | null } }).brief ?? {};
                  const r = await criarTrabalho({ project_id: t.project_id, texto: dados.fonte.texto, titulo: b.titulo ?? "", objetivo: b.objetivo ?? "", tom: b.tom ?? "", slides: b.slides ?? 3, modo: "estruturacao" });
                  nav(`/estudio/carrosseis/${r.trabalho_id}`);
                } catch (e) { toast.error((e as Error).message); }
              }}>Fazer sem IA a partir da mesma fonte</Button>
            </div>
          </div>
        )}

        {passo === "fonte" && (
          <section className="mc-entrar mx-auto max-w-3xl space-y-4" aria-labelledby="t-fonte">
            <h1 id="t-fonte" className="text-2xl font-semibold tracking-tight">Fonte</h1>
            <p className="text-xs text-muted-foreground">Guardada tal como foi enviada · impressão digital {dados.fonte.hash.slice(0, 12)}</p>
            <ol className="space-y-3 border-l border-border pl-4">
              {fonte.paragrafos.map((p, i) => <li key={i} className="flex gap-3 text-sm leading-relaxed"><span className="w-7 shrink-0 tabular-nums text-muted-foreground">§{i + 1}</span><span>{p}</span></li>)}
            </ol>
          </section>
        )}

        {passo === "narrativa" && pronto && prop && pacote && sSel && (
          <section className="mc-entrar space-y-6" aria-labelledby="t-narr">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 id="t-narr" className="text-2xl font-semibold tracking-tight">Narrativa</h1>
              <p className="text-xs text-muted-foreground">Proposta v{gravado!.propostaVersao} · o texto é o mesmo nas variantes A e B · cada alteração cria nova versão</p>
            </div>
            <PainelEstruturas dados={dados} atual={gravado!.conteudo} aceitar={aceitarEstrutura} />
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <ol className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label="Storyboard">
                {slides.map((s, i) => {
                  const ps = prop.slides.find((x) => x.id === s.id);
                  const sel = i === iSel;
                  return (
                    <li key={s.id} className="shrink-0 lg:shrink">
                      <button type="button" aria-current={sel ? "true" : undefined} onClick={() => setSlideSel(i)}
                        className={cn("mc-trans flex min-h-14 w-44 items-start gap-3 rounded-[var(--mc-r-md)] border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
                          sel ? "border-primary bg-primary/10" : "border-input hover:border-muted-foreground")}>
                        <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                        <span className="min-w-0">
                          <span className="block text-xs text-muted-foreground">{ps ? PAPEL[ps.papel] ?? ps.papel : "Slide"}</span>
                          <span className="block truncate text-sm">{s.titulo || "Sem título"}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div key={sSel.id} className="mc-entrar space-y-4 rounded-[var(--mc-r-lg)] border border-border bg-card p-4 sm:p-6">
                <p className="text-xs text-muted-foreground">Slide {iSel + 1} de {slides.length} · {psSel ? PAPEL[psSel.papel] ?? psSel.papel : ""}</p>
                <div className="space-y-1">
                  <Label htmlFor="s-titulo">Título</Label>
                  <Input id="s-titulo" className="h-11 text-base font-medium" value={sSel.titulo} maxLength={400} onChange={(e) => alterarSlide(sSel.id, "titulo", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="s-texto">Texto</Label>
                  <Textarea id="s-texto" rows={5} className="text-base leading-relaxed" value={sSel.texto} maxLength={3000} onChange={(e) => alterarSlide(sSel.id, "texto", e.target.value)} />
                </div>
                {psSel && psSel.fontes.length > 0 && (
                  <details className="group border-t border-border pt-2">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      Evidência na fonte · {psSel.fontes.map((n) => `§${n}`).join(", ")}<span className="ml-auto transition-transform group-open:rotate-45 motion-reduce:transition-none" aria-hidden>+</span>
                    </summary>
                    <div className="space-y-2 pb-1">
                    {psSel.fontes.map((n) => fonte.paragrafos[n - 1] && (
                      <blockquote key={n} className="flex gap-3 text-sm leading-relaxed text-muted-foreground"><span className="w-7 shrink-0 tabular-nums">§{n}</span><span>{fonte.paragrafos[n - 1]}</span></blockquote>
                    ))}
                    </div>
                  </details>
                )}
                <div className="flex justify-between gap-2 pt-1">
                  <Button variant="ghost" className="h-11" disabled={iSel === 0} onClick={() => setSlideSel(iSel - 1)}><ArrowLeft className="mr-1.5 h-4 w-4" />{iSel > 0 ? `Slide ${iSel}` : "Anterior"}</Button>
                  <Button variant="ghost" className="h-11" disabled={iSel >= slides.length - 1} onClick={() => setSlideSel(iSel + 1)}>{iSel < slides.length - 1 ? `Slide ${iSel + 2}` : "Seguinte"}<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
                </div>
              </div>
            </div>
            <div className="lg:ml-[284px]">
              <Grupo titulo="Legenda" resumo={extras.legenda.slice(0, 80)}>
                <Label htmlFor="legenda" className="sr-only">Legenda</Label>
                <Textarea id="legenda" rows={5} className="text-base" maxLength={2200} value={extras.legenda} onChange={(e) => setExtras((x) => ({ ...x, legenda: e.target.value }))} />
              </Grupo>
              <Grupo titulo="Texto alternativo" resumo={`${extras.alt.filter(Boolean).length} de ${extras.alt.length} preenchidos`}>
                <div className="space-y-2">
                  {extras.alt.map((a, i) => (
                    <Input key={i} aria-label={`Texto alternativo do slide ${i + 1}`} className="h-11" maxLength={250} value={a}
                      onChange={(e) => setExtras((x) => ({ ...x, alt: x.alt.map((y, j) => (j === i ? e.target.value : y)) }))} />
                  ))}
                </div>
              </Grupo>
              <Grupo titulo="Fontes citadas" resumo={prop.citacao.titulo ?? `${fonte.paragrafos.length} parágrafos`}>
                <p className="text-sm text-muted-foreground">{prop.citacao.titulo ?? "Texto colado"}{prop.citacao.url && <> · <a className="underline" href={prop.citacao.url} target="_blank" rel="noreferrer">{prop.citacao.url}</a></>}</p>
                <p className="mt-1 text-xs text-muted-foreground">Impressão digital {dados.fonte.hash.slice(0, 12)}</p>
              </Grupo>
              {totalAvisos > 0 && <div className="pt-3 sm:hidden">{avisoBadge}</div>}
            </div>
          </section>
        )}

        {passo === "revisao" && pronto && pacote && (
          <RevisaoExportacao dados={dados} pacote={pacote} medidor={medidor} guardado={estadoG === "guardado"} irPara={irPara} />
        )}
      </div></main>

      {pronto && passo !== "revisao" && (
        <BarraAcoes
          inicio={passo === "narrativa" ? <Button variant="ghost" className="h-11" onClick={() => setPasso("fonte")}><ArrowLeft className="mr-1.5 h-4 w-4" />Fonte</Button>
 : null}
          fim={passo === "fonte"
            ? <Button className="h-11 px-5" onClick={() => setPasso("narrativa")}>Narrativa<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            : passo === "narrativa"
            ? <Button className="h-11 px-5" onClick={() => setPasso("composicao")}>Composição<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            : null}
        />
      )}
      {pronto && passo === "revisao" && (
        <BarraAcoes inicio={<Button variant="ghost" className="h-11" onClick={() => setPasso("composicao")}><ArrowLeft className="mr-1.5 h-4 w-4" />Composição</Button>} nota="A publicação continua a exigir aprovação no Painel social." />
      )}
      {dialogos}
    </Quadro>
  );
}
