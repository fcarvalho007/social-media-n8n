// Geração dos Briefs da edição e fila do que precisa de atenção humana.
//
// Não mostra conteúdo do Brief: é o painel de trabalho. A revisão das
// leituras pessoais vive em `ReverLeituras.tsx` e nunca se mistura aqui.

import { useState } from "react";
import { useServerFn } from "@/newsletter/shim/start";
import { AlertTriangle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import type { EstadoBriefEdicao } from "@/newsletter/lib/brief.functions";
import { gerarBriefFn, reformularBriefFn, reverificarBriefFn } from "@/newsletter/lib/brief.functions";

export interface AccoesBriefs {
  /** Volta a ler o estado dos Briefs da edição. */
  recarregar: () => void;
  /** Registo de actividade, com o nome real de quem fez. */
  registar: (accao: string, detalhe?: unknown) => void;
}

interface Progresso {
  total: number;
  feitos: number;
  falhados: string[];
}

function Etiqueta({ texto, alerta }: { texto: string; alerta?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        alerta
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          : "border-border bg-muted/50 text-muted-foreground"
      }`}
    >
      {alerta ? "!" : "·"} {texto}
    </span>
  );
}

export function BriefsDaEdicao({
  briefs, bloqueado, accoes, carregando,
}: {
  briefs: EstadoBriefEdicao[];
  bloqueado: boolean;
  carregando?: boolean;
  accoes: AccoesBriefs;
}) {
  const gerar = useServerFn(gerarBriefFn);
  const reformular = useServerFn(reformularBriefFn);
  const reverificar = useServerFn(reverificarBriefFn);

  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [aTrabalhar, setATrabalhar] = useState<Record<string, boolean>>({});

  const emFalta = briefs.filter((b) => b.estado === "por_gerar" || b.estado === "erro");
  const atencao = briefs.filter((b) => b.precisaAtencao);
  const aGerar = progresso !== null;

  /** Gera em série: uma falha nunca interrompe os restantes. */
  const gerarLote = async (alvos: EstadoBriefEdicao[]) => {
    if (alvos.length === 0 || aGerar) return;
    const falhados: string[] = [];
    setProgresso({ total: alvos.length, feitos: 0, falhados: [] });

    for (const [i, b] of alvos.entries()) {
      try {
        const r = await gerar({ data: { id: b.briefId, componente: "tudo", intencao: "normal" } });
        if (r.erro) {
          falhados.push(b.briefId);
          accoes.registar("Geração de Brief falhou", { brief: b.slug, motivo: r.erro });
        } else {
          accoes.registar("Gerou Brief", { brief: b.slug, papel: b.papel, estado: r.estado });
        }
      } catch (e) {
        falhados.push(b.briefId);
        accoes.registar("Geração de Brief falhou", { brief: b.slug, motivo: (e as Error).message });
      }
      setProgresso({ total: alvos.length, feitos: i + 1, falhados: [...falhados] });
      accoes.recarregar();
    }

    setProgresso(null);
    accoes.recarregar();
    if (falhados.length === 0) toast.success("Briefs gerados.");
    else toast.error(`${falhados.length} Brief(s) falharam — podes repetir só esses.`);
  };

  const accaoIndividual = async (
    b: EstadoBriefEdicao,
    tipo: "gerar" | "reformular" | "reverificar",
  ) => {
    setATrabalhar((x) => ({ ...x, [b.briefId]: true }));
    try {
      const r =
        tipo === "gerar"
          ? await gerar({ data: { id: b.briefId, componente: "tudo", intencao: "normal" } })
          : tipo === "reformular"
            ? await reformular({ data: { id: b.briefId } })
            : await reverificar({ data: { id: b.briefId } });
      accoes.registar(
        tipo === "gerar" ? "Gerou Brief" : tipo === "reformular" ? "Reformulou Brief" : "Voltou a verificar Brief",
        { brief: b.slug, estado: r.estado, motivos: r.motivos },
      );
      if (r.bloqueado) toast.warning(r.motivos[0] ?? "Continua a precisar de atenção.");
      else toast.success("Feito.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setATrabalhar((x) => ({ ...x, [b.briefId]: false }));
      accoes.recarregar();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={bloqueado || aGerar || emFalta.length === 0}
          onClick={() => void gerarLote(emFalta)}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/[0.07] px-3 py-2 text-[13px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-45"
        >
          {aGerar ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {aGerar
            ? `A gerar ${progresso!.feitos + 1} de ${progresso!.total}…`
            : emFalta.length === 0
              ? "Briefs todos gerados"
              : `Gerar Briefs em falta (${emFalta.length})`}
        </button>

        <span className="text-[12.5px] text-muted-foreground">
          {briefs.length === 0
            ? "Escolhe Destaques e Radar para criar os Briefs desta edição."
            : `${briefs.filter((b) => b.papel === "destaque").length} Destaques · ${briefs.filter((b) => b.papel === "radar").length} Radar`}
        </span>
        {carregando && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
      </div>

      {progresso && progresso.falhados.length > 0 && (
        <button
          type="button"
          onClick={() => void gerarLote(briefs.filter((b) => progresso.falhados.includes(b.briefId)))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted"
        >
          <RefreshCw size={13} /> Repetir os falhados ({progresso.falhados.length})
        </button>
      )}

      {atencao.length > 0 && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/[0.06] p-3.5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle size={14} />
            {atencao.length === 1
              ? "1 Brief precisa de atenção"
              : `${atencao.length} Briefs precisam de atenção`}
          </p>
          <ul className="mt-2.5 space-y-2">
            {atencao.map((b) => {
              const ocupado = Boolean(aTrabalhar[b.briefId]);
              return (
                <li key={b.briefId} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-[14px] font-semibold leading-snug text-foreground">
                    {b.titulo || b.slug}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Etiqueta texto={b.papel === "radar" ? "Radar" : "Destaque"} />
                    {b.motivos.map((m) => <Etiqueta key={m} texto={m} alerta />)}
                  </div>
                  {b.erro && <p className="mt-1.5 text-[12.5px] text-muted-foreground">{b.erro}</p>}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button" disabled={bloqueado || ocupado}
                      onClick={() => void accaoIndividual(b, "gerar")}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted disabled:opacity-45"
                    >
                      {ocupado ? "A trabalhar…" : "Gerar outra vez"}
                    </button>
                    <button
                      type="button" disabled={bloqueado || ocupado}
                      onClick={() => void accaoIndividual(b, "reformular")}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted disabled:opacity-45"
                    >
                      Reformular
                    </button>
                    <button
                      type="button" disabled={bloqueado || ocupado}
                      onClick={() => void accaoIndividual(b, "reverificar")}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted disabled:opacity-45"
                    >
                      Voltar a verificar
                    </button>
                    {b.fonteUrl && (
                      <a
                        href={b.fonteUrl} target="_blank" rel="noreferrer"
                        className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-primary hover:bg-muted"
                      >
                        Abrir fonte ↗
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
