import { Buffer } from 'node:buffer';
import process from 'node:process';
import { setInterval, clearInterval } from 'node:timers';
import { loadEnv, type Plugin } from 'vite';
import path from 'node:path';
import { MotorSeo } from './motor-local';
import { z } from 'zod';
import { guardarCredenciaisLocais, lerCredenciaisLocais } from './credenciais';
import type { CredenciaisSeo } from './motor-local';
export function seoLocal():Plugin {
  return {name:'hub-pesquisa-editorial-local',configureServer(server){
    const raiz=path.join(server.config.root,'.seo-local');let privadas:CredenciaisSeo={};let filaCredenciais:Promise<unknown>=Promise.resolve();
    const credenciais=()=>{const e=loadEnv('seo',server.config.root,'');return {login:privadas.login??process.env.DATAFORSEO_LOGIN??e.DATAFORSEO_LOGIN,password:privadas.password??process.env.DATAFORSEO_PASSWORD??e.DATAFORSEO_PASSWORD,deepseek:privadas.deepseek??process.env.DEEPSEEK_API_KEY??e.DEEPSEEK_API_KEY};};
    const motor=new MotorSeo(raiz,credenciais);
    const pronto=(async()=>{privadas=await lerCredenciaisLocais(raiz);await motor.iniciar();})();void pronto.catch(()=>{});
    const timer=setInterval(()=>{void pronto.then(()=>motor.executarCiclo()).catch(()=>{});},60000);timer.unref();
    server.httpServer?.once('close',()=>{clearInterval(timer);void pronto.then(()=>motor.fechar()).catch(()=>{});});
    server.middlewares.use('/__hub-seo',async(req,res)=>{
      res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json');
      const host=req.headers.host??'',remoto=req.socket.remoteAddress;
      const loopback=remoto==='127.0.0.1'||remoto==='::1'||remoto==='::ffff:127.0.0.1';
      if(!loopback||req.method!=='POST'||!/^127\.0\.0\.1:\d+$/.test(host)||req.headers.origin!==`http://${host}`||!req.headers['content-type']?.startsWith('application/json')){res.statusCode=403;res.end(JSON.stringify({erro:'Este pedido só pode partir do Hub local.'}));return;}
      try{await pronto;let corpo='';for await(const parte of req){corpo+=parte;if(Buffer.byteLength(corpo)>300000)throw new Error('O pedido excede o limite local. Reduz os excertos ou a lista.');}const a=JSON.parse(corpo||'{}');if(!a||typeof a!=='object'||Array.isArray(a))throw new Error('Pedido inválido.');
        const id=(v:unknown)=>z.string().uuid().parse(v);let dados:unknown;
        switch(req.url?.split('?')[0]){
          case '/credenciais':{const grava=filaCredenciais.then(async()=>{privadas=await guardarCredenciaisLocais(raiz,privadas,a.credenciais);});filaCredenciais=grava.catch(()=>{});await grava;dados={guardado:true};break;}
          case '/pausar':dados=await motor.pausar();break;
          case '/estado':dados=await motor.estado();break;
          case '/orcamento':dados=await motor.orcamentarPesquisa(a.pesquisa);break;
          case '/conhecimento':dados=await motor.guardarConhecimento(z.string().max(80).parse(a.siteId),a.conhecimento);break;
          case '/usar-conhecimento':dados=await motor.usarConhecimento(id(a.id),z.number().int().parse(a.versao));break;
          case '/confirmar-estrutura':dados=await motor.confirmarEstrutura(id(a.id),z.number().int().parse(a.versao),a.estrutura,a.confirmacao===true);break;
          case '/orcamento-estrutura':dados=await motor.orcamentarTexto(id(a.id),false,'estrutura');break;
          case '/orcamento-texto':dados=await motor.orcamentarTexto(id(a.id));break;
          case '/executar':dados=await motor.executar(id(a.id),a.confirmar===true);break;
          case '/resultado':dados=await motor.resultado(id(a.id));break;
          case '/configuracao':dados=await motor.guardarConfiguracao(a.configuracao);break;
          case '/politica':dados=await motor.guardarPolitica(z.string().max(80).parse(a.siteId),a.politica,z.number().int().parse(a.revista),a.identidade);break;
          case '/pauta':dados=await motor.guardarPauta(a.pauta);break;
          case '/planear':dados=await motor.planear(id(a.id),z.array(z.string().max(80)).min(1).max(20).parse(a.palavras),z.string().max(80).parse(a.siteId));break;
          case '/aplicar':dados=await motor.aplicarProposta(id(a.id),z.number().int().parse(a.versao));break;
          case '/aprovar':dados=await motor.aprovar(id(a.id),z.number().int().parse(a.versao),a.confirmacao===true);break;
          case '/reconciliar':dados=await motor.reconciliar(id(a.id),a.micro,a.nota);break;
          case '/ligacao':dados=await motor.verificarLigacao();break;
          case '/ciclo':dados=await motor.preverCiclo();break;
          case '/executar-ciclo':void motor.executarCiclo().catch(()=>{});dados={iniciado:true};break;
          default:res.statusCode=404;throw new Error('Operação local não reconhecida.');
        }res.end(JSON.stringify(dados));
      }catch(e){res.statusCode=res.statusCode===404?404:422;const mensagem=e instanceof z.ZodError?`Confere os campos do pedido: ${e.issues.map(i=>i.path.join('.')).filter(Boolean).join(', ')}.`:e instanceof Error&&!/ENOTFOUND|ECONN|certificate|fetch failed|aborted|timed out/i.test(e.message)?e.message:'O serviço não respondeu. Verifica o histórico antes de repetir um pedido pago.';res.end(JSON.stringify({erro:mensagem}));}
    });
  }};
}
