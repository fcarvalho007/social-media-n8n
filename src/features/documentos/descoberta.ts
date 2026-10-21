import type { DescobertaDocumento, MarkupDocumento, MarkupNo } from './contratos';

const limpar = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
export function resolverLigacao(bruto: string | null, origem: string): string | null {
  if (!bruto || bruto.length > 2000) return null;
  try { const u = new URL(bruto, origem); if (u.protocol !== 'https:' || u.username || u.password || u.port) return null; u.hash = ''; return u.href; } catch { return null; }
}
export function mesmoSite(url: string, origem: string): boolean {
  try { const h = new URL(origem).hostname.replace(/^www\./, ''); const outro = new URL(url).hostname.replace(/^www\./, ''); return outro === h || outro.endsWith(`.${h}`); } catch { return false; }
}
export function dataVerificavel(s: string | null | undefined): string | null {
  const str = limpar(s);
  // A year alone is not a date; never replace an unknown publication date with today.
  if (!str || !(/\d{4}[-/]\d{2}[-/]\d{2}/.test(str) || /\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}/.test(str))) return null;
  const t = Date.parse(str); return Number.isFinite(t) && t <= Date.now() + 86400000 ? new Date(t).toISOString() : null;
}
function meta(doc: MarkupDocumento, selector: string) { const n = doc.querySelector(selector); return limpar(n?.getAttribute('content') ?? n?.textContent); }
const editorial = /report|research|insight|publica|estudo|estudi|relat[oó]rio|paper|article|artigo|not[ií]cia|blog|news|ai-index|policy|working|conhecimento|knowledge|digital|intelligence|intelig[eê]ncia/i;
const excluir = /(?:\/|\b)(?:login|signin|sign-in|subscribe|privacy|cookies|contact|careers|events?|webinars?|terms|account|cart|search)(?:\/|\b)/i;

