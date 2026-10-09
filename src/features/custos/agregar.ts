import type { Fornecedor, RegistoCusto } from "@/services/custos";

export type Periodo = "semana" | "mes" | "3m" | "12m" | "tudo";
export const PERIODOS: Array<{ id: Periodo; nome: string }> = [
  { id: "semana", nome: "Esta semana" }, { id: "mes", nome: "Este mês" }, { id: "3m", nome: "3 meses" }, { id: "12m", nome: "12 meses" }, { id: "tudo", nome: "Tudo" },
];
export const FORNECEDORES: Array<{ id: Fornecedor; nome: string }> = [
  { id: "deepseek", nome: "DeepSeek" }, { id: "kie", nome: "Kie.ai" }, { id: "fal", nome: "fal.ai" }, { id: "outros", nome: "Outros" },
];

const TZ = "Europe/Lisbon";
/** YYYY-MM-DD of an instant in Lisbon. */
export const diaLisboa = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** First Lisbon day (YYYY-MM-DD) of the period, or null for "tudo". */
export function inicioPeriodo(p: Periodo, agora = new Date()): string | null {
  const hoje = diaLisboa(agora);
  const [y, m, d] = hoje.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  if (p === "semana") { const dow = (base.getUTCDay() + 6) % 7; base.setUTCDate(base.getUTCDate() - dow); }
  else if (p === "mes") base.setUTCDate(1);
  else if (p === "3m") base.setUTCMonth(base.getUTCMonth() - 3);
  else if (p === "12m") base.setUTCMonth(base.getUTCMonth() - 12);
  else return null;
  return base.toISOString().slice(0, 10);
}

export type Area = "todas" | "newsletter" | "estudio";
/** Newsletter rows come from nl_ia_uso (id prefix "nl:"); everything else is Studio work. */
export const areaDe = (x: Pick<RegistoCusto, "id">): Exclude<Area, "todas"> => (x.id.startsWith("nl:") ? "newsletter" : "estudio");

const ROTULOS: Record<string, string> = {
  curadoria_fila: "Curadoria (RSS)", curadoria_rss: "Curadoria (RSS)", email: "Emails", email_extrair: "Emails · extrair notícias",
  email_blocos: "Emails · ferramentas e ligações", sugerir_assunto: "Sugerir assunto", carrossel_cronica: "Carrossel da crónica",
  confirmar_repeticao: "Confirmar repetição", colagem_manual: "Colar notícia", descricao_reescrita: "Reescrever descrição",
  minha_leitura: "Minha leitura", curadoria_ferramentas_relevancia: "Ferramentas · relevância", curadoria_ferramentas_polimento: "Ferramentas · polimento",
};
/** Human label for a technical action name; unknown names stay as they are. */
export const rotuloAcao = (acao: string) => ROTULOS[acao] ?? acao;

export function filtrar(r: RegistoCusto[], p: { periodo: Periodo; fornecedor: Fornecedor | "todos"; pesquisa: string; area?: Area }, agora = new Date()) {
  const ini = inicioPeriodo(p.periodo, agora);
  const q = p.pesquisa.trim().toLowerCase();
  const area = p.area ?? "todas";
  return r.filter((x) => (!ini || diaLisboa(new Date(x.criado_em)) >= ini)
    && (p.fornecedor === "todos" || x.fornecedor === p.fornecedor)
    && (area === "todas" || areaDe(x) === area)
    && (!q || `${x.modelo} ${x.acao} ${rotuloAcao(x.acao)} ${x.estado}`.toLowerCase().includes(q)));
}

/** Daily buckets up to 3 months, monthly beyond; empty buckets are 0, never missing. */
export function serie(r: RegistoCusto[], periodo: Periodo, agora = new Date()) {
  const mensal = periodo === "12m" || periodo === "tudo";
  const chave = (iso: string) => (mensal ? diaLisboa(new Date(iso)).slice(0, 7) : diaLisboa(new Date(iso)));
  let ini = inicioPeriodo(periodo, agora) ?? (r.length ? diaLisboa(new Date(r[r.length - 1].criado_em)) : diaLisboa(agora));
  if (periodo === "tudo") for (const x of r) { const d = diaLisboa(new Date(x.criado_em)); if (d < ini) ini = d; }
  const fim = diaLisboa(agora);
  const chaves: string[] = [];
  const c = new Date(`${ini}T00:00:00Z`);
  if (mensal) c.setUTCDate(1);
  while (c.toISOString().slice(0, 10) <= fim) { chaves.push(mensal ? c.toISOString().slice(0, 7) : c.toISOString().slice(0, 10)); if (mensal) c.setUTCMonth(c.getUTCMonth() + 1); else c.setUTCDate(c.getUTCDate() + 1); }
  const mapa = new Map(chaves.map((k) => [k, { periodo: k, deepseek: 0, kie: 0, fal: 0, outros: 0, total: 0 }]));
  for (const x of r) { const b = mapa.get(chave(x.criado_em)); if (b && x.custo_eur) { b[x.fornecedor] += x.custo_eur; b.total += x.custo_eur; } }
  return { pontos: [...mapa.values()], mensal };
}

export function totais(r: RegistoCusto[]) {
  const t = { deepseek: 0, kie: 0, fal: 0, outros: 0, total: 0, pedidos: r.length, conhecidos: 0, desconhecidos: 0, estimados: 0 };
  for (const x of r) {
    if (x.custo_eur != null) { t[x.fornecedor] += x.custo_eur; t.total += x.custo_eur; }
    if (x.custo_origem === "desconhecido") t.desconhecidos++; else if (x.custo_origem === "estimado") t.estimados++; else t.conhecidos++;
  }
  return t;
}

const fmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const eur = (v: number) => fmt.format(v);
export const dataPt = (iso: string) => new Intl.DateTimeFormat("pt-PT", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const rotuloPeriodo = (k: string) => (k.length === 7 ? `${k.slice(5, 7)}/${k.slice(0, 4)}` : `${k.slice(8, 10)}/${k.slice(5, 7)}`);
