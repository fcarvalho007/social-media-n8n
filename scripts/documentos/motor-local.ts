import * as jsdom from 'jsdom';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { analisarDocumento, extrairArtigoDocumento, mesmoSite } from '../../src/features/documentos/descoberta';
import { LIMITES_RECOLHA, type FonteDocumento, type MarkupDocumento, type TarefaDocumentos, type EvidenciaFonte } from '../../src/features/documentos/contratos';
import { obterPublico, validarDestino } from './obter';
import { ErroRobots, Robots } from './robots';
import { downloadConhecido } from './adaptadores';

const { JSDOM, VirtualConsole } = jsdom as { VirtualConsole: new () => unknown; JSDOM: new (s: string, o?: { contentType?: string; virtualConsole?: unknown }) => { window: { document: MarkupDocumento; close(): void } } };
const robots = new Robots();
export function fonteUtilizavel(f: FonteDocumento): boolean {
  try { const u = validarDestino(f.url); return !/\.(?:supabase\.co|lovable\.dev)$/i.test(u.hostname); } catch { return false; }
}
export class MotorDocumentos {
  private jobs = new Map<string, TarefaDocumentos>();
  private prontos: Promise<void>;
  private sequencia: Promise<unknown> = Promise.resolve();
  private descargas: Promise<unknown> = Promise.resolve();
  private escritas = new Map<string,Promise<void>>();
  private execucoes = new Map<string,Promise<unknown>>();
  constructor(readonly pasta: string, readonly fontes: FonteDocumento[],private continuar:()=>boolean|Promise<boolean>=()=>true) { this.prontos = this.carregar(); }
  private async carregar() {
    await mkdir(path.join(this.pasta, 'pdfs'), { recursive: true });
    for (const nome of (await readdir(this.pasta)).filter(n => /^tarefa-[a-f0-9-]+\.json$/.test(n))) {
      try { const j = JSON.parse(await readFile(path.join(this.pasta, nome), 'utf8')) as TarefaDocumentos;
        if (j.estado === 'em_curso') { j.estado = 'interrompida'; j.atual = 'Servidor reiniciado. Retoma a recolha para continuar.'; }
        this.jobs.set(j.id, j);
      } catch { /* A broken file is not returned as a successful task. */ }
    }
  }
  async listar(ambito: string) { await this.prontos; return [...this.jobs.values()].filter(j => j.ambito === ambito).sort((a,b) => b.iniciadaEm.localeCompare(a.iniciadaEm)).slice(0, 10); }
  async ler(id: string, ambito: string) { await this.prontos; const j = this.jobs.get(id); if (!j || j.ambito !== ambito) throw new Error('Recolha não encontrada neste projeto.'); return j; }
  async aguardar(id:string,ambito:string){await this.ler(id,ambito);await this.execucoes.get(id);return this.ler(id,ambito);}
  private enfileirar(j:TarefaDocumentos){
    const p=this.sequencia.catch(()=>undefined).then(()=>this.executar(j));this.sequencia=p;this.execucoes.set(j.id,p);
    void p.catch(e=>{j.estado='interrompida';j.atual='Não foi possível persistir o resultado no disco.';j.erros.push((e as Error).message);});
  }
  private async salvar(j: TarefaDocumentos) {
    const dados = JSON.stringify(j);
    const p = (this.escritas.get(j.id) ?? Promise.resolve()).catch(()=>undefined).then(async()=>{
      const destino = path.join(this.pasta, `tarefa-${j.id}.json`); const tmp = `${destino}.${randomUUID()}.tmp`;
      await writeFile(tmp, dados, { mode: 0o600 }); await rename(tmp, destino);
    });
    this.escritas.set(j.id,p); await p;
  }
  async iniciar(ambito: string, ids: number[], modo: TarefaDocumentos['modo']) {
    await this.prontos;
    if (!ambito || ambito.length > 300 || !Array.isArray(ids) || !ids.length || ids.length > 120) throw new Error('Escolhe as fontes a consultar.');
    const existente = [...this.jobs.values()].find(j => j.ambito === ambito && j.estado === 'em_curso'); if (existente) return existente;
    const escolhidas = this.fontes.filter(f => ids.includes(f.id));
    if (!escolhidas.length) throw new Error('As fontes escolhidas não existem no inventário.');
    const j: TarefaDocumentos = { id: randomUUID(), ambito, modo, estado: 'em_curso', iniciadaEm: new Date().toISOString(), atual: 'Na fila local…', total: escolhidas.length, fontes: escolhidas.map(f => ({ fonteId:f.id,nome:f.name,url:f.url,estado:'a_consultar',paginas:0,pdfs:0,novidades:0,detalhes:[] })), descobertas: [], pdfs: [], erros: [] };
    this.jobs.set(j.id, j); await this.salvar(j);
    this.enfileirar(j);
    return j;
  }
  async retomar(id: string, ambito: string) {
    const j = await this.ler(id,ambito); if (j.estado !== 'interrompida') return j;
    if ((await this.listar(ambito)).some(x => x.estado === 'em_curso')) throw new Error('Há outra recolha em curso neste projeto.');
    j.estado = 'em_curso'; delete j.terminadaEm; await this.salvar(j);
    this.enfileirar(j); return j;
  }
  async confirmar(id: string, ambito: string, hash: string, documentoId: string | undefined, erro?: string, capaCriada?: boolean, capaErro?: string, titulo?: string) {
    const j = await this.ler(id,ambito); const p = j.pdfs.find(p => p.hash === hash); if (!p) throw new Error('PDF não encontrado nesta recolha.');
    p.estado = erro ? 'erro' : 'guardado'; p.erro = erro?.slice(0,500); p.documentoId = documentoId; p.capaCriada=capaCriada;p.capaErro=capaErro?.slice(0,500); if(titulo)p.titulo=titulo.slice(0,250); await this.salvar(j);
  }
  async binario(id: string, ambito: string, hash: string) {
    const j = await this.ler(id,ambito); if (!/^[a-f0-9]{64}$/.test(hash) || !j.pdfs.some(p => p.hash === hash)) throw new Error('PDF não encontrado nesta recolha.');
    return readFile(path.join(this.pasta,'pdfs',`${hash}.pdf`));
  }
  async lerArtigo(id:string,ambito:string,url:string){
    const j=await this.ler(id,ambito);const item=j.descobertas.find(d=>d.url===url&&d.tipo==='artigo');
    if(!item)throw new Error('A referência não pertence a esta recolha.');
    const r=await obterPublico(url,AbortSignal.timeout(30000),{antesDeVisitar:u=>robots.verificar(u)});
    if(!r.tipo.includes('html'))throw new Error('O endereço não devolveu uma página de artigo.');
    const dom=new JSDOM(r.bytes.toString('utf8'),{virtualConsole:new VirtualConsole()});
    try{const texto=extrairArtigoDocumento(dom.window.document);return{...texto,titulo:texto.titulo||item.titulo,url:r.url,origem:item.origem,publicadoEm:item.publicadoEm,fonteNome:item.nomeFonte,hash:createHash('sha256').update(r.bytes).digest('hex')};}finally{dom.window.close();}
  }
  private async verificarContinuidade(){if(!await this.continuar())throw new Error('Recolha pausada ou reserva expirada. Resultados anteriores preservados.');}
  private async executar(j: TarefaDocumentos) {
    const vistas = new Set([...this.jobs.values()].filter(x => x.ambito === j.ambito && x.id !== j.id).flatMap(x => x.descobertas.map(d => d.url)));
    try {
      // Three workers, at most one source per hostname at a time. Work survives closing the browser.
      const pendentes = j.fontes.filter(f => f.estado === 'a_consultar');
      const dominios = new Set<string>(); let cursor = 0;
      const worker = async () => {
        while (cursor < pendentes.length) {
          const ev = pendentes[cursor++]; await this.verificarContinuidade(); const f = this.fontes.find(f => f.id === ev.fonteId)!;
          let dominio = f.url; try { dominio = new URL(f.url).hostname.replace(/^www\./,''); } catch { /* invalid source is reported below */ }
          while (dominios.has(dominio)) await new Promise(r => setTimeout(r,100));
          dominios.add(dominio);
          try { await this.consultar(j,f,ev,vistas); } finally { dominios.delete(dominio); }
          await this.salvar(j);
        }
      };
      const finais=await Promise.allSettled([worker(),worker(),worker()]);
      const falhou=finais.find(r=>r.status==='rejected');if(falhou?.status==='rejected')throw falhou.reason;
      j.estado = 'concluida'; j.atual = 'Consulta concluída. Revê os resultados e as fontes com limitações.';
    } catch (e) { j.estado = 'interrompida'; j.erros.push((e as Error).message); j.atual = 'Recolha interrompida; os resultados já guardados foram preservados.'; }
    j.terminadaEm = new Date().toISOString(); await this.salvar(j);
  }
  private async consultar(j: TarefaDocumentos, f: FonteDocumento, ev: EvidenciaFonte, vistas: Set<string>) {
    if (!fonteUtilizavel(f)) { ev.estado = 'bloqueada'; ev.detalhes.push('Endereço interno, redigido ou inválido. Precisa de uma fonte pública correta.'); return; }
    const signal = AbortSignal.timeout(LIMITES_RECOLHA.timeoutFonte);
    const fila = [f.url,...f.alternative_urls.filter(u => mesmoSite(u,f.url))]; const visitadas = new Set<string>(); let sucesso = false;
    const pdfs = new Map<string,TarefaDocumentos['descobertas'][number]>();
    while (fila.length && visitadas.size < LIMITES_RECOLHA.paginasPorFonte && !signal.aborted) {
      await this.verificarContinuidade();
      const url = fila.shift()!; if (visitadas.has(url)) continue; visitadas.add(url);
      j.atual = `A consultar ${f.name} · página ${visitadas.size}/${LIMITES_RECOLHA.paginasPorFonte}`;
      try {
        const r = await obterPublico(url,signal,{ antesDeVisitar:u=>robots.verificar(u), aceitarErroHttp:true });
        if (r.status !== 200) {
          ev.detalhes.push(`HTTP ${r.status}: ${url}`);
          if ((r.status === 404 || r.status === 410) && visitadas.size === 1) fila.push(new URL('/',url).href);
          continue;
        }
        if (new URL(r.url).hostname.replace(/^www\./,'') !== new URL(f.url).hostname.replace(/^www\./,'')) ev.detalhes.push(`Redirecionamento para ${new URL(r.url).hostname}; identidade editorial por confirmar.`);
        sucesso = true; ev.paginas++; ev.finalUrl ??= r.url;
        let itens: ReturnType<typeof analisarDocumento>;
        if (r.bytes.subarray(0,1024).includes(Buffer.from('%PDF-'))) itens = { itens:[{url:r.url,titulo:f.name,tipo:'pdf',origem:url,publicadoEm:null}],seguir:[],feeds:[] };
        else {
          let bytes = r.bytes; if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes,{ maxOutputLength: 2*1024*1024 });
          const texto = bytes.toString('utf8'); const xml = /xml|rss|atom/.test(r.tipo) || /^\s*<\?xml/.test(texto);
          const dom = new JSDOM(texto,{contentType:xml?'text/xml':'text/html',virtualConsole:new VirtualConsole()});
          try { itens = analisarDocumento(dom.window.document,r.url); } finally { dom.window.close(); }
          fila.unshift(...itens.feeds.filter(u=>!visitadas.has(u))); fila.push(...itens.seguir.filter(u=>!visitadas.has(u)));
        }
        for (const item of itens.itens) {
          const d = {...item,fonteId:f.id,nomeFonte:f.name,nova:!vistas.has(item.url)};
          const anterior = j.descobertas.find(x=>x.url===d.url && x.fonteId===f.id);
          if (!anterior) j.descobertas.push(d);
          else if(anterior.tipo!=='pdf'&&d.tipo==='pdf')Object.assign(anterior,d);
          if (d.tipo === 'pdf') pdfs.set(d.url,d);
        }
        await this.salvar(j);
      } catch (e) { ev.detalhes.push(`${(e as Error).message} · ${url}`); if (e instanceof ErroRobots && visitadas.size === 1) ev.estado = 'bloqueada'; }
    }
    ev.pdfs = pdfs.size; ev.novidades = j.descobertas.filter(d=>d.fonteId===f.id && d.tipo==='artigo').length;
    if (j.modo === 'recolher') {
      const descarregar = async () => {
      let guardadosFonte=0;
      const anteriores=new Set([...this.jobs.values()].filter(x=>x.id!==j.id&&x.ambito===j.ambito).flatMap(x=>x.pdfs.filter(p=>p.estado!=='erro').map(p=>p.url)));
      const ordem=(p:TarefaDocumentos['descobertas'][number])=>{
        const novo=!anteriores.has(p.url)&&!anteriores.has(downloadConhecido(p.url));
        const nome=`${p.titulo} ${p.url}`;return(novo?100:0)+(/download report|full report|complete report|estudo completo/i.test(nome)?30:0)+(/\.pdf(?:[?#]|$)/i.test(p.url)?10:0)-(/foreword|pref[aá]cio|resumo|summary|chapter|cap[ií]tulo/i.test(nome)?5:0);
      };
      const candidatos=[...pdfs.values()].sort((a,b)=>ordem(b)-ordem(a));
      for (const p of candidatos.slice(0,LIMITES_RECOLHA.tentativasPdfPorFonte)) {
        await this.verificarContinuidade();
        if(guardadosFonte>=LIMITES_RECOLHA.pdfsPorFonte)break;
        if (j.pdfs.length >= LIMITES_RECOLHA.pdfsPorTarefa || j.pdfs.reduce((n,p)=>n+p.bytes,0) >= LIMITES_RECOLHA.bytesPorTarefa) { ev.detalhes.push('Limite de descarga desta recolha atingido. Os restantes PDFs ficam como candidatos.'); break; }
        j.atual = `A descarregar ${p.titulo.slice(0,80)}`;
        try {
          const restante = LIMITES_RECOLHA.bytesPorTarefa-j.pdfs.reduce((n,p)=>n+p.bytes,0);
          const r = await obterPublico(downloadConhecido(p.url),AbortSignal.timeout(30000),{ antesDeVisitar:u=>robots.verificar(u),maxBytes:Math.min(restante,50*1024*1024) });
          if (!r.bytes.subarray(0,1024).includes(Buffer.from('%PDF-'))) throw new Error('A ligação devolveu HTML ou outro ficheiro; não é um PDF.');
          const hash = createHash('sha256').update(r.bytes).digest('hex');
          if (!j.pdfs.some(x=>x.hash===hash)) {
            const destino=path.join(this.pasta,'pdfs',`${hash}.pdf`);const tmp=`${destino}.${randomUUID()}.tmp`;
            await writeFile(tmp,r.bytes,{mode:0o600});await rename(tmp,destino);
            j.pdfs.push({...p,url:r.url,hash,bytes:r.bytes.length,categoria:f.group_category,estado:'descarregado'});
            guardadosFonte++;
          }
          await this.salvar(j);
        } catch (e) { ev.detalhes.push(`PDF não descarregado: ${(e as Error).message} · ${p.url}`); }
      }
      };
      this.descargas = this.descargas.catch(()=>undefined).then(descarregar); await this.descargas;
    }
    if (ev.estado !== 'bloqueada') ev.estado = !sucesso ? 'erro' : ev.detalhes.length ? 'limitada' : 'concluida';
    if (!ev.pdfs && sucesso) ev.detalhes.push('Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs.');
  }
}