/** HTML, RSS/Atom, sitemaps and JSON-LD. Only URLs actually present in the response. */
export function analisarDocumento(doc: MarkupDocumento, origem: string): { itens: DescobertaDocumento[]; seguir: string[]; feeds: string[] } {
  const itens = new Map<string, DescobertaDocumento>(); const seguir = new Map<string, number>(); const feeds = new Set<string>();
  const tituloPagina = meta(doc, 'meta[property="og:title"]') || limpar(doc.querySelector('title')?.textContent);
  const dataPagina = dataVerificavel(meta(doc, 'meta[property="article:published_time"]') || meta(doc, 'meta[name="citation_publication_date"]'));
  const add = (bruto: string | null, titulo: string, pdf: boolean, data: string | null = null) => {
    const url = resolverLigacao(bruto, origem); if (!url || url === origem || excluir.test(new URL(url).pathname)) return;
    if(!pdf&&(/^(?:wwwstg|staging|stage|preview|dev)\./i.test(new URL(url).hostname)||/\/(?:research|publications|estudos|insights|news|blog|home|articles|reports|documents-reports)\/?$/i.test(new URL(url).pathname)))return;
    const nome = limpar(titulo).slice(0, 250) || decodeURIComponent(new URL(url).pathname.split('/').at(-1) || 'Documento');
    const existente = itens.get(url);
    if (!existente || (existente.tipo !== 'pdf' && pdf)) itens.set(url, { url, titulo: nome, tipo: pdf ? 'pdf' : 'artigo', origem, publicadoEm: data });
  };
  for (const n of doc.querySelectorAll('link[href]')) {
    const tipo = n.getAttribute('type') ?? ''; const href = n.getAttribute('href');
    if (/rss|atom|feed\+json/i.test(tipo)) { const u = resolverLigacao(href, origem); if (u && mesmoSite(u, origem)) feeds.add(u); }
    if (/application\/pdf/i.test(tipo)) add(href, tituloPagina, true, dataPagina);
  }
  for (const n of doc.querySelectorAll('meta[name="citation_pdf_url"],meta[property="og:pdf"]')) add(n.getAttribute('content'), tituloPagina, true, dataPagina);
  for (const n of doc.querySelectorAll('a[href],iframe[src],embed[src],object[data],[data-pdf-url],[data-download-url]')) {
    const href = n.getAttribute('href') ?? n.getAttribute('src') ?? n.getAttribute('data') ?? n.getAttribute('data-pdf-url') ?? n.getAttribute('data-download-url');
    let titulo = limpar(n.getAttribute('aria-label') || n.getAttribute('title') || n.textContent || n.getAttribute('download'));
    if(/^(?:read(?: more| in pdf)?|here|pdf|download|estudo completo(?: \(pdf\))?|resumo(?: \(pdf\))?)$/i.test(titulo)){
      const bloco=n.closest?.('article,li,[class*="card"],[class*="publication"],[class*="report"]');
      const contexto=limpar(bloco?.querySelector('h1,h2,h3,h4')?.textContent)||limpar(doc.querySelector('h1')?.textContent);
      if(contexto.length>12)titulo=`${contexto}${/resumo/i.test(titulo)?' — Resumo':''}`;
    }
    const downloadDireto=/(?:\/bitstreams?\/[^?#]+\/(?:download|content)|\/(?:download|getfile|filedownload|attachment)(?:\.(?:php|ashx|aspx))?)(?:[?#]|$)/i.test(href??'');
    const pdf = /\.pdf(?:[?#]|$)/i.test(href ?? '') || /pdf/i.test(n.getAttribute('type') ?? '') || /\bpdf\b/i.test(titulo) || !!n.getAttribute('data-pdf-url') || downloadDireto || n.getAttribute('download')!==null;
    if (pdf) add(href, /^(?:(?:view|download|descarregar|abrir|consultar|ler)\s+)?pdf$/i.test(titulo) ? tituloPagina : titulo, true);
    else {
      const url = resolverLigacao(href, origem);
      if (!url || !mesmoSite(url, origem) || /^(?:wwwstg|staging|stage|preview|dev)\./i.test(new URL(url).hostname) || excluir.test(new URL(url).pathname) || !editorial.test(`${titulo} ${new URL(url).pathname}`)) continue;
      if (titulo.length >= 15 && !/^(?:read more|learn more|saiba mais|ver mais|publications?|research|insights?|blog|news)$/i.test(titulo)) add(url, titulo, false);
      if (url !== origem) seguir.set(url, titulo.length >= 35 ? 2 : 1);
    }
  }
  for (const item of doc.querySelectorAll('item,entry')) {
    const nome = limpar(item.querySelector('title')?.textContent); const data = dataVerificavel(item.querySelector('pubDate,published,updated')?.textContent);
    const links = [...item.querySelectorAll('enclosure,link,content')];
    for (const n of links) {
      const href = n.getAttribute('href') ?? n.getAttribute('url') ?? limpar(n.textContent);
      const pdf = /application\/pdf/i.test(n.getAttribute('type') ?? '') || /\.pdf(?:[?#]|$)/i.test(href);
      add(href, nome, pdf, data);
      const u = resolverLigacao(href, origem); if (!pdf && u && mesmoSite(u, origem)) seguir.set(u, 3);
    }
    for (const n of item.querySelectorAll('description,summary')) {
      for (const m of (n.textContent ?? '').matchAll(/https?:\/\/[^\s<>"']+\.pdf(?:\?[^\s<>"']*)?/gi)) add(m[0], nome, true, data);
    }
  }
  for (const n of doc.querySelectorAll('url > loc,sitemap > loc')) {
    const u = resolverLigacao(limpar(n.textContent), origem); if (!u) continue;
    if (/\.pdf(?:[?#]|$)/i.test(u)) add(u, '', true);
    else if (mesmoSite(u, origem) && editorial.test(u)) seguir.set(u, 1);
  }
  const visitados = new Set<unknown>();
  function json(v: unknown, profundidade = 0) {
    if (!v || typeof v !== 'object' || profundidade > 12 || visitados.has(v)) return; visitados.add(v);
    if (Array.isArray(v)) { v.slice(0, 100).forEach(x => json(x, profundidade + 1)); return; }
    const o = v as Record<string, unknown>; const nome = limpar(String(o.headline || o.name || tituloPagina));
    if (typeof o.contentUrl === 'string' && (/pdf/i.test(String(o.encodingFormat || o.fileFormat || '')) || /\.pdf(?:[?#]|$)/i.test(o.contentUrl))) add(o.contentUrl, nome, true, dataVerificavel(String(o.datePublished || '')));
    Object.values(o).forEach(x => json(x, profundidade + 1));
  }
  for (const n of doc.querySelectorAll('script[type="application/ld+json"]')) { try { json(JSON.parse(n.textContent || '')); } catch { /* malformed metadata is not invented */ } }
  return { itens: [...itens.values()].slice(0, 250), seguir: [...seguir].sort((a,b) => b[1]-a[1]).map(([u]) => u).slice(0, 15), feeds: [...feeds].slice(0, 3) };
}

export function extrairArtigoDocumento(doc:MarkupDocumento):{titulo:string;texto:string;parcial:boolean}{
  // CMS menus and related cards also use <article>. Prefer the editorial body;
  // otherwise rank candidates by paragraphs, not menu/list label length.
  const candidatos=[...doc.querySelectorAll('[itemprop="articleBody"],.field--name-field-body,.field--name-body')];
  if(!candidatos.length)candidatos.push(...doc.querySelectorAll('article'));
  const principal=doc.querySelector('main')??doc.querySelector('[role="main"]');
  const preparar=(n:MarkupNo)=>{for(const lixo of n.querySelectorAll('nav,header,footer,aside,form,script,style,noscript,[aria-hidden="true"],.menu-teaser,.node-teaser'))lixo.remove?.();return n;};
  const peso=(n:MarkupNo)=>[...n.querySelectorAll('p')].reduce((total,p)=>total+limpar(p.textContent).length,0);
  const area=candidatos.map(preparar).sort((a,b)=>peso(b)-peso(a)).find(n=>peso(n)>=200)??(principal?preparar(principal):null);
  if(!area)throw new Error('Não foi identificado texto editorial nesta página. Abre a origem e seleciona o conteúdo manualmente.');
  for(const n of area.querySelectorAll('nav,header,footer,aside,form,script,style,noscript,[aria-hidden="true"]'))n.remove?.();
  const paragrafos=[...new Set([...area.querySelectorAll('h1,h2,h3,p,li')].map(n=>limpar(n.textContent)).filter(s=>s.length>=20))];
  const texto=paragrafos.join('\n\n');
  if(texto.length<200)throw new Error('O texto editorial disponível é insuficiente. A página pode depender de JavaScript, login ou subscrição.');
  const parcial=texto.length>20000;let fim=Math.min(texto.length,20000);
  if(parcial){const corte=texto.lastIndexOf('\n\n',20000);if(corte>1000)fim=corte;}
  return{titulo:limpar(area.querySelector('h1')?.textContent)||meta(doc,'meta[property="og:title"]')||limpar(principal?.querySelector('h1')?.textContent)||limpar(doc.querySelector('title')?.textContent),texto:texto.slice(0,fim),parcial};
}
