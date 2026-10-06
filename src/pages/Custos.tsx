import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Cell, CartesianGrid, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listarCustos, type Fornecedor, type RegistoCusto } from "@/services/custos";
import { dataPt, eur, filtrar, FORNECEDORES, PERIODOS, rotuloPeriodo, serie, totais, type Periodo } from "@/features/custos/agregar";

const COR: Record<Fornecedor, string> = { deepseek: "hsl(var(--custo-deepseek))", kie: "hsl(var(--custo-kie))", fal: "hsl(var(--custo-fal))", outros: "hsl(var(--custo-outros))" };
const ORIGEM: Record<string, string> = { confirmado: "Confirmado", calculado: "Calculado", estimado: "Estimado", desconhecido: "Sem custo conhecido" };
const NOME = Object.fromEntries(FORNECEDORES.map((f) => [f.id, f.nome])) as Record<Fornecedor, string>;
const PAGINA = 50;

function Grafico({ dados, chaves, altura = 260 }: { dados: Array<Record<string, number | string>>; chaves: Fornecedor[]; altura?: number }) {
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="periodo" tickFormatter={rotuloPeriodo} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" minTickGap={16} />
        <YAxis tickFormatter={(v: number) => eur(v)} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={72} />
        <Tooltip formatter={(v: number, n: string) => [eur(v), NOME[n as Fornecedor] ?? n]} labelFormatter={(l: string) => rotuloPeriodo(l)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        {chaves.length > 1 && <Legend formatter={(n: string) => NOME[n as Fornecedor] ?? n} wrapperStyle={{ fontSize: 12 }} />}
        {chaves.map((k) => <Line key={k} type="monotone" dataKey={k} stroke={COR[k]} strokeWidth={2} dot={false} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function Custos() {
  const [sp, setSp] = useSearchParams();
  const periodo = (sp.get("p") as Periodo) || "mes";
  const fornecedor = (sp.get("f") as Fornecedor | "todos") || "todos";
  const pesquisa = sp.get("q") ?? "";
  const [pagina, setPagina] = useState(0);
  const definir = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); setPagina(0); };
  const { data, isLoading, error } = useQuery({ queryKey: ["custos-ia"], queryFn: listarCustos });

  const r = useMemo(() => filtrar(data ?? [], { periodo, fornecedor, pesquisa }), [data, periodo, fornecedor, pesquisa]);
  const t = useMemo(() => totais(r), [r]);
  const s = useMemo(() => serie(r, periodo), [r, periodo]);
  const visiveis = (fornecedor === "todos" ? FORNECEDORES.map((f) => f.id) : [fornecedor]).filter((k) => fornecedor !== "todos" || k !== "outros" || t.outros > 0 || r.some((x) => x.fornecedor === "outros"));
  const pie = FORNECEDORES.map((f) => ({ id: f.id, nome: f.nome, valor: t[f.id] })).filter((x) => x.valor > 0);
  const porFornecedor = (k: Fornecedor) => r.filter((x) => x.fornecedor === k);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custos</h1>
          <p className="text-sm text-muted-foreground">Pedidos de IA registados no servidor. Valores em euros, câmbio fixo 1 USD = 0,86 €.</p>
        </div>
        <ToggleGroup type="single" value={periodo} onValueChange={(v) => v && definir("p", v === "mes" ? "" : v)} className="flex-wrap justify-start gap-1 rounded-xl border bg-card p-1" aria-label="Período">
          {PERIODOS.map((p) => <ToggleGroupItem key={p.id} value={p.id} className="h-9 rounded-lg px-3 text-xs">{p.nome}</ToggleGroupItem>)}
        </ToggleGroup>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={fornecedor} onValueChange={(v) => definir("f", v === "todos" ? "" : v)}>
          <SelectTrigger className="h-10 sm:w-52" aria-label="Fornecedor"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="todos">Todos os fornecedores</SelectItem>{FORNECEDORES.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Input className="h-10 sm:max-w-xs" placeholder="Pesquisar modelo, ação ou estado" value={pesquisa} onChange={(e) => definir("q", e.target.value)} aria-label="Pesquisar" />
      </div>

      {error ? <p className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive">Não foi possível ler os custos: {(error as Error).message}</p>
      : isLoading ? <Skeleton className="h-64 w-full rounded-2xl" /> : (<>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="col-span-2 rounded-2xl border bg-card p-4 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{eur(t.total)}</p>
            <p className="text-xs text-muted-foreground">{t.pedidos} pedidos{t.desconhecidos ? ` · ${t.desconhecidos} sem custo conhecido` : ""}</p>
          </div>
          {FORNECEDORES.map((f) => (
            <div key={f.id} className="rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COR[f.id] }} />{f.nome}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{eur(t[f.id])}</p>
              <p className="text-xs text-muted-foreground">{porFornecedor(f.id).length} pedidos</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4 lg:col-span-2">
            <h2 className="mb-2 text-sm font-semibold">Evolução {s.mensal ? "mensal" : "diária"}</h2>
            <Grafico dados={s.pontos} chaves={visiveis} />
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold">Repartição</h2>
            {pie.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">Sem custos neste período.</p> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pie} dataKey="valor" nameKey="nome" innerRadius={55} outerRadius={90} paddingAngle={2}>{pie.map((x) => <Cell key={x.id} fill={COR[x.id]} />)}</Pie>
                  <Tooltip formatter={(v: number) => eur(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {fornecedor === "todos" && (
          <section className="grid gap-4 lg:grid-cols-3">
            {(["deepseek", "kie", "fal"] as Fornecedor[]).map((k) => {
              const rr = porFornecedor(k); const falhas = rr.filter((x) => x.estado === "falhou").length;
              return (
                <div key={k} className="rounded-2xl border bg-card p-4">
                  <div className="mb-2 flex items-baseline justify-between"><h2 className="text-sm font-semibold">{NOME[k]}</h2><span className="text-sm font-semibold tabular-nums">{eur(t[k])}</span></div>
                  <p className="mb-2 text-xs text-muted-foreground">{rr.length} pedidos{falhas ? ` · ${falhas} falhados (0 €)` : ""}</p>
                  {rr.length ? <Grafico dados={s.pontos} chaves={[k]} altura={160} /> : <p className="py-12 text-center text-xs text-muted-foreground">Sem pedidos neste período.</p>}
                </div>
              );
            })}
          </section>
        )}

        <section className="rounded-2xl border bg-card">
          <h2 className="border-b p-4 text-sm font-semibold">Pedidos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr>{["Data", "Fornecedor", "Modelo", "Ação", "Estado", "Custo", "Valor"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {r.slice(pagina * PAGINA, (pagina + 1) * PAGINA).map((x: RegistoCusto) => (
                  <tr key={x.id} className="border-t">
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">{dataPt(x.criado_em)}</td>
                    <td className="px-4 py-2"><span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COR[x.fornecedor] }} />{NOME[x.fornecedor]}</span></td>
                    <td className="px-4 py-2 text-muted-foreground">{x.modelo}</td>
                    <td className="px-4 py-2">{x.acao}</td>
                    <td className="px-4 py-2">{x.estado}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{x.custo_eur == null ? "—" : eur(x.custo_eur)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{ORIGEM[x.custo_origem]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {r.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Sem pedidos com estes filtros.</p>}
          </div>
          {r.length > PAGINA && (
            <div className="flex items-center justify-between border-t p-3 text-xs">
              <button className="rounded-md px-3 py-2 hover:bg-muted disabled:opacity-40" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
              <span className="text-muted-foreground">{pagina * PAGINA + 1}–{Math.min(r.length, (pagina + 1) * PAGINA)} de {r.length}</span>
              <button className="rounded-md px-3 py-2 hover:bg-muted disabled:opacity-40" disabled={(pagina + 1) * PAGINA >= r.length} onClick={() => setPagina((p) => p + 1)}>Seguinte</button>
            </div>
          )}
        </section>
        <p className="text-xs text-muted-foreground">«Calculado»: tokens × tabela de preços oficial da DeepSeek (com horário de pico). «Confirmado»: pedidos recusados pelo fornecedor, sem cobrança. «Sem custo conhecido»: o fornecedor não devolveu o valor e o pedido não entra no total.</p>
      </>)}
    </div>
  );
}
