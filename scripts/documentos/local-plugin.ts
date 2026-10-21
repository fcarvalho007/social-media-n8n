import type { Plugin } from 'vite';
import { obterPublico } from './obter';
import { MotorDocumentos } from './motor-local';
import fontes from './fontes-originais.json';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import {binarioLegado,lerCatalogoLegado} from './legado-local';

export function documentosLocal(): Plugin {
  return { name: 'hub-documentos-local', configureServer(server) {
    const motor = new MotorDocumentos(path.join(server.config.root,'.documentos-local'),fontes);
    server.middlewares.use('/__hub-documentos', async (req, res) => {
      res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
      const origem = req.headers.origin;
      const host = req.headers.host ?? '';
      const remoto=req.socket.remoteAddress;
      const loopback=remoto==='127.0.0.1'||remoto==='::1'||remoto==='::ffff:127.0.0.1';
      // Same-origin POST, JSON and loopback host prevent another website driving this downloader.
      if (!loopback || req.method !== 'POST' || !/^127\.0\.0\.1:\d+$/.test(host) || origem !== `http://${host}` || !req.headers['content-type']?.startsWith('application/json')) { res.statusCode = 403; res.end('Pedido local recusado.'); return; }
      const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 35000);
      res.on('close', () => ctrl.abort());
      try {
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 16000) throw new Error('Pedido demasiado grande.'); }
        const args = JSON.parse(body); const acao = req.url?.split('?')[0];
        if (acao === '/obter') {
          const r = await obterPublico(args.url, ctrl.signal);
          res.setHeader('Content-Type', r.tipo || 'application/octet-stream'); res.setHeader('X-Hub-Url-Final', encodeURIComponent(r.url)); res.end(r.bytes);
        } else if(acao==='/legado/pdf'){
          const bytes=await binarioLegado(path.join(server.config.root,'.documentos-local'),args.hash);res.setHeader('Content-Type','application/pdf');res.end(bytes);
        } else if (acao === '/pdf') {
          const bytes = await motor.binario(args.id,args.ambito,args.hash); res.setHeader('Content-Type','application/pdf'); res.end(bytes);
        } else {
          let data: unknown;
          if (acao === '/fontes') data = fontes;
          else if(acao==='/legado/catalogo')data=await lerCatalogoLegado(path.join(server.config.root,'.documentos-local'));
          else if (acao === '/diagnostico') { try { data = JSON.parse(await readFile(path.join(server.config.root,'docs/auditorias/fontes-pdfs-2026-10-18.json'),'utf8')); } catch { data = null; } }
          else if (acao === '/tarefas') data = await motor.listar(args.ambito);
          else if (acao === '/iniciar') { if (!['diagnostico','recolher'].includes(args.modo)) throw new Error('Modo inválido.'); data = await motor.iniciar(args.ambito,args.ids,args.modo); }
          else if (acao === '/ler') data = await motor.ler(args.id,args.ambito);
          else if (acao === '/retomar') data = await motor.retomar(args.id,args.ambito);
          else if (acao === '/artigo') data = await motor.lerArtigo(args.id,args.ambito,args.url);
          else if (acao === '/confirmar') { await motor.confirmar(args.id,args.ambito,args.hash,args.documentoId,args.erro,args.capaCriada,args.capaErro,args.titulo); data = {ok:true}; }
          else throw new Error('Operação não reconhecida.');
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data));
        }
      } catch (e) {
        res.statusCode = 422; res.setHeader('Content-Type', 'application/json');
        const message = e instanceof Error && !/ENOTFOUND|ECONN|certificate|fetch|aborted/i.test(e.message) ? e.message : 'Não foi possível obter o endereço. Verifica a ligação ou carrega o PDF manualmente.';
        res.end(JSON.stringify({ erro: message }));
      } finally { clearTimeout(timer); }
    });
  } };
}
