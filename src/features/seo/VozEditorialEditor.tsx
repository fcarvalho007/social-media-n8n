import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { EscolhaSeo } from './ComponentesSeo';
import { vozEditorialVazia, type ConhecimentoMarca } from './sequencia';
export function VozEditorialEditor({valor,onChange}:{valor:ConhecimentoMarca['vozEditorial'];onChange:(v:NonNullable<ConhecimentoMarca['vozEditorial']>)=>void}) {
  const v=valor??vozEditorialVazia();
  return <section className="flex min-w-0 flex-col gap-4 border-t pt-5"><div><h4 className="text-lg font-semibold">Como esta marca escreve</h4><p className="mt-1 max-w-prose text-sm text-muted-foreground">Complementa a voz definida em Sites e regras. Os exemplos orientam o estilo; não são fontes de factos nem de promessas comerciais.</p></div>
    <EscolhaSeo id="voz-tratamento" rotulo="Forma de tratar o leitor" valor={v.tratamento} onChange={x=>onChange({...v,tratamento:x as typeof v.tratamento})} opcoes={[{valor:'tu',nome:'Tu · proximidade'},{valor:'voce',nome:'Você · tratamento formal'},{valor:'impessoal',nome:'Impessoal · sem tratamento direto'}]}/>
    {v.amostras.map((a,i)=><div key={i} className="flex flex-col gap-2"><Label htmlFor={`voz-exemplo-${i}`}>Exemplo de escrita aprovado {i+1}</Label><Textarea id={`voz-exemplo-${i}`} rows={3} maxLength={2000} value={a} onChange={e=>onChange({...v,amostras:v.amostras.map((a,j)=>i===j?e.target.value:a)})}/><p className="text-xs text-muted-foreground">{a.trim().length} / 2 000 caracteres · mínimo de 40</p><Button type="button" variant="ghost" className="min-h-11 self-start" onClick={()=>onChange({...v,amostras:v.amostras.filter((_,j)=>i!==j)})}>Retirar exemplo</Button></div>)}
    <Button type="button" variant="outline" className="min-h-11 self-start" disabled={v.amostras.length>=3} onClick={()=>onChange({...v,amostras:[...v.amostras,'']})}>Adicionar exemplo de voz</Button>
    {v.termosPreferidos.map((t,i)=><div key={i} className="grid min-w-0 gap-3 sm:grid-cols-[1fr_1fr_auto]"><div className="flex min-w-0 flex-col gap-2"><Label htmlFor={`voz-evitar-${i}`}>Em vez de</Label><Input id={`voz-evitar-${i}`} className="min-h-11" maxLength={80} value={t.evitar} onChange={e=>onChange({...v,termosPreferidos:v.termosPreferidos.map((t,j)=>i===j?{...t,evitar:e.target.value}:t)})}/></div><div className="flex min-w-0 flex-col gap-2"><Label htmlFor={`voz-usar-${i}`}>Preferir</Label><Input id={`voz-usar-${i}`} className="min-h-11" maxLength={80} value={t.usar} onChange={e=>onChange({...v,termosPreferidos:v.termosPreferidos.map((t,j)=>i===j?{...t,usar:e.target.value}:t)})}/></div><Button type="button" variant="ghost" className="min-h-11 self-end" onClick={()=>onChange({...v,termosPreferidos:v.termosPreferidos.filter((_,j)=>i!==j)})}>Retirar termo {i+1}</Button></div>)}
    <Button type="button" variant="outline" className="min-h-11 self-start" disabled={v.termosPreferidos.length>=20} onClick={()=>onChange({...v,termosPreferidos:[...v.termosPreferidos,{evitar:'',usar:''}]})}>Definir termo preferido</Button>
  </section>;
}
