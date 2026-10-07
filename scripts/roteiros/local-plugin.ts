import { loadEnv, type Plugin } from 'vite';
import { gerarRoteiro } from '../../supabase/functions/_shared/roteiros/gerar';
import { chamarGateway } from '../../supabase/functions/_shared/motor/gateway.server';
import { MODELO_DEEPSEEK } from '../../supabase/functions/_shared/deepseek-direto';
import type { Roteiro, GeracaoRoteiro } from '../../supabase/functions/_shared/roteiros/modelo';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { inspecionarImagem } from '../../supabase/functions/_shared/motor/fontes';
import { sha256Hex, nomeCarregado } from '../../supabase/functions/_shared/motor/carregar.server';
/** Isolated PostgreSQL engine on disk. No Supabase credentials or production writes. */
export function roteirosLocal(): Plugin {
 let database: Promise<PGlite> | undefined;
 const root = process.cwd();
 let chave = process.env.DEEPSEEK_API_KEY ?? loadEnv('roteiros',root,'DEEPSEEK_').DEEPSEEK_API_KEY;
 const tarefas = new Set<Promise<void>>();
 function db() { return database ??= (async () => {
  const d = new PGlite(path.join(root, '.roteiros-local'));
  const exists = await d.query<{ name: string | null }>("SELECT to_regclass('public.rv_roteiros')::text AS name");
  if (!exists.rows[0].name) { await d.exec(await readFile(path.join(root, 'scripts/roteiros/base-local.sql'), 'utf8')); await d.exec(await readFile(path.join(root, 'drizzle/migrations/0045_roteiros_reels.sql'), 'utf8')); }
  const upgraded = await d.query<{ok:boolean}>("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='rv_geracoes' AND column_name='contexto') AS ok");
  if (!upgraded.rows[0].ok) await d.exec(await readFile(path.join(root,'drizzle/migrations/0046_roteiros_refinamento.sql'),'utf8'));
  await d.exec(await readFile(path.join(root,'drizzle/migrations/0048_roteiros_permissoes.sql'),'utf8'));
  await d.exec("CREATE TABLE IF NOT EXISTS public.mc_assets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),project_id uuid NOT NULL REFERENCES projects(id),hash text NOT NULL,mime text NOT NULL,largura integer NOT NULL,altura integer NOT NULL,dados text NOT NULL,nome text NOT NULL,credito text,UNIQUE(project_id,hash))");
  await d.exec(await readFile(path.join(root,'drizzle/migrations/0049_roteiros_materiais.sql'),'utf8'));
  await d.exec("SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000009'"); return d;
 })(); }
 return { name: 'roteiros-local-postgres', configureServer(server) {
  server.middlewares.use(async (req, res, next) => {
   if (req.url?.split('?')[0] !== '/__roteiros_local') return next();
   const origem = req.headers.origin;
   if (!/^127\.0\.0\.1:\d+$/.test(req.headers.host ?? '') || (origem && origem !== `http://${req.headers.host}`)) { res.statusCode = 403; return res.end('Local only'); }
   res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','no-store');
   if (req.method !== 'POST') { res.statusCode=405; return res.end('{}'); }
   try {
    let input=''; for await (const chunk of req) { input+=chunk; if (input.length>9*1024*1024) throw new Error('Pedido demasiado grande'); }
    const { acao, args = {} } = JSON.parse(input); const d=await db(); let data: unknown;
    const run = async (sql: string, params: unknown[] = []): Promise<Array<Record<string, unknown>>> => (await d.query(sql,params)).rows as Array<Record<string, unknown>>;
    if(acao!=='asset_carregar'&&input.length>350000)throw new Error('Pedido demasiado grande');
    if(acao==='assets_listar'||acao==='assets_ler'||acao==='asset_carregar'){
     if(!(await run('SELECT mc_pode_escrever($1) AS ok',[args.project]))[0]?.ok)throw new Error('Sem acesso ao projeto');
     if(acao==='assets_listar')data=await run('SELECT id,nome FROM mc_assets WHERE project_id=$1 ORDER BY id',[args.project]);
     else if(acao==='assets_ler'){if(!Array.isArray(args.ids)||args.ids.length>30)throw new Error('Imagens inválidas');const rows=await run('SELECT id,mime,largura,altura,dados,nome,credito FROM mc_assets WHERE project_id=$1 AND id=ANY($2::uuid[])',[args.project,args.ids]);if(rows.length!==new Set(args.ids).size)throw new Error('Imagem indisponível');data=Object.fromEntries(rows.map(a=>[a.id,a]));}
     else{if(typeof args.dados!=='string'||args.dados.length>8388612||!/^([A-Za-z0-9+/]+={0,2})$/.test(args.dados))throw new Error('Imagem inválida ou maior que 6 MB');const bytes=new Uint8Array(Buffer.from(args.dados,'base64'));const info=inspecionarImagem(bytes);const hash=await sha256Hex(bytes);const a=(await run('INSERT INTO mc_assets(project_id,hash,mime,largura,altura,dados,nome) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(project_id,hash) DO NOTHING RETURNING *',[args.project,hash,info.mime,info.largura,info.altura,args.dados,nomeCarregado(args.nome)]))[0]??(await run('SELECT * FROM mc_assets WHERE project_id=$1 AND hash=$2',[args.project,hash]))[0];data=a;}
    }
    else if (acao==='ia_estado') data={disponivel:!!chave,limite:(await run('SELECT max_chamadas_dia FROM mc_orcamentos LIMIT 1'))[0]?.max_chamadas_dia??0};
    else if (acao==='ia_configurar') { if (typeof args.chave!=='string'||args.chave.trim().length<10||args.chave.length>500||!Number.isInteger(args.limite)||args.limite<1||args.limite>20) throw new Error('Indica uma chave e um limite diário de 1 a 20 pedidos.'); chave=args.chave.trim(); await run('UPDATE mc_orcamentos SET max_chamadas_dia=$1',[args.limite]); data={disponivel:true,limite:args.limite}; }
    else if (acao==='gerar') {
     if (!chave || args.confirmar!==true) throw new Error('Configura a DeepSeek e confirma o pedido pago.');
     const r=(await run('SELECT * FROM rv_roteiros WHERE id=$1',[args.roteiro.id]))[0] as unknown as Roteiro;
     if (!r) throw new Error('Roteiro não encontrado');
     const reserva=(await run('SELECT rv_reservar_contexto($1,$2,$3,$4,$5,$6,$7) AS reserva',[args.id,r.id,args.roteiro.revisao,args.pedido?.modo??'roteiro',args.pedido?.variante_id??null,args.pedido?.cena_id??null,args.pedido?.estilo??'alternativa']))[0].reserva as {nova:boolean;geracao:GeracaoRoteiro};
     data=reserva.geracao;
     if (reserva.nova) {
      const chavePedido=chave;
      const tarefa=(async()=>{const g=reserva.geracao;const resultado=await gerarRoteiro(r.fonte,g.brief,(s,t)=>chamarGateway(MODELO_DEEPSEEK,s,t,(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(180000)}),chavePedido),g.contexto);await run('SELECT rv_concluir($1,$2,$3::jsonb,$4,$5,$6,$7)',[g.id,resultado.estado,JSON.stringify(resultado.resultado),resultado.erro,MODELO_DEEPSEEK,resultado.entrada,resultado.saida]);})();
      tarefas.add(tarefa); void tarefa.catch(()=>console.error('[roteiros-local] Resultado não confirmado; consultar o pedido.')).finally(()=>tarefas.delete(tarefa));
     }
    }
    else if (acao==='projetos') data=await run('SELECT id,name FROM projects');
    else if (acao==='listar') data=await run('SELECT * FROM rv_roteiros WHERE project_id=$1 ORDER BY atualizado_em DESC LIMIT 100',[args.project]);
    else if (acao==='obter') { data=(await run('SELECT * FROM rv_roteiros WHERE id=$1',[args.id]))[0]; if (!data) throw new Error('Roteiro não encontrado'); }
    else if (acao==='criar') data=(await run('SELECT * FROM rv_criar($1,$2,$3::jsonb,$4::jsonb)',[args.id,args.project,JSON.stringify(args.fonte),JSON.stringify(args.brief)]))[0];
    else if (acao==='guardar') data=(await run('SELECT * FROM rv_guardar($1,$2,$3::jsonb,$4::jsonb)',[args.id,args.revisao,JSON.stringify(args.brief),JSON.stringify(args.documento)]))[0];
    else if (acao==='historico') data=await run('SELECT revisao,brief,documento,criado_em FROM rv_versoes WHERE roteiro_id=$1 ORDER BY revisao DESC LIMIT 50',[args.id]);
    else if (acao==='geracoes') data=await run('SELECT * FROM rv_geracoes WHERE roteiro_id=$1 ORDER BY criado_em DESC LIMIT 20',[args.id]);
    else if (acao==='noticias') data=await run('SELECT * FROM rv_noticias_local ORDER BY criado_em DESC');
    else if (acao==='fonte') data=(await run('SELECT nl_curadoria_snapshot($1) AS fonte',[args.id]))[0]?.fonte;
    else if (acao==='noticia_criar') { if (typeof args.titulo!=='string'||!args.titulo.trim()||args.titulo.length>200||typeof args.texto!=='string'||args.texto.trim().length<40||args.texto.length>60000) throw new Error('Preenche título e texto (mínimo 40 caracteres).'); data=await run('INSERT INTO rv_noticias_local(titulo,texto) VALUES($1,$2) RETURNING id',[args.titulo,args.texto]); }
    else if (acao==='decidir') { if (!['pendente','aprovada','rejeitada'].includes(args.estado)) throw new Error('Estado inválido'); data=await run('UPDATE rv_noticias_local SET estado=$2 WHERE id=$1',[args.id,args.estado]); }
    else throw new Error('Ação indisponível nesta pré-visualização.');
    res.end(JSON.stringify({data}));
   } catch (e) { res.statusCode=400; res.end(JSON.stringify({error:(e as Error).message})); }
  });
  server.middlewares.use((req,_res,next) => { if(req.headers.accept?.includes('text/html')&&!req.url?.split('?')[0].includes('.')) req.url='/roteiros-preview.html'; next(); });
 }};
}
