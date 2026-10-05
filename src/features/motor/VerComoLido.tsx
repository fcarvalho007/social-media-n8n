import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PaginaCanvas } from "@/features/editor-grafico/PaginaCanvas";
import type { Medidor, PacoteProva, Variante } from "../../../supabase/functions/_shared/documento-grafico/nucleo";
import { PAG_H, PAG_W, caixaTexto, paginasCortadas, recorteCentral, recuos, sequenciaTitulos, type Formato } from "./leituraPreview";

type Modo = "telemovel" | "titulos" | "enquadramento";
const MODOS: Array<{ id: Modo; nome: string }> = [
  { id: "telemovel", nome: "Telemóvel" },
  { id: "titulos", nome: "Só títulos" },
  { id: "enquadramento", nome: "Enquadramento" },
];
const FORMATOS: Array<{ id: Formato; nome: string }> = [
  { id: "4:5", nome: "Completo 4:5" },
  { id: "3:4", nome: "Simulação 3:4" },
  { id: "1:1", nome: "Simulação 1:1" },
];

interface Props {
  pacote: PacoteProva;
  variante: Variante;
  indice: number;
  medidor: Medidor;
  imagens: Record<string, HTMLImageElement>;
  alt: string[];
  onPagina: (i: number) => void;
}

/** Read-only preview modes. Overlays are HTML on top of the canvas: never layers, never exported. */
export function VerComoLido({ pacote, variante, indice, medidor, imagens, alt, onPagina }: Props) {
  const [modo, setModo] = useState<Modo>("telemovel");
  const [formato, setFormato] = useState<Formato>("4:5");
  const [guias, setGuias] = useState(false);
  const titulos = useMemo(() => sequenciaTitulos(pacote, variante, alt), [pacote, variante, alt]);
  const cortadas = useMemo(() => (formato === "4:5" ? [] : paginasCortadas(pacote, variante, formato)), [pacote, variante, formato]);
  const caixa = caixaTexto(pacote, variante, indice);
  const rec = recorteCentral(formato);
  // ~ physical width of a phone feed post (393 CSS px screen); approximation, not a platform metric.
  const W = modo === "telemovel" ? 300 : 260;
  const e = W / PAG_W;
  const pct = (n: number, t: number) => `${(n / t) * 100}%`;

  return (
    <details className="rounded-[var(--mc-r-md)] border border-border p-3 text-sm" aria-label="Ver como será lido">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium">Ver como será lido</summary>
      <div className="mt-2 space-y-3">
        <div role="tablist" aria-label="Modo de leitura" className="flex flex-wrap gap-2">
          {MODOS.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={modo === m.id} onClick={() => setModo(m.id)}
              className={cn("mc-trans min-h-11 rounded-[var(--mc-r-md)] border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", modo === m.id ? "border-primary bg-primary/10" : "border-input")}>{m.nome}</button>
          ))}
        </div>

        {modo === "titulos" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Os títulos reais, pela ordem das páginas. Lidos seguidos, devem contar o raciocínio.</p>
            <ol className="space-y-1">
              {titulos.map((t) => (
                <li key={t.pagina}>
                  <button type="button" onClick={() => onPagina(t.pagina)} aria-current={t.pagina === indice ? "true" : undefined}
                    className={cn("flex w-full items-baseline gap-2 rounded-[var(--mc-r-sm)] px-2 py-1.5 text-left hover:bg-muted", t.pagina === indice && "bg-muted")}>
                    <span className="w-6 shrink-0 tabular-nums text-muted-foreground">{t.pagina + 1}</span>
                    <span className="min-w-0 flex-1">{t.titulo}</span>
                    <span className={cn("shrink-0 text-xs", t.altPreenchido ? "text-muted-foreground" : "text-destructive")}>{t.altPreenchido ? "alt ✓" : "sem alt"}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="space-y-2">
            {modo === "telemovel" && <p className="text-xs text-muted-foreground">Tamanho aproximado de uma publicação no ecrã de um telemóvel. É uma aproximação visual, sem métricas nem regras de nenhuma plataforma.</p>}
            {modo === "enquadramento" && (
              <>
                <div role="radiogroup" aria-label="Formato" className="flex flex-wrap gap-2">
                  {FORMATOS.map((f) => (
                    <button key={f.id} type="button" role="radio" aria-checked={formato === f.id} onClick={() => setFormato(f.id)}
                      className={cn("mc-trans min-h-11 rounded-[var(--mc-r-md)] border px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", formato === f.id ? "border-primary bg-primary/10" : "border-input")}>{f.nome}</button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">O ficheiro exportado é sempre 1080×1350 (4:5). 3:4 e 1:1 simulam um recorte central; cada plataforma pode recortar ou mostrar de outra forma, e o 1:1 não representa a grelha atual de nenhuma rede.</p>
                {cortadas.length > 0 && <p role="note" className="text-xs text-destructive">Nesta simulação, o texto da página {cortadas.map((i) => i + 1).join(", ")} fica parcialmente fora do recorte.</p>}
              </>
            )}
            <div className="flex items-center gap-2">
              <Checkbox id="vcl-guias" checked={guias} onCheckedChange={(v) => setGuias(v === true)} />
              <Label htmlFor="vcl-guias" className="text-xs">Mostrar área do texto e recuos (só nesta pré-visualização)</Label>
            </div>
            <div className="relative mx-auto overflow-hidden rounded-[var(--mc-r-sm)]" style={{ width: W, height: Math.round(PAG_H * e) }} data-testid="vcl-palco">
              <PaginaCanvas pacote={pacote} variante={variante} indice={indice} medidor={medidor} imagens={imagens} escala={e} />
              {modo === "enquadramento" && formato !== "4:5" && (
                <div aria-hidden className="pointer-events-none absolute" data-testid="vcl-recorte"
                  style={{ left: pct(rec.x, PAG_W), top: pct(rec.y, PAG_H), width: pct(rec.w, PAG_W), height: pct(rec.h, PAG_H), boxShadow: "0 0 0 9999px hsl(var(--foreground) / 0.55)", outline: "2px solid hsl(var(--primary))" }} />
              )}
              {guias && caixa && (
                <div aria-hidden className="pointer-events-none absolute border-2 border-dashed border-primary" data-testid="vcl-guia"
                  style={{ left: pct(caixa.x, PAG_W), top: pct(caixa.y, PAG_H), width: pct(caixa.w, PAG_W), height: pct(caixa.h, PAG_H) }} />
              )}
            </div>
            {guias && caixa && (() => { const r = recuos(caixa); return <p className="text-center text-xs tabular-nums text-muted-foreground">Recuos do texto (px na página 1080×1350): topo {r.topo} · direita {r.dir} · base {r.base} · esquerda {r.esq}</p>; })()}
            <p className="text-center text-xs text-muted-foreground">Página {indice + 1}. Nada aqui é gravado nem entra nos ficheiros.</p>
          </div>
        )}
      </div>
    </details>
  );
}
