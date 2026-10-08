import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { ESTILOS, type EstiloId } from "../../../supabase/functions/_shared/motor/estilos";
import { aplicarSistema, paginasComAjustes, quebrasSugeridas, NOMES_VARIANTE, PALETAS_ANTERIORES, PALETAS_PRINCIPAIS, PARES_PRINCIPAIS, quebrasPadrao, tipografiaDe, type PaletaId, type PaletaMarca, type SistemaVisual } from "../../../supabase/functions/_shared/motor/sistema";
import { PaginaCanvas } from "./PaginaCanvas";
import { VistaSequencia } from "./VistaSequencia";
import { FICHEIROS_EXTRA } from "./fontes";
import { FAMILIAS, type Familia } from "../../../supabase/functions/_shared/documento-grafico/nucleo";

const NOME_FAMILIA: Record<Familia, string> = { worksans: "Work Sans (anterior)", montserrat: "Montserrat", inter: "Inter", playfair: "Playfair Display", sourcesans: "Source Sans 3", grotesk: "Space Grotesk", dmserif: "DM Serif Display", dmsans: "DM Sans", plex: "IBM Plex Sans" };
const FONTE_UI = (f: Familia) => `"mc-${f}", system-ui, sans-serif`;
let amostrasCarregadas = false;
/** Registers the same TTF files the renderer uses, so each typography option shows a real sample. */
function carregarAmostras() {
  if (amostrasCarregadas || typeof FontFace === "undefined") return;
  amostrasCarregadas = true;
  for (const [f, pesos] of Object.entries(FICHEIROS_EXTRA)) for (const [peso, url] of Object.entries(pesos ?? {}))
    new FontFace(`mc-${f}`, `url(${url})`, { weight: peso }).load().then((ff) => document.fonts.add(ff)).catch(() => undefined);
}

interface Props {
  /** Document before the current draft (catalogue thumbnails are computed from it). */
  base: PacoteProva;
  /** System currently shown on the canvas (draft or saved); null = none chosen yet. */
  atual: SistemaVisual | null;
  emRascunho: boolean;
  medidor: Medidor | null;
  imagens: Record<string, HTMLImageElement>;
  onExperimentar: (s: SistemaVisual, tipo: "estilo" | "variante" | "paleta" | "tipografia" | "ritmo" | "imagens") => void;
  onAplicar: () => void;
  onCancelar: () => void;
}

const opcao = (ativo: boolean) =>
  `mc-trans flex min-h-11 w-full items-center gap-2 rounded-[var(--mc-r-md)] border px-3 text-left text-sm hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${ativo ? "border-primary ring-1 ring-primary" : "border-border"}`;

