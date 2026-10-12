type SupabaseAdmin = {
    from: (t: string) => {
        select: (c: string) => any;
        insert: (v: unknown) => any;
        update: (v: unknown) => any;
        delete: () => any;
    };
};
type ChamarIaExtrator = (bloco: string, urlManual: string | undefined, corpoArtigo?: string) => Promise<{
    resultado: any | null;
}>;
export type MetaEmail = {
    html: string | null;
    plain: string | null;
    assunto: string;
    remetenteLabel: string;
    remetenteEmail: string | null;
    emailRecebidoId: string | null;
};
export type Formato = "curadoria" | "ensaio" | "misto" | "estruturado";
export type MotivoSemResultado = "fonte_inactiva" | "sem_html" | "sem_blocos" | "tudo_duplicado" | "ia_sem_resultado" | null;
export type ClassificacaoDetalhe = {
    destaques: number;
    breves: number;
    ferramentas: number;
    links: number;
    patrocinios_ignorados: number;
    tutoriais_ignorados: number;
    blocos_total: number;
    budget_ia: number;
    chamadas_ia: number;
    duplicados: number;
    /** Entradas bloqueadas por título praticamente igual a notícia já existente. */
    bloqueadas_repeticao?: number;
    /** Entradas válidas que ficaram de fora por causa do tecto por email/dia. */
    cortadas_por_tecto?: number;
    tecto_email?: number;
    vagas_dia?: number;
    duplicados_detalhe: Array<{
        titulo: string;
        url: string;
        gemea: string;
    }>;
    descartados: Array<{
        titulo: string;
        motivo: string;
    }>;
    truncado_por_tempo?: boolean;
    motivo_sem_resultado: MotivoSemResultado;
    fonte_id: string | null;
    fonte_nome: string | null;
    processado_em: string;
};
export type ResultadoPipeline = {
    formato: Formato;
    candidatos: number;
    noticias_inseridas: number;
    ferramentas_inseridas: number;
    duplicadas: number;
    erros: number;
    usou_fallback: boolean;
    url_canonico: string | null;
    motivo_sem_resultado: MotivoSemResultado;
    detalhe: ClassificacaoDetalhe;
};
export type OpcoesPipeline = {
    /** Ignora `fontes_curadoria.activa` — usado pelo reprocessamento manual de admin. */
    forcar?: boolean;
};
/** Acima deste valor de similaridade de título tratamos como possível repetição. */
export declare const LIMIAR_TITULO_PARECIDO = 0.55;
/** Deriva um nome apresentável para a fonte a partir do label e do endereço. */
export declare function derivarNomeFonte(remetenteLabel: string | null, emailLower: string): string;
export declare function processarEmailComPipeline(supabaseAdmin: SupabaseAdmin, meta: MetaEmail, deps: {
    chamarIaExtrator: ChamarIaExtrator;
    chamarDeepSeek: (sistema: string, user: string) => Promise<string | null>;
    /**
     * Opcional: lê o texto do artigo original para a IA ter material próprio.
     * Nunca lança — devolve "" quando não é possível.
     */
    lerCorpoArtigo?: (url: string) => Promise<string>;
    /**
     * Opcional: reescreve a descrição quando esta se limita a repetir o
     * título. Recebe o material do email como contexto factual.
     */
    corrigirDescricao?: (args: {
        titulo: string;
        descricao: string;
        corpo?: string;
    }) => Promise<string>;
}, opcoes?: OpcoesPipeline): Promise<ResultadoPipeline>;
export {};
