import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, CloudOff, History, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { chaveRecuperacao, guardarRecuperacao, limparRecuperacao } from "@/lib/recuperacaoLocal";
import { abrirTrabalho, acordarFila, ConflitoVersao, gravarEdicao, lerVersao, listarVersoes, retomarTrabalho, type TrabalhoCompleto, type VersaoDoc } from "@/services/motor";
import { EditorGrafico } from "@/features/editor-grafico/EditorGrafico";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { carregarMedidor } from "@/features/editor-grafico/fontes";
import { aplicarResultado, calcularGravacao, type Extras, type Gravado } from "@/features/motor/gravacao";
import { layoutTexto, resolverTexto, type Medidor, type PacoteProva, type Variante } from "../../supabase/functions/_shared/documento-grafico/nucleo";
import { normalizarFonte, paraPacote, type PropostaEditorial } from "../../supabase/functions/_shared/motor/proposta";
import { dataPt, NOME_ESTADO } from "./Carrosseis";

type Passo = "fonte" | "conteudo" | "design";
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
  const { user } = useAuth();
  const [dados, setDados] = useState<TrabalhoCompleto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [passo, setPasso] = useState<Passo>("conteudo");
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

  const chave = user && dados ? chaveRecuperacao(user.id, "carrossel", id, dados.trabalho.project_id) : null;

  const carregar = useCallback(async () => {
    try {
      const d = await abrirTrabalho(id);
      setDados(d);
      const g = gravadoDe(d);
      if (g) {
        setGravado(g);
        setPacote(paraPacote(id, d.trabalho.titulo ?? "Carrossel", g.conteudo, { A: g.docs.A.documento, B: g.docs.B.documento }));
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

  const alterarSlide = (sid: string, campo: "titulo" | "texto", valor: string) => {
    setPacote((p) => p && ({ ...p, conteudo: { slides: p.conteudo.slides.map((s) => (s.id === sid ? { ...s, [campo]: valor } : s)) } }));
    setRevisao((r) => r + 1);
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
    }
    return out;
  }, [medidor, pacote]);

  if (erro) return <div className="p-4"><p role="alert" className="text-sm text-destructive">{erro}</p><Link className="text-sm underline" to="/estudio/carrosseis">Voltar aos carrosséis</Link></div>;
  if (!dados) return <p className="flex items-center p-4 text-sm text-muted-foreground" role="status"><Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />A abrir…</p>;

  const t = dados.trabalho;
  const prop = dados.proposta.conteudo;
  const fonte = normalizarFonte(dados.fonte.texto);
  const pronto = !!(gravado && pacote);

  const avisoBadge = avisos.length > 0 && (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 lg:h-8 text-destructive"><AlertTriangle className="mr-1 h-3.5 w-3.5" />{avisos.length} {avisos.length === 1 ? "aviso" : "avisos"}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm">
        <p className="mb-2 font-medium">Texto que não cabe</p>
        <ul className="space-y-1 text-xs">{avisos.map((a) => <li key={a}>{a}</li>)}</ul>
        <p className="mt-2 text-xs text-muted-foreground">O texto não é reduzido automaticamente. Encurta-o no conteúdo ou aumenta a caixa no design.</p>
      </PopoverContent>
    </Popover>
  );

  const passos = (
    <nav aria-label="Passos" className="flex gap-1">
      {(["fonte", "conteudo", "design"] as const).map((p, i) => (
        <Button key={p} size="sm" variant={passo === p ? "secondary" : "ghost"} className="h-11 lg:h-8" disabled={p !== "fonte" && !pronto} onClick={() => setPasso(p)} aria-current={passo === p ? "step" : undefined}>
          {i + 1}. {p === "fonte" ? "Fonte" : p === "conteudo" ? "Conteúdo" : "Design"}
        </Button>
      ))}
    </nav>
  );

  const dialogos = (
    <>
      <Dialog open={!!conflito} onOpenChange={() => undefined}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Outra sessão gravou alterações</DialogTitle>
            <DialogDescription>Nada foi substituído. Escolhe como continuar; a tua versão continua guardada neste dispositivo.</DialogDescription>
          </DialogHeader>
          {conflito?.servidor?.proposta.conteudo && pacote && (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><h3 className="mb-1 font-medium">A tua versão</h3><ol className="space-y-1">{pacote.conteudo.slides.map((s) => <li key={s.id} className="rounded bg-muted p-2"><strong>{s.titulo}</strong><br />{s.texto}</li>)}</ol></div>
              <div><h3 className="mb-1 font-medium">No servidor (proposta v{conflito.servidor.proposta.versao})</h3><ol className="space-y-1">{conflito.servidor.proposta.conteudo.slides.map((s) => <li key={s.id} className="rounded bg-muted p-2"><strong>{s.titulo}</strong><br />{s.texto}</li>)}</ol></div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {!conflito?.servidor && <Button variant="outline" onClick={verServidor}>Comparar</Button>}
            <Button variant="outline" onClick={usarServidor}>Usar a do servidor</Button>
            <Button onClick={manterMinha}>Gravar a minha como nova versão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!versoes} onOpenChange={(o) => { if (!o) { setVersoes(null); setVendoVersao(null); } }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Versões da variante {versoes?.variante}</DialogTitle>
            <DialogDescription>Só leitura. Versões antigas nunca são alteradas.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {versoes?.lista.map((v) => (
              <Button key={v.versao} size="sm" variant={vendoVersao?.versao === v.versao ? "secondary" : "outline"} onClick={() => verVersao(versoes.variante, v.versao)}>
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

  if (passo === "design" && pacote && chave !== undefined) {
    return (
      <>
        <EditorGrafico key={`${id}-${revisao}`} pacoteInicial={pacote} chaveLocal={chave} real
          titulo={<span className="truncate">{t.titulo || dados?.proposta?.conteudo?.titulo || "Carrossel"}</span>}
          cabecalhoInicio={<Button variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9" aria-label="Voltar ao conteúdo" onClick={() => setPasso("conteudo")}><ArrowLeft className="h-4 w-4" /></Button>}
          estadoGravacao={<div className="flex items-center gap-2">{avisoBadge}<EstadoChip estado={estadoG} /></div>}
          menuExtra={<><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => abrirVersoes("A")}><History className="mr-2 h-4 w-4" />Versões da variante A</DropdownMenuItem><DropdownMenuItem onSelect={() => abrirVersoes("B")}><History className="mr-2 h-4 w-4" />Versões da variante B</DropdownMenuItem></>}
          onAlterado={(p) => setPacote(p)} />
        {dialogos}
      </>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-3">
      <header className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9" aria-label="Voltar aos carrosséis"><Link to="/estudio/carrosseis"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{t.titulo || dados?.proposta?.conteudo?.titulo || "Carrossel"}</h1>
          <p className="text-xs text-muted-foreground">{dataPt(t.criado_em)} · {NOME_ESTADO[t.estado]}{prop?.demonstracao && " · demonstração"}</p>
        </div>
        {pronto && <EstadoChip estado={estadoG} />}
      </header>
      {passos}

      {emCurso && (
        <p className="flex items-center rounded-md border border-border p-3 text-sm" role="status">
          <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
          {t.estado === "pendente" ? "Na fila do servidor." : t.etapa === "documento" ? "A compor as variantes A e B…" : "A preparar a proposta editorial…"} Podes sair desta página; o trabalho continua no servidor.
        </p>
      )}
      {(t.estado === "erro" || t.estado === "desconhecido") && (
        <div className="rounded-md border border-destructive/50 p-3 text-sm" role="alert">
          <p className="font-medium">{t.estado === "erro" ? "O trabalho parou." : "O resultado da última chamada é incerto e não será repetido automaticamente."}</p>
          {t.erro && <p className="text-muted-foreground">{t.erro}</p>}
          {t.estado === "erro" && <Button size="sm" variant="outline" className="mt-2 h-11 lg:h-8" onClick={async () => { try { await retomarTrabalho(id); setPolls(0); await carregar(); } catch (e) { toast.error((e as Error).message); } }}><RotateCw className="mr-1.5 h-4 w-4" />Tentar de novo</Button>}
        </div>
      )}

      {passo === "fonte" && (
        <section className="space-y-2" aria-label="Fonte">
          <p className="text-xs text-muted-foreground">Fonte guardada tal como foi enviada · impressão digital {dados.fonte.hash.slice(0, 12)}</p>
          <ol className="space-y-2 rounded-md border border-border bg-card p-3">
            {fonte.paragrafos.map((p, i) => <li key={i} className="flex gap-2 text-sm"><span className="w-7 shrink-0 tabular-nums text-muted-foreground">§{i + 1}</span><span>{p}</span></li>)}
          </ol>
        </section>
      )}

      {passo === "conteudo" && pronto && prop && pacote && (
        <section className="space-y-4" aria-label="Conteúdo">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{prop.metodo === "demonstracao" ? "Demonstração (fornecedor simulado)" : prop.metodo === "estruturacao" ? "Estruturado sem IA" : "IA"}</Badge>
            <span>Proposta v{gravado!.propostaVersao}. O texto é partilhado pelas variantes A e B; cada alteração cria uma nova versão.</span>
          </div>
          <ol className="space-y-3">
            {pacote.conteudo.slides.map((s, i) => {
              const ps = prop.slides.find((x) => x.id === s.id);
              return (
                <li key={s.id} className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Slide {i + 1}</span>
                    {ps && <span>{{ capa: "Capa", contexto: "Contexto", desenvolvimento: "Desenvolvimento", fecho: "Fecho" }[ps.papel]}</span>}
                    {ps && ps.fontes.length > 0 && <span>· fonte {ps.fontes.map((n) => `§${n}`).join(", ")}</span>}
                  </div>
                  <Input aria-label={`Título do slide ${i + 1}`} className="h-11 font-medium lg:h-9" value={s.titulo} maxLength={400} onChange={(e) => alterarSlide(s.id, "titulo", e.target.value)} />
                  <Textarea aria-label={`Texto do slide ${i + 1}`} rows={3} className="text-base lg:text-sm" value={s.texto} maxLength={3000} onChange={(e) => alterarSlide(s.id, "texto", e.target.value)} />
                </li>
              );
            })}
          </ol>
          <div className="space-y-1">
            <Label htmlFor="legenda">Legenda</Label>
            <Textarea id="legenda" rows={4} className="text-base lg:text-sm" maxLength={2200} value={extras.legenda} onChange={(e) => setExtras((x) => ({ ...x, legenda: e.target.value }))} />
          </div>
          <details className="rounded-md border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">Texto alternativo das imagens</summary>
            <div className="mt-2 space-y-2">
              {extras.alt.map((a, i) => (
                <Input key={i} aria-label={`Texto alternativo do slide ${i + 1}`} className="h-11 lg:h-9" maxLength={250} value={a}
                  onChange={(e) => setExtras((x) => ({ ...x, alt: x.alt.map((y, j) => (j === i ? e.target.value : y)) }))} />
              ))}
            </div>
          </details>
          {avisoBadge}
          <Button className="h-11 lg:h-9" onClick={() => setPasso("design")}>Continuar para o design</Button>
        </section>
      )}
      {dialogos}
    </div>
  );
}
