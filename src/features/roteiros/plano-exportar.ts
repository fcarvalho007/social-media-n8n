import {segundos,type VarianteRoteiro} from '../../../supabase/functions/_shared/roteiros/modelo';
export function textoPlano(v: VarianteRoteiro, ppm: number) {
 let palavrasAntes='';
 const cenas=v.cenas.map((c,i)=>{const inicio=segundos(palavrasAntes,ppm);palavrasAntes+=` ${c.locucao}`;return `${i+1}. ${c.etapa} · ~${inicio}–${segundos(palavrasAntes,ppm)} s\nDIZER: ${c.locucao}\nMOSTRAR: ${c.visual||'Sem indicação visual.'}\nPESQUISA: ${c.palavras.join(', ')}`;});
 return `${v.titulo}\nPLANO DE GRAVAÇÃO · tempos estimados, confirmar após gravar\n\n${cenas.join('\n\n')}\n\n${v.notas}`;
}
export async function pdfPlano(v: VarianteRoteiro, ppm:number) {
 const {default:jsPDF}=await import('jspdf');const pdf=new jsPDF();
 const paginas=textoPlano(v,ppm).split('\n');let y=20;
 pdf.setFont('helvetica');pdf.setFontSize(11);
 for(const p of paginas){for(const linha of pdf.splitTextToSize(p,170) as string[]){if(y>277){pdf.addPage();y=20;}pdf.text(linha,20,y);y+=6;}}
 pdf.save('plano-gravacao.pdf');
}
