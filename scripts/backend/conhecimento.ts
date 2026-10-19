import type { ContextoBackend } from './seguranca';
import type { DocumentoConhecimento } from '../../src/features/seo/documentoConhecimento';
import { referenciaDoDocumento } from '../../src/features/seo/documentoConhecimento';
import { schemaDocumentoReferencia } from '../../src/features/seo/sequencia';
import type { FonteEditorial } from '../../src/features/seo/contratos';

/** The browser supplies only a reference; the text is always re-read with project RLS. */
export async function documentoConhecimentoNuvem(ctx: ContextoBackend, bruto: unknown): Promise<DocumentoConhecimento> {
  const ref = schemaDocumentoReferencia.parse(bruto);
  const r = await ctx.user.from('hub_documentos').select('dados,hash').eq('project_id', ctx.projeto).eq('id', ref.id).maybeSingle();
  if (r.error || !r.data) throw new Error('O documento não está disponível neste projeto.');
  const d = r.data.dados as { titulo: string; origem: string | null; pdf: { hash: string; paginas: { n: number; texto: string; estado: string }[] } };
  if (d.pdf.hash !== ref.hash || r.data.hash !== ref.hash) throw new Error('O documento mudou. Reabre o PDF antes de reutilizar o texto.');
  const paginas = d.pdf.paginas.filter(p => ref.paginas.includes(p.n) && p.estado === 'texto' && p.texto.trim());
  if (paginas.length !== new Set(ref.paginas).size) throw new Error('Há páginas sem texto disponível. Revê a seleção no leitor.');
  return { id: ref.id, hash: ref.hash, titulo: d.titulo, origem: d.origem, paginas: paginas.map(({ n, texto }) => ({ n, texto })) };
}
export async function conferirReferenciasDocumento(ctx: ContextoBackend, referencias: FonteEditorial[]) {
  for (const f of referencias) if (f.documento) {
    const d = await documentoConhecimentoNuvem(ctx, f.documento), original = referenciaDoDocumento(d, f.id, f.verificadaEm);
    if (original.excerto !== f.excerto || original.url !== f.url || original.titulo !== f.titulo) throw new Error('Uma referência de PDF não coincide com o acervo. Reimporta as páginas; para texto próprio, cria uma referência separada.');
  }
}
