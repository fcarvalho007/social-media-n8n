// Painel de custos de IA — página própria.
// Lê `ia_uso` no período escolhido e mostra totais, evolução diária,
// repartição por origem e custo por edição.

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { DollarSign, Activity, AlertCircle, RefreshCw, Loader2, Cpu, ArrowUpRight, ArrowDownRight } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

const T = {
  shell: "#F7F8FA", card: "#FFFFFF", line: "#E4E7EC",
  ink: "#101828", muted: "#667085", faint: "#98A2B3",
  primary: "#6366F1", ok: "#10B981", warn: "#F59E0B", bad: "#B42318",
};

type LinhaUso = {
  id: string;
  criado_em: string;
  modelo: string;
  origem: string;
  tokens_entrada_cache_hit: number;
  tokens_entrada_cache_miss: number;
  tokens_saida: number;
  custo_usd: number;
  edicao_id: string | null;
};

const ORIGEM_LABEL: Record<string, string> = {
  colagem_manual: "Colagem manual",
  curadoria_rss: "Recolha de fontes",
  curadoria_fila: "Fila de entrada",
  email_newsletter: "Emails recebidos",
  sugerir_assunto: "Sugestão de assunto",
  encurtar_descricao: "Encurtar descrições",
  pesquisar_fonte: "Pesquisa de fontes",
  embedding_deteccao_repeticao: "Detecção de repetidos",
  confirmar_repeticao: "Confirmação de repetidos",
  minha_leitura: "A minha leitura",
};

const PALETA = ["#6366F1", "#F59E0B", "#10B981", "#EC4899", "#8B5CF6", "#0EA5E9", "#F97316", "#64748B"];

// Modelos com tabela de preços conhecida (inclui nomes antigos da DeepSeek).
const MODELOS_COM_PRECO = new Set([
  "deepseek-flash",
  "deepseek-v4-flash",
  "deepseek-v4-flash-vision-exp",
  "deepseek-chat",
  "deepseek-v4-pro",
  "deepseek-v4-pro-0813",
]);

type Periodo = 7 | 30 | 90;


