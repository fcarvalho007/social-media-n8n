// Utilitários puros para o cabeçalho-validador e para o cálculo do destino
// efectivo de cada notícia (email vs só no site).
//
// Regra editorial (Julho 2026):
// - Por categoria, as 2 primeiras notícias por ordem vão para o email.
// - Da 3.ª em diante ficam automaticamente «só no site».
// - Tecto global do email: MAX_TOTAL_EMAIL (12). A partir de AVISO_EMAIL (10)
//   o pill do header fica âmbar; a 12 fica vermelho.
// - Pins manuais (override_destino):
//     'email' → força no email, mesmo ultrapassando os limites automáticos.
//     'site'  → força só no site, mesmo em posição 1 ou 2.
//     'auto'  → segue a regra acima.
// - Categoria oculta no email → todas as suas notícias vão para site.

export type ItemChave =
  | "noticiasEmail"
  | "maxPorCategoria"
  | "cronica"
  | "podcast"
  | "ferramenta";
export type NivelChecklist = "verde" | "ambar" | "vermelho" | "neutro";

export interface ItemChecklist {
  chave: ItemChave;
  verde: boolean;              // compat legado; equivalente a nivel === "verde"
  nivel: NivelChecklist;
  rotulo: string;
  destino: string;             // secId do Foldable
  detalhe?: string;            // texto auxiliar (ex.: categorias que excedem)
}

/* ─── Constantes editoriais ─── */
export const MAX_TOTAL_EMAIL = 12;
export const AVISO_EMAIL = 10;
export const MAX_POR_CATEGORIA = 2;

/* ─── Resolver de destino efectivo ─── */

export type OverrideDestino = "auto" | "email" | "site";

export interface EntradaResolve {
  id: string;
  ordem: number;
  categoria: string;
  destaque: boolean;
  override: OverrideDestino;
}

export type RazaoDestino =
  | "pin_email"
  | "pin_site"
  | "destaque"
  | "auto_top"
  | "auto_extra_categoria"
  | "auto_corte_global"
  | "categoria_oculta";

export interface ResultadoDestino {
  destino: "email" | "site";
  razao: RazaoDestino;
}

export interface OpcoesResolver {
  categoriasOcultas: Set<string>;
  maxTotal?: number;
  maxPorCategoria?: number;
}

/**
 * Devolve, para cada notícia (identificada pelo `id`), o destino final:
 * "email" ou "site", com a razão que o determinou.
 *
 * Regras (ordem de precedência):
 *  1. Categoria oculta no email → site.
 *  2. Pin manual (override 'email' ou 'site') → força.
 *  3. Destaque → sempre email (conta para o cap de categoria e global).
 *  4. Auto: as primeiras `maxPorCategoria` da categoria vão para email,
 *     desde que o total não ultrapasse `maxTotal`. Resto → site.
 */
export function resolverDestinos(
  itens: EntradaResolve[],
  opts: OpcoesResolver,
): Map<string, ResultadoDestino> {
  const maxTotal = opts.maxTotal ?? MAX_TOTAL_EMAIL;
  const maxCat = opts.maxPorCategoria ?? MAX_POR_CATEGORIA;
  const out = new Map<string, ResultadoDestino>();
  const ordenado = [...itens].sort((a, b) => a.ordem - b.ordem);

  const contCat = new Map<string, number>();
  let contTotal = 0;

  // Passagem 1 — pins e categorias ocultas.
  for (const it of ordenado) {
    if (opts.categoriasOcultas.has(it.categoria)) {
      out.set(it.id, { destino: "site", razao: "categoria_oculta" });
      continue;
    }
    if (it.override === "site") {
      out.set(it.id, { destino: "site", razao: "pin_site" });
      continue;
    }
    if (it.override === "email") {
      out.set(it.id, { destino: "email", razao: "pin_email" });
      contCat.set(it.categoria, (contCat.get(it.categoria) ?? 0) + 1);
      contTotal += 1;
    }
  }

  // Passagem 2 — destaques (força email, mas pode ser bloqueado por categoria
  // oculta na passagem 1). Se o destaque estiver oculto, respeitamos: fica site.
  // Nota: os destaques contam para o tecto global, mas NÃO consomem a quota
  // por categoria — caso contrário uma categoria com destaques desaparecia
  // por completo do bloco "Categorias" do email.
  for (const it of ordenado) {
    if (out.has(it.id)) continue;
    if (!it.destaque) continue;
    out.set(it.id, { destino: "email", razao: "destaque" });
    contTotal += 1;
  }


  // Passagem 3 — auto, pela ordem.
  for (const it of ordenado) {
    if (out.has(it.id)) continue;
    const cCat = contCat.get(it.categoria) ?? 0;
    if (cCat >= maxCat) {
      out.set(it.id, { destino: "site", razao: "auto_extra_categoria" });
      continue;
    }
    if (contTotal >= maxTotal) {
      out.set(it.id, { destino: "site", razao: "auto_corte_global" });
      continue;
    }
    out.set(it.id, { destino: "email", razao: "auto_top" });
    contCat.set(it.categoria, cCat + 1);
    contTotal += 1;
  }

  return out;
}

