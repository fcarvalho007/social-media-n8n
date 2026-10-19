import { randomUUID } from 'node:crypto';
import { JSDOM, VirtualConsole } from 'jsdom';
import type { ArmazemSeo } from './persistencia';
import { obterPublico, validarDestino, type OpcoesObter, type RespostaPublica } from '../documentos/obter';
import { Robots } from '../documentos/robots';
import { conhecimentoVazio, paginaDoSite, type PaginaMarca } from '../../src/features/seo/sequencia';
import type { SiteEditorial } from '../../src/features/seo/contratos';

type Obter = (url:string, signal:AbortSignal, opcoes?:OpcoesObter)=>Promise<RespostaPublica>;
export class InventarioEditorial {
  constructor(private repo:ArmazemSeo, private obter:Obter=obterPublico, private robots:Pick<Robots,'verificar'>=new Robots(), private agora=()=>new Date()) {}
  private async site(id:string) { const s=(await this.repo.ler()).sites.find(s=>s.id===id); if(!s)throw new Error('Site não encontrado.');return s; }
  private async ler(url:string,s:SiteEditorial,signal:AbortSignal) {
    const antesDeVisitar=async(u:URL)=>{validarDestino(u.href);if(u.hostname.replace(/^www\./,'')!==s.dominio.replace(/^www\./,''))throw new Error('O inventário não segue destinos de outro domínio.');await this.robots.verificar(u);};
    return this.obter(url,signal,{maxBytes:2*1024*1024,aceitarErroHttp:true,antesDeVisitar});
  }
  async descobrir(siteId:string) {
    const s=await this.site(siteId), signal=AbortSignal.timeout(45000), candidatas=new Set<string>(), avisos:string[]=[], visitadas=new Set<string>();
    const fila=[`https://${s.dominio}/wp-sitemap.xml`,`https://${s.dominio}/sitemap_index.xml`,`https://${s.dominio}/sitemap.xml`];
    for(let n=0;fila.length&&n<6&&candidatas.size<100;n++) {
      const url=fila.shift()!;if(visitadas.has(url)){n--;continue;}visitadas.add(url);
      try {
        const r=await this.ler(url,s,signal); if(r.status!==200) {avisos.push(`Sitemap HTTP ${r.status}: ${url}`);continue;}
        if(!/xml|text\/plain/.test(r.tipo)) {avisos.push(`O destino não devolveu um sitemap XML: ${url}`);continue;}
        const dom=new JSDOM(r.bytes.toString('utf8'),{contentType:'text/xml',virtualConsole:new VirtualConsole()});
        try {
          const d=dom.window.document, indice=!!d.querySelector('sitemapindex');
          if(!indice&&!d.querySelector('urlset'))throw new Error('XML sem índice de sitemap nem lista de URLs.');
          const descobertas:string[]=[];
          for(const el of d.querySelectorAll('loc')) {
            const u=(el.textContent??'').trim();if(indice){try{const destino=validarDestino(u);if(destino.hostname.replace(/^www\./,'')!==s.dominio.replace(/^www\./,'')||destino.search)continue;}catch{continue;}}else if(!paginaDoSite(u,s))continue;
            if(indice) {if(!/attachment|image|video|author|category|post_tag|product_cat|post_format|locations/i.test(new URL(u).pathname))descobertas.push(u);} else if(candidatas.size<100)candidatas.add(u);
          }
          if(indice){const prioridade=(u:string)=>/post[-_]?sitemap|sitemap[-_]posts[-_]post/.test(u)?0:/page[-_]?sitemap|sitemap[-_]posts[-_]page/.test(u)?1:2;descobertas.sort((a,b)=>prioridade(a)-prioridade(b));fila.unshift(...descobertas.filter(u=>!visitadas.has(u)).slice(0,12));}
        } finally {dom.window.close();}
      } catch(x) {avisos.push((x as Error).message);if(signal.aborted)break;}
    }
    if(candidatas.size===100)avisos.push('Mostram-se as primeiras 100 URLs elegíveis. A descoberta é limitada; não representa uma auditoria completa do site.');
    return {candidatas:[...candidatas],avisos:[...new Set(avisos)],limite:100,em:this.agora().toISOString()};
  }
  async verificar(siteId:string,revista:number,urls:string[],importar=false) {
    if(!Array.isArray(urls)||!urls.length||urls.length>10||new Set(urls).size!==urls.length)throw new Error('Escolhe entre uma e dez URLs distintas por verificação.');
    const s=await this.site(siteId);if(urls.some(u=>!paginaDoSite(u,s)))throw new Error('Usa apenas URLs públicas canónicas do próprio site.');
    if((s.conhecimento?.revista??0)!==revista)throw new Error('O conhecimento mudou. Guarda ou reabre antes de verificar destinos.');
    const signal=AbortSignal.timeout(45000), em=this.agora().toISOString(), novas:PaginaMarca[]=[];
    for(const url of urls) {
      const anterior=s.conhecimento?.paginas.find(p=>p.url===url);
      if(!importar&&!anterior)throw new Error('Uma página não pertence ao inventário guardado.');
      const pagina:PaginaMarca=anterior?structuredClone(anterior):{id:randomUUID(),url,titulo:url,tema:'Completar o contexto editorial desta página.',keyword:'',tipo:'artigo',aprovada:false,verificadaEm:''};
      try {
        const r=await this.ler(url,s,signal), dom=/html/.test(r.tipo)?new JSDOM(r.bytes.toString('utf8'),{virtualConsole:new VirtualConsole()}):null;
        try {
          const d=dom?.window.document, robots=[r.xRobotsTag??'',...(d?[...d.querySelectorAll('meta[name="robots" i],meta[name="googlebot" i]')].map(x=>x.getAttribute('content')??''):[])].join(',');
          const href=d?.querySelector('link[rel~="canonical" i]')?.getAttribute('href');
          const canonical=href?new URL(href,r.url).href:r.url, indexavel=!!d&&r.status===200&&!/\b(noindex|none)\b/i.test(robots)&&paginaDoSite(canonical,s);
          pagina.verificacao={em,http:r.status,canonical,indexavel,detalhe:r.status!==200?`HTTP ${r.status}`:!d?'O destino não é uma página HTML.':!indexavel?'Página não indexável ou canonical fora do site.':canonical!==url?'O destino redireciona ou indica outra URL canónica.':'HTTP 200, HTML indexável e URL canónica coincidente.'};
          if(!anterior) {pagina.titulo=(d?.querySelector('title')?.textContent?.trim()||url).slice(0,200);pagina.tema=(d?.querySelector('meta[name="description" i]')?.getAttribute('content')?.trim()||pagina.titulo).slice(0,500);}
          if(!indexavel||canonical!==url) {pagina.aprovada=false;pagina.verificadaEm='';}
        } finally {dom?.window.close();}
      } catch(x) {pagina.verificacao={em,http:null,canonical:null,indexavel:false,detalhe:(x as Error).message.slice(0,1000)};pagina.aprovada=false;pagina.verificadaEm='';}
      novas.push(pagina);
      if(signal.aborted)break;
    }
    return this.repo.alterar(e=>{
      const atual=e.sites.find(x=>x.id===siteId)!,c=atual.conhecimento??conhecimentoVazio();if(c.revista!==revista)throw new Error('O conhecimento mudou durante a verificação. Os dados guardados foram preservados.');
      const paginas=[...c.paginas];for(const p of novas){const i=paginas.findIndex(x=>x.url===p.url);if(i>=0)paginas[i]=p;else{if(paginas.length>=100)throw new Error('O inventário já tem 100 páginas. Retira uma antes de importar.');paginas.push(p);}}
      atual.conhecimento={...c,paginas,revista:c.revista+1};for(const p of e.pautas.filter(p=>p.siteId===siteId&&p.aprovacao)){p.aprovacao=null;p.estado='aguarda_revisao';p.motivo='Inventário verificado. É necessária nova revisão das ligações.';}
      e.auditoria.push({id:randomUUID(),em,acao:'inventario_verificado',alvo:siteId,detalhe:`${novas.length} destinos verificados; novas páginas exigem aprovação editorial.`});return atual;
    });
  }
}
