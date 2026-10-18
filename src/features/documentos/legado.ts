export interface RegistoPdfTracker extends Record<string,unknown> {
  id:number;title:string;url:string;storage_path:string|null;thumbnail_url:string|null;
  deleted_at:string|null;source:string;publisher:string|null;category:string;tags:string[];
  summary?:string|null;summary_pt?:string|null;summary_1paragraph?:string|null;date?:string;
}
export interface ObjetoPdfTracker {name:string;size_bytes:number;mimetype:string;updated_at:string}
export interface ExportacaoPdfTracker {exportadoEm:string;projeto:string;baseStorage:string;proveniencia:string;registos:RegistoPdfTracker[];pdfs:ObjetoPdfTracker[];thumbnails:ObjetoPdfTracker[]}
export interface EntradaPdfTracker {id:string;url:string;nome:string;registos:RegistoPdfTracker[];orfao:boolean;hash?:string;bytes?:number;erro?:string}
export interface CatalogoPdfTracker {
  versao:1;exportadoEm:string;projeto:string;estado:'a_descarregar'|'concluido';
  registos:number;objetos:number;capas:number;entradas:EntradaPdfTracker[];
  thumbnails:(ObjetoPdfTracker&{hash?:string;erro?:string})[];
}
export interface MetadadosPdfTracker {projeto:string;exportadoEm:string;registos:RegistoPdfTracker[];objeto:string;orfao:boolean}
const simples=(s:string)=>s.replace(/\s+/g,' ').trim();
export function caminhoLegado(r:RegistoPdfTracker,base:string):string|null{
  if(r.storage_path)return r.storage_path;
  try{const u=new URL(r.url),b=new URL(`${base}pdfs/`);return u.origin===b.origin&&u.pathname.startsWith(b.pathname)?decodeURIComponent(u.pathname.slice(b.pathname.length)):null;}catch{return null;}
}
export function reconciliarLegado(e:ExportacaoPdfTracker):EntradaPdfTracker[]{
  const usadas=new Set<number>();
  const entradas=e.pdfs.map((o,i)=>{const registos=e.registos.filter(r=>caminhoLegado(r,e.baseStorage)===o.name);registos.forEach(r=>usadas.add(r.id));return{id:`objeto-${i}`,url:`${e.baseStorage}pdfs/${o.name.split('/').map(encodeURIComponent).join('/')}`,nome:o.name,registos,orfao:!registos.length};});
  return [...entradas,...e.registos.filter(r=>!usadas.has(r.id)).map(r=>({id:`registo-${r.id}`,url:r.url,nome:r.title,registos:[r],orfao:false}))];
}
export function documentosLegado(c:CatalogoPdfTracker):EntradaPdfTracker[]{
  const unicos=new Map<string,EntradaPdfTracker>();
  for(const e of c.entradas){if(!e.hash)continue;const previo=unicos.get(e.hash);if(previo){previo.registos=[...new Map([...previo.registos,...e.registos].map(r=>[r.id,r])).values()];previo.orfao=previo.orfao&&e.orfao;}else unicos.set(e.hash,{...e,registos:[...e.registos]});}
  return [...unicos.values()];
}
export function tituloLegado(e:EntradaPdfTracker){return simples(e.registos.find(r=>!r.deleted_at)?.title||e.registos[0]?.title||e.nome.replace(/\.pdf$/i,''));}
export function resumoLegado(m?:MetadadosPdfTracker){const r=m?.registos.find(r=>!r.deleted_at)??m?.registos[0];return simples(r?.summary_pt||r?.summary_1paragraph||r?.summary||'');}
export function soEliminados(m?:MetadadosPdfTracker){return!!m?.registos.length&&m.registos.every(r=>!!r.deleted_at);}
export function estadoLeitura(d:{leitura?:'por_ler'|'lido'|'arquivado';legado?:MetadadosPdfTracker}){return d.leitura??(d.legado?.registos.length&&d.legado.registos.filter(r=>!r.deleted_at).every(r=>r.status==='archived')?'arquivado':'por_ler');}
export function filtrarEstado(d:{leitura?:'por_ler'|'lido'|'arquivado';legado?:MetadadosPdfTracker},estado:string){if(estado==='eliminados')return soEliminados(d.legado);if(soEliminados(d.legado))return false;const l=estadoLeitura(d);return estado==='ativos'?l!=='arquivado':l===estado;}