/* ─── Checklist do header-validador ─── */

/** Contagem por categoria — usada para o limite de N por categoria. */
export interface ContagemCategoria {
  id: string;
  nome: string;
  curto: string;
  count: number;
}

export interface SinaisChecklist {
  /** Nº de notícias com destino efectivo = email. */
  noticiasEmail: number;
  cronicaConcluida: boolean;
  /** A crónica tem texto real gravado (é o que entra no email). */
  cronicaTemTexto?: boolean;
  temPodcast: boolean;
  ferramentasPreenchidas: number;
  /** Distribuição das notícias no email por categoria (só as visíveis). */
  porCategoriaNoEmail?: ContagemCategoria[];
  /** Nº de categorias ocultas no email (informativo). */
  categoriasOcultas?: number;
  /** Tectos configuráveis (usa defaults se omitido). */
  maxTotal?: number;
  aviso?: number;
  maxPorCategoria?: number;
}


export function computarChecklist(s: SinaisChecklist): ItemChecklist[] {
  const maxTotal = s.maxTotal ?? MAX_TOTAL_EMAIL;
  const aviso = s.aviso ?? AVISO_EMAIL;
  const maxCat = s.maxPorCategoria ?? MAX_POR_CATEGORIA;
  const excede = (s.porCategoriaNoEmail ?? []).filter((c) => c.count > maxCat);

  let nivelN: NivelChecklist;
  let detalheN: string | undefined;
  if (s.noticiasEmail > maxTotal) {
    // Defesa: não deve acontecer com o resolver actual.
    nivelN = "vermelho";
    detalheN = `Acima do tecto (${maxTotal}).`;
  } else if (s.noticiasEmail === maxTotal) {
    // Cheio = objectivo atingido, não é pendência.
    nivelN = "verde";
  } else if (s.noticiasEmail >= aviso) {
    // Informativo — perto do tecto, mas não bloqueia envio.
    nivelN = "neutro";
    detalheN = `A aproximar-te do tecto (${maxTotal}).`;
  } else if (s.noticiasEmail === 0) {
    nivelN = "ambar";
  } else {
    nivelN = "verde";
  }
  const rotuloN = `${s.noticiasEmail}/${maxTotal} notícias`;

  const excedeVis = excede.length > 0;
  const categoriasOcultasN = s.categoriasOcultas ?? 0;
  const cronicaPronta = s.cronicaConcluida || Boolean(s.cronicaTemTexto);


  return [
    {
      chave: "noticiasEmail",
      verde: nivelN === "verde",
      nivel: nivelN,
      rotulo: rotuloN,
      destino: "categorias",
      detalhe: detalheN,
    },
    {
      chave: "maxPorCategoria",
      verde: !excedeVis && categoriasOcultasN === 0,
      // Sempre informativo — a regra editorial já resolve o excesso automaticamente.
      nivel: excedeVis || categoriasOcultasN > 0 ? "neutro" : "verde",
      rotulo: excedeVis
        ? `${excede.length} categoria(s) acima de ${maxCat}`
        : categoriasOcultasN > 0
          ? `${categoriasOcultasN} categoria(s) oculta(s)`
          : `Máx. ${maxCat}/categoria`,
      destino: "categorias",
      detalhe: excedeVis
        ? excede.map((c) => `${c.curto} ${c.count}/${maxCat}`).join(" · ")
        : undefined,
    },
    {
      chave: "cronica",
      // O que conta para o email é haver texto. A marcação manual é só uma
      // confirmação: sem ela, o item fica verde mas com nota.
      verde: cronicaPronta,
      nivel: cronicaPronta ? "verde" : "ambar",
      rotulo: "Crónica",
      destino: "cronica",
      detalhe: !s.cronicaConcluida && cronicaPronta ? "Texto escrito, por confirmar." : undefined,
    },

    {
      chave: "podcast",
      verde: s.temPodcast,
      nivel: s.temPodcast ? "verde" : "ambar",
      rotulo: "Podcast",
      destino: "podcast",
    },
    {
      chave: "ferramenta",
      verde: s.ferramentasPreenchidas > 0,
      nivel: s.ferramentasPreenchidas > 0 ? "verde" : "ambar",
      rotulo: "Ferramentas",
      destino: "ferramentas",
    },
  ];
}

