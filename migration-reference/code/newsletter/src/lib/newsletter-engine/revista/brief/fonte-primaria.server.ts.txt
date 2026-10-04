// Procura da fonte primária de um Brief. Server-only.
//
// Etapa explícita: quando a notícia fala de um anúncio de uma empresa,
// tentamos chegar ao comunicado oficial. A IA sugere candidatos, mas o
// endereço só é aceite depois de resolvido. A fonte jornalística nunca é
// substituída — a primária acrescenta-se.

import type { SupabaseClient } from "@supabase/supabase-js";

import { chamarIaBrief } from "./adaptador-ia.server";
import { ligacoesExternas, validarCandidato, publisherDeUrl } from "./fontes.server";

const SISTEMA = `És um investigador de fontes. Recebes o título e os factos de uma notícia e uma lista de endereços citados pelo artigo.

Devolve APENAS JSON válido:
{"candidatos":["https://..."],"reportagem_propria":false,"entidade":""}

- candidatos: até 3 endereços que possam ser a fonte PRIMÁRIA oficial (sala de imprensa, blogue oficial, documentação, comunicado) da entidade que fez o anúncio. Prefere endereços da lista fornecida. Só inclui endereços plausíveis e completos; nunca inventes caminhos improváveis.
- reportagem_propria: true quando a notícia é investigação, reportagem ou exclusivo do órgão jornalístico e não a cobertura de um anúncio público.
- entidade: nome da empresa ou organização anunciante, ou "" quando não houver.`;

export interface ResultadoFontePrimaria {
  url: string | null;
  publisher: string | null;
  reportagemPropria: boolean;
  adicionais: Array<{ titulo: string; url: string }>;
  motivo?: string;
}

/** Sinal grosseiro de endereço oficial: sala de imprensa, blogue, comunicado. */
function pareceOficial(url: string): boolean {
  return /(newsroom|press|blog|about|investor|developers?|docs?|announce|comunicad)/i.test(url);
}

export async function identificarFontePrimaria(args: {
  sb: SupabaseClient;
  briefId?: string | null;
  titulo: string;
  factos: string[];
  urlFonte: string | null;
  htmlLigacoes?: string;
}): Promise<ResultadoFontePrimaria> {
  const vazio: ResultadoFontePrimaria = {
    url: null,
    publisher: null,
    reportagemPropria: false,
    adicionais: [],
  };

  const citados = args.htmlLigacoes ? ligacoesExternas(args.htmlLigacoes, args.urlFonte ?? "") : [];

  let sugeridos: string[] = [];
  let reportagemPropria = false;
  try {
    const r = await chamarIaBrief<{ candidatos?: unknown; reportagem_propria?: unknown }>({
      papel: "extraccao",
      operacao: "fonte_primaria",
      briefId: args.briefId,
      sb: args.sb,
      system: SISTEMA,
      user: [
        `Título: ${args.titulo}`,
        args.factos.length ? `Factos:\n- ${args.factos.slice(0, 12).join("\n- ")}` : "",
        args.urlFonte ? `Fonte jornalística: ${args.urlFonte}` : "",
        citados.length ? `Endereços citados pelo artigo:\n${citados.slice(0, 30).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    if (Array.isArray(r.dados?.candidatos)) {
      sugeridos = (r.dados.candidatos as unknown[])
        .filter((c): c is string => typeof c === "string")
        .slice(0, 3);
    }
    reportagemPropria = r.dados?.reportagem_propria === true;
  } catch (e) {
    return { ...vazio, motivo: (e as Error).message };
  }

  // A ordem importa: primeiro o que a IA sugeriu, depois os endereços
  // oficiais que o próprio artigo já citava.
  const candidatos = [...new Set([...sugeridos, ...citados.filter(pareceOficial)])].slice(0, 6);

  for (const c of candidatos) {
    const material = await validarCandidato(c);
    if (material?.ok) {
      return {
        url: material.urlFinal ?? c,
        publisher: material.publisher ?? publisherDeUrl(c),
        reportagemPropria,
        adicionais: candidatos
          .filter((o) => o !== c)
          .slice(0, 2)
          .map((url) => ({ titulo: publisherDeUrl(url) ?? url, url })),
      };
    }
  }

  return {
    ...vazio,
    reportagemPropria,
    motivo: candidatos.length ? "Nenhum candidato a fonte primária foi confirmado." : undefined,
  };
}
