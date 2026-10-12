export interface DadosArtigoCronica {
    /** Edição em curso — âncora de toda a verificação de proveniência. */
    edicaoId: string;
    /** `cronicas.id` da linha lida; `null` quando a edição ainda não tem crónica. */
    cronicaId: string | null;
    /** `cronicas.edicao_id` lido; tem de coincidir com `edicaoId`. */
    cronicaEdicaoId: string | null;
    /** `revista_edicao.edicao_id` lido; tem de coincidir com `edicaoId`. */
    configEdicaoId: string | null;
    numeroEdicao: number;
    /** Título editorial principal (`revista_edicao.cronica_titulo`). */
    titulo: string;
    /** Segunda linha — por defeito NÃO entra no título do artigo. */
    subtitulo: string;
    /** Lede/tese editorial — candidata natural a excerpt. */
    lede: string;
    /** Corpo integral do editor rico (`cronicas.conteudo_html` ou `conteudo`). */
    corpoHtml: string;
    /** URL canónica absoluta da edição pública (`/edicoes/:numero`). */
    urlEdicao: string;
}
export interface ArtigoCronica {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    /** Corpo em texto simples, sem a referência à edição — base da validação. */
    corpoTexto: string;
    /** Canónica candidata — só usada se o WordPress real permitir escrevê-la. */
    canonical: string;
    categoria: string | null;
    tags: string[];
    status: "draft" | "publish";
    /** Suporte futuro; nunca preenchido nesta fase. */
    featured_media_id?: number | null;
    /** Proveniência: edição e crónica que originaram exactamente este payload. */
    edicaoId: string;
    cronicaId: string | null;
    numeroEdicao: number;
    /** Falso quando o corpo editorial não cumpre o mínimo publicável. */
    publicavel: boolean;
}
/**
 * Título final do artigo. Fonte única de verdade.
 * Por decisão editorial explícita, a segunda linha não é concatenada; o
 * parâmetro existe para tornar a alternativa visível, não para a activar.
 */
export declare function tituloArtigoCronica(d: Pick<DadosArtigoCronica, "titulo" | "subtitulo">, opts?: {
    incluirSegundaLinha?: boolean;
}): string;
/** Slug estável, sem acentos. Só é enviado na criação do artigo. */
export declare function slugArtigo(titulo: string): string;
/**
 * Allowlist estrita: preserva a estrutura do editor rico (parágrafos,
 * headings, listas, links, ênfase) e elimina tudo o que possa partir o
 * WordPress ou introduzir execução de código.
 */
export declare function sanitizarHtmlArtigo(html: string): string;
/** Texto simples a partir de HTML — determinístico, sem IA. */
export declare function textoDeHtml(html: string): string;
/**
 * Uma lede só serve de excerpt se for mesmo uma lede: notas curtas de trabalho
 * («dada», «bla bla») nunca chegam ao site.
 */
export declare function ledeValida(lede: string): boolean;
/** Excerpt: a lede quando é válida; caso contrário, o arranque do corpo. */
export declare function excerptArtigo(lede: string, corpoHtml: string): string;
/** Referência editorial discreta à edição de origem. Nunca um bloco promocional. */
export declare function referenciaEdicao(numero: number, url: string): string;
export declare const MINIMO_CORPO = 200;
/**
 * O corpo é medido antes de existir rodapé.
 *
 * Elimina marcação vazia (`<p></p>`, `<br>`, `&nbsp;`) e qualquer ocorrência da
 * frase automática. Sem isto, uma crónica vazia parecia conteúdo e podia
 * esvaziar um artigo já publicado.
 */
export declare function corpoEditorialUtil(html: string): string;
/** Verdadeiro apenas com corpo editorial real e suficiente para publicar. */
export declare function corpoEditorialValido(html: string): boolean;
/**
 * Payload final do artigo — a mesma função alimenta preview e publicação.
 *
 * Lança quando os dados vêm de edições diferentes: mais vale falhar visível do
 * que escrever um artigo cruzado.
 */
export declare function construirPayloadArtigo(d: DadosArtigoCronica, opts: {
    status: "draft" | "publish";
    categoria?: string | null;
    tags?: string[];
    /** Edição a que a escrita se destina; tem de ser a mesma dos dados. */
    destinoEdicaoId?: string;
}): ArtigoCronica;
/**
 * Validação mínima para permitir escrita automática.
 *
 * O corpo é medido sem a referência à edição: sem isto, uma crónica vazia
 * continuaria a parecer conteúdo e poderia esvaziar um artigo já publicado.
 */
export declare function validarArtigo(a: ArtigoCronica): string[];
/**
 * Impressão digital do conteúdo editorial já publicado.
 *
 * Serve uma única pergunta: o artigo externo contém a versão mais recente?
 * Cobre título, excerpt e corpo — o que a acção «Actualizar artigo» escreve.
 * Determinística e sem rede.
 */
export declare function impressaoArtigo(a: Pick<ArtigoCronica, "title" | "excerpt" | "content"> & {
    categoria?: string | null;
}): Promise<string>;
/** Meta description: o excerpt determinístico, cortado limpo. Sem IA. */
export declare function metaDescriptionArtigo(excerpt: string): string;
export type CampoArtigo = "titulo" | "excerpt" | "corpo" | "categoria";
export interface DiferencaArtigo {
    campo: CampoArtigo;
    local: string;
    remoto: string;
}
/**
 * Normaliza para comparação editorial: tira marcação, entidades, aspas
 * tipográficas, espaços redundantes e maiúsculas. O objectivo é responder a
 * «o texto é o mesmo?», não «os bytes são os mesmos?».
 */
export declare function normalizarParaComparacao(valor: string): string;
/**
 * Compara o payload canónico com o artigo lido no WordPress.
 *
 * Fora da comparação, por decisão explícita: slug (imutável após publicação),
 * timestamps e qualquer formatação que o WordPress reescreva.
 */
export declare function compararArtigoRemoto(local: Pick<ArtigoCronica, "title" | "excerpt" | "content">, remoto: {
    titulo: string;
    excerpt: string;
    conteudo: string;
    categorias?: number[];
}, opts?: {
    categoriaId?: number | null;
}): DiferencaArtigo[];
