import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import { carregarImagens } from "@/features/editor-grafico/desenho";
import { cn } from "@/lib/utils";
import { PARES_FONTES, transbordos, type Medidor, type PacoteProva, type Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { aplicarEstilo, ESTILOS, type Estilo, type Paleta } from "../../../supabase/functions/_shared/motor/estilos";
import { composicoesPagina, NOME_RITMO, type ComposicaoId, type OpcaoComposicao, type SlideRitmo } from "../../../supabase/functions/_shared/motor/composicoes";
import { aplicarComposicaoSlide, previaPagina, slideDaPagina, sugerirRitmo, type SugestaoRitmo } from "./variacoes";

interface Props {
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

/** Design step: pick one of six styles, adjust palette and font pair, apply explicitly. Never opens with changes. */
export function PassoDesign({ pacote, medidor, onAplicar, slides, paragrafos, inicio }: Props) {
  const [ambito, setAmbito] = useState<"todos" | "slide">(inicio ? "slide" : "todos");
  const [paginaSel, setPaginaSel] = useState(inicio?.pagina ?? 0);
  const [opcoes, setOpcoes] = useState<OpcaoComposicao[] | null>(null);
  const [compSel, setCompSel] = useState<ComposicaoId | null>(null);
  const [ambas, setAmbas] = useState(false);
  const [ritmo, setRitmo] = useState<SugestaoRitmo | null>(null);
  const [escolha, setEscolha] = useState<Estilo>(ESTILOS[0]);
  const [paleta, setPaleta] = useState<Paleta>(ESTILOS[0].paleta);
  const [par, setPar] = useState(ESTILOS[0].par);
  const [manuais, setManuais] = useState(false);
  const [variante, setVariante] = useState<Variante>(inicio?.variante ?? "A");
  const [confirmar, setConfirmar] = useState(false);
  const [imagens, setImagens] = useState<Record<string, HTMLImageElement>>({});
  useEffect(() => { let vivo = true; carregarImagens(pacote).then((i) => vivo && setImagens(i)).catch(() => undefined); return () => { vivo = false; }; }, [pacote]);

  useEffect(() => { setOpcoes(null); setCompSel(null); setRitmo(null); }, [pacote]);
  const escolher = (e: Estilo) => { setEscolha(e); setPaleta(e.paleta); setPar(e.par); };
  const previa = useMemo(() => estilizar(pacote, paleta, par, manuais), [pacote, paleta, par, manuais]);
  const miniaturas = useMemo(() => ESTILOS.map((e) => ({ e, p: estilizar(pacote, e.paleta, e.par, false).pacote })), [pacote]);
  const novos = useMemo(() => {
    const antes = new Set((["A", "B"] as const).flatMap((v) => transbordos(pacote, v, medidor).map((t) => `${v}${t.pagina}`)));
    return (["A", "B"] as const).flatMap((v) => transbordos(previa.pacote, v, medidor).filter((t) => !antes.has(`${v}${t.pagina}`)).map((t) => `${v} p${t.pagina + 1}`));
  }, [pacote, previa, medidor]);
  const paginas = previa.pacote.variantes[variante].paginas;
  const docPaginas = pacote.variantes[variante].paginas;
  const pgSel = docPaginas[Math.min(paginaSel, docPaginas.length - 1)];
  const slideSel = pgSel ? slideDaPagina(pgSel) : null;
  const explorar = () => { if (pgSel) { setOpcoes(composicoesPagina(pgSel, pacote.conteudo, medidor)); setCompSel(null); } };
  const outra: Variante = variante === "A" ? "B" : "A";
  const aplicarSlide = () => {
    if (!slideSel || !compSel) return;
    const r = aplicarComposicaoSlide(pacote, slideSel, compSel, ambas ? [variante, outra] : [variante], medidor);
    if (!r.aplicadas.length) return;
    onAplicar(r.pacote);
    setOpcoes(null); setCompSel(null);
  };
  const podeRitmo = !!slides?.length && !!paragrafos?.length;

  return (
    <section className="mc-entrar space-y-6" aria-labelledby="t-design">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 id="t-design" className="text-2xl font-semibold tracking-tight">Design</h1>
        <p className="text-xs text-muted-foreground">{ambito === "slide" ? "O texto não muda. Nada é aplicado até carregares em «Aplicar só ao slide»." : "O texto não muda. Nada é aplicado até carregares em «Aplicar estilo»."}</p>
      </div>

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
            <Button variant="outline" className="h-11" onClick={explorar} disabled={!slideSel}>Explorar 5 composições do slide {paginaSel + 1}</Button>
            {!slideSel && <p className="text-xs text-muted-foreground">Este slide só tem camadas acrescentadas à mão; não há composições para ele.</p>}
          </div>
          {opcoes && (
            <div className="space-y-3">
              <p role="status" className="text-sm font-medium">Pré-visualização — não aplicada <span className="font-normal text-muted-foreground">· o documento guardado só muda quando aplicares.</span></p>
              {opcoes.length === 0 ? <p className="text-sm text-muted-foreground">Este slide não tem título nem texto para recompor.</p> : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Composições">
                  {opcoes.map((o) => {
                    const fraco = o.contrasteMin != null && o.contrasteMin < 4.5;
                    return (
                      <li key={o.id}>
                        <button type="button" disabled={!o.cabe} aria-pressed={compSel === o.id} onClick={() => setCompSel(o.id)}
                          className={cn("block w-full rounded-[var(--mc-r-md)] border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60", compSel === o.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground")}>
                          <span className="block overflow-hidden rounded-[var(--mc-r-sm)]"><PaginaCanvas pacote={previaPagina(pacote, variante, o.pagina)} variante={variante} indice={paginaSel} medidor={medidor} imagens={imagens} escala={160 / 1080} /></span>
                          <span className="mt-2 flex items-center gap-1 text-sm font-medium">{compSel === o.id && <Check className="h-3.5 w-3.5 text-primary" />}{o.nome}</span>
                          <span className="block text-xs text-muted-foreground">{o.descricao}</span>
                          {!o.cabe && <span className="mt-1 block text-xs text-destructive">O texto não cabe aqui. Encurta o texto ou ajusta a caixa no editor.</span>}
                          {o.cabe && fraco && <span className="mt-1 block text-xs text-destructive">Contraste baixo ({o.contrasteMin?.toFixed(1)}:1).</span>}
                          {o.cabe && o.contrasteMin == null && <span className="mt-1 block text-xs text-muted-foreground">Texto sobre imagem: confirma a leitura.</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {opcoes.length > 0 && opcoes.every((o) => !o.cabe) && <p role="alert" className="text-sm text-destructive">Nenhuma composição cabe com o texto atual. Encurta o texto na Narrativa ou ajusta a caixa no editor; o tamanho da letra nunca é reduzido sozinho.</p>}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="ambas" checked={ambas} onCheckedChange={(v) => setAmbas(v === true)} />
                  <Label htmlFor="ambas" className="text-sm font-normal">Aplicar também à variante {outra}</Label>
                </div>
                <Button variant="ghost" className="h-11" onClick={() => { setOpcoes(null); setCompSel(null); }}>Cancelar</Button>
                <Button className="h-11" disabled={!compSel} onClick={aplicarSlide}>Aplicar só ao slide {paginaSel + 1}</Button>
              </div>
            </div>
          )}
        </div>
      ) : (<>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Estilos">
        {miniaturas.map(({ e, p }) => (
          <li key={e.id}>
            <button type="button" onClick={() => escolher(e)} aria-pressed={escolha.id === e.id}
              className={cn("mc-trans block w-full rounded-[var(--mc-r-md)] border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", escolha.id === e.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground")}>
              <span className="block overflow-hidden rounded-[var(--mc-r-sm)]"><PaginaCanvas pacote={p} variante="A" indice={0} medidor={medidor} imagens={imagens} escala={140 / 1080} /></span>
              <span className="mt-2 flex items-center gap-1 text-sm font-medium">{escolha.id === e.id && <Check className="h-3.5 w-3.5 text-primary" />}{e.nome}</span>
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
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tipografia</legend>
            <div className="grid gap-2">
              {PARES_FONTES.map((f) => (
                <button key={f.id} type="button" onClick={() => setPar(f.id)} aria-pressed={par === f.id}
                  className={cn("mc-trans flex min-h-11 items-center justify-between rounded-[var(--mc-r-md)] border px-3 text-left text-sm", par === f.id ? "border-primary" : "border-input hover:border-muted-foreground")}>
                  <span>{f.nome}</span>{f.id === "montserrat-inter" && <span className="text-xs text-muted-foreground">predefinido</span>}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Paleta</legend>
            {(Object.keys(NOME_COR) as (keyof Paleta)[]).map((k) => (
              <label key={k} className="flex min-h-11 items-center justify-between gap-2 text-sm">
                <span>{NOME_COR[k]}</span>
                <input type="color" value={paleta[k]} onChange={(e) => setPaleta((p) => ({ ...p, [k]: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1" aria-label={`Cor: ${NOME_COR[k]}`} />
              </label>
            ))}
          </fieldset>
          {previa.manuais > 0 || manuais ? (
            <div className="flex items-start gap-2">
              <Checkbox id="manuais" checked={manuais} onCheckedChange={(v) => setManuais(v === true)} className="mt-0.5" />
              <Label htmlFor="manuais" className="text-sm font-normal">Recolorir também as {manuais ? "" : `${previa.manuais} `}camadas que acrescentaste à mão</Label>
            </div>
          ) : null}
          <Button className="h-11 w-full" onClick={() => setConfirmar(true)} disabled={!!ritmo}>Aplicar estilo</Button>
        </div>
      </div>
      </>)}

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent className="mc-estudio">
          <DialogHeader>
            <DialogTitle>Aplicar «{escolha.nome}»?</DialogTitle>
            <DialogDescription>Muda cores e tipos de letra nas variantes A e B e cria uma nova versão da composição. O texto não muda e as versões anteriores ficam guardadas.</DialogDescription>
          </DialogHeader>
          {novos.length > 0 && <p role="alert" className="text-sm text-destructive">Com estas letras, o texto deixa de caber em: {novos.join(", ")}. Terás de o ajustar antes de aprovar (o tamanho nunca é reduzido sozinho).</p>}
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
