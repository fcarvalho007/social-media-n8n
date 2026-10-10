// Universo único de notícias do formato Revista.
//
// REGRA: «notícias aprovadas da edição» significa exclusivamente as notícias
// associadas à edição corrente. Nunca todas as notícias globalmente aprovadas.
//
// Esta mesma consulta alimenta, sem excepção: selector de Destaques, selector
// do Radar, cálculo de «Só site», contadores do editor e a listagem completa
// de Atualidades na versão web.

export const COLUNAS_NOTICIA_EDICAO = "id, titulo, descricao, url, url_curto, categoria, ordem, destino";

/** Estados que contam como «aprovada da edição» (inclui já enviada). */
export const ESTADOS_NOTICIA_EDICAO = ["aprovada", "enviada"] as const;

export interface NoticiaDaEdicao {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string | null;
  url_curto: string | null;
  categoria: string;
  ordem: number;
  destino: string | null;
}

/** Cliente mínimo aceite (browser ou service role). */
interface ClienteMinimo {
  from: (t: string) => {
    select: (c: string) => {
      eq: (c: string, v: string) => {
        in: (c: string, v: readonly string[]) => {
          order: (c: string, o: { ascending: boolean }) => PromiseLike<{ data: unknown; error: unknown }>;
        };
      };
    };
  };
}

/** Fonte única de verdade do universo de notícias de uma edição Revista. */
export async function carregarNoticiasDaEdicao(
  sb: ClienteMinimo,
  edicaoId: string,
): Promise<NoticiaDaEdicao[]> {
  const { data, error } = await sb
    .from("nl_noticias")
    .select(COLUNAS_NOTICIA_EDICAO)
    .eq("edicao_id", edicaoId)
    .in("estado", ESTADOS_NOTICIA_EDICAO)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NoticiaDaEdicao[];
}
