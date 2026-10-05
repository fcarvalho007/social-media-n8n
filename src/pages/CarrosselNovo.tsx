import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, FileText, FlaskConical, Link2, Loader2, Type, Upload } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useProjeto } from "@/contexts/ProjetoContext";
import { chaveRecuperacao, guardarRecuperacao, lerRecuperacao, limparRecuperacao } from "@/lib/recuperacaoLocal";
import { criarTrabalho, lerLinkFonte, type OrcamentoIa } from "@/services/motor";
import { acoesFalhaLink, dominioDe, formatarNumero, resumoLeitura } from "@/features/motor/lerPagina";
import { comporFontePdf, ErroPdf, lerPdf, NOME_ESTADO_PAGINA, type PdfLido } from "@/features/motor/fontePdf";
import { HOSTS_LINK, intervalos, type LinkFalhado, type LinkLido, type MetaLink, type MetaPdf } from "../../supabase/functions/_shared/motor/fontes";
import { LimitesIa } from "@/features/motor/LimitesIa";
import { BarraAcoes, Cabecalho, Etapas, Grupo, Quadro } from "@/features/motor/Estudio";
import { cn } from "@/lib/utils";
import { avaliarFonte, LIMITES_FONTE, MARCADOR_FIXTURE, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";

/** Synthetic fixture for the deterministic demo provider (never real user text). */
export const FIXTURE_DEMO = `${MARCADOR_FIXTURE} Teste sintético R3. Este texto existe apenas para demonstrar o motor.

1. A biblioteca municipal fictícia de Vale Claro abriu uma sala de leitura com quarenta lugares.
2. A sala funciona de segunda a sábado e empresta livros, jornais e revistas.
3. O espaço foi pensado para estudantes e para leitores que procuram silêncio.`;

export const OBJETIVOS = [
  { id: "informar", nome: "Informar", desc: "Dar a conhecer os factos principais." },
  { id: "explicar", nome: "Explicar", desc: "Clarificar como funciona ou porquê." },
  { id: "opiniao", nome: "Opinião", desc: "Apresentar o ponto de vista da fonte." },
  { id: "divulgar", nome: "Divulgar", desc: "Chamar a atenção para algo a acontecer." },
] as const;
type ObjetivoId = (typeof OBJETIVOS)[number]["id"];

/** Editorial structure preview from the slide count: cover, context, one idea per page, close. */
export function estruturaPrevista(n: number): string[] {
  if (n <= 2) return ["Capa", "Fecho"];
  if (n === 3) return ["Capa", "Ideia", "Fecho"];
  return ["Capa", "Contexto", ...Array.from({ length: n - 3 }, () => "Ideia"), "Fecho"];
}

type TipoFonte = "texto" | "link" | "pdf";
interface Rascunho { texto: string; titulo: string; objetivo: ObjetivoId; detalhe: string; tom: string; slides: number | null; url?: string; link?: MetaLink | null; pdf?: MetaPdf | null; original?: string; parcial?: boolean }

export default function CarrosselNovo() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const { projetos, projetoId, estado } = useProjeto();
  const [etapa, setEtapa] = useState<"fonte" | "narrativa">("fonte");
  const [projeto, setProjeto] = useState<string>(projetoId ?? "");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [objetivo, setObjetivo] = useState<ObjetivoId>("informar");
  const [detalhe, setDetalhe] = useState("");
  const [tom, setTom] = useState("");
  const [slides, setSlides] = useState<number | null>(null);
  const [demo, setDemo] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [rever, setRever] = useState(false);
  const [aCriar, setACriar] = useState(false);
  const [recuperado, setRecuperado] = useState<string | null>(null);
  const [orc, setOrc] = useState<OrcamentoIa | null>(null);
  const projetoRef = useRef(projeto);
  projetoRef.current = projeto;
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const [tipoFonte, setTipoFonte] = useState<TipoFonte>("texto");
  const tipoRef = useRef(tipoFonte);
  tipoRef.current = tipoFonte;
  const pedido = useRef(0);
  const [url, setUrl] = useState("");
  const [lendo, setLendo] = useState(false);
  const [falhaFonte, setFalhaFonte] = useState<string | null>(null);
  const [linkMeta, setLinkMeta] = useState<MetaLink | null>(null);
  const [motivoLink, setMotivoLink] = useState<string | null>(null);
  const [pdfLido, setPdfLido] = useState<PdfLido | null>(null);
  const [pdfMeta, setPdfMeta] = useState<MetaPdf | null>(null);
  const [excluidas, setExcluidas] = useState<Set<number>>(new Set());
  const [original, setOriginal] = useState("");
  const [parcial, setParcial] = useState(false);

  useEffect(() => { if (!projeto && projetoId) setProjeto(projetoId); }, [projetoId, projeto]);

  // Local recovery per user + project (this device only; never claimed as saved on the server).
  const chave = user && projeto && !demo ? chaveRecuperacao(user.id, tipoFonte === "texto" ? "carrossel-novo" : `carrossel-novo-${tipoFonte}`, null, projeto) : null;
  useEffect(() => {
    if (!chave || !user || texto) return;
    const r = lerRecuperacao<Rascunho>(chave, user.id);
    if (r?.dados?.texto) {
      const d = r.dados;
      setUrl(d.url ?? ""); setLinkMeta(d.link ?? null); setPdfMeta(d.pdf ?? null); setOriginal(d.original ?? ""); setParcial(!!d.parcial);
      setTexto(d.texto); setTitulo(d.titulo); setObjetivo(d.objetivo ?? "informar"); setDetalhe(d.detalhe ?? ""); setTom(d.tom ?? ""); setSlides(d.slides ?? null);
      setRecuperado(new Date(r.guardado_em).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }));
    }
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!chave || !texto.trim()) return;
    const t = setTimeout(() => guardarRecuperacao<Rascunho>(chave, { texto, titulo, objetivo, detalhe, tom, slides, url, link: linkMeta, pdf: pdfMeta, original, parcial }), 600);
    return () => clearTimeout(t);
  }, [chave, texto, titulo, objetivo, detalhe, tom, slides, url, linkMeta, pdfMeta, original, parcial]);

  useEffect(() => { if (params.get("demo") === "1") usarDemo(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const comIa = !demo && !!orc && orc.maxDia > 0 && orc.usadosHoje < orc.maxDia;
  const fonte = useMemo(() => normalizarFonte(texto), [texto]);
  const av = useMemo(() => avaliarFonte(fonte), [fonte]);
  const nSlides = Math.min(av.slidesMax || LIMITES_FONTE.maxSlides, Math.max(2, slides ?? av.slidesSugeridos));
  const nomeProjeto = projetos.find((p) => p.id === projeto)?.name;
  const mostrarErro = tocado && !!texto.trim() && !av.ok;
  const semTexto = tocado && !texto.trim();

  const pdfSemTexto = !!pdfMeta && !pdfMeta.paginas.some((p) => p.estado === "texto");
  const precisaParcial = (tipoFonte === "pdf" && !!pdfMeta && !pdfMeta.completo && !pdfSemTexto) || (tipoFonte === "link" && !!linkMeta?.truncado);
  const fonteDefinida = tipoFonte === "texto" || (tipoFonte === "link" ? !!linkMeta : !!pdfMeta);
  const fonteValida = av.ok && fonteDefinida && !(tipoFonte === "pdf" && pdfSemTexto) && (!precisaParcial || parcial);

  function limparFonte() {
    pedido.current++;
    setTexto(""); setOriginal(""); setLinkMeta(null); setPdfMeta(null); setPdfLido(null); setExcluidas(new Set());
    setParcial(false); setFalhaFonte(null); setMotivoLink(null); setLendo(false); setTocado(false); setSlides(null); setRecuperado(null);
  }
  function mudarTipo(t: TipoFonte) {
    if (t === tipoFonte) return;
    limparFonte(); setUrl(""); setTipoFonte(t);
  }

  async function lerLink() {
    if (!projeto || !url.trim()) return;
    const n = ++pedido.current; const alvo = projeto;
    // Text already pasted stays until a successful read replaces it.
    setLendo(true); setFalhaFonte(null); setMotivoLink(null);
    try {
      const r = await lerLinkFonte(alvo, url.trim());
      // Late answers for another request/project/type are discarded.
      if (n !== pedido.current || projetoRef.current !== alvo || tipoRef.current !== "link") return;
      if (r.ok) {
        const l = r as LinkLido;
        setTexto(l.texto); setOriginal(l.texto); setSlides(null);
        setLinkMeta({ tipo: "link", modo: "extraido", url: url.trim(), url_final: l.url_final, titulo_pagina: l.titulo, bytes: l.bytes, truncado: l.truncado, editado: false, lido_em: new Date().toISOString() });
      } else { setFalhaFonte((r as LinkFalhado).mensagem); setMotivoLink((r as LinkFalhado).motivo); }
    } catch (e) {
      if (n === pedido.current) { setFalhaFonte((e as Error).message); setMotivoLink("rede"); }
    } finally {
      if (n === pedido.current) setLendo(false);
    }
  }
  function usarComoReferencia() {
    const u = url.trim();
    if (!/^https?:\/\/\S+$/i.test(u)) { setFalhaFonte("Indica um endereço completo (https://…)."); return; }
    pedido.current++; setLendo(false); setFalhaFonte(null); setTexto(""); setOriginal("");
    setLinkMeta({ tipo: "link", modo: "referencia", url: u, url_final: null, titulo_pagina: null, bytes: null, truncado: false, editado: true, lido_em: null });
    setTimeout(() => textoRef.current?.focus(), 50);
  }

  async function escolherPdf(f: File | undefined) {
    if (!f || !projeto) return;
    const n = ++pedido.current; const alvo = projeto;
    setLendo(true); setFalhaFonte(null);
    try {
      const lido = await lerPdf(f);
      if (n !== pedido.current || projetoRef.current !== alvo || tipoRef.current !== "pdf") return;
      const c = comporFontePdf(lido, new Set(), false);
      setPdfLido(lido); setExcluidas(new Set()); setParcial(false); setPdfMeta(c.meta); setTexto(c.texto); setOriginal(c.texto); setSlides(null);
    } catch (e) {
      // Previous draft stays intact on error.
      if (n === pedido.current) setFalhaFonte(e instanceof ErroPdf ? e.message : "Não foi possível ler o PDF. Cola o texto em alternativa.");
    } finally {
      if (n === pedido.current) setLendo(false);
    }
  }
  function alternarPagina(np: number) {
    if (!pdfLido) return;
    const ex = new Set(excluidas);
    if (ex.has(np)) ex.delete(np); else ex.add(np);
    const c = comporFontePdf(pdfLido, ex, false);
    setExcluidas(ex); setPdfMeta(c.meta); setTexto(c.texto); setOriginal(c.texto); setParcial(false); setSlides(null);
  }

  function usarDemo() { mudarTipo("texto"); setDemo(true); setTexto(FIXTURE_DEMO); setTitulo(""); setSlides(null); setTocado(false); }
  const sairDemo = () => { setDemo(false); setTexto(""); setTocado(false); };

  const continuar = () => {
    setTocado(true);
    if (!projeto || !fonteValida) { textoRef.current?.focus(); return; }
    setEtapa("narrativa");
    window.scrollTo({ top: 0 });
  };

  const criar = async () => {
    if (!projeto || !fonteValida || aCriar) return;
    setACriar(true);
    const alvo = projeto;
    const o = OBJETIVOS.find((x) => x.id === objetivo)!;
    const objetivoTxt = detalhe.trim() ? `${o.nome}: ${detalhe.trim()}` : `${o.nome} — ${o.desc}`;
    try {
      const r = await criarTrabalho({ project_id: alvo, texto, titulo, objetivo: objetivoTxt.slice(0, 200), tom, slides: nSlides, modo: demo ? "demonstracao" : comIa ? "ia" : "estruturacao",
        fonte_tipo: demo ? "texto" : tipoFonte,
        metadados: demo || tipoFonte === "texto" ? undefined
          : tipoFonte === "link" ? { ...linkMeta!, editado: linkMeta!.modo === "referencia" || texto !== original }
          : { ...pdfMeta!, parcial_confirmado: parcial, editado: texto !== original } });
      if (projetoRef.current !== alvo) { toast.info("O projeto mudou entretanto; o carrossel ficou no projeto anterior."); setACriar(false); return; }
      if (chave) limparRecuperacao(chave);
      if (r.reutilizado) toast.info("Já existia um carrossel com esta fonte e estas opções; foi aberto.");
      nav(`/estudio/carrosseis/${r.trabalho_id}`);
    } catch (e) {
      toast.error((e as Error).message);
      setACriar(false);
    }
  };

  const estrutura = estruturaPrevista(nSlides);

  return (
    <Quadro>
      <Cabecalho voltarPara="/estudio/carrosseis" titulo="Novo carrossel" sub={nomeProjeto ?? undefined}
        etapas={<Etapas atual={etapa} disponiveis={etapa === "narrativa" ? ["fonte"] : []} onIr={() => setEtapa("fonte")} compacto />} />

      <main className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
        {etapa === "fonte" && (
          <section className="mc-entrar space-y-6" aria-labelledby="t-fonte">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 id="t-fonte" className="text-2xl font-semibold tracking-tight sm:text-3xl">Que conteúdo vamos transformar?</h1>
              <div className="w-full space-y-1 sm:w-60">
                <Label htmlFor="projeto" className="text-xs text-muted-foreground">Marca / projeto</Label>
                <Select value={projeto} onValueChange={setProjeto} disabled={estado !== "pronto"}>
                  <SelectTrigger id="projeto" className="h-11"><SelectValue placeholder={projetos.length ? "Escolhe o projeto" : "Sem projetos disponíveis"} /></SelectTrigger>
                  <SelectContent className="mc-estudio">{projetos.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Organiza o conteúdo e define a cor inicial. O tom e objetivo são escolhidos no passo seguinte.</p>
              </div>
            </div>
            {!demo && (
              <ToggleGroup type="single" variant="outline" value={tipoFonte} onValueChange={(v) => v && mudarTipo(v as TipoFonte)} aria-label="Tipo de fonte" className="justify-start">
                <ToggleGroupItem value="texto" className="h-11 px-4"><Type className="mr-1.5 h-4 w-4" />Texto</ToggleGroupItem>
                <ToggleGroupItem value="link" className="h-11 px-4"><Link2 className="mr-1.5 h-4 w-4" />Link</ToggleGroupItem>
                <ToggleGroupItem value="pdf" className="h-11 px-4"><FileText className="mr-1.5 h-4 w-4" />PDF</ToggleGroupItem>
              </ToggleGroup>
            )}
            <p id="ajuda-texto" className="max-w-xl text-sm text-muted-foreground">
              {tipoFonte === "texto" ? "Cola o texto que vai servir de base ao carrossel."
                : tipoFonte === "link" ? "Indica o endereço do artigo. Sites autorizados são lidos automaticamente; nos outros, o link fica como referência e colas o texto."
                : "Escolhe um PDF com texto (até 15 MB e 60 páginas). O texto é lido página a página neste dispositivo."}
            </p>
            {tipoFonte === "link" && !demo && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Label htmlFor="url" className="sr-only">Endereço do artigo</Label>
                  <Input id="url" type="url" inputMode="url" className="h-11 flex-1" placeholder="https://…" value={url} maxLength={2000}
                    onChange={(e) => { setUrl(e.target.value); if (lendo) { pedido.current++; setLendo(false); } setFalhaFonte(null); setMotivoLink(null); if (linkMeta) limparFonte(); }} onKeyDown={(e) => e.key === "Enter" && !lendo && lerLink()}
                    aria-describedby="estado-link" aria-invalid={!!falhaFonte} />
                  <Button className="h-11" variant="secondary" onClick={lerLink} disabled={lendo || !url.trim()}>{lendo && <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />}Ler página</Button>
                </div>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer py-1">Que sites são lidos automaticamente?</summary>
                  <p className="mt-1">Por segurança, só origens públicas fixas já usadas no Hub: {HOSTS_LINK.join(", ")}. Páginas com acesso pago ou que dependem de JavaScript não são contornadas.</p>
                </details>
                <div id="estado-link" aria-live="polite" className="space-y-2">
                  {lendo && (
                    <p role="status" className="flex items-center gap-2 rounded-[var(--mc-r-md)] border border-border p-3 text-sm">
                      <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden />
                      <span>A ler a página e extrair o texto…{dominioDe(url) && <span className="text-muted-foreground"> · {dominioDe(url)}</span>}</span>
                    </p>
                  )}
                  {falhaFonte && !lendo && (
                    <div role="alert" className="space-y-2 rounded-[var(--mc-r-md)] border border-destructive/50 p-3 text-sm">
                      <p className="text-destructive">{falhaFonte}</p>
                      <div className="flex flex-wrap gap-2">
                        {acoesFalhaLink(motivoLink).repetir && <Button variant="secondary" className="h-11" onClick={lerLink}>Tentar de novo</Button>}
                        <Button variant="outline" className="h-11" onClick={usarComoReferencia}>Colar texto (o link fica como referência)</Button>
                      </div>
                    </div>
                  )}
                  {linkMeta && !lendo && (
                    <div className="space-y-1 rounded-[var(--mc-r-md)] border border-border p-3 text-xs text-muted-foreground" role="status">
                      {linkMeta.modo === "extraido" ? <>
                        <p className="text-sm text-foreground">{linkMeta.titulo_pagina ? `«${linkMeta.titulo_pagina}»` : "Página lida"} <span className="text-muted-foreground">· {dominioDe(linkMeta.url_final) ?? linkMeta.url_final}</span></p>
                        <p>Extraído automaticamente: {formatarNumero(resumoLeitura(original).caracteres)} caracteres.{linkMeta.truncado && " Texto truncado no limite de leitura: confirma abaixo se a parte lida chega."}{texto !== original && " Editado por ti depois da leitura."}</p>
                        {original && <p className="line-clamp-3 italic">{resumoLeitura(original).previa}</p>}
                      </> : <p>Referência: <span className="break-all text-foreground">{linkMeta.url}</span>. A página não foi lida — o texto abaixo é colado por ti.</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
            {tipoFonte === "pdf" && !demo && (
              <div className="space-y-3">
                <Label htmlFor="pdf" className="inline-flex h-11 cursor-pointer items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent focus-within:ring-2 focus-within:ring-ring">
                  {lendo ? <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}{pdfMeta ? "Escolher outro PDF" : "Escolher PDF"}
                  <input id="pdf" type="file" accept="application/pdf,.pdf" className="sr-only" disabled={lendo} onChange={(e) => { escolherPdf(e.target.files?.[0]); e.target.value = ""; }} />
                </Label>
                {falhaFonte && <p role="alert" className="text-sm text-destructive">{falhaFonte}</p>}
                {pdfMeta && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground" role="status">{pdfMeta.ficheiro} · {pdfMeta.total_paginas} {pdfMeta.total_paginas === 1 ? "página" : "páginas"} · {pdfMeta.completo ? "todas as páginas com texto" : `sem texto usado nas páginas ${intervalos(pdfMeta.paginas_em_falta)}`}</p>
                    <ol className="max-h-72 space-y-1 overflow-y-auto rounded-[var(--mc-r-md)] border border-border p-2" aria-label="Páginas do PDF">
                      {pdfMeta.paginas.map((pg) => {
                        const paras = pg.paragrafos ? fonte.paragrafos.slice(pg.paragrafos[0] - 1, pg.paragrafos[1]) : [];
                        const lida = pdfLido?.paginas[pg.n - 1];
                        const temTexto = lida ? lida.estado === "texto" : pg.estado === "texto";
                        return (
                          <li key={pg.n} className="flex gap-3 rounded p-2 text-sm">
                            {temTexto && pdfLido
                              ? <Checkbox id={`pg-${pg.n}`} className="mt-0.5" checked={!excluidas.has(pg.n)} onCheckedChange={() => alternarPagina(pg.n)} aria-label={`Usar página ${pg.n}`} />
                              : <span className="w-4" aria-hidden />}
                            <div className="min-w-0">
                              <p className="text-xs font-medium">Pág. {pg.n} · <span className={pg.estado === "texto" ? "text-muted-foreground" : "text-destructive"}>{NOME_ESTADO_PAGINA[pg.estado]}</span></p>
                              {paras.length > 0 && <p className="line-clamp-2 text-xs text-muted-foreground">{paras.join(" ")}</p>}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            )}
            {tipoFonte === "pdf" && pdfSemTexto && !demo && (
              <p role="alert" className="rounded-[var(--mc-r-md)] border border-destructive/50 p-3 text-sm text-destructive">Este PDF não tem camada de texto (parece digitalizado). Nesta versão não há OCR: usa a opção «Texto» e cola o conteúdo.</p>
            )}
            {precisaParcial && !demo && (
              <label className="flex items-start gap-3 rounded-[var(--mc-r-md)] border border-destructive/50 p-3 text-sm">
                <Checkbox checked={parcial} onCheckedChange={(v) => setParcial(v === true)} className="mt-0.5" aria-describedby="parcial-desc" />
                <span id="parcial-desc">{tipoFonte === "pdf"
                  ? <>Fonte parcial: {(pdfMeta?.paginas_em_falta.length ?? 0) === 1 ? "a página" : "as páginas"} {intervalos(pdfMeta?.paginas_em_falta ?? [])} não {(pdfMeta?.paginas_em_falta.length ?? 0) === 1 ? "entra" : "entram"} no carrossel. Confirmo que quero usar só o texto lido.</>
                  : <>A página é maior do que o texto lido; o artigo pode estar incompleto. Confirmo que quero usar só esta parte.</>}</span>
              </label>
            )}
            {demo && (
              <p className="flex items-center gap-2 rounded-[var(--mc-r-md)] border border-border px-3 py-2 text-xs text-muted-foreground" role="status">
                <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />Demonstração: texto sintético processado por um fornecedor simulado, sem IA real.
              </p>
            )}
            {recuperado && !demo && (
              <p className="text-xs text-muted-foreground" role="status">Rascunho recuperado deste dispositivo ({recuperado}). Ainda não foi enviado.</p>
            )}
            {(tipoFonte === "texto" || demo || (tipoFonte === "link" && linkMeta)) && <div>
              <Label htmlFor="texto" className="sr-only">Texto da fonte</Label>
              <Textarea id="texto" ref={textoRef} rows={8} readOnly={demo}
                aria-describedby="ajuda-texto estado-texto" aria-invalid={mostrarErro || semTexto}
                className={cn("min-h-[min(40vh,320px)] resize-y rounded-[var(--mc-r-lg)] border-input bg-card p-4 text-base leading-relaxed", (mostrarErro || semTexto) && "border-destructive")}
                value={texto} onBlur={() => texto.trim() && setTocado(true)}
                onChange={(e) => { setTexto(e.target.value); setSlides(null); setRecuperado(null); }}
                placeholder="Cola aqui o texto que queres transformar em carrossel." />
              <div id="estado-texto" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs" aria-live="polite">
                <span className={cn(mostrarErro || semTexto ? "text-destructive" : "text-muted-foreground")}>
                  {semTexto ? "Cola o texto para continuar." : mostrarErro ? av.motivo : fonte.paragrafos.length ? `${fonte.paragrafos.length} ${fonte.paragrafos.length === 1 ? "parágrafo" : "parágrafos"}` : ""}
                </span>
                {fonte.paragrafos.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-11" aria-expanded={rever} aria-controls="rever-fonte" onClick={() => setRever((v) => !v)}>
                    {rever ? "Esconder fonte" : "Rever fonte"}
                  </Button>
                )}
              </div>
            </div>}
            {tipoFonte === "pdf" && pdfMeta && !pdfSemTexto && !demo && (
              <Grupo titulo="Editar texto extraído" resumo={texto !== original ? "Editado por ti" : "Tal como foi lido"}>
                <Label htmlFor="texto-pdf" className="sr-only">Texto extraído do PDF</Label>
                <Textarea id="texto-pdf" rows={8} className="rounded-[var(--mc-r-lg)] bg-card p-4 text-sm leading-relaxed" value={texto} onChange={(e) => { setTexto(e.target.value); setSlides(null); }} />
                <p className="mt-1 text-xs text-muted-foreground">{av.ok ? `${fonte.paragrafos.length} parágrafos` : av.motivo} {texto !== original && "· Ao editar, a correspondência exata página→parágrafo deixa de ser garantida."}</p>
              </Grupo>
            )}
            {rever && fonte.paragrafos.length > 0 && (
              <ol id="rever-fonte" className="mc-entrar space-y-3 border-l border-border pl-4" aria-label="Parágrafos numerados (§), tal como os slides os vão citar">
                <li className="text-xs text-muted-foreground">Cada parágrafo fica numerado (§) para que os slides citem a sua origem.</li>
                {fonte.paragrafos.map((p, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed"><span className="w-7 shrink-0 tabular-nums text-muted-foreground">§{i + 1}</span><span>{p}</span></li>
                ))}
              </ol>
            )}
            <Grupo titulo="Detalhes" resumo={titulo ? titulo : "Título opcional"}>
              <div className="space-y-1">
                <Label htmlFor="titulo">Título <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                <Input id="titulo" className="h-11" maxLength={300} value={titulo} onChange={(e) => setTitulo(e.target.value)} disabled={demo} />
              </div>
            </Grupo>
            <div className="border-t border-border pt-4">
              {!demo
                ? <Button variant="ghost" size="sm" className="h-11 text-muted-foreground" onClick={usarDemo}><FlaskConical className="mr-1.5 h-4 w-4" />Experimentar com texto de demonstração</Button>
                : <Button variant="ghost" size="sm" className="h-11" onClick={sairDemo}>Sair da demonstração</Button>}
            </div>
          </section>
        )}

        {etapa === "narrativa" && (
          <section className="mc-entrar space-y-8" aria-labelledby="t-narrativa">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{nomeProjeto}</span><span aria-hidden>·</span>
              <span>{titulo || fonte.paragrafos[0]?.slice(0, 60) + (fonte.paragrafos[0]?.length > 60 ? "…" : "")}</span><span aria-hidden>·</span>
              <span>{fonte.paragrafos.length} §</span>
              {demo && <><span aria-hidden>·</span><span>Demonstração</span></>}
            </div>
            <div className="space-y-4">
              <h1 id="t-narrativa" className="text-2xl font-semibold tracking-tight sm:text-3xl">O que deve fazer este carrossel?</h1>
              <div role="radiogroup" aria-label="Objetivo" className="grid gap-2 sm:grid-cols-2">
                {OBJETIVOS.map((o) => {
                  const sel = objetivo === o.id;
                  return (
                    <button key={o.id} type="button" role="radio" aria-checked={sel} onClick={() => setObjetivo(o.id)}
                      className={cn("mc-trans min-h-16 rounded-[var(--mc-r-lg)] border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        sel ? "border-primary bg-primary/10" : "border-input hover:border-muted-foreground")}>
                      <span className="block font-medium">{o.nome}</span>
                      <span className="block text-sm text-muted-foreground">{o.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-medium">Estrutura prevista · {nSlides} slides</h2>
              <ol className="flex flex-wrap gap-1.5" aria-label="Estrutura prevista">
                {estrutura.map((p, i) => (
                  <li key={i} className="rounded-[var(--mc-r-sm)] border border-border px-2 py-1 text-xs text-muted-foreground"><span className="tabular-nums">{i + 1}</span> {p}</li>
                ))}
              </ol>
              <p className="text-xs text-muted-foreground">Uma ideia por página, só com factos da fonte. A estrutura final adapta-se ao texto.</p>
            </div>

            <div>
              <Grupo titulo="Personalizar" resumo={[tom || "Tom automático", `${nSlides} slides`].join(" · ")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="detalhe">Precisar o objetivo <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                    <Input id="detalhe" className="h-11" maxLength={160} value={detalhe} onChange={(e) => setDetalhe(e.target.value)} placeholder="Por exemplo: convidar a ler a edição completa" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tom">Tom</Label>
                    <Input id="tom" className="h-11" maxLength={80} value={tom} onChange={(e) => setTom(e.target.value)} placeholder="Sóbrio, próximo, didático…" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="slides">Número de slides</Label>
                    <Input id="slides" type="number" inputMode="numeric" className="h-11 w-28" min={2} max={av.slidesMax || 2} value={nSlides}
                      onChange={(e) => setSlides(Number(e.target.value) || null)} aria-describedby="slides-ajuda" />
                    <p id="slides-ajuda" className="text-xs text-muted-foreground">Sugestão: {av.slidesSugeridos}. Este texto permite até {av.slidesMax}.</p>
                  </div>
                </div>
              </Grupo>
              {!demo && projeto && (
                <Grupo titulo="Opções de geração" resumo={orc ? (comIa ? `IA disponível · ${Math.max(0, orc.maxDia - orc.usadosHoje)} pedidos hoje` : "Sem IA — estruturado com frases da fonte") : "A ler limites…"}>
                  <div className="space-y-3">
                    <LimitesIa projectId={projeto} onAlterado={setOrc} />
                    <p className="text-xs text-muted-foreground">
                      {comIa ? "A IA reescreve o texto em slides usando só factos da fonte, com referência aos parágrafos (§). Usa 1 pedido (2 se precisar de correção)."
                        : "Sem IA: cada frase vem do texto, com a referência ao parágrafo, e nada é inventado."}
                    </p>
                  </div>
                </Grupo>
              )}
            </div>
            {!demo && orc && !comIa && (
              <p className="text-xs text-muted-foreground" role="note">A IA não está disponível hoje neste projeto; o carrossel será estruturado com frases da fonte. Podes mudar isto em «Opções de geração».</p>
            )}
          </section>
        )}
      </div></main>

      <BarraAcoes
        inicio={etapa === "narrativa" && <Button variant="ghost" className="h-11" onClick={() => setEtapa("fonte")}><ArrowLeft className="mr-1.5 h-4 w-4" />Voltar</Button>}
        nota={etapa === "narrativa" ? (demo ? "Demonstração · fornecedor simulado" : comIa ? "Gera no servidor; podes sair da página." : "Gera sem IA, no servidor.") : undefined}
        fim={etapa === "fonte"
          ? <Button className="h-11 px-5" onClick={continuar} disabled={!projeto}>Continuar<ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          : <Button className="h-11 px-5" onClick={criar} disabled={aCriar || !fonteValida}>{aCriar && <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />}{demo ? "Gerar demonstração" : comIa ? "Gerar carrossel" : "Gerar sem IA"}</Button>}
      />
    </Quadro>
  );
}
