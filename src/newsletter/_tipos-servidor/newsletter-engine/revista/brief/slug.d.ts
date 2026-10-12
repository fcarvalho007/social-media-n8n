/** Deriva o endereço a partir do título editorial. */
export declare function derivarSlug(titulo: string): string;
/**
 * Garante unicidade contra os endereços já existentes. O sufixo numérico só
 * existe para títulos genuinamente diferentes com o mesmo texto — nunca para
 * a mesma fonte a reentrar.
 */
export declare function slugUnico(titulo: string, existentes: Iterable<string>): string;
/** Caminho interno do Brief. Nunca inclui domínio. */
export declare function caminhoBrief(slug: string): string;
