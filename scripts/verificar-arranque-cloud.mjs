// Reproduces Cloud module resolution outside this repository, with no network or credentials.
import { mkdtemp, copyFile, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path'; import os from 'node:os';
const pasta = await mkdtemp(path.join(os.tmpdir(), 'hub-cloud-inicio-'));
try {
  for (const f of ['runtime.js', 'deno.json']) await copyFile(`supabase/functions/hub-editorial/${f}`, path.join(pasta, f));
  await writeFile(path.join(pasta, 'verificar.mjs'), `
import{criarRuntimeEdge}from'./runtime.js';
const e={SUPABASE_URL:'https://backend.example',SUPABASE_ANON_KEY:'anon-teste',SUPABASE_SERVICE_ROLE_KEY:'servico-teste',HUB_ORIGENS:'https://hub.example'};
const r=criarRuntimeEdge({get:n=>e[n],lerWasm:async()=>{throw new Error('Não necessário para autenticação');}});
const a=await r.fetch(new Request('https://backend.example/functions/v1/hub-editorial/seo/estado',{method:'POST',headers:{origin:'https://hub.example','content-type':'application/json'},body:'{}'}));
const b=await r.trabalhar(new Request('https://backend.example/functions/v1/hub-editorial-worker',{method:'POST'}));
const c=await r.fetch(new Request('https://backend.example/functions/v1/hub-editorial/seo/estado',{method:'POST',headers:{origin:'https://outro.example'},body:'{}'}));
const projeto='11111111-1111-4111-8111-111111111111';
const userId='22222222-2222-4222-8222-222222222222';
const acessos=[];
globalThis.fetch=async(input,opcoes={})=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 const method=opcoes.method??(input instanceof Request?input.method:'GET');
 if(url.origin!=='https://backend.example')throw new Error('Rede externa proibida no ensaio');
 acessos.push(method+' '+url.pathname);
 if(url.pathname==='/auth/v1/user')return Response.json({id:userId,aud:'authenticated',role:'authenticated'});
 if(url.pathname==='/rest/v1/rpc/mc_pode_ler'||url.pathname==='/rest/v1/rpc/mc_pode_escrever')return Response.json(true);
 if(method!=='GET')throw new Error('Escrita não esperada no ensaio de leitura');
 if(url.pathname==='/rest/v1/hub_editorial_estados'||url.pathname==='/rest/v1/hub_operacao')return Response.json(null);
 if(url.pathname==='/rest/v1/hub_documentos'||url.pathname==='/rest/v1/hub_jobs')return Response.json([]);
 throw new Error('Pedido não previsto: '+url.pathname);
};
const leituras={};
for(const rota of ['seo/estado','operacao/estado','documentos/acervo']){
 const q=await r.fetch(new Request('https://backend.example/functions/v1/hub-editorial/'+rota,{method:'POST',headers:{origin:'https://hub.example',authorization:'Bearer sessao-sintetica','x-hub-projeto':projeto,'content-type':'application/json'},body:'{}'}));
 const dados=await q.json();leituras[rota]=q.status;
 if(q.status!==200)throw new Error('Leitura autenticada '+rota+': '+JSON.stringify(dados));
}
if(!acessos.some(x=>x.includes('hub_documentos')))throw new Error('Leitura não chegou ao repositório');
console.log(JSON.stringify({semNodeModulesLocal:true,apiAnonimo:a.status,workerAnonimo:b.status,origemEstranha:c.status,leiturasAutenticadas:leituras,pedidosReaisExternos:0}));
if(a.status!==401||b.status!==401||c.status!==403)Deno.exit(1);
`);
  const { stdout } = await promisify(execFile)(path.resolve('node_modules/.bin/deno'), ['run', '--cached-only', '--node-modules-dir=none', '--allow-read', '--allow-env', '--config', path.join(pasta, 'deno.json'), path.join(pasta, 'verificar.mjs')], { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
  process.stdout.write(stdout);
} finally { await rm(pasta, { recursive: true, force: true }); }
