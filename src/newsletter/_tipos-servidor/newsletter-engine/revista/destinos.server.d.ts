import { type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
export type EstadoWeb = "preparada" | "publica" | "erro" | "por_preparar";
export type EstadoCronica = "nao_configurada" | "manual" | "pendente" | "rascunho" | "publicada" | "desactualizada" | "erro";
export type EstadoBackup = 
/** faltam mesmo as credenciais WordPress */
"nao_configurado"
/** configurado, mas a edição ainda não tem fotografia preparada */
 | "pronto"
/** edição preparada, backup ainda por escrever */
 | "aguardar" | "guardado" | "erro";
export type EstadoEmail = "nao_enviado" | "agendado" | "parcial" | "enviado" | "erro";
export interface DestinoEstado {
    estado: string;
    url: string | null;
    /** ID no sistema externo — base da idempotência (nunca substituído pelo número). */
    external_id: string | number | null;
    erro: string | null;
    tentado_em: string | null;
    publicado_em?: string | null;
    /** Última actualização confirmada do artigo externo. */
    actualizado_em?: string | null;
    /** Impressão digital do conteúdo escrito na última sincronização. */
    hash_publicado?: string | null;
    /** Resumo do último SEO escrito (nunca credenciais). */
    seo?: string | null;
    /** Metadados do artigo externo — só informativos, nunca credenciais. */
    titulo?: string | null;
    slug?: string | null;
    categoria?: string | null;
}
export interface DestinosEdicao {
    email: {
        estado: EstadoEmail;
        url: null;
        external_id: null;
        erro: string | null;
        tentado_em: string | null;
    };
    web: DestinoEstado & {
        estado: EstadoWeb;
    };
    cronica: DestinoEstado & {
        estado: EstadoCronica;
    };
    backup: DestinoEstado & {
        estado: EstadoBackup;
    };
}
export declare const BASE_URL_PADRAO = "https://edicoes.digitalsprint.pt";
/** Caminho estável e permanente da edição pública. Nunca inclui domínio. */
export declare function caminhoCanonicoEdicao(numero: number): string;
/** Base configurável das edições públicas (`configuracoes.edicoes_base_url`). */
export declare function baseUrlEdicoes(sb?: SupabaseClient): Promise<string>;
/** URL absoluta canónica — só resolvida onde é mesmo precisa (email, OG). */
export declare function urlCanonicaEdicao(numero: number, sb?: SupabaseClient): Promise<string>;
/**
 * Impressão digital do conteúdo editorial actual da crónica.
 *
 * Construída exactamente com o mesmo payload que a publicação escreve, para
 * que a comparação seja de conteúdo e não de formato.
 */
export declare function impressaoCronicaActual(edicaoId: string, sb?: SupabaseClient): Promise<string | null>;
/** Estado consolidado dos quatro destinos de uma edição Revista. */
export declare function estadoDestinos(edicaoId: string): Promise<DestinosEdicao>;
/** Grava o estado de um destino sem tocar nos restantes. */
export declare function gravarDestino(edicaoId: string, chave: "web" | "cronica" | "backup", patch: Partial<DestinoEstado>, sb?: SupabaseClient): Promise<void>;
/**
 * URL manual do artigo da crónica em FredericoCarvalho.pt.
 * Não existe segunda URL: escreve no `revista_edicao.cronica_url` já usado
 * pelo composer, pela página pública e pelo verificador de links.
 */
export declare function guardarUrlCronica(opts: {
    edicaoId: string;
    url: string;
    quem?: string | null;
}): Promise<{
    ok: true;
    url: string;
}>;
/**
 * Cópia de segurança em DigitalSprint.pt. Nunca lança: uma falha aqui não
 * pode impedir os subscritores de receberem uma edição pronta.
 * Idempotente — actualiza a mesma Lição quando já existe `wordpress_post_id`.
 */
export declare function criarBackup(opts: {
    edicaoId: string;
    quem?: string | null;
}): Promise<{
    ok: boolean;
    url: string | null;
    mensagem: string;
}>;
/** Retry individual. Nunca reenvia email nem recria o snapshot bloqueado. */
export declare function repetirDestino(opts: {
    edicaoId: string;
    destino: "backup";
    quem?: string | null;
}): Promise<{
    ok: boolean;
    mensagem: string;
}>;