/**
 * Diferença em dias entre hoje (meia-noite local) e a data de envio.
 * Se a data não existir, cai para a próxima sexta-feira a partir de hoje.
 * Devolve 0 quando é hoje, 1 amanhã, negativo se em atraso.
 */
export function diasAteEnvio(dataPrevistaIso: string | null | undefined): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  let alvo: Date;
  if (dataPrevistaIso) {
    const partes = dataPrevistaIso.slice(0, 10).split("-");
    if (partes.length === 3) {
      alvo = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
    } else {
      alvo = new Date(dataPrevistaIso);
      alvo.setHours(0, 0, 0, 0);
    }
  } else {
    const dow = hoje.getDay();
    const diff = (5 - dow + 7) % 7;
    alvo = new Date(hoje);
    alvo.setDate(hoje.getDate() + diff);
  }

  const ms = alvo.getTime() - hoje.getTime();
  return Math.round(ms / 86400000);
}

export function copyPilulaContagem(dias: number): string {
  if (dias < 0) return "envio em atraso";
  if (dias === 0) return "sai hoje";
  if (dias === 1) return "sai amanhã";
  return `sai em ${dias} dias`;
}

export function fmtDiaSemanaEData(dataPrevistaIso: string | null | undefined): string {
  const iso = dataPrevistaIso;
  let d: Date;
  if (iso) {
    const p = iso.slice(0, 10).split("-");
    d = p.length === 3 ? new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])) : new Date(iso);
  } else {
    d = new Date();
  }
  const dia = new Intl.DateTimeFormat("pt-PT", { weekday: "long" }).format(d);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const diaCurto = dia.replace(/-feira$/, "");
  return `${diaCurto}, ${dd}/${mm}/${yyyy}`;
}

/* ─── Avaliação anti-spam do assunto ─── */

export interface AvisoAssunto {
  nivel: "ambar" | "vermelho";
  texto: string;
}

const TERMOS_RISCO = [
  "grátis", "gratis", "grátis!", "urgente", "promoção", "promocao", "oferta imperdível",
  "clica aqui", "clique aqui", "dinheiro", "ganha já", "última chance", "100%",
  "free", "winner", "cash", "risk-free",
];

/**
 * Sinais que aumentam a probabilidade de o email ser marcado como spam.
 * Puro e sem dependências — usado no campo «Assunto do email».
 */
export function avaliarAssuntoSpam(assunto: string): AvisoAssunto[] {
  const t = (assunto ?? "").trim();
  if (!t) return [];
  const avisos: AvisoAssunto[] = [];
  const baixo = t.toLowerCase();

  if (t.length > 60) {
    avisos.push({
      nivel: "ambar",
      texto: `Assunto com ${t.length} caracteres — acima de 60 é cortado no Outlook e no telemóvel.`,
    });
  }

  const letras = t.replace(/[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g, "");
  const maiusculas = letras.replace(/[^A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/g, "");
  if (letras.length >= 8 && maiusculas.length / letras.length > 0.5) {
    avisos.push({ nivel: "vermelho", texto: "Demasiadas maiúsculas — sinal clássico de spam." });
  }

  const exclamacoes = (t.match(/!/g) ?? []).length;
  if (exclamacoes >= 2) {
    avisos.push({ nivel: "vermelho", texto: "Mais do que um ponto de exclamação penaliza a entregabilidade." });
  }

  const encontrados = TERMOS_RISCO.filter((x) => baixo.includes(x));
  if (encontrados.length) {
    avisos.push({
      nivel: "ambar",
      texto: `Termos de risco no assunto: ${encontrados.slice(0, 3).join(", ")}.`,
    });
  }

  const emojis = (t.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  if (emojis > 1) {
    avisos.push({ nivel: "ambar", texto: "Mais do que um emoji no assunto aumenta o risco de filtro." });
  }

  return avisos;
}