function fmtUsd(v: number): string {
  return `$${v.toFixed(v < 1 ? 4 : 2)}`;
}
function fmtNum(v: number): string {
  return v.toLocaleString("pt-PT");
}
function fmtDataCurta(iso: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function carregarUso(dias: Periodo): Promise<LinhaUso[]> {
  const limite = new Date(Date.now() - dias * 2 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("nl_ia_uso")
    .select("id, criado_em, modelo, origem, tokens_entrada_cache_hit, tokens_entrada_cache_miss, tokens_saida, custo_usd, edicao_id")
    .gte("criado_em", limite)
    .order("criado_em", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as LinhaUso[];
}

async function carregarEdicoes(): Promise<Array<{ id: string; numero: number }>> {
  const { data, error } = await supabase
    .from("nl_edicoes").select("id, numero").order("numero", { ascending: false }).limit(60);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; numero: number }>;
}

export function PainelCustos() {
  const [dias, setDias] = useState<Periodo>(30);
  const [vista, setVista] = useState<"custo" | "pedidos" | "tokens">("custo");

  const q = useQuery({ queryKey: ["ia-uso", dias], queryFn: () => carregarUso(dias), staleTime: 30_000 });
  const qEd = useQuery({ queryKey: ["edicoes-numeros"], queryFn: carregarEdicoes, staleTime: 300_000 });

  const todas = q.data ?? [];
  const inicio = Date.now() - dias * 24 * 3600 * 1000;
  const inicioAnterior = Date.now() - dias * 2 * 24 * 3600 * 1000;

  const periodo = useMemo(() => todas.filter((l) => new Date(l.criado_em).getTime() >= inicio), [todas, inicio]);
  const anterior = useMemo(
    () => todas.filter((l) => {
      const t = new Date(l.criado_em).getTime();
      return t >= inicioAnterior && t < inicio;
    }),
    [todas, inicio, inicioAnterior],
  );

  const totais = useMemo(() => {
    const soma = (linhas: LinhaUso[]) => linhas.reduce((acc, l) => {
      acc.custo += Number(l.custo_usd) || 0;
      acc.pedidos += 1;
      acc.entrada += (l.tokens_entrada_cache_hit || 0) + (l.tokens_entrada_cache_miss || 0);
      acc.saida += l.tokens_saida || 0;
      return acc;
    }, { custo: 0, pedidos: 0, entrada: 0, saida: 0 });
    return { actual: soma(periodo), anterior: soma(anterior) };
  }, [periodo, anterior]);

  const serie = useMemo(() => {
    const mapa = new Map<string, { custo: number; pedidos: number; tokens: number }>();
    for (const l of periodo) {
      const k = chaveDia(new Date(l.criado_em));
      const acc = mapa.get(k) ?? { custo: 0, pedidos: 0, tokens: 0 };
      acc.custo += Number(l.custo_usd) || 0;
      acc.pedidos += 1;
      acc.tokens += (l.tokens_entrada_cache_hit || 0) + (l.tokens_entrada_cache_miss || 0) + (l.tokens_saida || 0);
      mapa.set(k, acc);
    }
    const out: Array<{ label: string; custo: number; pedidos: number; tokens: number }> = [];
    const hoje = new Date();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      const dados = mapa.get(chaveDia(d)) ?? { custo: 0, pedidos: 0, tokens: 0 };
      out.push({
        label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        custo: Number(dados.custo.toFixed(6)),
        pedidos: dados.pedidos,
        tokens: dados.tokens,
      });
    }
    return out;
  }, [periodo, dias]);

  const porOrigem = useMemo(() => {
    const mapa = new Map<string, { custo: number; pedidos: number; tokens: number }>();
    for (const l of periodo) {
      const acc = mapa.get(l.origem) ?? { custo: 0, pedidos: 0, tokens: 0 };
      acc.custo += Number(l.custo_usd) || 0;
      acc.pedidos += 1;
      acc.tokens += (l.tokens_entrada_cache_hit || 0) + (l.tokens_entrada_cache_miss || 0) + (l.tokens_saida || 0);
      mapa.set(l.origem, acc);
    }
    const total = totais.actual.custo || 0;
    return [...mapa.entries()]
      .map(([origem, v], i) => ({
        origem,
        rotulo: ORIGEM_LABEL[origem] ?? origem,
        cor: PALETA[i % PALETA.length],
        ...v,
        quota: total > 0 ? (v.custo / total) * 100 : 0,
      }))
      .sort((a, b) => b.custo - a.custo || b.pedidos - a.pedidos);
  }, [periodo, totais]);

  const porEdicao = useMemo(() => {
    const numeros = new Map((qEd.data ?? []).map((e) => [e.id, e.numero]));
    const mapa = new Map<string, { custo: number; pedidos: number }>();
    for (const l of periodo) {
      if (!l.edicao_id) continue;
      const acc = mapa.get(l.edicao_id) ?? { custo: 0, pedidos: 0 };
      acc.custo += Number(l.custo_usd) || 0;
      acc.pedidos += 1;
      mapa.set(l.edicao_id, acc);
    }
    return [...mapa.entries()]
      .map(([id, v]) => ({ id, numero: numeros.get(id) ?? null, ...v }))
      .sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0))
      .slice(0, 12);
  }, [periodo, qEd.data]);

  const variacao = (actual: number, ant: number): { valor: number; subiu: boolean } | null => {
    if (ant <= 0) return null;
    const pct = ((actual - ant) / ant) * 100;
    return { valor: Math.abs(pct), subiu: pct >= 0 };
  };

  const varCusto = variacao(totais.actual.custo, totais.anterior.custo);
  const varPedidos = variacao(totais.actual.pedidos, totais.anterior.pedidos);
  const tokensTotal = totais.actual.entrada + totais.actual.saida;
  const varTokens = variacao(tokensTotal, totais.anterior.entrada + totais.anterior.saida);

  // Totais de referência, independentes do período escolhido.
  const { custoMes, custo7d } = useMemo(() => {
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
    const sete = agora.getTime() - 7 * 24 * 3600 * 1000;
    let mes = 0, semana = 0;
    for (const l of todas) {
      const t = new Date(l.criado_em).getTime();
      const c = Number(l.custo_usd) || 0;
      if (t >= inicioMes) mes += c;
      if (t >= sete) semana += c;
    }
    return { custoMes: mes, custo7d: semana };
  }, [todas]);

  // Modelos sem tabela de preços — o custo fica invisível se não avisarmos.
  const desconhecidos = useMemo(() => {
    const set = new Set<string>();
    for (const l of periodo) {
      if (!MODELOS_COM_PRECO.has((l.modelo || "").toLowerCase())) set.add(l.modelo || "sem modelo");
    }
    return [...set];
  }, [periodo]);

  const ultimos = useMemo(() => periodo.slice(0, 25), [periodo]);


  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: T.ink }}>Custos de processamento</h1>
          <p className="text-[13px] mt-1" style={{ color: T.muted }}>
            Tudo o que a inteligência artificial consumiu na aplicação, ao detalhe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg p-0.5" style={{ background: T.shell, border: `1px solid ${T.line}` }}>
            {([7, 30, 90] as Periodo[]).map((d) => (
              <button key={d} type="button" onClick={() => setDias(d)}
                className="text-xs font-semibold px-3 py-1.5 rounded-md transition"
                style={{
                  background: dias === d ? T.card : "transparent",
                  color: dias === d ? T.ink : T.muted,
                }}>
                {d} dias
              </button>
            ))}
          </div>
          <button type="button" onClick={() => q.refetch()} disabled={q.isFetching}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 rounded-lg disabled:opacity-50"
            style={{ border: `1px solid ${T.line}`, color: T.muted, background: T.card }}>
            {q.isFetching ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Actualizar
          </button>
        </div>
      </header>

      {q.isError && (
        <div className="mb-4 px-3.5 py-2.5 rounded-lg text-sm flex items-center gap-2"
          style={{ background: "#FEE4E2", color: T.bad }}>
          <AlertCircle size={14} /> Não foi possível ler o consumo: {(q.error as Error).message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <Kpi label="Custo" valor={fmtUsd(totais.actual.custo)} sufixo={`últimos ${dias} dias`}
          icone={<DollarSign size={14} />} variacao={varCusto} destaque />
        <Kpi label="Pedidos à IA" valor={fmtNum(totais.actual.pedidos)} sufixo={`últimos ${dias} dias`}
          icone={<Activity size={14} />} variacao={varPedidos} />
        <Kpi label="Tokens" valor={fmtNum(tokensTotal)}
          sufixo={`${fmtNum(totais.actual.entrada)} entrada · ${fmtNum(totais.actual.saida)} saída`}
          icone={<Cpu size={14} />} variacao={varTokens} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: T.muted }}>
        <span>Este mês: <strong className="tabular-nums" style={{ color: T.ink }}>{fmtUsd(custoMes)}</strong></span>
        <span>Últimos 7 dias: <strong className="tabular-nums" style={{ color: T.ink }}>{fmtUsd(custo7d)}</strong></span>
        <span>Modelo em uso: <strong style={{ color: T.ink }}>DeepSeek Flash</strong></span>
      </div>

      {desconhecidos.length > 0 && (
        <div className="mb-6 px-3.5 py-2.5 rounded-lg text-[12.5px] flex items-start gap-2"
          style={{ background: "#FEF0C7", color: "#93370D" }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>
            Há chamadas com modelo sem tabela de preços ({desconhecidos.join(", ")}): o custo dessas
            chamadas aparece a zero e não está contabilizado. Actualiza a tabela de preços.
          </span>
        </div>
      )}


      <section className="rounded-[20px] p-5 mb-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-[11.5px] font-bold uppercase tracking-[0.08em]" style={{ color: T.muted }}>
            Evolução diária
          </h2>
          <div className="inline-flex rounded-lg p-0.5" style={{ background: T.shell, border: `1px solid ${T.line}` }}>
            {([["custo", "Custo"], ["pedidos", "Pedidos"], ["tokens", "Tokens"]] as const).map(([v, rot]) => (
              <button key={v} type="button" onClick={() => setVista(v)}
                className="text-xs font-semibold px-3 py-1.5 rounded-md transition"
                style={{ background: vista === v ? T.card : "transparent", color: vista === v ? T.ink : T.muted }}>
                {rot}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 260 }}>
          {q.isLoading ? (
            <div className="h-full grid place-items-center">
              <Loader2 size={20} className="animate-spin" style={{ color: T.primary }} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                <CartesianGrid stroke={T.line} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.muted }} axisLine={{ stroke: T.line }}
                  tickLine={false} interval="preserveStartEnd" minTickGap={18} />
                <YAxis tick={{ fontSize: 11, fill: T.muted }} axisLine={{ stroke: T.line }} tickLine={false}
                  tickFormatter={(v: number) => vista === "custo" ? `$${Number(v).toFixed(Number(v) < 0.1 ? 3 : 2)}` : fmtNum(Number(v))} />
                <Tooltip
                  cursor={{ fill: "rgba(99,102,241,0.06)" }}
                  contentStyle={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: T.muted, fontSize: 11 }}
                  formatter={(v: number) => vista === "custo"
                    ? [fmtUsd(Number(v)), "Custo"]
                    : [fmtNum(Number(v)), vista === "pedidos" ? "Pedidos" : "Tokens"]}
                />
                <Bar dataKey={vista} radius={[4, 4, 0, 0]} fill={T.primary} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-[20px] p-5 mb-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <h2 className="text-[11.5px] font-bold uppercase tracking-[0.08em] mb-4" style={{ color: T.muted }}>
          De onde vem o custo
        </h2>
        {porOrigem.length === 0 ? (
          <p className="text-xs px-3 py-6 rounded-lg text-center" style={{ background: T.shell, color: T.muted }}>
            Ainda não há consumo registado neste período.
          </p>
        ) : (
          <div className="space-y-3">
            {porOrigem.map((o) => (
              <div key={o.origem}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="font-semibold truncate" style={{ color: T.ink }}>{o.rotulo}</span>
                  <span className="tabular-nums shrink-0" style={{ color: T.muted }}>
                    {fmtUsd(o.custo)} · {fmtNum(o.pedidos)} pedidos · {o.quota.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ background: T.shell }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, o.quota)}%`, background: o.cor }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[20px] p-5" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <h2 className="text-[11.5px] font-bold uppercase tracking-[0.08em] mb-4" style={{ color: T.muted }}>
          Custo por edição
        </h2>
        {porEdicao.length === 0 ? (
          <p className="text-xs px-3 py-6 rounded-lg text-center" style={{ background: T.shell, color: T.muted }}>
            Nenhum consumo associado a uma edição neste período.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${T.line}` }}>
            <table className="w-full text-xs" style={{ background: T.card }}>
              <thead>
                <tr style={{ background: T.shell, color: T.muted }}>
                  <th className="text-left px-3 py-2 font-semibold">Edição</th>
                  <th className="text-right px-3 py-2 font-semibold">Pedidos</th>
                  <th className="text-right px-3 py-2 font-semibold">Custo</th>
                </tr>
              </thead>
              <tbody>
                {porEdicao.map((e) => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${T.line}`, color: T.ink }}>
                    <td className="px-3 py-2 font-semibold">{e.numero ? `#${e.numero}` : "sem número"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(e.pedidos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtUsd(e.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[20px] p-5 mt-6" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <h2 className="text-[11.5px] font-bold uppercase tracking-[0.08em] mb-4" style={{ color: T.muted }}>
          Últimos registos
        </h2>
        {ultimos.length === 0 ? (
          <p className="text-xs px-3 py-6 rounded-lg text-center" style={{ background: T.shell, color: T.muted }}>
            Ainda não há chamadas registadas neste período.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${T.line}` }}>
            <table className="w-full text-xs" style={{ background: T.card }}>
              <thead>
                <tr style={{ background: T.shell, color: T.muted }}>
                  <th className="text-left px-3 py-2 font-semibold">Quando</th>
                  <th className="text-left px-3 py-2 font-semibold">Funcionalidade</th>
                  <th className="text-left px-3 py-2 font-semibold">Modelo</th>
                  <th className="text-right px-3 py-2 font-semibold">Tokens</th>
                  <th className="text-right px-3 py-2 font-semibold">Custo</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((l) => {
                  const tokens = (l.tokens_entrada_cache_hit || 0) + (l.tokens_entrada_cache_miss || 0) + (l.tokens_saida || 0);
                  const semPreco = !MODELOS_COM_PRECO.has((l.modelo || "").toLowerCase());
                  return (
                    <tr key={l.id} style={{ borderTop: `1px solid ${T.line}`, color: T.ink }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: T.muted }}>{fmtDataCurta(l.criado_em)}</td>
                      <td className="px-3 py-2">{ORIGEM_LABEL[l.origem] ?? l.origem}</td>
                      <td className="px-3 py-2" style={{ color: T.muted }}>{l.modelo}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtNum(tokens)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold"
                        style={{ color: semPreco ? T.warn : T.ink }}>
                        {semPreco ? "preço desconhecido" : fmtUsd(Number(l.custo_usd) || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-[11px]" style={{ color: T.faint }}>
          Os valores saem dos tokens que a DeepSeek reporta em cada resposta (cache, entrada e saída),
          aplicando a tabela de preços oficial: tarifa de pico entre as 01:00–04:00 e as 06:00–10:00 UTC
          de segunda a sexta, e metade do preço nas restantes horas. Tabela em vigor desde 10/09/2026;
          registos anteriores mantêm o custo calculado na altura. Serve para acompanhar tendências —
          o valor definitivo é sempre o da conta DeepSeek.
        </p>
      </section>

    </div>
  );
}

function Kpi({ label, valor, sufixo, icone, destaque, variacao }: {
  label: string; valor: string; sufixo?: string; icone?: React.ReactNode; destaque?: boolean;
  variacao?: { valor: number; subiu: boolean } | null;
}) {
  return (
    <div className="rounded-[14px] p-4"
      style={destaque
        ? { background: "linear-gradient(135deg,#6366F1,#8B5CF6,#EC4899)", color: "#fff" }
        : { background: T.card, border: `1px solid ${T.line}` }}>
      <div className="flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em]"
        style={{ color: destaque ? "rgba(255,255,255,0.85)" : T.muted }}>
        {icone} {label}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-2xl font-bold tabular-nums" style={{ color: destaque ? "#fff" : T.ink }}>{valor}</div>
        {variacao && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold"
            style={{ color: destaque ? "rgba(255,255,255,0.9)" : (variacao.subiu ? T.warn : T.ok) }}>
            {variacao.subiu ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {variacao.valor.toFixed(0)}%
          </span>
        )}
      </div>
      {sufixo && (
        <div className="text-[12px] mt-0.5" style={{ color: destaque ? "rgba(255,255,255,0.75)" : T.faint }}>
          {sufixo}
        </div>
      )}
    </div>
  );
}
