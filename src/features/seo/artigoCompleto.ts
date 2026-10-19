import { z } from 'zod';
export const schemaImagemArtigo=z.object({id:z.string().uuid().optional(),url:z.string().max(2000).default(''),alt:z.string().trim().max(500),titulo:z.string().trim().max(200),legenda:z.string().max(1000),credito:z.string().max(500)}).strict().refine(v=>!!v.id||(()=>{try{const u=new URL(v.url);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}})(),'Escolhe uma imagem guardada ou uma URL HTTPS pública.');
export type ImagemArtigo=z.infer<typeof schemaImagemArtigo>;
export const schemaSeoArtigo=z.object({enviar:z.boolean().optional(),titulo:z.string().max(200).optional(),descricao:z.string().max(320),schema:z.enum(['Article','BlogPosting','nenhum'])}).strict();
export interface ImagemGuardada {id:string;hash:string;nome:string;tipo:string;bytes:number;criadaEm:string;url?:string}

export type zSeoArtigo=z.infer<typeof schemaSeoArtigo>;
