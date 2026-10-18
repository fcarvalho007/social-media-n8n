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
console.log(JSON.stringify({semNodeModulesLocal:true,apiAnonimo:a.status,workerAnonimo:b.status,origemEstranha:c.status}));
if(a.status!==401||b.status!==401||c.status!==403)Deno.exit(1);
`);
  const { stdout } = await promisify(execFile)(path.resolve('node_modules/.bin/deno'), ['run', '--cached-only', '--node-modules-dir=none', '--allow-read', '--allow-env', '--config', path.join(pasta, 'deno.json'), path.join(pasta, 'verificar.mjs')], { timeout: 60000, maxBuffer: 2 * 1024 * 1024 });
  process.stdout.write(stdout);
} finally { await rm(pasta, { recursive: true, force: true }); }
