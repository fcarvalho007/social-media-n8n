export type PdfGenerationMode = 'server' | 'client' | 'both';

// 'both': permite exportação local (cliente) E geração no servidor para publicação
// 'client': apenas exportação local
// 'server': apenas geração no servidor (desabilita exportação local)
export const PDF_GENERATION_MODE: PdfGenerationMode = 'both';
