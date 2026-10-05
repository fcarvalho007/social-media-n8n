import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { carregarImagens } from "@/features/editor-grafico/desenho";
import { cn } from "@/lib/utils";
import { Grupo } from "./Estudio";
import { PARES_FONTES, transbordos, type Medidor, type PacoteProva, type Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarEstilo, ESTILOS, type Estilo, type EstiloId, type Paleta } from "../../../supabase/functions/_shared/motor/estilos";
import { adaptarCorNotas, aplicarModelo, notasIlegiveis, type ResultadoPacoteModelo } from "../../../supabase/functions/_shared/motor/modelos";
import { composicoesPagina, contrastesFracos, formatarRazao, NOME_RITMO, type ComposicaoId, type OpcaoComposicao, type SlideRitmo } from "../../../supabase/functions/_shared/motor/composicoes";
import { aplicarComposicaoSlide, previaPagina, slideDaPagina, sugerirRitmo, type SugestaoRitmo } from "./variacoes";

interface Props {
  onPendente?: (pendente: boolean) => void;
  pacote: PacoteProva;
  medidor: Medidor;
  /** Replaces both variants (text untouched); the page autosaves as a new composition version. */
  onAplicar: (p: PacoteProva) => void;
  /** Slide roles/citations and source paragraphs, used only for the deterministic rhythm suggestion. */
  slides?: Array<SlideRitmo & { id: string }>;
  paragrafos?: string[];
  /** Opens directly on one slide (coming from the editor's Estilos panel). */
  inicio?: { variante: Variante; pagina: number } | null;
}

const NOME_COR: Record<keyof Paleta, string> = { fundo: "Fundo", fundoCapa: "Fundo da capa", titulo: "Títulos", texto: "Texto", destaque: "Destaque", discreto: "Números e notas" };

function estilizar(p: PacoteProva, paleta: Paleta, par: string, manuais: boolean): { pacote: PacoteProva; manuais: number } {
  const A = aplicarEstilo(p.variantes.A, paleta, par, manuais);
  const B = aplicarEstilo(p.variantes.B, paleta, par, manuais);
  return { pacote: { ...p, variantes: { A: A.doc, B: B.doc } }, manuais: A.manuais + B.manuais };
}

/** Model preview for the whole carousel (both variants); refused pages stay as they are. */
function modelar(p: PacoteProva, id: EstiloId, paleta: Paleta, par: string, m: Medidor): ResultadoPacoteModelo {
  return aplicarModelo(p, id, paleta, par, ["A", "B"], m);
}
const listaRecusas = (r: ResultadoPacoteModelo) => r.recusadas.map((x) => `${x.variante} p${x.pagina + 1}`).join(", ");

