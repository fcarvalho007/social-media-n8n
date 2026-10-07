import { useEffect, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeradorKie } from '@/features/motor/GeradorKie';
import { ACEITAR_CARREGAR } from '@/features/editor-grafico/carregar';
import type { ApiMateriais, ImagemDisponivel, MaterialRoteiro } from '@/services/roteiros-materiais';

export function SeletorMateriais({project,api,prompt,onEscolher,onFechar}:{project:string;api:ApiMateriais;prompt:string;onEscolher:(a:MaterialRoteiro)=>void;onFechar:()=>void}) {
  const [imagens,setImagens]=useState<ImagemDisponivel[]|null>(null);
  const [previews,setPreviews]=useState<Record<string,MaterialRoteiro>>({});
  const [geradas,setGeradas]=useState<MaterialRoteiro[]>([]);
  const [query,setQuery]=useState('');const [pagina,setPagina]=useState(0);
  const [busy,setBusy]=useState(false);const [erro,setErro]=useState('');
  const lista=(imagens??[]).filter(a=>a.nome.toLocaleLowerCase('pt-PT').includes(query.toLocaleLowerCase('pt-PT')));
  const lote=lista.slice(pagina*8,pagina*8+8);
  const ids=lote.filter(a=>!a.biblioteca).map(a=>a.id).join(',');
  useEffect(()=>{let vivo=true;api.listar(project).then(a=>vivo&&setImagens(a)).catch(e=>vivo&&setErro(e.message));return()=>{vivo=false;};},[api,project]);
  useEffect(()=>{if(!ids)return;let vivo=true;api.ler(project,ids.split(',')).then(a=>{if(vivo)setPreviews(p=>({...p,...a}));}).catch(e=>vivo&&setErro(e.message));return()=>{vivo=false;};},[api,project,ids]);
  const escolher=async(a:ImagemDisponivel)=>{setBusy(true);setErro('');try{onEscolher(await api.escolher(project,a));}catch(e){setErro((e as Error).message);}finally{setBusy(false);}};
  return <Dialog open onOpenChange={o=>{if(!o&&!busy)onFechar();}}><DialogContent className="max-h-[88dvh] max-w-3xl overflow-y-auto">
    <DialogHeader><DialogTitle>Imagem de apoio para esta passagem</DialogTitle><DialogDescription>Escolhe uma imagem, carrega um ficheiro ou gera propostas. A imagem só entra no roteiro quando a escolheres.</DialogDescription></DialogHeader>
    {erro&&<p role="alert" className="text-sm text-destructive">{erro}</p>}
    <Tabs defaultValue="biblioteca"><TabsList className="grid h-auto grid-cols-3"><TabsTrigger value="biblioteca">Biblioteca</TabsTrigger><TabsTrigger value="carregar">Carregar</TabsTrigger><TabsTrigger value="ia">Gerar com IA</TabsTrigger></TabsList>
      <TabsContent value="biblioteca" className="flex flex-col gap-4"><label className="flex flex-col gap-2 text-sm">Procurar imagens existentes<Input value={query} onChange={e=>{setQuery(e.target.value);setPagina(0);}}/></label>
        {!imagens&&!erro&&<p role="status">A carregar a biblioteca…</p>}
        {imagens&&!lista.length&&<p className="text-sm text-muted-foreground">Não há imagens para esta pesquisa. Podes carregar uma no separador Carregar.</p>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Imagens disponíveis">{lote.map(a=><li key={a.id}><button disabled={busy} onClick={()=>void escolher(a)} className="flex w-full flex-col gap-2 rounded-lg border p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" aria-label={`Usar ${a.nome}`}>
          {a.miniatura||previews[a.id]?<img src={a.miniatura??`data:${previews[a.id].mime};base64,${previews[a.id].dados}`} alt="" className="aspect-square w-full rounded-md object-contain"/>:<span className="flex aspect-square items-center justify-center text-sm text-muted-foreground">Pré-visualização a carregar</span>}
          <span className="line-clamp-2 min-h-10 break-words text-sm">{a.nome}</span></button></li>)}</ul>
        {lista.length>8&&<div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={busy||pagina===0} onClick={()=>setPagina(p=>p-1)}>Anterior</Button><span className="text-sm">{pagina+1} / {Math.ceil(lista.length/8)}</span><Button variant="outline" disabled={busy||(pagina+1)*8>=lista.length} onClick={()=>setPagina(p=>p+1)}>Seguinte</Button></div>}
      </TabsContent>
      <TabsContent value="carregar" className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">JPG, PNG ou WebP · até 10 MB. Os ficheiros ficam na biblioteca do projeto.</p><label className="flex flex-col gap-3 text-sm"><span className="flex items-center gap-2"><Upload aria-hidden/>Escolher ficheiro de imagem</span><Input type="file" accept={ACEITAR_CARREGAR} disabled={busy} onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;setBusy(true);setErro('');try{onEscolher(await api.carregar(project,f));}catch(e){setErro((e as Error).message);}finally{setBusy(false);}}}/></label></TabsContent>
      <TabsContent value="ia" className="flex flex-col gap-4">{api.local?<p className="text-sm text-muted-foreground">A geração de imagens usa a ligação já configurada no Hub. Neste teste local, valida a escolha e o carregamento; não são feitas chamadas pagas ao Cloud.</p>:<GeradorKie projectId={project} promptInicial={prompt.slice(0,2000)} ocupado={busy} usar={async(_chave,_nome,obter)=>{try{const id=await obter();const a=(await api.ler(project,[id]))[id];if(!a)throw new Error('Imagem gerada indisponível.');setGeradas(old=>old.some(x=>x.id===id)?old:[...old,a]);}catch(e){setErro((e as Error).message);}}}/>}
        {geradas.map(a=><figure key={a.id} className="flex flex-col gap-3"><img src={`data:${a.mime};base64,${a.dados}`} alt="Imagem ilustrativa gerada por IA" className="max-h-80 rounded-lg object-contain"/><figcaption className="text-sm text-muted-foreground">Imagem ilustrativa · revê antes de usar.</figcaption><Button disabled={busy} onClick={()=>onEscolher(a)}>Usar esta imagem gerada</Button></figure>)}
      </TabsContent>
    </Tabs>
    {busy&&<p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="motion-safe:animate-spin" aria-hidden/>A guardar e verificar a imagem…</p>}
    <Button variant="ghost" disabled={busy} onClick={onFechar}>Voltar ao plano</Button>
  </DialogContent></Dialog>;
}
