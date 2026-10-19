import { obterPublico } from '../documentos/obter';
import { Buffer } from 'node:buffer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { lerImagemPedido, validarImagem } from '../seo/imagens';
import { exigirEscrita, type ContextoBackend } from './seguranca';
export class ImagensArtigoNuvem{
 constructor(private sb:SupabaseClient){}
 async guardar(ctx:ContextoBackend,bruto:unknown){exigirEscrita(ctx);const v=lerImagemPedido(bruto),antiga=await this.sb.from('hub_artigo_imagens').select('*').eq('project_id',ctx.projeto).eq('hash',v.hash).maybeSingle();if(antiga.error)throw new Error('A biblioteca de imagens ainda não está instalada ou não respondeu.');if(antiga.data)return this.assinar(antiga.data);
 const id=randomUUID(),caminho=`${ctx.projeto}/${id}.${v.ext}`,upload=await this.sb.storage.from('hub-artigos').upload(caminho,new Uint8Array(v.bytes),{contentType:v.tipo,upsert:false});if(upload.error)throw new Error('Não foi possível guardar a imagem privada.');
 const r=await this.sb.from('hub_artigo_imagens').insert({id,project_id:ctx.projeto,hash:v.hash,nome:v.nome,tipo:v.tipo,bytes:v.bytes.length,caminho}).select('*').single();if(r.error){await this.sb.storage.from('hub-artigos').remove([caminho]);const repetida=await this.sb.from('hub_artigo_imagens').select('*').eq('project_id',ctx.projeto).eq('hash',v.hash).maybeSingle();if(repetida.data)return this.assinar(repetida.data);throw new Error('A imagem não foi registada. Repete o carregamento.');}return this.assinar(r.data);
 }
 async importar(ctx:ContextoBackend,url:string){exigirEscrita(ctx);const r=await obterPublico(url,AbortSignal.timeout(20000),{maxBytes:8388608});return this.guardar(ctx,{nome:new URL(r.url).pathname.split('/').at(-1)||'imagem',base64:Buffer.from(r.bytes).toString('base64')});}
 private async assinar(v:Record<string,unknown>){const r=await this.sb.storage.from('hub-artigos').createSignedUrl(String(v.caminho),900);if(r.error)throw new Error('Não foi possível abrir a pré-visualização privada.');return{id:v.id,hash:v.hash,nome:v.nome,tipo:v.tipo,bytes:v.bytes,criadaEm:v.criado_em,url:r.data.signedUrl};}
 async detalhe(ctx:ContextoBackend,id:string){z.string().uuid().parse(id);const r=await this.sb.from('hub_artigo_imagens').select('*').eq('project_id',ctx.projeto).eq('id',id).single();if(r.error||!r.data)throw new Error('Esta imagem não pertence ao projeto.');return this.assinar(r.data);}
 async listar(ctx:ContextoBackend){const r=await this.sb.from('hub_artigo_imagens').select('*').eq('project_id',ctx.projeto).order('criado_em',{ascending:false}).limit(200);if(r.error)throw new Error('Não foi possível abrir as imagens deste projeto.');return Promise.all((r.data??[]).map(v=>this.assinar(v)));}
 async ficheiro(projeto:string,id:string){z.string().uuid().parse(id);const r=await this.sb.from('hub_artigo_imagens').select('*').eq('project_id',projeto).eq('id',id).single();if(r.error||!r.data)throw new Error('Esta imagem não pertence ao projeto.');const b=await this.sb.storage.from('hub-artigos').download(r.data.caminho);if(b.error)throw new Error('Não foi possível ler a imagem privada.');const bytes=new Uint8Array(await b.data.arrayBuffer());if(validarImagem(bytes).hash!==r.data.hash)throw new Error('A integridade da imagem não foi confirmada.');return{bytes,nome:r.data.nome,tipo:r.data.tipo,hash:r.data.hash};}
}
