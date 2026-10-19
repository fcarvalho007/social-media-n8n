import { z } from 'zod';
import type { FonteEditorial } from './contratos';
import { urlPublicaEditorial } from './sequencia';

export const schemaDocumentoConhecimento = z.object({
  id: z.string().uuid(), hash: z.string().regex(/^[a-f0-9]{64}$/), titulo: z.string().trim().min(3).max(300),
  origem: z.string().max(2000).nullable(),
  paginas: z.array(z.object({ n: z.number().int().positive().max(10000), texto: z.string().trim().min(1).max(12000) }).strict()).min(1).max(20),
}).strict();
export type DocumentoConhecimento = z.infer<typeof schemaDocumentoConhecimento>;
export function referenciaDoDocumento(bruto: unknown, id: string, em: string): FonteEditorial {
  const d = schemaDocumentoConhecimento.parse(bruto), paginas = [...d.paginas].sort((a, b) => a.n - b.n);
  if (new Set(paginas.map(p => p.n)).size !== paginas.length) throw new Error('Seleciona cada página uma única vez.');
  const excerto = paginas.map(p => `[Página ${p.n}]\n${p.texto}`).join('\n\n');
  if (excerto.length < 200 || excerto.length > 12000) throw new Error('Escolhe páginas com 200 a 12 000 caracteres de texto. Nenhum excerto foi cortado.');
  return { id, titulo: d.titulo, url: d.origem && urlPublicaEditorial(d.origem) ? d.origem : '', excerto, verificadaEm: em, aprovada: true, documento: { id: d.id, hash: d.hash, paginas: paginas.map(p => p.n) } };
}
