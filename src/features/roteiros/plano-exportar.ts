import {segundos,type VarianteRoteiro} from '../../../supabase/functions/_shared/roteiros/modelo';
import type { MaterialRoteiro } from '@/services/roteiros-materiais';
export function textoPlano(v: VarianteRoteiro, ppm: number) {
 let palavrasAntes='';
 const cenas=v.cenas.map((c,i)=>{const inicio=segundos(palavrasAntes,ppm);palavrasAntes+=` ${c.locucao}`;return `${i+1}. ${c.etapa} · ~${inicio}–${segundos(palavrasAntes,ppm)} s\nDIZER: ${c.locucao}\nMOSTRAR / EDITAR: ${c.visual||'Sem indicação visual.'}\nMATERIAL: ${c.apoio?.tipo==='apresentador'?'Apresentador em câmara':c.apoio?.nome||'Imagem ainda por escolher'}\nPESQUISA: ${c.palavras.join(', ')}`;});
 return `${v.titulo}\nPLANO DE GRAVAÇÃO · tempos estimados, confirmar após gravar\n\n${cenas.join('\n\n')}\n\n${v.notas}`;
}
export async function pdfPlano(v: VarianteRoteiro, ppm:number, assets:Record<string,MaterialRoteiro>={}, guardar=true):Promise<Blob> {
 const {default:jsPDF}=await import('jspdf');const pdf=new jsPDF();
 let y=20;
 pdf.setFont('helvetica');pdf.setFontSize(11);
 const escrever=(t:string)=>{for(const p of t.split('\n'))for(const linha of pdf.splitTextToSize(p,170) as string[]){if(y>277){pdf.addPage();y=20;}pdf.text(linha,20,y);y+=6;}};
 escrever(`${v.titulo}\nPLANO DE GRAVAÇÃO · tempos estimados\nConfirmar após gravar.\n`);
 let antes='';
 for(const [i,c] of v.cenas.entries()) {
  if(y>215){pdf.addPage();y=20;}
  escrever(`${i+1}. ${c.etapa} · ~${segundos(antes,ppm)}–${segundos(antes+' '+c.locucao,ppm)} s`);antes+=' '+c.locucao;
  const a=c.apoio?.asset_id?assets[c.apoio.asset_id]:null;
  if(a){const escala=Math.min(170/a.largura,85/a.altura);const w=a.largura*escala,h=a.altura*escala;if(y+h>270){pdf.addPage();y=20;}pdf.addImage(`data:${a.mime};base64,${a.dados}`,a.mime==='image/png'?'PNG':'JPEG',20,y,w,h);y+=h+6;if(a.credito)escrever(`Crédito: ${a.credito}`);}
  escrever(`DIZER: ${c.locucao}\nMOSTRAR / EDITAR: ${c.visual||'Sem indicação visual.'}\nMATERIAL: ${c.apoio?.tipo==='apresentador'?'Apresentador em câmara':c.apoio?.nome||'Ainda por escolher'}\n`);
 }
 escrever(`NOTAS\n${v.notas}`);
 if(guardar)pdf.save('plano-gravacao.pdf');
 return pdf.output('blob');
}
