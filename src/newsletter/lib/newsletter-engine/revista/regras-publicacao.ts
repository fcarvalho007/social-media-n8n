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
