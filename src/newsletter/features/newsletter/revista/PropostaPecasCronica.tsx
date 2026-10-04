// Botão «Montar com IA» das peças móveis: propor → rever → aplicar / reverter / limpar.

import { useState } from "react";
import { useServerFn } from "@/newsletter/shim/start";
import { toast } from "sonner";
import { Check, Eraser, Loader2, RefreshCw, RotateCcw, Sparkles, X } from "lucide-react";
import { proporPecasCronicaFn, type PropostaPecas } from "@/newsletter/lib/propor-pecas.functions";
import { paragrafosCronica } from "@/newsletter/lib/newsletter-engine/revista/sequencia-cronica";
import type { ConfigRevista } from "./data-revista";

type CamposPecas = Pick<
  ConfigRevista,
  | "cronica_lede" | "cronica_lede_posicao" | "pull_quote" | "pull_quote_posicao"
  | "momento_activo" | "momento_etiqueta" | "momento_valor" | "momento_descricao" | "momento_posicao"
>;

export function snapshotPecas(cfg: ConfigRevista): CamposPecas {
  return {
    cronica_lede: cfg.cronica_lede, cronica_lede_posicao: cfg.cronica_lede_posicao,
    pull_quote: cfg.pull_quote, pull_quote_posicao: cfg.pull_quote_posicao,
    momento_activo: cfg.momento_activo, momento_etiqueta: cfg.momento_etiqueta,
    momento_valor: cfg.momento_valor, momento_descricao: cfg.momento_descricao,
    momento_posicao: cfg.momento_posicao,
  };
}

export const PECAS_VAZIAS: CamposPecas = {
  cronica_lede: "", cronica_lede_posicao: 0, pull_quote: "", pull_quote_posicao: 99,
  momento_activo: false, momento_etiqueta: "", momento_valor: "", momento_descricao: "", momento_posicao: 99,
};

export function PropostaPecasCronica({
  edicaoId, cfg, editar, excerto, bloqueado,
}: {
  edicaoId: string; cfg: ConfigRevista; editar: (p: Partial<ConfigRevista>) => void;
  excerto: string; bloqueado: boolean;
}) {
  const propor = useServerFn(proporPecasCronicaFn);
  const [aCarregar, setACarregar] = useState(false);
  const [proposta, setProposta] = useState<PropostaPecas | null>(null);
  const [escolha, setEscolha] = useState({ lede: true, quote: true, momento: true });
  const [anterior, setAnterior] = useState<CamposPecas | null>(null);
  const pars = paragrafosCronica(excerto);

  const onde = (pos: number) => {
    if (pos <= 0) return "Antes do 1.º parágrafo";
    if (pos >= pars.length) return "No fim do texto visível";
    const p = pars[pos - 1] ?? "";
    return `Depois de «${p.slice(0, 50)}${p.length > 50 ? "…" : ""}»`;
  };

  const pedir = async () => {
    setACarregar(true);
    try {
      const r = await propor({ data: { edicaoId, excerto } });
      setProposta(r);
      setEscolha({ lede: !!r.lede, quote: !!r.pullQuote, momento: r.momento.activo });
      r.avisos.forEach((a) => toast.warning(a));
    } catch (e) {
      toast.error((e as Error).message || "Não foi possível montar as peças.");
    } finally {
      setACarregar(false);
    }
  };

  const aplicar = () => {
    if (!proposta) return;
    const p: Partial<ConfigRevista> = {};
    if (escolha.lede && proposta.lede) Object.assign(p, { cronica_lede: proposta.lede, cronica_lede_posicao: proposta.ledePosicao });
    if (escolha.quote && proposta.pullQuote) Object.assign(p, { pull_quote: proposta.pullQuote, pull_quote_posicao: proposta.pullQuotePosicao });
    if (escolha.momento && proposta.momento.activo) Object.assign(p, {
      momento_activo: true, momento_etiqueta: proposta.momento.etiqueta, momento_valor: proposta.momento.valor,
      momento_descricao: proposta.momento.descricao, momento_posicao: proposta.momento.posicao,
    });
    if (!Object.keys(p).length) { toast.info("Nenhuma peça escolhida."); return; }
    setAnterior(snapshotPecas(cfg));
    editar(p);
    setProposta(null);
    toast.success("Peças aplicadas.");
  };

  const reverter = () => {
    if (!anterior) return;
    editar(anterior);
    setAnterior(null);
    toast.success("Peças repostas como estavam.");
  };

  const limpar = () => {
    if (!window.confirm("Esvaziar a lede, a frase de destaque e o momento editorial?")) return;
    setAnterior(snapshotPecas(cfg));
    editar(PECAS_VAZIAS);
    toast.success("Peças limpas.");
  };

  const Linha = ({ k, rotulo, texto, pos }: { k: keyof typeof escolha; rotulo: string; texto: string; pos: number }) => (
    <label className={`flex gap-3 rounded-md border border-border p-3 ${texto ? "cursor-pointer" : "opacity-50"}`}>
      <input type="checkbox" className="mt-1" disabled={!texto} checked={escolha[k] && !!texto}
        onChange={(e) => setEscolha((s) => ({ ...s, [k]: e.target.checked }))} />
      <span className="min-w-0 space-y-1">
        <span className="block text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</span>
        <span className="block text-sm">{texto || "Sem proposta utilizável."}</span>
        {texto && <span className="block text-xs text-muted-foreground">{onde(pos)}</span>}
      </span>
    </label>
  );

  return (
    <div className="mb-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={pedir} disabled={bloqueado || aCarregar || pars.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {aCarregar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {aCarregar ? "A ler a crónica…" : "Montar com IA"}
        </button>
        {anterior && (
          <button type="button" onClick={reverter} disabled={bloqueado}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
            <RotateCcw className="h-4 w-4" /> Reverter
          </button>
        )}
        <button type="button" onClick={limpar} disabled={bloqueado}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground disabled:opacity-50">
          <Eraser className="h-4 w-4" /> Limpar peças
        </button>
      </div>

      {proposta && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-card p-3">
          <p className="text-sm font-medium">Proposta da IA — escolhe o que entra</p>
          <Linha k="lede" rotulo="Lede / tese editorial" texto={proposta.lede} pos={proposta.ledePosicao} />
          <Linha k="quote" rotulo="Frase de destaque" texto={proposta.pullQuote} pos={proposta.pullQuotePosicao} />
          <Linha k="momento" rotulo="Momento editorial"
            texto={proposta.momento.activo ? `${proposta.momento.etiqueta}: ${proposta.momento.valor} — ${proposta.momento.descricao}` : ""}
            pos={proposta.momento.posicao} />
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={aplicar} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              <Check className="h-4 w-4" /> Aplicar
            </button>
            <button type="button" onClick={pedir} disabled={aCarregar} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50">
              <RefreshCw className="h-4 w-4" /> Regenerar
            </button>
            <button type="button" onClick={() => setProposta(null)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm">
              <X className="h-4 w-4" /> Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
