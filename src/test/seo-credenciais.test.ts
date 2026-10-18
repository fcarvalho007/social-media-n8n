import { describe,expect,it } from 'vitest';
import {mkdtemp,stat,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {guardarCredenciaisLocais,lerCredenciaisLocais} from '../../scripts/seo/credenciais';
import {validarEstadoPersistido} from '../../scripts/seo/persistencia';
import {estadoInicialSeo} from '@/features/seo/catalogo';
describe('configuração privada local',()=>{
 it('guarda com permissões privadas, conserva o outro fornecedor e não usa variáveis VITE',async()=>{const raiz=await mkdtemp(path.join(tmpdir(),'hub-creds-'));const c=await guardarCredenciaisLocais(raiz,{}, {login:'teste@example.com',password:'senha-teste'});await guardarCredenciaisLocais(raiz,c,{deepseek:'chave-teste'});expect((await stat(path.join(raiz,'credenciais.json'))).mode&0o777).toBe(0o600);expect(await lerCredenciaisLocais(raiz)).toEqual({login:'teste@example.com',password:'senha-teste',deepseek:'chave-teste'});expect(await readFile(path.join(raiz,'credenciais.json'),'utf8')).not.toContain('VITE_');});
 it('recusa gravação parcial e quebras de linha nas credenciais',async()=>{const raiz=await mkdtemp(path.join(tmpdir(),'hub-creds-'));await expect(guardarCredenciaisLocais(raiz,{}, {login:'teste@example.com'})).rejects.toThrow();await expect(guardarCredenciaisLocais(raiz,{}, {login:'teste@example.com',password:'senha\nVITE_SECRET=valor'})).rejects.toThrow();});
 it('não interpreta limites corrompidos como um histórico de custo zero',()=>{const e=estadoInicialSeo();e.configuracao.diarioMicro=NaN;expect(()=>validarEstadoPersistido(e)).toThrow('preservado');});
 it('o estado do site pessoal não pode perder silenciosamente o requisito de revisão',()=>{const e=estadoInicialSeo();e.sites.find(s=>s.id==='frederico')!.revisaoObrigatoria=false;expect(()=>validarEstadoPersistido(e)).toThrow('inválidos');});
});
