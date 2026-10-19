import { createHash, randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { escreverAtomico } from './persistencia';
import type { ImagemGuardada } from '../../src/features/seo/artigoCompleto';
export const MAX_IMAGEM=8*1024*1024;
export function validarImagem(bytes:Uint8Array){
 const b=Buffer.from(bytes);if(b.length<24||b.length>MAX_IMAGEM)throw new Error('Escolhe uma imagem até 8 MB.');
 const tipo=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b[0]===255&&b[1]===216&&b[2]===255?'image/jpeg':b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'?'image/webp':null;
 if(!tipo)throw new Error('Usa PNG, JPEG ou WebP. O conteúdo do ficheiro não corresponde a uma imagem suportada.');
 let largura=0,altura=0;
 if(tipo==='image/png'&&b.length>=33&&b.toString('ascii',12,16)==='IHDR'){largura=b.readUInt32BE(16);altura=b.readUInt32BE(20);}
 if(tipo==='image/webp'){const formato=b.toString('ascii',12,16);if(formato==='VP8X'&&b.length>=30){largura=b.readUIntLE(24,3)+1;altura=b.readUIntLE(27,3)+1;}else if(formato==='VP8L'&&b.length>=25&&b[20]===47){const bits=b.readUInt32LE(21);largura=(bits&16383)+1;altura=((bits>>>14)&16383)+1;}else if(formato==='VP8 '&&b.length>=30&&b.subarray(23,26).equals(Buffer.from([157,1,42]))){largura=b.readUInt16LE(26)&16383;altura=b.readUInt16LE(28)&16383;}}
 if(tipo==='image/jpeg'){let n=2;while(n+4<=b.length){if(b[n++]!==255)break;while(b[n]===255)n++;const marker=b[n++];if(marker===216||marker===1)continue;if(marker===217||marker===218)break;const tamanho=b.readUInt16BE(n);if(tamanho<2||n+tamanho>b.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&tamanho>=8){altura=b.readUInt16BE(n+3);largura=b.readUInt16BE(n+5);break;}n+=tamanho;}}
 if(!largura||!altura)throw new Error('O cabeçalho da imagem é incompleto ou inválido. Exporta novamente para PNG, JPEG ou WebP.');
 if(largura>10000||altura>10000||largura*altura>40000000)throw new Error('A imagem excede 40 megapíxeis ou 10 000 px.');
 return{tipo,ext:tipo==='image/jpeg'?'jpg':tipo.split('/')[1],hash:createHash('sha256').update(b).digest('hex')};
}
export function lerImagemPedido(bruto:unknown){const v=z.object({nome:z.string().min(1).max(250),base64:z.string().min(20).max(Math.ceil(MAX_IMAGEM*4/3)+4)}).strict().parse(bruto);if(!/^[A-Za-z0-9+/]+={0,2}$/.test(v.base64))throw new Error('O ficheiro não foi recebido corretamente.');const bytes=Buffer.from(v.base64,'base64');return{...v,bytes,...validarImagem(bytes)};}
export class ImagensLocais{
 private fila:Promise<unknown>=Promise.resolve();constructor(private raiz:string){}
 private get pasta(){return path.join(this.raiz,'imagens');}
 async listar():Promise<ImagemGuardada[]>{try{return JSON.parse(await readFile(path.join(this.pasta,'catalogo.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return[];throw new Error('A biblioteca de imagens não pôde ser lida.');}}
 async guardar(bruto:unknown){const v=lerImagemPedido(bruto);const t=this.fila.then(async()=>{await mkdir(this.pasta,{recursive:true,mode:0o700});const lista=await this.listar(),anterior=lista.find(x=>x.hash===v.hash);if(anterior)return anterior;const imagem:ImagemGuardada={id:randomUUID(),hash:v.hash,nome:v.nome,tipo:v.tipo,bytes:v.bytes.length,criadaEm:new Date().toISOString()};await writeFile(path.join(this.pasta,imagem.id),v.bytes,{mode:0o600,flag:'wx'});await escreverAtomico(path.join(this.pasta,'catalogo.json'),[imagem,...lista]);return imagem;});this.fila=t.catch(()=>{});return t;}
 async ficheiro(id:string){z.string().uuid().parse(id);const i=(await this.listar()).find(v=>v.id===id);if(!i)throw new Error('Imagem não encontrada.');const bytes=await readFile(path.join(this.pasta,id));if(validarImagem(bytes).hash!==i.hash)throw new Error('A integridade da imagem não foi confirmada.');return{...i,bytes};}
}
