// Selecção equilibrada de candidatos de curadoria.
//
// O tecto «Máximo por corrida» passa a significar N notícias VARIADAS, e não
// as N mais recentes: sem isto, uma fonte prolífica (TechCrunch, Search Engine
// Journal) ocupa todas as vagas e as restantes fontes nunca entram.
//
// Estratégia: round-robin pelas fontes (a mais recente de cada uma, à vez),
// com tecto por fonte e por categoria. Só quando já não há candidatos de
// outras fontes é que uma fonte pode ultrapassar o seu tecto.

export interface OpcoesSeleccao {
  max: number;
  /** Tecto por fonte enquanto houver material de outras fontes. Default 2. */
  maxPorFonte?: number;
  /** Tecto por categoria enquanto houver material de outras categorias. Default 3. */
  maxPorCategoria?: number;
}

export interface ChavesSeleccao<T> {
  fonte: (item: T) => string;
  categoria?: (item: T) => string;
  /** Maior = mais recente/prioritário. */
  prioridade: (item: T) => number;
}

export interface ResultadoSeleccao<T> {
  seleccionados: T[];
  /** Quantos entraram por fonte (nome/id → contagem). */
  porFonte: Record<string, number>;
}

export function seleccionarDiverso<T>(
  itens: T[],
  chaves: ChavesSeleccao<T>,
  opts: OpcoesSeleccao,
): ResultadoSeleccao<T> {
  const max = Math.max(0, opts.max);
  const maxFonte = opts.maxPorFonte ?? 2;
  const maxCat = opts.maxPorCategoria ?? 3;
  if (max === 0 || itens.length === 0) return { seleccionados: [], porFonte: {} };

  // Agrupar por fonte, cada grupo ordenado por prioridade decrescente.
  const grupos = new Map<string, T[]>();
  for (const it of itens) {
    const k = chaves.fonte(it) || "—";
    const arr = grupos.get(k);
    if (arr) arr.push(it);
    else grupos.set(k, [it]);
  }
  for (const arr of grupos.values()) arr.sort((a, b) => chaves.prioridade(b) - chaves.prioridade(a));

  // Ordem das fontes: a que tem o item mais recente começa.
  const ordemFontes = Array.from(grupos.keys()).sort(
    (a, b) => chaves.prioridade(grupos.get(b)![0]) - chaves.prioridade(grupos.get(a)![0]),
  );

  const seleccionados: T[] = [];
  const porFonte: Record<string, number> = {};
  const porCategoria = new Map<string, number>();
  const indices = new Map<string, number>(ordemFontes.map((f) => [f, 0]));

  // Passagem 1 e 2: round-robin respeitando os tectos.
  const passar = (respeitarTectos: boolean) => {
    let progrediu = true;
    while (seleccionados.length < max && progrediu) {
      progrediu = false;
      for (const f of ordemFontes) {
        if (seleccionados.length >= max) break;
        if (respeitarTectos && (porFonte[f] ?? 0) >= maxFonte) continue;
        const grupo = grupos.get(f)!;
        let i = indices.get(f)!;
        while (i < grupo.length) {
          const cand = grupo[i];
          const cat = chaves.categoria ? (chaves.categoria(cand) || "—") : "—";
          if (respeitarTectos && chaves.categoria && (porCategoria.get(cat) ?? 0) >= maxCat) {
            i += 1; // tenta o próximo item desta fonte
            continue;
          }
          indices.set(f, i + 1);
          seleccionados.push(cand);
          porFonte[f] = (porFonte[f] ?? 0) + 1;
          porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + 1);
          progrediu = true;
          break;
        }
        if (i >= grupo.length) indices.set(f, i);
      }
    }
  };

  passar(true);
  // Sobram vagas (poucas fontes com material)? Preenche sem tectos.
  if (seleccionados.length < max) {
    for (const f of ordemFontes) indices.set(f, indices.get(f) ?? 0);
    passar(false);
  }

  return { seleccionados, porFonte };
}

/** Chave de título normalizada, para deduplicação dentro da mesma corrida. */
export function chaveTitulo(titulo: string): string {
  return (titulo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Semelhança simples por palavras (Jaccard sobre palavras com 4+ letras). */
export function semelhancaTitulos(a: string, b: string): number {
  const pa = new Set(chaveTitulo(a).split(" ").filter((w) => w.length > 3));
  const pb = new Set(chaveTitulo(b).split(" ").filter((w) => w.length > 3));
  if (pa.size === 0 || pb.size === 0) return 0;
  let comuns = 0;
  for (const w of pa) if (pb.has(w)) comuns += 1;
  return comuns / Math.min(pa.size, pb.size);
}

/** Item mínimo da fila para escolher um lote variado. */
export interface ItemLoteFila {
  origem: string;
  fonte_id: string | null;
  fonte_nome?: string | null;
  publicado_em?: string | null;
}

/** Chave de fonte: fonte_id, ou o domínio-base do remetente nos emails. */
export function chaveFonteFila(item: ItemLoteFila): string {
  if (item.origem === "email") {
    const m = /@([a-z0-9.-]+)/i.exec(item.fonte_nome ?? "");
    if (m) {
      const partes = m[1].toLowerCase().split(".").filter(Boolean);
      // insight.emarketer.com → emarketer.com; mail.beehiiv.com → remetente completo
      const base = partes.slice(-2).join(".");
      const genericos = ["beehiiv.com", "substack.com", "gmail.com", "mailchimp.com"];
      return "email:" + (genericos.includes(base) ? (item.fonte_nome ?? base).toLowerCase() : base);
    }
    return "email:" + (item.fonte_nome ?? "—").toLowerCase();
  }
  return item.fonte_id ?? (item.fonte_nome ?? "—");
}

/**
 * Escolhe `max` itens da fila com variedade: round-robin por fonte (tecto
 * maxPorFonte) e pelo menos um terço de itens vindos de emails, quando existem.
 */
export function escolherLoteVariado<T extends ItemLoteFila>(
  itens: T[],
  max: number,
  maxPorFonte = 2,
): ResultadoSeleccao<T> {
  const prioridade = (i: T) => Date.parse(i.publicado_em ?? "") || 0;
  const chaves = { fonte: chaveFonteFila, prioridade };
  const emails = itens.filter((i) => i.origem === "email");
  const outros = itens.filter((i) => i.origem !== "email");
  const quotaEmail = Math.min(emails.length, Math.ceil(max / 3));
  const a = seleccionarDiverso(emails, chaves, { max: quotaEmail, maxPorFonte });
  const usados = new Set<T>(a.seleccionados);
  const b = seleccionarDiverso(
    [...outros, ...emails.filter((e) => !usados.has(e))],
    chaves,
    { max: max - a.seleccionados.length, maxPorFonte },
  );
  const porFonte: Record<string, number> = { ...a.porFonte };
  for (const [k, v] of Object.entries(b.porFonte)) porFonte[k] = (porFonte[k] ?? 0) + v;
  return { seleccionados: [...a.seleccionados, ...b.seleccionados], porFonte };
}
