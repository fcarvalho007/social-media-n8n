import {BACKEND_NUVEM,apiBackend} from '@/lib/backendHub';
import {renovarCapasNuvem,atualizarAlteradosNuvem,guardarFicheiroNuvem,ficheiroNuvem,refazerCapaNuvem} from '@/features/documentos/acervoNuvem';
import {EstadoServicoEditorial} from '@/components/backend/EstadoServicoEditorial';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Info, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { CuradoriaNavegacao } from '@/components/CuradoriaNavegacao';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useProjeto } from '@/contexts/ProjetoContext';
import { lerPdf } from '@/features/motor/fontePdf';
import { encontrarDocumentoHash, guardarCapaDocumento, guardarDocumento, guardarLegadoDocumento, guardarLeituraDocumento, guardarRecolha, guardarTituloDocumento, listarAcervo } from '@/features/documentos/acervoLocal';
import { ImportarPdfTracker } from '@/features/documentos/ImportarPdfTracker';
import { FontesDocumentos } from '@/features/documentos/FontesDocumentos';
import { GaleriaDocumentos } from '@/features/documentos/GaleriaDocumentos';
import { LeitorDocumento } from '@/features/documentos/LeitorDocumento';
import { HistoricoDocumentos, EntradaDocumento } from '@/features/documentos/PercursosDocumentos';
import { pedidoLocal } from '@/features/documentos/apiLocal';
import { gerarCapaPdf } from '@/features/documentos/capaPdf';
import { lerEstadoBiblioteca } from '@/features/documentos/interface';
import { LIMITES_ACERVO, type PdfRecolhido } from '@/features/documentos/contratos';
import { ambitoAcervo, descobrirCandidatos, DOCUMENTOS_LOCAL, excertoReferenciado, nomeDoFicheiro, temAssinaturaPdf, tituloDoDocumento, urlPublica, type CandidatoPdf, type DocumentoAcervo, type Recolha } from '@/features/documentos/modelo';
import { prepararArtigoAcervo, prepararFonte } from '@/features/documentos/transferencia';

