import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { escreverAtomico } from './persistencia';
import type { CredenciaisSeo } from './motor-local';
const segredo=z.string().min(5).max(2000).refine(s=>!/[\r\n\0]/.test(s),'A credencial não pode conter quebras de linha.');
export const schemaCredenciaisSeo=z.object({login:z.string().trim().min(3).max(200).refine(s=>!/[\r\n\0:]/.test(s)),password:segredo,deepseek:segredo}).partial().strict();
export async function lerCredenciaisLocais(raiz:string):Promise<CredenciaisSeo>{try{const j=JSON.parse(await readFile(path.join(raiz,'credenciais.json'),'utf8'));return schemaCredenciaisSeo.parse(j);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {};throw new Error('A configuração privada de credenciais está inválida. Os dados foram preservados; confere o ficheiro local.');}}
export async function guardarCredenciaisLocais(raiz:string,anteriores:CredenciaisSeo,bruto:unknown){const c=schemaCredenciaisSeo.parse(bruto);if(!c.deepseek&&(!c.login||!c.password))throw new Error('Indica o login e a senha API DataForSEO, ou uma chave DeepSeek.');if((c.login&&!c.password)||(!c.login&&c.password))throw new Error('O login e a senha DataForSEO devem ser guardados em conjunto.');const novo={...anteriores,...c};await escreverAtomico(path.join(raiz,'credenciais.json'),novo);return novo;}
