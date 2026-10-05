import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { ESTILOS, type EstiloId } from "../../../supabase/functions/_shared/motor/estilos";
import { aplicarSistema, NOMES_VARIANTE, PALETAS, quebrasPadrao, slidesQuebra, type PaletaId, type SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { PaginaCanvas } from "./PaginaCanvas";

interface Props {
  /** Document before the current draft (catalogue thumbnails are computed from it). */
  base: PacoteProva;
  /** System currently shown on the canvas (draft or saved); null = none chosen yet. */
  atual: SistemaVisual | null;
  emRascunho: boolean;
  medidor: Medidor | null;
  imagens: Record<string, HTMLImageElement>;
  onExperimentar: (s: SistemaVisual, tipo: "estilo" | "variante" | "paleta" | "ritmo" | "imagens") => void;
  onAplicar: () => void;
  onCancelar: () => void;
}

const opcao = (ativo: boolean) =>
  `mc-trans flex min-h-11 w-full items-center gap-2 rounded-[var(--mc-r-md)] border px-3 text-left text-sm hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${ativo ? "border-primary ring-1 ring-primary" : "border-border"}`;

/** "Direção visual": every choice is applied immediately to the real document on the canvas (as a draft). */
export function PainelDirecaoVisual({ base, atual, emRascunho, medidor, imagens, onExperimentar, onAplicar, onCancelar }: Props) {
  const total = base.variantes.A.paginas.length;
  const s: SistemaVisual = atual ?? { estilo: "editorial", variante: "A", paleta: "navy-editorial", quebras: quebrasPadrao(total), ritmo: "auto", imagens: "auto" };
  // Catalogue only (cover of this carousel per style); the confirmation is the real canvas.
  const catalogo = useMemo(() => (medidor ? ESTILOS.map((e) => ({ id: e.id, p: aplicarSistema(base, { ...s, estilo: e.id }, medidor, [0]).pacote })) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, medidor, s.paleta, s.variante, s.imagens]);
  const ritmo = s.ritmo ?? "auto";

  return (
    <div className="space-y-4 text-sm">
      {emRascunho ? (
        <div className="sticky top-0 z-10 space-y-2 rounded-[var(--mc-r-md)] border border-primary bg-background p-3" role="status">
          <p className="font-medium">A experimentar no documento</p>
          <p className="text-xs text-muted-foreground">O canvas e as miniaturas mostram o resultado real. Só fica guardado ao aplicar.</p>
          <div className="flex gap-2">
            <Button className="h-11 flex-1" onClick={onAplicar}>Aplicar</Button>
            <Button variant="outline" className="h-11 flex-1" onClick={onCancelar}>Cancelar</Button>
          </div>
        </div>
      ) : !atual && <p className="text-xs text-muted-foreground">Escolhe uma direção visual. Cada escolha muda logo os slides reais.</p>}

      <section className="space-y-2" aria-labelledby="dv-estilo">
        <h3 id="dv-estilo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estilo</h3>
        <ul className="grid grid-cols-2 gap-2">
          {ESTILOS.map((e) => {
            const c = catalogo.find((x) => x.id === e.id);
            const ativo = !!atual && atual.estilo === e.id;
            return (
              <li key={e.id}>
                <button type="button" aria-pressed={ativo} onClick={() => onExperimentar({ ...s, estilo: e.id as EstiloId }, "estilo")}
                  className={`mc-trans block w-full rounded-[var(--mc-r-md)] border p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${ativo ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}>
                  <span className="pointer-events-none block overflow-hidden rounded-sm border border-border" aria-hidden>
                    {c && medidor ? <PaginaCanvas pacote={c.p} variante={s.variante} indice={0} medidor={medidor} imagens={imagens} escala={0.098} /> : <span className="block aspect-[4/5] bg-muted" />}
                  </span>
                  <span className="mt-1 block text-xs font-medium">{e.nome}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">As miniaturas são um catálogo; o resultado é o que vês no canvas.</p>
      </section>

      <section className="space-y-2" aria-labelledby="dv-var">
        <h3 id="dv-var" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Variante</h3>
        <div className="grid grid-cols-2 gap-2">
          {(["A", "B"] as Variante[]).map((v) => (
            <button key={v} type="button" aria-pressed={!!atual && s.variante === v} className={opcao(!!atual && s.variante === v)} onClick={() => onExperimentar({ ...s, variante: v }, "variante")}>
              {NOMES_VARIANTE[s.estilo][v]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2" aria-labelledby="dv-pal">
        <h3 id="dv-pal" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paleta</h3>
        <ul className="space-y-1.5">
          {PALETAS.map((p) => (
            <li key={p.id}>
              <button type="button" aria-pressed={!!atual && s.paleta === p.id} className={opcao(!!atual && s.paleta === p.id)} onClick={() => onExperimentar({ ...s, paleta: p.id as PaletaId }, "paleta")}>
                <span className="flex shrink-0 overflow-hidden rounded-sm border border-border" aria-hidden>
                  {p.amostras.map((c, i) => <span key={i} className="h-5 w-3" style={{ background: c }} />)}
                </span>
                <span className="min-w-0"><span className="block font-medium">{p.nome}</span><span className="block truncate text-xs text-muted-foreground">{p.sensacao}</span></span>
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Trocar a paleta só muda as cores; posições, imagens e recortes ficam.</p>
      </section>

      <section className="space-y-2" aria-labelledby="dv-ritmo">
        <h3 id="dv-ritmo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ritmo</h3>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={ritmo === "auto"} className={opcao(ritmo === "auto")} onClick={() => onExperimentar({ ...s, ritmo: "auto", quebras: quebrasPadrao(total) }, "ritmo")}>Automático</button>
          <button type="button" aria-pressed={ritmo === "personalizado"} className={opcao(ritmo === "personalizado")} onClick={() => onExperimentar({ ...s, ritmo: "personalizado" }, "ritmo")}>Personalizado</button>
        </div>
        {ritmo === "personalizado" && slidesQuebra(total).map((n) => (
          <label key={n} className="flex min-h-10 items-center justify-between gap-2">
            <span>Quebra visual no slide {n}</span>
            <Switch checked={!!s.quebras[String(n)]} onCheckedChange={(v) => onExperimentar({ ...s, quebras: { ...s.quebras, [String(n)]: v } }, "ritmo")} aria-label={`Quebra visual no slide ${n}`} />
          </label>
        ))}
      </section>

      <section className="space-y-2" aria-labelledby="dv-img">
        <h3 id="dv-img" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imagens</h3>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={(s.imagens ?? "auto") === "auto"} className={opcao((s.imagens ?? "auto") === "auto")} onClick={() => onExperimentar({ ...s, imagens: "auto" }, "imagens")}>Automático</button>
          <button type="button" aria-pressed={s.imagens === "manual"} className={opcao(s.imagens === "manual")} onClick={() => onExperimentar({ ...s, imagens: "manual" }, "imagens")}>Sem sugestão automática</button>
        </div>
        <p className="text-xs text-muted-foreground">Sem sugestão automática, a imagem só muda nos slides em que a escolheres.</p>
      </section>
    </div>
  );
}
