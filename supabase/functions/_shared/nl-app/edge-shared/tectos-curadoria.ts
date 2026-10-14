// Tectos de entrada de notícias — partilhados por TODAS as portas automáticas.
//
// Antes, o «Máximo por corrida» só existia na curadoria RSS. Os emails
// inseriam tudo o que o motor extraísse, pelo que a fila de pendentes crescia
// sem controlo (uma newsletter prolífica ocupava a fila inteira). Este módulo
// centraliza os limites configuráveis e o cálculo da quota diária.

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface TectosCuradoria {
  maxPorCorrida: number;
  maxPorEmail: number;
  maxPorDia: number;
  /** Tecto diário exclusivo das entradas por email (reserva vagas para o RSS). */
  maxPorDiaEmail: number;
  maxPorFonte: number;
  maxPorCategoria: number;
  janelaHoras: number;
}

export const TECTOS_DEFAULT: TectosCuradoria = {
  maxPorCorrida: 15,
  maxPorEmail: 4,
  maxPorDia: 25,
  maxPorDiaEmail: 15,
  maxPorFonte: 2,
  maxPorCategoria: 3,
  janelaHoras: 24,
};

/** Origens que contam para a quota diária automática (a entrada manual não conta). */
export const ORIGENS_AUTOMATICAS = [
  "curadoria_ia",
  "email_newsletter",
  "email_newsletter_fallback",
];

export const ORIGENS_EMAIL = ["email_newsletter", "email_newsletter_fallback"];
export const ORIGENS_RSS = ["curadoria_ia"];

export type AmbitoQuota = "rss" | "email" | "global";

function origensDoAmbito(ambito: AmbitoQuota): string[] {
  if (ambito === "email") return ORIGENS_EMAIL;
  if (ambito === "rss") return ORIGENS_RSS;
  return ORIGENS_AUTOMATICAS;
}

export async function lerTectos(admin: Admin): Promise<TectosCuradoria> {
  try {
    const { data } = await admin
      .from("nl_curadoria_config")
      .select(
        "max_insercoes_por_corrida, janela_horas, max_por_email, max_por_dia, max_por_dia_email, max_por_fonte, max_por_categoria",
      )
      .eq("id", 1)
      .maybeSingle();
    if (!data) return { ...TECTOS_DEFAULT };
    return {
      maxPorCorrida: data.max_insercoes_por_corrida ?? TECTOS_DEFAULT.maxPorCorrida,
      maxPorEmail: data.max_por_email ?? TECTOS_DEFAULT.maxPorEmail,
      maxPorDia: data.max_por_dia ?? TECTOS_DEFAULT.maxPorDia,
      maxPorDiaEmail: data.max_por_dia_email ?? TECTOS_DEFAULT.maxPorDiaEmail,
      maxPorFonte: data.max_por_fonte ?? TECTOS_DEFAULT.maxPorFonte,
      maxPorCategoria: data.max_por_categoria ?? TECTOS_DEFAULT.maxPorCategoria,
      janelaHoras: data.janela_horas ?? TECTOS_DEFAULT.janelaHoras,
    };
  } catch {
    return { ...TECTOS_DEFAULT };
  }
}

/** Quantas entradas do âmbito pedido entraram nas últimas 24 horas. */
export async function contarInseridasHoje(
  admin: Admin,
  ambito: AmbitoQuota = "global",
): Promise<number> {
  try {
    const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await admin
      .from("nl_noticias")
      .select("id", { count: "exact", head: true })
      .in("origem", origensDoAmbito(ambito))
      .gte("created_at", desde);
    return typeof count === "number" ? count : 0;
  } catch {
    return 0;
  }
}

/**
 * Vagas ainda disponíveis no dia para o âmbito pedido, nunca negativas.
 *
 * O email tem um tecto próprio (`maxPorDiaEmail`) para nunca consumir as vagas
 * da recolha RSS; o RSS conta apenas as suas próprias entradas contra o tecto
 * global do dia.
 */
export async function vagasDiarias(
  admin: Admin,
  tectos: TectosCuradoria,
  ambito: AmbitoQuota = "global",
): Promise<number> {
  if (ambito === "email") {
    const usadas = await contarInseridasHoje(admin, "email");
    return Math.max(0, tectos.maxPorDiaEmail - usadas);
  }
  if (ambito === "rss") {
    const usadasRss = await contarInseridasHoje(admin, "rss");
    const tectoRss = Math.max(0, tectos.maxPorDia - tectos.maxPorDiaEmail);
    // O RSS tem sempre garantida a sua fatia (global menos a fatia do email),
    // mas nunca menos do que o tecto de uma corrida se a conta der zero.
    return Math.max(0, Math.max(tectoRss, tectos.maxPorCorrida) - usadasRss);
  }
  const usadas = await contarInseridasHoje(admin, "global");
  return Math.max(0, tectos.maxPorDia - usadas);
}


/**
 * Corta uma lista de candidatos ao tecto pedido, equilibrando por categoria
 * (usado nos emails, onde a fonte é sempre a mesma).
 */
export function limitarPorCategoria<T>(
  itens: T[],
  categoria: (item: T) => string,
  max: number,
  maxPorCategoria: number,
): { mantidos: T[]; cortados: T[] } {
  if (max <= 0) return { mantidos: [], cortados: [...itens] };
  const mantidos: T[] = [];
  const cortados: T[] = [];
  const contagem = new Map<string, number>();
  // Passagem 1: respeita o tecto por categoria.
  for (const it of itens) {
    if (mantidos.length >= max) { cortados.push(it); continue; }
    const c = categoria(it) || "—";
    if ((contagem.get(c) ?? 0) >= maxPorCategoria) { cortados.push(it); continue; }
    contagem.set(c, (contagem.get(c) ?? 0) + 1);
    mantidos.push(it);
  }
  // Passagem 2: sobram vagas → aceita os cortados por categoria, por ordem.
  if (mantidos.length < max && cortados.length > 0) {
    const sobras = cortados.splice(0, max - mantidos.length);
    mantidos.push(...sobras);
  }
  return { mantidos, cortados };
}
