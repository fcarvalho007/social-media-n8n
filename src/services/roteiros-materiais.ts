import { supabase } from '@/integrations/supabase/client';
import { carregarFicheiro } from '@/features/editor-grafico/carregar';
import { lerAssets, listarImagens, registarImagem } from './motor';
import type { Asset } from '../../supabase/functions/_shared/documento-grafico/nucleo';
export interface MaterialRoteiro extends Asset { nome: string; credito: string | null }
export interface ImagemDisponivel { id: string; nome: string; miniatura?: string; biblioteca?: boolean }
export interface ApiMateriais {
  local?: boolean;
  listar(project: string): Promise<ImagemDisponivel[]>;
  ler(project: string, ids: string[]): Promise<Record<string, MaterialRoteiro>>;
  escolher(project: string, imagem: ImagemDisponivel): Promise<MaterialRoteiro>;
  carregar(project: string, ficheiro: File): Promise<MaterialRoteiro>;
}
async function ler(project: string, ids: string[]): Promise<Record<string,MaterialRoteiro>> {
  const resultado: Record<string,MaterialRoteiro> = {};
  for(let i=0;i<ids.length;i+=8) {
    const lote=ids.slice(i,i+8);
    const [{assets,falhas},meta]=await Promise.all([lerAssets(project,lote),supabase.from('mc_assets').select('id,nome,credito').eq('project_id',project).in('id',lote)]);
    if(meta.error||falhas.length||lote.some(id=>!assets[id])) throw new Error('Uma imagem deixou de estar disponível neste projeto. Volta a escolhê-la.');
    for(const id of lote){const m=meta.data?.find(a=>a.id===id);if(!m)throw new Error('Imagem inacessível.');resultado[id]={...assets[id],nome:m.nome??'Imagem',credito:m.credito};}
  }
  return resultado;
}
export const apiMateriais: ApiMateriais = {
  listar:async project=>{const d=await listarImagens(project);const ligadas=new Set(d.assets.map(a=>a.media_id));return [...d.assets.filter(a=>!a.origem||a.origem!=='giphy').map(a=>({id:a.id,nome:a.nome??'Imagem do projeto'})),...d.biblioteca.filter(m=>!ligadas.has(m.id)).map(m=>({id:m.id,nome:m.file_name,miniatura:m.thumbnail_url??m.file_url,biblioteca:true}))];},
  ler,
  escolher:async(project,imagem)=>{const id=imagem.biblioteca?(await registarImagem(project,imagem.id)).asset.id:imagem.id;return (await ler(project,[id]))[id];},
  carregar:async(project,f)=>{const r=await carregarFicheiro(project,f);return (await ler(project,[r.asset.id]))[r.asset.id];},
};
