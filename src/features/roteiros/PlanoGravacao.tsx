import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Copy, Download, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { segundos, type VarianteRoteiro } from '../../../supabase/functions/_shared/roteiros/modelo';
import { transferirTexto } from './transferir';
import {textoPlano,pdfPlano} from './plano-exportar';
/** A timing rehearsal, never an MP4 export or measured audio alignment. */
export function PlanoGravacao({variante,ppm,erro}: {variante:VarianteRoteiro;ppm:number;erro:(s:string)=>void}) {
 const [indice,setIndice]=useState(0);const [play,setPlay]=useState(false);
 const [exportando,setExportando]=useState(false);
 const atual=Math.min(indice,variante.cenas.length-1);
 const cena=variante.cenas[atual];
 const temLocucao=variante.cenas.some(c=>c.locucao.trim());
 useEffect(()=>{setIndice(i=>Math.min(i,variante.cenas.length-1));},[variante.cenas.length]);
 useEffect(()=>{setIndice(0);setPlay(false);},[variante.id]);
 useEffect(()=>{if(!play)return;const t=setTimeout(()=>{if(atual>=variante.cenas.length-1)setPlay(false);else setIndice(i=>i+1);},Math.max(2,segundos(cena.locucao,ppm))*1000);return()=>clearTimeout(t);},[play,atual,cena.locucao,ppm,variante.cenas.length]);
 return <div className="flex flex-col gap-6">
  <section aria-label="Pré-visualização do plano" className="flex flex-col gap-4 rounded-xl border bg-card p-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Ensaiar a sequência</h3><p className="text-xs text-muted-foreground">Tempos estimados · sem áudio</p></div>
   <p role="status" className="text-sm text-muted-foreground">{atual+1} de {variante.cenas.length} · {cena.etapa}</p>
   <p className="whitespace-pre-wrap break-words text-lg leading-relaxed">{cena.locucao||'Secção ainda sem locução.'}</p>
   <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{cena.visual||'Gera o plano visual para receber sugestões de gravação.'}</p>
   <div className="flex flex-wrap gap-2"><Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Cena anterior" disabled={atual===0} onClick={()=>{setPlay(false);setIndice(i=>Math.max(0,i-1));}}><SkipBack/></Button><Button variant="outline" disabled={!cena.locucao.trim()} onClick={()=>{if(!play&&atual===variante.cenas.length-1)setIndice(0);setPlay(p=>!p);}}>{play?<Pause/>:<Play/>}{play?'Pausar ensaio':atual===variante.cenas.length-1?'Recomeçar ensaio':'Ensaiar sequência'}</Button><Button variant="outline" size="icon" className="min-h-11 min-w-11" aria-label="Cena seguinte" disabled={atual>=variante.cenas.length-1} onClick={()=>{setPlay(false);setIndice(i=>i+1);}}><SkipForward/></Button></div>
  </section>
  {variante.notas&&<p className="whitespace-pre-wrap text-sm leading-relaxed">{variante.notas}</p>}
  <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!temLocucao} onClick={async()=>{try{await navigator.clipboard.writeText(textoPlano(variante,ppm));toast.success('Plano copiado');}catch{erro('Não foi possível copiar o plano. Usa a exportação TXT.');}}}><Copy/>Copiar plano</Button><Button variant="outline" disabled={!temLocucao} onClick={()=>{try{transferirTexto(textoPlano(variante,ppm),'plano-gravacao.txt');}catch{erro('Não foi possível preparar o TXT. Usa Copiar plano.');}}}><Download/>Plano TXT</Button><Button variant="outline" disabled={exportando||!temLocucao} onClick={async()=>{setExportando(true);try{await pdfPlano(variante,ppm);}catch{erro('Não foi possível preparar o PDF. Usa a exportação TXT.');}finally{setExportando(false);}}}><Download/>{exportando?'A preparar PDF…':'Plano PDF'}</Button></div>
 </div>;
}