/** Design step: pick one of six styles, adjust palette and font pair, apply explicitly. Never opens with changes. */
export function PassoDesign({ pacote, medidor, onAplicar, slides, paragrafos, inicio, onPendente }: Props) {
  const [ambito, setAmbito] = useState<"todos" | "slide">(inicio ? "slide" : "todos");
  const [paginaSel, setPaginaSel] = useState(inicio?.pagina ?? 0);
  const [opcoes, setOpcoes] = useState<OpcaoComposicao[] | null>(null);
  const [compSel, setCompSel] = useState<ComposicaoId | null>(null);
  const [modSlide, setModSlide] = useState<EstiloId | null>(null);
  const [ambas, setAmbas] = useState(false);
  const [ritmo, setRitmo] = useState<SugestaoRitmo | null>(null);
  // No style is marked as current until the user picks one: the saved document may not match any preset.
  const [escolha, setEscolha] = useState<Estilo | null>(null);
  const [ajustado, setAjustado] = useState(false);
  const [paleta, setPaleta] = useState<Paleta>(ESTILOS[0].paleta);
  const [par, setPar] = useState(ESTILOS[0].par);
  const [manuais, setManuais] = useState(false);
  const [variante, setVariante] = useState<Variante>(inicio?.variante ?? "A");
  const [confirmar, setConfirmar] = useState(false);
  const [imagens, setImagens] = useState<Record<string, HTMLImageElement>>({});
  useEffect(() => { let vivo = true; carregarImagens(pacote).then((i) => vivo && setImagens(i)).catch(() => undefined); return () => { vivo = false; }; }, [pacote]);

  useEffect(() => { setOpcoes(null); setCompSel(null); setRitmo(null); setAjustado(false); setEscolha(null); }, [pacote]);
  useEffect(() => { onPendente?.((!!compSel || !!modSlide) && !!opcoes); }, [compSel, modSlide, opcoes, onPendente]);
  useEffect(() => () => onPendente?.(false), [onPendente]);
  const escolher = (e: Estilo) => { setEscolha(e); setPaleta(e.paleta); setPar(e.par); setAjustado(true); };
  const modelo = useMemo(() => (ajustado && escolha ? modelar(pacote, escolha.id, paleta, par, medidor) : null), [ajustado, escolha, pacote, paleta, par, medidor]);
  const previa = useMemo(() => {
    const base = ajustado ? estilizar(modelo?.pacote ?? pacote, paleta, par, manuais) : { pacote, manuais: estilizar(pacote, paleta, par, false).manuais };
    // With a model, editorial text/decor already carry the model's choices; only manual layers get recoloured on request.
    return modelo && !manuais ? { pacote: modelo.pacote, manuais: base.manuais } : base;
  }, [ajustado, modelo, pacote, paleta, par, manuais]);
  const miniaturas = useMemo(() => ESTILOS.map((e) => ({ e, p: modelar(pacote, e.id, e.paleta, e.par, medidor).pacote })), [pacote, medidor]);
  const opcoesModelo = useMemo(() => {
    if (ambito !== "slide" || !opcoes) return [];
    return ESTILOS.map((e) => ({ e, r: aplicarModelo(pacote, e.id, e.paleta, e.par, [variante], medidor, [paginaSel]) }));
  }, [ambito, opcoes, pacote, variante, medidor, paginaSel]);
  const novos = useMemo(() => {
    const antes = new Set((["A", "B"] as const).flatMap((v) => transbordos(pacote, v, medidor).map((t) => `${v}${t.pagina}`)));
    return (["A", "B"] as const).flatMap((v) => transbordos(previa.pacote, v, medidor).filter((t) => !antes.has(`${v}${t.pagina}`)).map((t) => `${v} p${t.pagina + 1}`));
  }, [pacote, previa, medidor]);
  const paginas = previa.pacote.variantes[variante].paginas;
  const docPaginas = pacote.variantes[variante].paginas;
  const pgSel = docPaginas[Math.min(paginaSel, docPaginas.length - 1)];
  const slideSel = pgSel ? slideDaPagina(pgSel) : null;
  const explorar = () => { if (pgSel) { setOpcoes(composicoesPagina(pgSel, pacote.conteudo, medidor)); setCompSel(null); setModSlide(null); } };
  const outra: Variante = variante === "A" ? "B" : "A";
  const aplicarSlide = () => {
    if (modSlide) {
      const e = ESTILOS.find((x) => x.id === modSlide)!;
      const r = aplicarModelo(pacote, e.id, e.paleta, e.par, ambas ? [variante, outra] : [variante], medidor, [paginaSel]);
      if (r.recusadas.length === (ambas ? 2 : 1)) return;
      onAplicar(r.pacote);
      setOpcoes(null); setModSlide(null);
      return;
    }
    if (!slideSel || !compSel) return;
    const r = aplicarComposicaoSlide(pacote, slideSel, compSel, ambas ? [variante, outra] : [variante], medidor);
    if (!r.aplicadas.length) return;
    onAplicar(r.pacote);
    setOpcoes(null); setCompSel(null);
  };
  const podeRitmo = !!slides?.length && !!paragrafos?.length;
  const notas = useMemo(() => ({ A: notasIlegiveis(pacote.variantes.A), B: notasIlegiveis(pacote.variantes.B) }), [pacote]);
  const nNotas = notas.A.length + notas.B.length;

  return (
    <section className="mc-entrar space-y-6" aria-labelledby="t-design">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 id="t-design" className="text-2xl font-semibold tracking-tight">Design</h1>
        <p className="text-xs text-muted-foreground">{ambito === "slide" ? "O texto não muda. Nada é aplicado até carregares em «Aplicar só ao slide»." : "O texto não muda. Nada é aplicado até carregares em «Aplicar estilo»."}</p>
      </div>

      {nNotas > 0 && (
        <div role="note" className="flex flex-wrap items-center gap-3 rounded-[var(--mc-r-md)] border border-border p-3 text-sm">
          <p className="min-w-0 flex-1">
            {nNotas === 1 ? "Uma nota acrescentada à mão fica" : `${nNotas} notas acrescentadas à mão ficam`} pouco legível sobre o fundo
            ({[...notas.A.map((n) => `A p${n.pagina + 1}`), ...notas.B.map((n) => `B p${n.pagina + 1}`)].join(", ")}; contraste {formatarRazao(Math.min(...[...notas.A, ...notas.B].map((n) => n.razao)))} para o mínimo {Math.max(...[...notas.A, ...notas.B].map((n) => n.minimo))}:1).
            Se não adaptares, a tua cor mantém-se.
          </p>
          <Button variant="outline" className="h-11" onClick={() => onAplicar({ ...pacote, variantes: { A: adaptarCorNotas(pacote.variantes.A, notas.A), B: adaptarCorNotas(pacote.variantes.B, notas.B) } })}>Adaptar cor</Button>
        </div>
      )}

      <p className="max-w-2xl text-sm text-muted-foreground">As variantes A e B usam a mesma narrativa com duas composições diferentes. Não são redes sociais nem versões: escolhes uma na revisão.</p>

      <div role="radiogroup" aria-label="Âmbito" className="inline-flex gap-1 rounded-[var(--mc-r-md)] bg-muted p-1">
        {([["todos", "Carrossel completo"], ["slide", "Só este slide"]] as const).map(([id, nome]) => (
          <button key={id} type="button" role="radio" aria-checked={ambito === id} onClick={() => { setAmbito(id); setOpcoes(null); setRitmo(null); }}
            className={cn("min-h-10 rounded-sm px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", ambito === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{nome}</button>
        ))}
      </div>

      {ambito === "slide" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["A", "B"] as const).map((v) => <Button key={v} variant={variante === v ? "secondary" : "ghost"} className="h-11" onClick={() => { setVariante(v); setOpcoes(null); }}>Variante {v}</Button>)}
          </div>
          <ol className="flex gap-2 overflow-x-auto pb-1" aria-label="Escolhe o slide">
            {docPaginas.map((pg, i) => (
              <li key={pg.id} className="shrink-0">
                <button type="button" aria-pressed={i === paginaSel} aria-label={`Slide ${i + 1}`} onClick={() => { setPaginaSel(i); setOpcoes(null); }}
                  className={cn("block overflow-hidden rounded-[var(--mc-r-sm)] border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", i === paginaSel ? "border-primary" : "border-transparent")}>
                  <PaginaCanvas pacote={pacote} variante={variante} indice={i} medidor={medidor} imagens={imagens} escala={88 / 1080} />
                  <span className="block py-0.5 text-center text-xs tabular-nums">{i + 1}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" className="h-11" onClick={explorar} disabled={!slideSel}>Explorar modelos e composições do slide {paginaSel + 1}</Button>
            {!slideSel && <p className="text-xs text-muted-foreground">Este slide só tem camadas acrescentadas à mão; não há composições para ele.</p>}
          </div>
          {opcoes && (
            <div className="space-y-3">
              <p role="status" className="text-sm font-medium">Pré-visualização — não aplicada <span className="font-normal text-muted-foreground">· o documento guardado só muda quando aplicares.</span></p>
              {opcoesModelo.length > 0 && (<>
                <h2 className="text-sm font-medium">Modelos</h2>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Modelos para este slide">
                  {opcoesModelo.map(({ e, r }) => {
                    const recusado = r.recusadas.length > 0;
                    return (
                      <li key={e.id}>
                        <button type="button" disabled={recusado} aria-pressed={modSlide === e.id} onClick={() => { setModSlide(e.id); setCompSel(null); }}
                          className={cn("block w-full rounded-[var(--mc-r-md)] border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60", modSlide === e.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground")}>
                          <span className="block overflow-hidden rounded-[var(--mc-r-sm)]"><PaginaCanvas pacote={r.pacote} variante={variante} indice={paginaSel} medidor={medidor} imagens={imagens} escala={140 / 1080} /></span>
                          <span className="mt-2 flex items-center gap-1 text-sm font-medium">{modSlide === e.id && <Check className="h-3.5 w-3.5 text-primary" />}{e.nome}</span>
                          {recusado && <span className="mt-1 block text-xs text-destructive">O texto não cabe neste modelo sem reduzir a letra abaixo do mínimo legível. Encurta o texto na Narrativa.</span>}
                          {!recusado && r.marcador && <span className="mt-1 block text-xs text-muted-foreground">Sem imagem: mostra o marcador «Imagem por escolher».</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <h2 className="text-sm font-medium">Composições</h2>
              </>)}
              {opcoes.length === 0 ? <p className="text-sm text-muted-foreground">Este slide não tem título nem texto para recompor.</p> : (
                <ul className="grid grid-cols-1 gap-3 min-[481px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Composições">
                  {opcoes.map((o) => {
                    const fracos = contrastesFracos(o);
                    return (
                      <li key={o.id}>
                        <button type="button" disabled={!o.cabe} aria-pressed={compSel === o.id} onClick={() => { setCompSel(o.id); setModSlide(null); }}
                          className={cn("block w-full rounded-[var(--mc-r-md)] border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60", compSel === o.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground")}>
                          <span className="block overflow-hidden rounded-[var(--mc-r-sm)]"><PaginaCanvas pacote={previaPagina(pacote, variante, o.pagina)} variante={variante} indice={paginaSel} medidor={medidor} imagens={imagens} escala={(typeof window !== "undefined" && window.innerWidth <= 480 ? Math.min(320, window.innerWidth - 64) : 160) / 1080} /></span>
                          <span className="mt-2 flex items-center gap-1 text-sm font-medium">{compSel === o.id && <Check className="h-3.5 w-3.5 text-primary" />}{o.nome}</span>
                          <span className="block text-xs text-muted-foreground">{o.descricao}</span>
                          {!o.cabe && <span className="mt-1 block text-xs text-destructive">O texto não cabe aqui. Encurta o texto ou ajusta a caixa no editor.</span>}
                          {o.cabe && fracos.map((c) => <span key={c.elemento} className="mt-1 block text-xs text-destructive">Contraste baixo no {c.elemento}: {formatarRazao(c.razao)}:1 (mínimo {formatarRazao(c.minimo)}:1). Podes aplicar e ajustar a cor no editor.</span>)}
                          {o.cabe && o.contrasteMin == null && <span className="mt-1 block text-xs text-muted-foreground">Texto sobre imagem: confirma a leitura.</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {opcoes.length > 0 && opcoes.every((o) => !o.cabe) && <p role="alert" className="text-sm text-destructive">Nenhuma composição cabe com o texto atual. Encurta o texto na Narrativa ou ajusta a caixa no editor; o tamanho da letra nunca é reduzido sozinho.</p>}
              <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border bg-background px-4 py-2 sm:mx-0 sm:rounded-[var(--mc-r-md)] sm:border" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }} role="group" aria-label="Aplicar composição">
                <p className="w-full text-xs text-muted-foreground" aria-live="polite">{compSel || modSlide ? <>Escolhida: <strong className="font-medium text-foreground">{modSlide ? `Modelo ${ESTILOS.find((e) => e.id === modSlide)?.nome}` : opcoes.find((o) => o.id === compSel)?.nome}</strong> · variante {variante}{ambas ? ` e ${outra}` : ""} · só o slide {paginaSel + 1}. Ainda não aplicada.</> : "Escolhe um modelo ou uma composição para aplicar."}</p>
                <div className="flex min-h-11 items-center gap-2">
                  <Checkbox id="ambas" checked={ambas} onCheckedChange={(v) => setAmbas(v === true)} />
                  <Label htmlFor="ambas" className="text-sm font-normal">Aplicar também à variante {outra}</Label>
                </div>
                <Button variant="ghost" className="h-11" onClick={() => { setOpcoes(null); setCompSel(null); setModSlide(null); }}>Cancelar</Button>
                <Button className="h-11" disabled={!compSel && !modSlide} onClick={aplicarSlide}>Aplicar só ao slide {paginaSel + 1}</Button>
              </div>
            </div>
          )}
        </div>
      ) : (<>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Estilos">
        {miniaturas.map(({ e, p }) => (
          <li key={e.id}>
            <button type="button" onClick={() => escolher(e)} aria-pressed={escolha?.id === e.id}
              className={cn("mc-trans block w-full rounded-[var(--mc-r-md)] border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", escolha?.id === e.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground")}>
              <span className="flex gap-1 overflow-hidden rounded-[var(--mc-r-sm)]">
                {[0, 1].filter((i) => i < p.variantes.A.paginas.length).map((i) => <PaginaCanvas key={i} pacote={p} variante="A" indice={i} medidor={medidor} imagens={imagens} escala={(p.variantes.A.paginas.length > 1 ? 68 : 140) / 1080} />)}
              </span>
              <span className="mt-2 flex items-center gap-1 text-sm font-medium">{escolha?.id === e.id && <Check className="h-3.5 w-3.5 text-primary" />}{e.nome}</span>
              <span className="block text-xs text-muted-foreground">{e.descricao}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {(["A", "B"] as const).map((v) => <Button key={v} variant={variante === v ? "secondary" : "ghost"} className="h-11" onClick={() => setVariante(v)}>Variante {v}</Button>)}
          </div>
          {podeRitmo && !ritmo && <Button variant="outline" className="h-11" onClick={() => setRitmo(sugerirRitmo(pacote, slides!, paragrafos!, medidor))}>Sugerir ritmo visual</Button>}
          {ritmo && (
            <div className="space-y-2 rounded-[var(--mc-r-md)] border border-border p-3">
              <p role="status" className="text-sm font-medium">Ritmo visual — pré-visualização, não aplicada</p>
              <p className="text-xs text-muted-foreground">Baseado no papel de cada slide e nos parágrafos citados; capa e fecho ficam iguais. {ritmo.plano.filter((x) => x.muda).length === 0 && "Nenhum slide mudaria."}</p>
              <p className="text-xs text-muted-foreground">{ritmo.plano.map((x) => `${x.pagina + 1}: ${x.ritmo ? NOME_RITMO[x.ritmo] : "igual"}${x.ritmo && !x.muda ? " (não cabe, fica igual)" : ""}`).join(" · ")}</p>
              <div className="flex gap-2">
                <Button variant="ghost" className="h-11" onClick={() => setRitmo(null)}>Cancelar</Button>
                <Button className="h-11" disabled={!ritmo.plano.some((x) => x.muda)} onClick={() => { onAplicar(ritmo.pacote); setRitmo(null); }}>Aceitar ritmo</Button>
              </div>
            </div>
          )}
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Pré-visualização">
            {(ritmo ? ritmo.pacote.variantes[variante].paginas : paginas).map((pg, i) => (
              <li key={pg.id} className="overflow-hidden rounded-[var(--mc-r-sm)] border border-border">
                <PaginaCanvas pacote={ritmo ? ritmo.pacote : previa.pacote} variante={variante} indice={i} medidor={medidor} imagens={imagens} escala={200 / 1080} />
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-4">
          {!ajustado && <p className="text-xs text-muted-foreground">A pré-visualização mostra o documento guardado. Escolhe um estilo ou ajusta abaixo.</p>}
          <Grupo titulo="Tipografia" resumo={ajustado ? PARES_FONTES.find((f) => f.id === par)?.nome : "Atual do documento"}>
          <fieldset className="space-y-2">
            <legend className="sr-only">Tipografia</legend>
            <div className="grid gap-2">
              {PARES_FONTES.map((f) => (
                <button key={f.id} type="button" onClick={() => { setPar(f.id); setAjustado(true); }} aria-pressed={ajustado && par === f.id}
                  className={cn("mc-trans flex min-h-11 items-center justify-between rounded-[var(--mc-r-md)] border px-3 text-left text-sm", ajustado && par === f.id ? "border-primary" : "border-input hover:border-muted-foreground")}>
                  <span>{f.nome}</span>{f.id === "montserrat-inter" && <span className="text-xs text-muted-foreground">predefinido</span>}
                </button>
              ))}
            </div>
          </fieldset>
          </Grupo>
          <Grupo titulo="Cores" resumo={ajustado ? <span className="inline-flex gap-1 align-middle">{(Object.keys(NOME_COR) as (keyof Paleta)[]).map((k) => <span key={k} className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: paleta[k] }} />)}</span> : "Atuais do documento"}>
          <fieldset className="space-y-2">
            <legend className="sr-only">Cores</legend>
            {(Object.keys(NOME_COR) as (keyof Paleta)[]).map((k) => (
              <label key={k} className="flex min-h-11 items-center justify-between gap-2 text-sm">
                <span>{NOME_COR[k]}</span>
                <input type="color" value={paleta[k]} onChange={(e) => { setPaleta((p) => ({ ...p, [k]: e.target.value })); setAjustado(true); }} className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1" aria-label={`Cor: ${NOME_COR[k]}`} />
              </label>
            ))}
          </fieldset>
          </Grupo>
          {previa.manuais > 0 || manuais ? (
            <div className="flex items-start gap-2">
              <Checkbox id="manuais" checked={manuais} onCheckedChange={(v) => setManuais(v === true)} className="mt-0.5" />
              <Label htmlFor="manuais" className="text-sm font-normal">Recolorir também as {manuais ? "" : `${previa.manuais} `}camadas que acrescentaste à mão</Label>
            </div>
          ) : null}
          <Button className="h-11 w-full" onClick={() => setConfirmar(true)} disabled={!!ritmo || !ajustado}>Aplicar estilo</Button>
        </div>
      </div>
      </>)}

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent className="mc-estudio">
          <DialogHeader>
            <DialogTitle>{escolha ? `Aplicar «${escolha.nome}»?` : "Aplicar os ajustes?"}</DialogTitle>
            <DialogDescription>{escolha ? "Reorganiza a composição, cores e tipos de letra" : "Muda cores e tipos de letra"} nas variantes A e B e cria uma nova versão da composição. O texto não muda e as versões anteriores ficam guardadas.</DialogDescription>
          </DialogHeader>
          {novos.length > 0 && <p role="alert" className="text-sm text-destructive">Com estas letras, o texto deixa de caber em: {novos.join(", ")}. Terás de o ajustar antes de aprovar (o tamanho nunca é reduzido sozinho).</p>}
          {modelo && modelo.recusadas.length > 0 && <p role="alert" className="text-sm text-destructive">O modelo não cabe sem reduzir a letra abaixo do mínimo legível em: {listaRecusas(modelo)}. Esses slides ficam como estão; nenhum texto é cortado ou apagado.</p>}
          {modelo?.marcador && <p className="text-sm text-muted-foreground">Não há imagem neste carrossel: os slides mostram o marcador «Imagem por escolher», que também aparece na exportação até escolheres uma imagem.</p>}
          {!manuais && previa.manuais > 0 && <p className="text-sm text-muted-foreground">{previa.manuais} camada(s) acrescentada(s) à mão mantêm as cores atuais.</p>}
          <DialogFooter>
            <Button variant="ghost" className="h-11" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button className="h-11" onClick={() => { onAplicar(previa.pacote); setConfirmar(false); }}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