export default function Documentos() {
  const { user } = useAuth(); const ctx = useProjeto(); const nav = useNavigate();
  const ambito = user && ctx.projetoId ? ambitoAcervo(user.id, ctx.projetoId) : null;
  return <div className="hub-page">
    <header className="flex flex-wrap items-start justify-between gap-4"><div className="flex max-w-2xl flex-col gap-2"><h1 className="text-3xl font-semibold tracking-tight">Documentos e relatórios</h1><p className="text-sm text-muted-foreground">Pesquisa as tuas fontes e transforma páginas verificadas em conteúdo.</p></div><div className="flex w-full flex-col gap-1.5 sm:w-64"><Label htmlFor="projeto-acervo">Documentos do projeto</Label><Select value={ctx.projetoId ?? ''} disabled={ctx.estado !== 'pronto' || ctx.aGuardar} onValueChange={id => ctx.escolher(id).catch(e => toast.error(e.message))}><SelectTrigger id="projeto-acervo" className="min-h-11"><SelectValue placeholder="Escolhe um projeto" /></SelectTrigger><SelectContent><SelectGroup>{ctx.projetos.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectGroup></SelectContent></Select></div></header>
    <CuradoriaNavegacao />
    <div className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden="true"/><p>{BACKEND_NUVEM?'Acervo privado na nuvem · ficheiros e histórico separados por projeto.':'Pré-visualização local · ficheiros neste computador e neste navegador · sem sincronização na nuvem.'}</p></div>
    {BACKEND_NUVEM && <EstadoServicoEditorial projeto={ctx.projetoId}/>}
    {ctx.erro && <Alert variant="destructive"><AlertDescription>{ctx.erro}</AlertDescription></Alert>}
    {!DOCUMENTOS_LOCAL&&!BACKEND_NUVEM ? <p>Esta área ainda está em desenvolvimento local.</p> : !ambito || !user || !ctx.projetoId ? <div className="flex flex-col items-center gap-3 py-16 text-center"><BookOpen className="size-8 text-muted-foreground" aria-hidden="true"/><h2 className="text-xl font-semibold">Cada projeto, as suas fontes</h2><p className="text-sm text-muted-foreground">Escolhe o projeto acima para abrir o acervo.</p></div> : <Acervo key={ambito} ambito={ambito} userId={user.id} projetoId={ctx.projetoId} navegar={nav} />}
  </div>;
}
function Acervo({ ambito, userId, projetoId, navegar }: { ambito: string; userId: string; projetoId: string; navegar: ReturnType<typeof useNavigate> }) {
  const [params, setParams] = useSearchParams(); const estado = lerEstadoBiblioteca(params);
  const [docs, setDocs] = useState<DocumentoAcervo[]>([]); const [recolhas, setRecolhas] = useState<Recolha[]>([]);
  const [carregando, setCarregando] = useState(true); const [erroCarga, setErroCarga] = useState<string|null>(null); const [erro, setErro] = useState<string|null>(null);
  const [ocupado, setOcupado] = useState<string|null>(null); const emCurso = useRef(false); const vivo = useRef(true); const retorno = useRef<string|null>(null);
  const [url, setUrl] = useState(''); const [candidatos, setCandidatos] = useState<CandidatoPdf[]>([]); const [resultado, setResultado] = useState<string|null>(null);
  const [paginas, setPaginas] = useState<Set<number>>(new Set()); const ficheiroInput = useRef<HTMLInputElement>(null);
  function mudar(dados:Record<string,string|number|null>, substituir=false){setParams(p=>{const n=new URLSearchParams(p);for(const [k,v] of Object.entries(dados)){if(v===null||v==='')n.delete(k);else n.set(k,String(v));}n.set('projeto',projetoId);return n;},{replace:substituir});}
  const setTab=(v:string)=>mudar({separador:v});
  const doc=docs.find(d=>d.id===estado.id);
  useEffect(()=>{vivo.current=true;return()=>{vivo.current=false;};},[]);
  useEffect(()=>{if(params.get('projeto')&&params.get('projeto')!==projetoId)setParams(p=>{const n=new URLSearchParams(p);for(const k of ['documento','q','categoria','estado','pagina','projeto'])n.delete(k);return n;},{replace:true});},[projetoId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!estado.id&&retorno.current){const id=retorno.current;retorno.current=null;requestAnimationFrame(()=>{(document.getElementById(`documento-${id}`)??document.getElementById('pesquisa-documentos'))?.focus();});}},[estado.id]);
  async function recarregar(){const [d,r]=await Promise.all([listarAcervo<DocumentoAcervo>('documentos',ambito),listarAcervo<Recolha>('recolhas',ambito)]);if(!vivo.current)return;setDocs(d);setRecolhas(r.sort((a,b)=>b.em.localeCompare(a.em)));setErroCarga(null);}
  async function carregar(){setCarregando(true);try{await recarregar();}catch(e){if(vivo.current)setErroCarga((e as Error).message);}finally{if(vivo.current)setCarregando(false);}}
  useEffect(()=>{void carregar();},[]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!BACKEND_NUVEM||!docs.some(d=>(!d.pdf.paginas.length&&d.processamento?.estado!=='erro')||d.processamento?.estado==='a_processar'))return;const timer=setInterval(()=>{if(!emCurso.current)void atualizarAlteradosNuvem(ambito,docs).then(n=>{if(vivo.current)setDocs(n);}).catch(e=>{if(vivo.current)setErroCarga((e as Error).message);});},10000);return()=>clearInterval(timer);},[docs]);
  useEffect(()=>{if(!BACKEND_NUVEM)return;const timer=setInterval(()=>{void renovarCapasNuvem(ambito).then(urls=>{if(vivo.current)setDocs(ds=>ds.map(d=>({...d,capaUrl:urls.find(u=>u.id===d.id)?.capa_url??d.capaUrl})));}).catch(e=>{if(vivo.current)setErroCarga((e as Error).message);});},720000);return()=>clearInterval(timer);},[ambito]);
  function abrir(d:DocumentoAcervo){setPaginas(new Set());mudar({documento:d.id});}
  async function executar(nome:string,fn:()=>Promise<unknown>):Promise<boolean>{if(emCurso.current)return false;emCurso.current=true;setOcupado(nome);setErro(null);let ok=true;try{await fn();}catch(e){ok=false;if(vivo.current)setErro((e as Error).message);}finally{emCurso.current=false;if(vivo.current){setOcupado(null);await recarregar().catch(e=>setErro((e as Error).message));}}return ok;}
  async function guardar(f: File, origem: string | null, titulo?: string, registo?: Recolha, metadados?: PdfRecolhido) {
    const r: Recolha = registo ?? { id: crypto.randomUUID(), ambito, url: origem ?? f.name, em: new Date().toISOString(), estado: 'descarregado', detalhe: `${f.size} bytes recebidos; leitura do PDF por confirmar.` };
    await guardarRecolha(r);
    try {
      if(BACKEND_NUVEM){
       const salvo=await guardarFicheiroNuvem(f,ambito,{titulo,origem,fonteNome:metadados?.nomeFonte,categoria:metadados?.categoria});
       if(metadados?.legado)salvo.documento=await guardarLegadoDocumento(salvo.documento.id,ambito,metadados.legado);
       await guardarRecolha({...r,estado:salvo.duplicado?'duplicado':'guardado',documentoId:salvo.documento.id,detalhe:salvo.duplicado?'Documento já existente neste projeto.':'Original preservado; o servidor prepara texto e capa em segundo plano.'});
       if(vivo.current&&!metadados){setPaginas(new Set());mudar({documento:salvo.documento.id,separador:'acervo'});toast.success(salvo.duplicado?'Este PDF já está no acervo. Não foi duplicado.':'PDF guardado no acervo privado.');}return salvo.documento;
      }
      const existente = metadados ? await encontrarDocumentoHash(ambito,metadados.hash) : null;
      const pdf = existente?.pdf ?? await lerPdf(f,{limites:LIMITES_ACERVO,progresso:(n,total)=>{if(vivo.current)setOcupado(`A ler página ${n} de ${total}…`);}});
      if(metadados&&pdf.hash!==metadados.hash)throw new Error('A assinatura do PDF não corresponde ao ficheiro descarregado.');
      let capa=existente?.capa;let capaErro:string|undefined;
      if(!capa){try{if(vivo.current)setOcupado('A criar a imagem da primeira página…');capa=await gerarCapaPdf(f);}catch(e){capaErro=(e as Error).message;}}
      const salvo = existente ? {documento:existente,duplicado:true} : await guardarDocumento({ id: crypto.randomUUID(), ambito, titulo: tituloDoDocumento(titulo,pdf.titulo,f.name), origem, recolhidoEm: r.em, publicadoEm: metadados?.publicadoEm??null, ficheiro: f, pdf,capa,capaErro,fonteNome:metadados?.nomeFonte,categoria:metadados?.categoria,paginaOrigem:metadados?.origem,legado:metadados?.legado });
      if(existente&&!existente.capa&&capa)await guardarCapaDocumento(existente.id,ambito,capa);
      if(metadados?.legado)salvo.documento=await guardarLegadoDocumento(salvo.documento.id,ambito,metadados.legado);
      const n = pdf.paginas.filter(p => p.estado === 'texto').length;
      await guardarRecolha({ ...r, estado: salvo.duplicado ? 'duplicado' : 'guardado', documentoId: salvo.documento.id, detalhe: `Assinatura e estrutura PDF verificadas. ${pdf.paginas.length} páginas; ${n} com texto. ${n < pdf.paginas.length ? 'Leitura parcial: há páginas sem texto ou com erro.' : 'Texto extraído de todas as páginas.'}` });
      if (vivo.current && !metadados) { setPaginas(new Set()); mudar({documento:salvo.documento.id,separador:'acervo'}); toast.success(salvo.duplicado ? 'Este PDF já está no acervo. Não foi duplicado.' : 'PDF guardado neste navegador'); }
      return {...salvo.documento,capa:capa??salvo.documento.capa,capaErro};
    } catch (e) { await guardarRecolha({ ...r, estado: 'erro', detalhe: (e as Error).message }); throw e; }
  }
  async function importarRecolhido(f:File,p:PdfRecolhido){
    if(emCurso.current)throw new Error('Aguarda que a leitura atual termine.');emCurso.current=true;setOcupado('A organizar o PDF…');
    try{const d=await guardar(f,p.url,p.titulo,undefined,p);return{id:d.id,capaCriada:!!(d.capa||d.capaUrl),capaErro:d.capaErro,titulo:d.titulo};}finally{emCurso.current=false;if(vivo.current){setOcupado(null);await recarregar();}}
  }
  async function refazerCapa(d:DocumentoAcervo){if(BACKEND_NUVEM&&d.processamento?.estado==='erro'){await executar('A retomar a extração…',()=>apiBackend('/documentos/retomar-processamento',{id:d.id,ambito:d.ambito},{projeto:projetoId}));return;}await executar('A criar a imagem da primeira página…',async()=>{if(BACKEND_NUVEM){await refazerCapaNuvem(d.id,d.ambito);return;}const capa=await gerarCapaPdf(d.ficheiro);await guardarCapaDocumento(d.id,ambito,capa);});}
  async function obter(bruto: string, apenasPdf = false, titulo?: string) {
    const endereco = urlPublica(bruto).href;
    const r: Recolha = { id: crypto.randomUUID(), ambito, url: endereco, em: new Date().toISOString(), estado: 'encontrado', detalhe: 'Endereço recebido. Conteúdo ainda não verificado.' };
    await guardarRecolha(r);
    try {
      const res = await pedidoLocal('obter', { url: endereco });
      const bytes = new Uint8Array(await res.arrayBuffer()); const final = decodeURIComponent(res.headers.get('X-Hub-Url-Final') || encodeURIComponent(endereco));
      if (temAssinaturaPdf(bytes)) {
        setResultado(null); await guardar(new File([bytes], nomeDoFicheiro(final), { type: 'application/pdf' }), final, titulo, { ...r, estado: 'descarregado', detalhe: `${bytes.byteLength} bytes recebidos. A verificar a estrutura e a extrair o texto.` });
      } else {
        if (apenasPdf || !res.headers.get('Content-Type')?.includes('html')) throw new Error('O endereço não devolveu um PDF. Pode ser uma página de login, um bloqueio ou outro ficheiro.');
        const links = descobrirCandidatos(new TextDecoder().decode(bytes), final);
        if (vivo.current) { setCandidatos(links); setResultado(links.length ? `${links.length} ${links.length === 1 ? 'ligação candidata' : 'ligações candidatas'}. Escolhe os PDFs a verificar e guardar.` : 'Não há ligações PDF identificáveis nesta página. Se o site as carregar com JavaScript, usa o endereço direto ou faz upload.'); }
        await guardarRecolha({ ...r, estado: 'consultado', detalhe: `${links.length} ${links.length === 1 ? 'ligação candidata encontrada' : 'ligações candidatas encontradas'} no HTML. Nenhum PDF guardado nesta etapa.` });
      }
    } catch (e) { await guardarRecolha({ ...r, estado: 'erro', detalhe: (e as Error).message }); throw e; }
  }
  async function descarregar(d: DocumentoAcervo) {
    try{const f=BACKEND_NUVEM?await ficheiroNuvem(d):d.ficheiro;const href = URL.createObjectURL(f); const a = document.createElement('a'); a.href = href; a.download = d.pdf.ficheiro; a.click(); setTimeout(() => URL.revokeObjectURL(href), 10000);}catch(e){setErro((e as Error).message);}
  }
  function enviar(destino: 'artigo' | 'visual') {
    if (!doc) return;
    try { const fonteAcervo = prepararFonte(doc, paginas, userId, projetoId); navegar(destino === 'artigo' ? '/artigos' : '/estudio/carrosseis/novo?modo=manual', { state: { fonteAcervo } }); }
    catch (e) { setErro((e as Error).message); }
  }
  function downloadBlob(blob:Blob,nome:string){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=nome;a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);}
  return <Tabs value={estado.tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="w-full sm:w-auto"><TabsList className="grid h-auto w-full grid-cols-2 sm:flex"><TabsTrigger className="min-h-11" value="acervo">Biblioteca{!carregando&&!erroCarga?` (${docs.length})`:''}</TabsTrigger><TabsTrigger className="min-h-11" value="fontes">Sites com PDFs</TabsTrigger><TabsTrigger className="min-h-11" value="recolher">Adicionar por endereço</TabsTrigger><TabsTrigger className="min-h-11" value="historico">Histórico de recolhas</TabsTrigger></TabsList></div><Button className="min-h-11 w-full sm:w-auto" disabled={!!ocupado} onClick={()=>ficheiroInput.current?.click()}><Upload aria-hidden="true"/>Adicionar PDF</Button></div>
    <input ref={ficheiroInput} tabIndex={-1} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Ficheiro PDF" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void executar('A ler e guardar o PDF…',()=>guardar(f,null));}}/>
    {erro&&<Alert variant="destructive"><AlertDescription>{erro}</AlertDescription></Alert>}
    {ocupado&&<p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true"/>{ocupado}</p>}
    <div>
      <TabsContent value="acervo" forceMount hidden={estado.tab!=='acervo'} className={estado.tab!=='acervo'?'hidden':'flex flex-col gap-6'}>
        {erroCarga?<Alert variant="destructive"><AlertDescription><p>{erroCarga}</p><Button variant="outline" className="mt-3 min-h-11" onClick={()=>void carregar()}>Tentar abrir o acervo novamente</Button></AlertDescription></Alert>:doc?<LeitorDocumento key={doc.id} documento={doc} paginas={paginas} onPaginas={setPaginas} ocupado={!!ocupado} voltar={()=>{retorno.current=doc.id;mudar({documento:null});}} onTitulo={s=>executar('A guardar o título…',()=>guardarTituloDocumento(doc.id,ambito,s))} onLeitura={s=>void executar('A guardar o estado de leitura…',()=>guardarLeituraDocumento(doc.id,ambito,s))} onOriginal={()=>descarregar(doc)} onCapa={()=>void refazerCapa(doc)} onDownloadCapa={()=>{void executar('A preparar a capa…',async()=>{const b=BACKEND_NUVEM?await ficheiroNuvem(doc,true):doc.capa;if(b)downloadBlob(b,`${doc.pdf.ficheiro.replace(/\.pdf$/i,'')}-capa.png`);});}} onCopiar={()=>navigator.clipboard.writeText(excertoReferenciado(doc,paginas)).then(()=>toast.success('Texto e referência copiados')).catch(()=>setErro('O navegador não permitiu copiar. Abre o texto da página e seleciona o excerto.'))} onPreparar={enviar}/>:<>
          {estado.id&&!carregando&&<Alert><AlertDescription>Este documento não está disponível neste projeto. <Button variant="link" onClick={()=>mudar({documento:null},true)}>Voltar ao acervo</Button></AlertDescription></Alert>}
          <GaleriaDocumentos docs={docs} carregando={carregando} estado={estado} mudar={mudar} abrir={abrir}/>
        </>}
        {!carregando&&!erroCarga&&<ImportarPdfTracker docs={docs} ocupado={!!ocupado} onGuardar={importarRecolhido}/>}
      </TabsContent>
      <TabsContent value="fontes" forceMount hidden={estado.tab!=='fontes'} className={estado.tab!=='fontes'?'hidden':''}><FontesDocumentos ambito={ambito} ocupado={!!ocupado} onGuardar={importarRecolhido} onConcluido={()=>void recarregar().catch(e=>setErro((e as Error).message))} onAbrir={id=>{const d=docs.find(x=>x.id===id);if(d){setPaginas(new Set());mudar({documento:id,separador:'acervo'});}else setErro('O ficheiro está no disco, mas ainda não neste navegador. Usa «Reimportar do disco» na recolha.');}} onPrepararArtigo={f=>navegar('/artigos',{state:{fonteArtigo:prepararArtigoAcervo(f,userId,projetoId)}})}/></TabsContent>
      <TabsContent value="recolher"><EntradaDocumento url={url} onUrl={setUrl} ocupado={!!ocupado} candidatos={candidatos} resultado={resultado} onConsultar={()=>{setCandidatos([]);setResultado(null);void executar('A consultar o endereço…',()=>obter(url));}} onGuardar={c=>void executar('A descarregar e verificar o PDF…',()=>obter(c.url,true,c.titulo))}/></TabsContent>
      <TabsContent value="historico"><HistoricoDocumentos recolhas={recolhas} docs={docs} onAbrir={id=>{const d=docs.find(x=>x.id===id);if(d){setPaginas(new Set());mudar({documento:id,separador:'acervo'});}}}/></TabsContent>
    </div>
  </Tabs>;
}
