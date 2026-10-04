import { type LigacaoBrief } from "./brief/publicacao.server.ts";
export type { LigacaoBrief };
export interface RevistaConfigRow {
    preheader: string;
    promocao_activa: boolean;
    promocao_prefixo: string;
    promocao_link_texto: string;
    promocao_url: string;
    cronica_titulo: string;
    cronica_subtitulo: string;
    cronica_lede: string;
    cronica_excerto: string;
    cronica_url: string;
    momento_activo: boolean;
    momento_etiqueta: string;
    momento_valor: string;
    momento_descricao: string;
    pull_quote: string;
    momento_posicao: number;
    pull_quote_posicao: number;
    cronica_lede_posicao: number;
    cronica_imagem_url: string;
    cronica_imagem_alt: string;
    cronica_imagem_credito: string;
    cronica_imagem_credito_url: string;
    cronica_imagem_fonte: string;
    cronica_imagem_posicao: number;
    cronica_imagem_recorte_url: string;
    recomendacao_tipo: string;
    recomendacao_meta: string;
    recomendacao_titulo: string;
    recomendacao_url: string;
    recomendacao_nota: string;
    recomendacao_activa: boolean;
    bloco_ferramentas: boolean;
    podcast_activo: boolean;
    podcast_etiqueta: string;
    podcast_programa: string;
    podcast_tema: string;
    podcast_convidado: string;
    podcast_pergunta: string;
    podcast_url: string;
    podcast_cta: string;
    livro_activo: boolean;
    livro_etiqueta: string;
    livro_titulo: string;
    livro_texto: string;
    livro_cta: string;
    livro_url: string;
    servicos_activo: boolean;
    servicos_cursos_activo: boolean;
    servicos_consultoria_activo: boolean;
    servicos_auditoria_activo: boolean;
    servicos_titulo: string;
    servicos_intro: string;
    servicos_cta: string;
    servicos_url: string;
    servicos_consultoria_texto: string;
    servicos_consultoria_cta: string;
    servicos_consultoria_url: string;
    servicos_cursos_texto: string;
    servicos_cursos_cta: string;
    servicos_cursos_url: string;
}
export declare const REVISTA_CONFIG_VAZIA: RevistaConfigRow;
export interface DestaqueRevista {
    itemId: string;
    noticiaId: string;
    titulo: string;
    url: string;
    categoria: string;
    categoriaRotulo: string;
    resumoFactual: string;
    minhaLeitura: string;
    /** Rótulo do botão desta notícia («Ler o anúncio», «Consultar a documentação»…). */
    ctaRotulo: string;
    /** Data da notícia, para a linha «categoria · data». */
    data: string | null;
    /** Brief público congelado desta peça (Fase 3B). Ausente = comportamento anterior. */
    brief?: LigacaoBrief;
}
export interface RadarRevista {
    itemId: string;
    noticiaId: string;
    titulo: string;
    url: string;
    categoria: string;
    categoriaRotulo: string;
    /** Linha curta de contexto sob o título. */
    nota: string;
    /** Quick Brief público congelado desta peça (Fase 3B). */
    brief?: LigacaoBrief;
}
export interface FerramentaRevista {
    nome: string;
    descricao: string;
    url: string;
    /** Cor editorial escolhida para o cartão. */
    cor?: string;
    /** Etiqueta curta do cartão («Pesquisa», «Publicidade»…). */
    etiqueta: string;
    /** Rótulo do botão do cartão. */
    ctaRotulo: string;
}
export interface PodcastRevista {
    etiqueta: string;
    programa: string;
    tema: string;
    convidado: string;
    pergunta: string;
    url: string;
    cta: string;
}
export interface LivroRevista {
    etiqueta: string;
    titulo: string;
    texto: string;
    cta: string;
    url: string;
}
export interface ServicoRevista {
    rotulo: string;
    texto: string;
    cta: string;
    url: string;
    /** Cartão principal (fundo azul cheio) na grelha 2x2. */
    destaque?: boolean;
    /** «livro» quando o cartão é o livro integrado na grelha. */
    tipo?: "servico" | "livro";
}
export interface ServicosRevista {
    titulo: string;
    intro: string;
    cta: string;
    url: string;
    linhas: ServicoRevista[];
    /** Grelha 2x2 do modelo v4_2 (serviços + livro). */
    cartoes?: ServicoRevista[];
}
/** Notícia aprovada da edição, para a área completa da versão web. */
export interface AtualidadeRevista {
    noticiaId: string;
    titulo: string;
    descricao: string;
    url: string;
    categoria: string;
    categoriaRotulo: string;
    /** "destaque" | "radar" | "so_site" — papel derivado, nunca persistido. */
    papel: "destaque" | "radar" | "so_site";
}
export interface EdicaoRevista {
    edicao: {
        id: string;
        numero: number;
        assunto: string | null;
        data_envio_prevista: string | null;
        wordpress_post_url: string | null;
    };
    preheader: string;
    /** Aviso promocional compacto antes da crónica. Ausente em snapshots antigos. */
    promocao?: {
        prefixo: string;
        linkTexto: string;
        url: string;
    } | null;
    cronica: {
        titulo: string;
        subtitulo: string;
        lede: string;
        excerto: string;
        url: string; /** URL só para pré-visualização (sem endereço da crónica). */
        urlProvisoria?: boolean;
    };
    momento: {
        etiqueta: string;
        valor: string;
        descricao: string;
    } | null;
    pullQuote: string;
    /** Posições das peças móveis dentro da crónica (nº de parágrafos antes). */
    momentoPosicao: number;
    pullQuotePosicao: number;
    /** Posição da lede / tese editorial dentro da crónica. */
    ledePosicao: number;
    /** Imagem opcional da crónica (proporção 3:1). `null` quando não entra. */
    imagem: {
        url: string;
        alt: string;
        credito: string;
        creditoUrl: string;
        fonte: string; /** Faixa recortada a 556×200 (ausente em fotografias antigas). */
        recortada?: boolean;
    } | null;
    imagemPosicao: number;
    destaques: DestaqueRevista[];
    radar: RadarRevista[];
    recomendacao: {
        tipo: string;
        meta: string;
        titulo: string;
        url: string;
        nota: string;
    } | null;
    ferramentas: FerramentaRevista[];
    podcast: PodcastRevista | null;
    livro: LivroRevista | null;
    servicos: ServicosRevista | null;
    /** Todas as notícias aprovadas da edição (email + só site) — usada na versão web. */
    atualidades: AtualidadeRevista[];
    /** Página web da edição (todas as atualidades seleccionadas). */
    urlPagina: string;
    /** Verdadeiro quando a estrutura vem do snapshot imutável de uma edição já fechada. */
    congelada?: boolean;
    /** Problemas de integridade — bloqueiam o envio quando existem. */
    problemas: string[];
}
/** Rótulo curto da categoria para o Radar (sem emoji, sem parêntesis). */
export declare function rotuloCategoria(id: string): string;
export declare function limparTituloRevista(s: string): string;
export declare function normalizarConfigRevista(v: unknown): RevistaConfigRow;
/** Preheader efectivo: o definido no editor ou, em falta, o lede da crónica. */
export declare function preheaderRevista(cfg: RevistaConfigRow): string;
/** Destino do botão «Ler a crónica completa» enquanto não há endereço da crónica. */
export declare const URL_CRONICA_PROVISORIA = "https://fredericocarvalho.pt/";
export declare function validarRevista(e: EdicaoRevista): string[];
export declare const SNAPSHOT_SCHEMA_VERSION = 3;
export declare const RENDERER_VERSION = "revista-v1";
/**
 * Fotografia da edição. Guarda os dados compostos (base de verdade editorial)
 * e também o artefacto efectivamente enviado (HTML e texto), para que futuras
 * alterações ao renderer não mudem reenvios nem auditorias.
 */
