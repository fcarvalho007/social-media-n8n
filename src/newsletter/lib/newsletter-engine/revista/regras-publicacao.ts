// Regras de publicação da Revista — módulo puro, testável e partilhado.
//
// Duas decisões, deliberadamente separadas:
//   pública  → a página web já é servida a um leitor anónimo;
//   enviada  → o email já saiu, e só aí faz sentido indexar.
//
// A publicação web acontece antes do envio para que os endereços possam ser
// confirmados sem indexar uma edição ainda por lançar.

export interface SinaisEdicao {
  /** `edicoes.estado` */
  estado: string;
  /** Estado do envelope do snapshot: `preparado`, `bloqueado` ou ausente. */
  snapshotEstado: string | null;
  /** Existe snapshot gravado. */
  temSnapshot: boolean;
  /** `destinos.web.estado` */
  destinoWeb: string;
}

export interface EstadoPublicacao {
  publica: boolean;
  enviada: boolean;
}

export function avaliarPublicacao(s: SinaisEdicao): EstadoPublicacao {
  if (!s.temSnapshot) return { publica: false, enviada: false };
  // Envelopes antigos não têm `estado` e valem como bloqueados.
  const bloqueado = !s.snapshotEstado || s.snapshotEstado === "bloqueado";
  const enviada = s.estado === "enviada" && bloqueado;
  // Compatibilidade: edições anteriores a esta fase não têm o destino escrito.
  const publica = s.destinoWeb === "publica" || enviada;
  return { publica, enviada };
}

/** Um Brief só indexa se for Destaque, marcado indexável e de edição enviada. */
export function briefIndexavel(args: {
  tipo: "destaque" | "radar";
  indexavel: boolean;
  enviada: boolean;
  preview?: boolean;
}): boolean {
  if (args.preview) return false;
  return args.tipo === "destaque" && args.indexavel && args.enviada;
}

/** Public reading requires explicit publication; approval alone remains private. */
export function briefPublicavel(args: {
  estado: string;
  tipo: string;
  resumo: number;
  implicacoes: number;
  leitura: string;
  fonte: string;
}): boolean {
  return args.estado === "publicado" && args.resumo > 0 && args.implicacoes > 0 &&
    Boolean(args.fonte.trim()) && (args.tipo !== "destaque" || Boolean(args.leitura.trim()));
}

/** Envio de teste registado em `egoi_campanhas` (lista do tipo «teste»). */
export interface EnvioTeste {
  /** «aceite» = E-goi recebeu o disparo; «enviada» = E-goi confirmou a entrega. */
  estado: "aceite" | "enviada";
  lista: string;
  em: string | null;
}

/** Escolhe o envio de teste mais recente, aceite ou confirmado. Pura, sem rede. */
export function envioTesteMaisRecente(
  camps: Array<{ estado: string; aceite_em: string | null; confirmado_em: string | null; tipo: string | null; lista: string | null }>,
): EnvioTeste | null {
  const validas = camps
    .filter((c) => c.tipo === "teste" && (c.estado === "aceite" || c.estado === "enviada"))
    .map((c) => ({
      estado: c.estado as "aceite" | "enviada",
      lista: c.lista ?? "lista de teste",
      em: (c.estado === "enviada" ? c.confirmado_em : null) ?? c.aceite_em,
    }))
    .sort((a, b) => (b.em ?? "").localeCompare(a.em ?? ""));
  return validas[0] ?? null;
}

/** Test-public editions expose only Brief links explicitly frozen in their web publication. */
export function briefAutorizadoNaWeb(args: { enviada: boolean; noticiaId: string | null; slug: string; destaques: Array<{ noticiaId: string; brief?: { slug: string } }> }): boolean {
 return args.enviada || args.destaques.slice(0, 3).some(d => d.noticiaId === args.noticiaId && d.brief?.slug === args.slug);
}
