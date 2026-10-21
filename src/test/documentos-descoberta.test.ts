import { describe,expect,it } from 'vitest';
import { analisarDocumento,dataVerificavel,extrairArtigoDocumento,mesmoSite,resolverLigacao } from '@/features/documentos/descoberta';
import { tituloDoDocumento } from '@/features/documentos/modelo';
const ler=(s:string,xml=false)=>analisarDocumento(new DOMParser().parseFromString(s,xml?'text/xml':'text/html'),'https://example.org/research/');
describe('recolha editorial real: HTML, feeds e metadados',()=>{
  it('encontra metadados académicos e downloads sem extensão',()=>{
    const r=ler('<title>Relatório IA</title><meta name="citation_pdf_url" content="/download?id=1"><a href="/paper/2" type="application/pdf">PDF</a>');
    expect(r.itens.map(x=>x.url)).toEqual(['https://example.org/download?id=1','https://example.org/paper/2']);expect(r.itens.every(x=>x.tipo==='pdf')).toBe(true);
  });
  it('reconhece bitstreams de repositórios sem extensão .pdf e sem a palavra PDF no botão',()=>{
    const r=ler('<a href="https://openknowledge.worldbank.org/bitstreams/uuid/download">DOWNLOAD REPORT</a><a href="/download.aspx?id=3">Relatório</a>');expect(r.itens).toHaveLength(2);expect(r.itens.every(d=>d.tipo==='pdf')).toBe(true);
  });
  it('segue publicações e RSS da própria fonte; não navega menus de conta ou URLs inventados',()=>{
    const r=ler('<link type="application/rss+xml" href="/rss.xml"><a href="/research/new-report">New report on artificial intelligence and employment</a><a href="https://other.org/research/report">External research paper</a><a href="/account/research">Account Research</a>');
    expect(r.feeds).toEqual(['https://example.org/rss.xml']);expect(r.seguir).toEqual(['https://example.org/research/new-report']);
  });
  it('RSS preserva datas verificáveis e enclosures PDF',()=>{
    const r=ler('<rss><channel><item><title>Estudo sobre marketing</title><link>https://example.org/article/estudo</link><pubDate>Wed, 01 Oct 2025 10:00:00 GMT</pubDate><enclosure url="https://cdn.example.org/download?id=3" type="application/pdf"/></item></channel></rss>',true);
    expect(r.itens.find(x=>x.tipo==='pdf')).toMatchObject({url:'https://cdn.example.org/download?id=3',publicadoEm:'2025-10-01T10:00:00.000Z'});
  });
  it('Atom lê links href e documentos em content',()=>{
    const r=ler('<feed><entry><title>Investigação</title><published>2025-09-10T10:00:00Z</published><link href="https://example.org/research/nova"/><link href="/download/4" type="application/pdf"/></entry></feed>',true);
    expect(r.itens.some(x=>x.url==='https://example.org/download/4'&&x.tipo==='pdf')).toBe(true);
  });
  it('lê JSON-LD sem executar scripts ou seguir instruções',()=>{
    const r=ler('<script type="application/ld+json">{"@type":"Report","name":"Estudo real","encoding":{"contentUrl":"/download/5","encodingFormat":"application/pdf"}}</script><script>throw new Error("nao executar")</script>');
    expect(r.itens[0].url).toBe('https://example.org/download/5');
  });
  it('um sitemap identifica PDFs e páginas de pesquisa',()=>{
    const r=ler('<urlset><url><loc>https://example.org/r.pdf</loc></url><url><loc>https://example.org/research/new-report</loc></url></urlset>',true);
    expect(r.itens[0].tipo).toBe('pdf');expect(r.seguir).toContain('https://example.org/research/new-report');
  });
  it('não chama publicação a um ano isolado nem preenche a data com hoje',()=>{expect(dataVerificavel('2026')).toBeNull();expect(dataVerificavel('')).toBeNull();expect(dataVerificavel('2099-10-18')).toBeNull();});
  it('não confunde um domínio semelhante com um subdomínio autorizado',()=>{expect(mesmoSite('https://cdn.example.org/a','https://www.example.org')).toBe(true);expect(mesmoSite('https://evil-example.org','https://example.org')).toBe(false);});
  it.each(['javascript:alert(1)','https://u:p@example.org/a','http://example.org/a','https://example.org:999/a'])('recusa a ligação %s',u=>expect(resolverLigacao(u,'https://example.org')).toBeNull());
  it('o título do próprio PDF substitui nomes genéricos, mas conserva um título editorial dado',()=>{expect(tituloDoDocumento('Read more','Global Research Outlook','document.pdf')).toBe('Global Research Outlook');expect(tituloDoDocumento('O meu título','Outra coisa','d.pdf')).toBe('O meu título');});
  it('o título da publicação junto ao botão tem precedência sobre Read more',()=>{
    const r=ler('<article><h2>Transformação digital nas empresas portuguesas</h2><a href="/a.pdf">Read more</a></article>');expect(r.itens[0].titulo).toBe('Transformação digital nas empresas portuguesas');
  });
  it('extrai texto editorial, removendo navegação, scripts e rodapés sem executar instruções',()=>{
    const doc=new DOMParser().parseFromString(`<article><h1>Estudo sobre transformação digital</h1><nav><p>Não é conteúdo editorial</p></nav><p>${'Texto verificável da investigação. '.repeat(20)}</p><script>NAO EXECUTAR</script><footer><p>Privacidade e termos não são o artigo.</p></footer></article>`,'text/html');
    const r=extrairArtigoDocumento(doc);expect(r.titulo).toBe('Estudo sobre transformação digital');expect(r.texto).not.toContain('Não é conteúdo');expect(r.texto).not.toContain('NAO EXECUTAR');expect(r.parcial).toBe(false);
  });
  it('não converte uma página vazia, um menu ou um artigo truncado numa fonte completa',()=>{
    expect(()=>extrairArtigoDocumento(new DOMParser().parseFromString('<nav><p>Menu</p></nav>','text/html'))).toThrow('editorial');
    const doc=new DOMParser().parseFromString(`<main><h1>Relatório longo de investigação</h1><p>${'F'.repeat(21000)}</p></main>`,'text/html');
    const r=extrairArtigoDocumento(doc);expect(r.parcial).toBe(true);expect(r.texto.length).toBeLessThanOrEqual(20000);
  });
  it('escolhe o corpo editorial Drupal em vez dos cartões article dos menus FFMS',()=>{
    const doc=new DOMParser().parseFromString(`<nav><article class="menu-teaser"><p>${'Cartão de outra notícia. '.repeat(40)}</p></article></nav><main><h1>Emprego jovem em Portugal</h1><div class="field--name-field-body"><p>${'Investigação sobre qualificações e emprego. '.repeat(20)}</p></div><article class="node-teaser"><p>${'Conteúdo relacionado. '.repeat(50)}</p></article></main>`,'text/html');
    const r=extrairArtigoDocumento(doc);expect(r.titulo).toBe('Emprego jovem em Portugal');expect(r.texto).toContain('Investigação sobre qualificações');expect(r.texto).not.toContain('Cartão');expect(r.texto).not.toContain('Conteúdo relacionado');
  });
});