export interface SnapshotRevista {
    schema_version: number;
    renderer_version: string;
    /** «preparado» = determinístico mas reversível; «bloqueado» = imutável. */
    estado: "preparado" | "bloqueado";
    edicao: EdicaoRevista;
    email_html: string;
    email_text: string;
    url_web: string;
    /** Caminho canónico estável da edição pública (sem domínio). */
    url_web_path: string;
    preparado_em: string;
    bloqueado_em: string | null;
    /** Full chronicle frozen at send time (source for derived content). Optional for old snapshots. */
    cronica_integral?: {
        titulo: string;
        corpoHtml: string;
        url: string;
    };
}
/**
 * Interpreta o campo gravado. Snapshots antigos (objecto `EdicaoRevista` sem
 * envelope) são tratados como já bloqueados, sem artefacto preservado.
 */
export declare function lerEnvelope(v: unknown): SnapshotRevista | null;
/**
 * Estrutura final da edição Revista.
 *
 * Se já existir snapshot (edição fechada/enviada), é ele que manda: o
 * conteúdo histórico não muda quando as notícias forem editadas depois.
 * Passa `ignorarSnapshot` apenas para pré-visualizar o estado actual do editor.
 */
export declare function composeRevistaEdition(edicaoId: string, opcoes?: {
    ignorarSnapshot?: boolean;
}): Promise<EdicaoRevista>;
/**
 * Prepara a fotografia da edição: guarda os dados compostos e também o
 * artefacto realmente enviado (HTML e texto), com a versão do renderer.
 * Enquanto o estado for «preparado», a edição pode ainda ser libertada.
 */
export declare function prepararSnapshotRevista(edicaoId: string, estrutura: EdicaoRevista, artefacto: {
    emailHtml: string;
    emailText: string;
    urlWeb: string;
}): Promise<SnapshotRevista>;
/** Torna a fotografia definitiva — a partir daqui a edição é imutável. */
export declare function bloquearSnapshotRevista(edicaoId: string): Promise<void>;
/**
 * Descarta uma fotografia ainda não bloqueada (nenhuma lista foi aceite):
 * a edição volta a ser editável e o snapshot será regenerado no envio seguinte.
 */
export declare function descartarSnapshotPreparado(edicaoId: string): Promise<boolean>;
/** Envelope gravado desta edição, ou `null` quando ainda não existe. */
export declare function lerSnapshotRevista(edicaoId: string): Promise<SnapshotRevista | null>;
/** Verdadeiro quando a edição já está historicamente bloqueada. */
export declare function edicaoRevistaBloqueada(edicaoId: string): Promise<boolean>;
export { excertoDaCronica } from "./sequencia-cronica.ts";
