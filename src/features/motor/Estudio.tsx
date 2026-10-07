import { useState } from "react";
import * as React from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "./estudio.css";

export type Etapa = "fonte" | "narrativa" | "composicao" | "revisao";
export const ETAPAS: { id: Etapa; nome: string }[] = [
  { id: "fonte", nome: "Fonte" },
  { id: "narrativa", nome: "Narrativa" },
  { id: "composicao", nome: "Composição" },
  { id: "revisao", nome: "Preparar publicação" },
];

/** Full-height studio surface carrying the scoped tokens. */
export function Quadro({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mc-estudio flex h-dvh min-h-0 flex-col overflow-hidden", className)}>{children}</div>;
}

/** Accessible stepper: completed steps are revisitable, future ones are inert. */
export function Etapas({ atual, disponiveis, onIr, compacto }: { atual: Etapa; disponiveis: Etapa[]; onIr?: (e: Etapa) => void; compacto?: boolean }) {
  const iAtual = ETAPAS.findIndex((e) => e.id === atual);
  return (
    <nav aria-label="Etapas do carrossel" className="min-w-0">
      {compacto && (
        <label className="flex min-w-0 items-center gap-2 xl:hidden">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-xs tabular-nums text-primary-foreground" aria-hidden>{iAtual + 1}</span>
          <span className="sr-only">Etapa {iAtual + 1} de {ETAPAS.length}:</span>
          <select value={atual} onChange={(ev) => onIr?.(ev.target.value as Etapa)} disabled={!onIr}
            className="min-h-11 min-w-0 flex-1 truncate rounded-[var(--mc-r-md)] border border-input bg-background px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {ETAPAS.map((e, i) => <option key={e.id} value={e.id} disabled={e.id !== atual && !disponiveis.includes(e.id)}>{i + 1}/{ETAPAS.length} · {e.nome}</option>)}
          </select>
        </label>
      )}
      <ol className={cn("flex items-center gap-1 overflow-x-auto", compacto && "hidden xl:flex")}>
        {ETAPAS.map((e, i) => {
          const ativa = e.id === atual;
          const feita = i < iAtual;
          const pode = !ativa && disponiveis.includes(e.id) && !!onIr;
          return (
            <li key={e.id} className="flex shrink-0 items-center gap-1">
              {i > 0 && <span className="h-px w-3 bg-border sm:w-6" aria-hidden />}
              <button
                type="button"
                disabled={!pode}
                aria-current={ativa ? "step" : undefined}
                onClick={() => pode && onIr?.(e.id)}
                className={cn(
                  "mc-trans inline-flex min-h-11 items-center gap-2 rounded-[var(--mc-r-md)] px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  ativa ? "text-foreground" : pode ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/60",
                )}
              >
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs tabular-nums",
                  ativa ? "border-primary bg-primary text-primary-foreground" : feita ? "border-primary/60 text-primary" : "border-border",
                )}>{feita ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}</span>
                <span className={cn(compacto && !ativa && "sr-only xl:not-sr-only")}>{e.nome}</span>
                {feita && <span className="sr-only">(concluída)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Click-to-rename title: Enter/blur saves, Esc cancels, restores on failure. */
function TituloEditavel({ titulo, onRenomear }: { titulo: string; onRenomear: (t: string) => Promise<void> }) {
  const [edicao, setEdicao] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const guardar = async () => {
    if (edicao === null) return;
    const novo = edicao.replace(/\s+/g, " ").trim();
    setEdicao(null);
    if (!novo || novo === titulo) return;
    setAGuardar(true); setErro(null);
    try { await onRenomear(novo.slice(0, 300)); } catch (e) { setErro((e as Error).message); } finally { setAGuardar(false); }
  };
  if (edicao !== null) return <input autoFocus value={edicao} maxLength={300} aria-label="Título do carrossel" onChange={(e) => setEdicao(e.target.value)} onBlur={() => void guardar()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void guardar(); } if (e.key === "Escape") setEdicao(null); }} className="w-full min-w-[12rem] rounded-sm border border-input bg-background px-1.5 py-0.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" />;
  return <div className="flex min-w-0 items-center gap-2">
    <button type="button" onClick={() => setEdicao(titulo)} title="Clicar para mudar o título" className="truncate rounded-sm px-1 -mx-1 text-left text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{titulo}</button>
    {aGuardar && <span className="shrink-0 text-xs text-muted-foreground" role="status">A guardar…</span>}
    {erro && <span className="shrink-0 text-xs text-destructive" role="alert">{erro}</span>}
  </div>;
}

/** Single top bar: back, title, status, stepper. */
export function Cabecalho({ voltarPara, voltarRotulo = "Voltar aos carrosséis", titulo, sub, direita, etapas, onRenomear }: { onRenomear?: (t: string) => Promise<void>; voltarPara: string; voltarRotulo?: string; titulo: ReactNode; sub?: ReactNode; direita?: ReactNode; etapas?: ReactNode }) {
  return (
    <header className="z-20 flex-none border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={voltarRotulo}><Link to={voltarPara}><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="min-w-0">
            {onRenomear && typeof titulo === "string" ? <TituloEditavel titulo={titulo} onRenomear={onRenomear} /> : <p className="truncate text-sm font-semibold">{titulo}</p>}
            {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
        {etapas && <div className="order-3 w-full lg:order-none lg:w-auto">{etapas}</div>}
        {direita && <div className="flex items-center gap-2">{direita}</div>}
      </div>
    </header>
  );
}

/** One persistent action bar; sticks to the bottom and respects the safe area. */
export function BarraAcoes({ inicio, fim, nota }: { inicio?: ReactNode; fim?: ReactNode; nota?: ReactNode }) {
  return (
    <div className="z-20 flex-none border-t border-border bg-background/95 backdrop-blur-sm" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-6">
        <div className="flex items-center gap-2">{inicio}</div>
        <div className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{nota}</div>
        <div className="flex items-center gap-2">{fim}</div>
      </div>
    </div>
  );
}

/** Quiet disclosure group (native details: keyboard and screen-reader friendly). */
export function Grupo({ titulo, resumo, children, aberto }: { titulo: string; resumo?: ReactNode; children: ReactNode; aberto?: boolean }) {
  return (
    <details className="group border-t border-border" open={aberto}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="font-medium">{titulo}</span>
        {resumo && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{resumo}</span>}
        <span className="ml-auto text-muted-foreground transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" aria-hidden>+</span>
      </summary>
      <div className="pb-4 pt-1">{children}</div>
    </details>
  );
}

export const PAPEL: Record<string, string> = { capa: "Capa", contexto: "Contexto", desenvolvimento: "Ideia", fecho: "Fecho" };

/** Measures an element's width so canvases render at the real available size (no CSS scaling). */
export function useLargura<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