/** "Direção visual": every choice is applied immediately to the real document on the canvas (as a draft). */
export function PainelDirecaoVisual({ base, atual, emRascunho, medidor, imagens, onExperimentar, onAplicar, onCancelar }: Props) {
  const total = base.variantes.A.paginas.length;
  const s: SistemaVisual = atual ?? { estilo: "editorial", variante: "A", paleta: "azul", quebras: quebrasPadrao(total), ritmo: "auto", imagens: "auto", tipografia: { titulo: "montserrat", corpo: "inter" } };
  const tipo = tipografiaDe(s);
  useEffect(carregarAmostras, []);
  const [verAnteriores, setVerAnteriores] = useState(false);
  const [avancadas, setAvancadas] = useState(false);
  const [estilosAnteriores, setEstilosAnteriores] = useState(!!atual && !!ESTILOS.find((e) => e.id === atual.estilo)?.anterior);
  const ultima = Math.max(0, total - 1), interior = Math.min(1, ultima);
  const ajustes = paginasComAjustes(base, s.variante);
  // Catalogue only (cover of this carousel per style); the confirmation is the real canvas.
  // Computed after paint so choosing never waits for the catalogue.
  const [catalogo, setCatalogo] = useState<Array<{ id: string; p: PacoteProva }>>([]);
  useEffect(() => {
    if (!medidor) return;
    const t = setTimeout(() => setCatalogo(ESTILOS.map((e) => ({ id: e.id, p: aplicarSistema(base, { ...s, tipografia: tipo, estilo: e.id }, medidor, [...new Set([0, interior, ultima])], {}, { variantes: [s.variante] }).pacote }))), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, medidor, s.paleta, s.variante, s.imagens, tipo.titulo, tipo.corpo]);
  const ritmo = s.ritmo ?? "auto";

  const linhaPaleta = (p: PaletaMarca) => (
    <li key={p.id}>
      <button type="button" aria-pressed={!!atual && s.paleta === p.id} className={opcao(!!atual && s.paleta === p.id)} onClick={() => onExperimentar({ ...s, tipografia: tipo, paleta: p.id as PaletaId }, "paleta")}>
        <span className="flex shrink-0 overflow-hidden rounded-sm border border-border" aria-hidden>
          {p.amostras.map((c, i) => <span key={i} className="h-5 w-3" style={{ background: c }} />)}
        </span>
        <span className="min-w-0"><span className="block font-medium">{p.nome}</span><span className="block truncate text-xs text-muted-foreground">{p.sensacao}</span></span>
      </button>
    </li>
  );
  const mudarTipo = (t: { titulo: Familia; corpo: Familia }) => onExperimentar({ ...s, tipografia: t }, "tipografia");

  return (
    <div className="space-y-4 text-sm">
      {emRascunho ? (
        <div className="sticky top-0 z-10 space-y-2 rounded-[var(--mc-r-md)] border border-primary bg-background p-3" role="status">
          <p className="font-medium">A experimentar no documento</p>
          <p className="text-xs text-muted-foreground">O canvas e as miniaturas mostram o resultado real. Só fica guardado ao aplicar; depois, «Desfazer» repõe o anterior.</p>
          {ajustes > 0 && <p className="text-xs">{ajustes} página(s) têm ajustes manuais; cores postas à mão nunca são trocadas.</p>}
          <div className="flex gap-2">
            <Button className="h-11 flex-1" onClick={onAplicar}>Aplicar</Button>
            <Button variant="outline" className="h-11 flex-1" onClick={onCancelar}>Cancelar</Button>
          </div>
        </div>
      ) : !atual && <p className="text-xs text-muted-foreground">Escolhe uma direção visual. Cada escolha muda logo os slides reais.</p>}

      <section className="space-y-2" aria-labelledby="dv-estilo">
        <h3 id="dv-estilo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Composição</h3>
        <ul className="grid grid-cols-2 gap-2">
          {ESTILOS.filter((e) => !e.anterior || estilosAnteriores).map((e) => {
            const c = catalogo.find((x) => x.id === e.id);
            const ativo = !!atual && atual.estilo === e.id;
            return (
              <li key={e.id}>
                <button type="button" aria-pressed={ativo} onClick={() => onExperimentar({ ...s, tipografia: tipo, estilo: e.id as EstiloId }, "estilo")}
                  className={`mc-trans block w-full rounded-[var(--mc-r-md)] border p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${ativo ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"}`}>
                  <span className="pointer-events-none block overflow-hidden rounded-sm border border-border" aria-hidden>
                    {c && medidor ? <PaginaCanvas pacote={c.p} variante={s.variante} indice={0} medidor={medidor} imagens={imagens} escala={0.098} /> : <span className="block aspect-[4/5] bg-muted" />}
                  </span>
                  <span className="mt-1 block text-xs font-medium">{e.nome}{e.anterior ? " · anterior" : ""}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="text-xs font-medium text-primary underline-offset-2 hover:underline" aria-expanded={estilosAnteriores} onClick={() => setEstilosAnteriores((v) => !v)}>
          {estilosAnteriores ? "Ocultar estilos anteriores" : "Estilos anteriores (Minimalista, Contraste)"}
        </button>
        {medidor && catalogo.find((x) => x.id === s.estilo) && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Capa, página interior e fecho com o conteúdo real:</p>
            <div className="grid grid-cols-3 gap-1.5" aria-hidden>
              {[...new Set([0, interior, ultima])].map((i) => (
                <span key={i} className="block overflow-hidden rounded-sm border border-border">
                  <PaginaCanvas pacote={catalogo.find((x) => x.id === s.estilo)!.p} variante={s.variante} indice={i} medidor={medidor} imagens={imagens} escala={0.064} />
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">As miniaturas são um catálogo; o resultado é o que vês no canvas.</p>
      </section>

      <section className="space-y-2" aria-labelledby="dv-var">
        <h3 id="dv-var" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Variante</h3>
        <div className="grid grid-cols-2 gap-2">
          {(["A", "B"] as Variante[]).map((v) => (
            <button key={v} type="button" aria-pressed={!!atual && s.variante === v} className={opcao(!!atual && s.variante === v)} onClick={() => onExperimentar({ ...s, tipografia: tipo, variante: v }, "variante")}>
              {NOMES_VARIANTE[s.estilo][v]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2" aria-labelledby="dv-tipo">
        <h3 id="dv-tipo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipografia</h3>
        <ul className="space-y-1.5">
          {PARES_PRINCIPAIS.map((p) => {
            const ativo = tipo.titulo === p.titulo && tipo.corpo === p.corpo;
            return (
              <li key={p.id}>
                <button type="button" aria-pressed={ativo} className={`${opcao(ativo)} flex-col !items-start py-2`} onClick={() => mudarTipo({ titulo: p.titulo, corpo: p.corpo })}>
                  <span className="block text-base leading-tight" style={{ fontFamily: FONTE_UI(p.titulo), fontWeight: p.titulo === "dmserif" ? 400 : 700 }}>{base.conteudo.slides[0]?.titulo?.slice(0, 40) || "Título da capa"}</span>
                  <span className="block text-xs text-muted-foreground" style={{ fontFamily: FONTE_UI(p.corpo) }}>{p.nome} · corpo de leitura confortável</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="text-xs font-medium text-primary underline-offset-2 hover:underline" aria-expanded={avancadas} onClick={() => setAvancadas((v) => !v)}>
          {avancadas ? "Ocultar opções avançadas" : "Opções avançadas: título e corpo separados"}
        </button>
        {avancadas && (
          <div className="grid grid-cols-2 gap-2">
            {(["titulo", "corpo"] as const).map((k) => (
              <label key={k} className="space-y-1 text-xs">
                <span className="text-muted-foreground">{k === "titulo" ? "Títulos" : "Corpo"}</span>
                <select className="h-10 w-full rounded-[var(--mc-r-md)] border border-input bg-background px-2 text-sm" value={tipo[k]} onChange={(e) => mudarTipo({ ...tipo, [k]: e.target.value as Familia })}>
                  {FAMILIAS.filter((f) => f !== "worksans" || tipo[k] === "worksans").map((f) => <option key={f} value={f}>{NOME_FAMILIA[f]}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Trocar a letra mantém cores, imagens e direção. As quebras de linha são recalculadas e nunca se reduz o tamanho.</p>
      </section>

      <section className="space-y-2" aria-labelledby="dv-pal">
        <h3 id="dv-pal" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cores</h3>
        <ul className="space-y-1.5">{PALETAS_PRINCIPAIS.map(linhaPaleta)}</ul>
        <button type="button" className="text-xs font-medium text-primary underline-offset-2 hover:underline" aria-expanded={verAnteriores} onClick={() => setVerAnteriores((v) => !v)}>
          {verAnteriores ? "Ocultar paletas anteriores" : "Paletas anteriores (navy)"}
        </button>
        {verAnteriores && <ul className="space-y-1.5">{PALETAS_ANTERIORES.map(linhaPaleta)}</ul>}
        <p className="text-xs text-muted-foreground">Trocar a paleta só muda as cores; posições, imagens e recortes ficam.</p>
      </section>

      <section className="space-y-2" aria-labelledby="dv-ritmo">
        <h3 id="dv-ritmo" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ritmo</h3>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={ritmo === "auto"} className={opcao(ritmo === "auto")} onClick={() => onExperimentar({ ...s, tipografia: tipo, ritmo: "auto", quebras: quebrasPadrao(total) }, "ritmo")}>Automático</button>
          <button type="button" aria-pressed={ritmo === "personalizado"} className={opcao(ritmo === "personalizado")} onClick={() => onExperimentar({ ...s, tipografia: tipo, ritmo: "personalizado" }, "ritmo")}>Personalizado</button>
        </div>
        {ritmo === "personalizado" && (
          <>
            <Button variant="outline" size="sm" className="h-9 w-full text-xs" onClick={() => onExperimentar({ ...s, tipografia: tipo, quebras: quebrasSugeridas(base) }, "ritmo")}>Sugerir pela narrativa</Button>
            {Array.from({ length: Math.max(0, total - 1) }, (_, k) => k + 2).map((n) => (
              <label key={n} className="flex min-h-10 items-center justify-between gap-2">
                <span>Slide {n}: destaque ou transição</span>
                <Switch checked={!!s.quebras[String(n)]} onCheckedChange={(v) => onExperimentar({ ...s, tipografia: tipo, quebras: { ...s.quebras, [String(n)]: v } }, "ritmo")} aria-label={`Destaque no slide ${n}`} />
              </label>
            ))}
          </>
        )}
        <VistaSequencia pacote={base} variante={s.variante} />
      </section>

      <section className="space-y-2" aria-labelledby="dv-img">
        <h3 id="dv-img" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imagens</h3>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={(s.imagens ?? "auto") === "auto"} className={opcao((s.imagens ?? "auto") === "auto")} onClick={() => onExperimentar({ ...s, tipografia: tipo, imagens: "auto" }, "imagens")}>Automático</button>
          <button type="button" aria-pressed={s.imagens === "manual"} className={opcao(s.imagens === "manual")} onClick={() => onExperimentar({ ...s, tipografia: tipo, imagens: "manual" }, "imagens")}>Sem sugestão automática</button>
        </div>
        <p className="text-xs text-muted-foreground">Sem sugestão automática, a imagem só muda nos slides em que a escolheres.</p>
      </section>
    </div>
  );
}
