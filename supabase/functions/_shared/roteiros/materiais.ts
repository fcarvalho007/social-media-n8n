import type { VarianteRoteiro } from './modelo.ts';
/** Approval follows content, order, images and editing notes, never just a version number. */
export async function assinaturaMateriais(v: VarianteRoteiro, ppm: number): Promise<string> {
  // JSONB reorders object keys. Build an explicit canonical shape before hashing.
  const texto = JSON.stringify({titulo:v.titulo,notas:v.notas,ppm,cenas:v.cenas.map(c=>({id:c.id,etapa:c.etapa,locucao:c.locucao,visual:c.visual,palavras:c.palavras,apoio:c.apoio?{tipo:c.apoio.tipo,asset_id:c.apoio.asset_id??null,nome:c.apoio.nome??null}:null}))});
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(texto)));
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export function pendenciasMateriais(v: VarianteRoteiro): string[] {
  return v.cenas.flatMap((c,i)=>[
    ...(!c.locucao.trim() ? [`Passagem ${i+1}: falta a fala.`] : []),
    ...(!c.visual.trim() ? [`Passagem ${i+1}: falta a instrução de edição.`] : []),
    ...(!c.apoio ? [`Passagem ${i+1}: escolhe uma imagem ou o apresentador.`] : []),
  ]);
}
export const idsMateriais = (v: VarianteRoteiro) => [...new Set(v.cenas.flatMap(c=>c.apoio?.tipo==='imagem'&&c.apoio.asset_id?[c.apoio.asset_id]:[]))];
