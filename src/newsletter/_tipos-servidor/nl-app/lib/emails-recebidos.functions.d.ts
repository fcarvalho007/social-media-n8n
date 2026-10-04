export type MotivoSemResultado = "fonte_inactiva" | "sem_html" | "sem_blocos" | "tudo_duplicado" | "ia_sem_resultado" | null;
export type ClassificacaoDetalhe = {
    destaques?: number;
    breves?: number;
    ferramentas?: number;
    links?: number;
    patrocinios_ignorados?: number;
    tutoriais_ignorados?: number;
    blocos_total?: number;
    budget_ia?: number;
    chamadas_ia?: number;
    duplicados?: number;
    bloqueadas_repeticao?: number;
    descartados?: Array<{
        titulo: string;
        motivo: string;
    }>;
    motivo_sem_resultado?: MotivoSemResultado;
    fonte_id?: string | null;
    fonte_nome?: string | null;
    processado_em?: string;
};
export type EmailRecebido = {
    id: string;
    remetente: string | null;
    remetente_nome: string | null;
    assunto: string | null;
    classificacao: "confirmacao" | "newsletter" | "outro" | null;
    notas_processadas: number;
    recebido_em: string;
    corpo_html: string | null;
    corpo_texto: string | null;
    classificacao_detalhe: ClassificacaoDetalhe | null;
    processamento_estado?: "por_processar" | "a_processar" | "processado" | "falhou" | null;
    processamento_erro?: string | null;
    processamento_tentativas?: number | null;
    processado_em?: string | null;
};
export type Janela = "24h" | "7d" | "14d" | "tudo";
export type FiltroClasse = "todas" | "newsletter" | "confirmacao" | "outro";
export type ListaEmailsRecebidos = {
    emails: EmailRecebido[];
    total: number;
    contagens: {
        newsletter: number;
        confirmacao: number;
        outro: number;
        total: number;
    };
};
export type FiltrosListagem = {
    janela?: Janela;
    fonte?: string | null;
    classe?: FiltroClasse;
    q?: string | null;
};
export declare const listarEmailsRecebidos: import("../_shim/start.ts").NlServerFn<FiltrosListagem | undefined, ListaEmailsRecebidos>;
export type FonteEmail = {
    chave: string;
    nome: string | null;
    email: string | null;
    total: number;
    ultimo: string;
};
export declare const listarFontesEmail: import("../_shim/start.ts").NlServerFn<void, FonteEmail[]>;
export declare const apagarEmailRecebido: import("../_shim/start.ts").NlServerFn<{
    id: string;
}, {
    ok: true;
}>;
export type NoticiaDoEmail = {
    id: string;
    titulo: string;
    descricao: string | null;
    url: string | null;
    categoria: string | null;
    estado: "pendente" | "aprovada" | "rejeitada" | "enviada" | null;
    destaque: boolean | null;
    edicao_id: string | null;
    edicao_numero: number | null;
    created_at: string;
};
type JsonValue = string | number | boolean | null | JsonValue[] | {
    [k: string]: JsonValue;
};
export type MotivoIgnorado = {
    accao: string;
    detalhe: JsonValue | null;
    criado_em: string;
};
export type FonteDoEmail = {
    id: string;
    nome: string;
    activa: boolean;
} | null;
export type NoticiasDoEmail = {
    noticias: NoticiaDoEmail[];
    motivo_ignorado: MotivoIgnorado | null;
    motivo_sem_resultado: MotivoSemResultado;
    fonte: FonteDoEmail;
};
export declare const listarNoticiasDoEmail: import("../_shim/start.ts").NlServerFn<{
    emailId: string;
}, NoticiasDoEmail>;
export type ResultadoReprocessar = {
    ok: true;
    noticias_inseridas: number;
    ferramentas_inseridas: number;
    formato: string;
    usou_fallback: boolean;
    motivo_sem_resultado: MotivoSemResultado;
};
export declare const reprocessarEmail: import("../_shim/start.ts").NlServerFn<{
    id: string;
    forcar?: boolean;
}, ResultadoReprocessar>;
/** Activa a fonte do email e volta a correr o pipeline num só passo. */
export declare const activarFonteEReprocessar: import("../_shim/start.ts").NlServerFn<{
    emailId: string;
    fonteId: string;
}, ResultadoReprocessar>;
export {};
