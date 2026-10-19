import { obterPublico } from '../documentos/obter';
import { ImagensLocais, validarImagem } from './imagens';
import { IntegracoesEditorais, lerDestinosWebhook } from './integracoes';
import { GlossariosEditorial } from './glossarios';
import { criarPlano, bibliotecaPesquisas } from './planeamento';
import { InventarioEditorial } from './inventario';
import { LotesEditorial } from './lotes';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { setInterval, clearInterval } from 'node:timers';
import { loadEnv, type Plugin } from 'vite';
import path from 'node:path';
import { MotorSeo } from './motor-local';
import { projetarEstado } from '../backend/percurso';
import { z } from 'zod';
import { operarCampanha } from '../backend/campanhas';
import { guardarCredenciaisLocais, lerCredenciaisLocais } from './credenciais';
import type { CredenciaisSeo } from './motor-local';
export function seoLocal():Plugin {
  return {name:'hub-pesquisa-editorial-local',configureServer(server){
    const raiz=path.join(server.config.root,'.seo-local');let privadas:CredenciaisSeo={};let filaCredenciais:Promise<unknown>=Promise.resolve();
    const credenciais=()=>{const e=loadEnv('seo',server.config.root,'');return {login:privadas.login??process.env.DATAFORSEO_LOGIN??e.DATAFORSEO_LOGIN,password:privadas.password??process.env.DATAFORSEO_PASSWORD??e.DATAFORSEO_PASSWORD,deepseek:privadas.deepseek??process.env.DEEPSEEK_API_KEY??e.DEEPSEEK_API_KEY};};
    const motor=new MotorSeo(raiz,credenciais),imagens=new ImagensLocais(raiz);
    server.middlewares.use('/__hub-imagens',async(req,res)=>{try{const remoto=req.socket.remoteAddress,host=req.headers.host??'';if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(remoto??'')||!/^127\.0\.0\.1:\d+$/.test(host)||req.method!=='GET')throw new Error('Acesso local obrigatório.');const id=new URL(req.url??'','http://local').searchParams.get('id')??'',r=await imagens.ficheiro(id);res.setHeader('Content-Type',r.tipo);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, max-age=300');res.end(r.bytes);}catch{res.statusCode=404;res.end();}});
    const pronto=(async()=>{privadas=await lerCredenciaisLocais(raiz);await motor.iniciar();})();void pronto.catch(()=>{});
    const integracoes=()=>new IntegracoesEditorais(motor.repo,'local',()=>lerDestinosWebhook(process.env.HUB_WEBHOOKS_EDITORIAIS));
    const timer=setInterval(()=>{void pronto.then(async()=>{await motor.executarCiclo();await integracoes().processar();}).catch(()=>{});},60000);timer.unref();
    server.httpServer?.once('close',()=>{clearInterval(timer);void pronto.then(()=>motor.fechar()).catch(()=>{});});
    server.middlewares.use('/__hub-seo',async(req,res)=>{
      res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type','application/json');
      const host=req.headers.host??'',remoto=req.socket.remoteAddress;
      const loopback=remoto==='127.0.0.1'||remoto==='::1'||remoto==='::ffff:127.0.0.1';
      if(!loopback||req.method!=='POST'||!/^127\.0\.0\.1:\d+$/.test(host)||req.headers.origin!==`http://${host}`||!req.headers['content-type']?.startsWith('application/json')){res.statusCode=403;res.end(JSON.stringify({erro:'Este pedido só pode partir do Hub local.'}));return;}
      try{await pronto;let corpo='';for await(const parte of req){corpo+=parte;if(Buffer.byteLength(corpo)>(req.url?.startsWith('/imagem-guardar')?12000000:req.url?.startsWith('/glossario-guardar')?1300000:req.url?.startsWith('/campanha-composicao-guardar')?1700000:300000))throw new Error('O pedido excede o limite local. Reduz os excertos ou os recursos.');}const a=JSON.parse(corpo||'{}');if(!a||typeof a!=='object'||Array.isArray(a))throw new Error('Pedido inválido.');
        if(req.url?.startsWith('/campanha-')){res.end(JSON.stringify(await operarCampanha(motor,req.url.split('?')[0].slice(1),a)));return;}
        const id=(v:unknown)=>z.string().uuid().parse(v);let dados:unknown;
        switch(req.url?.split('?')[0]){
          case '/credenciais':{const grava=filaCredenciais.then(async()=>{privadas=await guardarCredenciaisLocais(raiz,privadas,a.credenciais);});filaCredenciais=grava.catch(()=>{});await grava;dados={guardado:true};break;}
          case '/pausar':dados=await motor.pausar();break;
          case '/inventario-descobrir':dados=await new InventarioEditorial(motor.repo).descobrir(z.string().max(80).parse(a.siteId));break;
          case '/inventario-verificar':dados=await new InventarioEditorial(motor.repo).verificar(z.string().max(80).parse(a.siteId),z.number().int().nonnegative().parse(a.revista),z.array(z.string().max(2000)).min(1).max(10).parse(a.urls),a.importar===true);break;
          case '/lote-proxima-etapa':dados=await new LotesEditorial(motor).proximaEtapa(id(a.id));break;
          case '/lote-criar':dados=await new LotesEditorial(motor).criar(a.lote);break;
          case '/lote-configurar':dados=await new LotesEditorial(motor).configurar(id(a.id),z.number().int().positive().parse(a.revista),z.number().int().positive().parse(a.tetoMicro),a.autorizar===true,a.confirmacao===true);break;
          case '/plano-criar':dados=await criarPlano(motor.repo,a.plano);break;
          case '/biblioteca-pesquisas':dados=await bibliotecaPesquisas(motor.repo);break;
          case '/glossario-guardar':dados=await new GlossariosEditorial(motor.repo).guardar(a.glossario);break;
          case '/glossario-preparar':dados=await new GlossariosEditorial(motor.repo).preparar(id(a.id),z.number().int().positive().parse(a.versao),a.termoId?id(a.termoId):null);break;
          case '/integracoes-estado':dados=await integracoes().estado();break;
          case '/integracoes-guardar':dados=await integracoes().guardar(a.configuracao);break;
          case '/integracoes-repetir':dados=await integracoes().repetir(z.string().parse(a.eventoId),z.string().parse(a.destinoId));break;
          case '/integracoes-processar':dados=await integracoes().processar();break;
          case '/imagens-listar':dados=(await imagens.listar()).map(i=>({...i,url:`/__hub-imagens/ficheiro?id=${i.id}`}));break;
          case '/imagem-detalhe':{const i=(await imagens.listar()).find(i=>i.id===id(a.id));if(!i)throw new Error('Imagem não encontrada.');dados={...i,url:`/__hub-imagens/ficheiro?id=${i.id}`};break;}
          case '/imagem-exportar':{const i=a.id?await imagens.ficheiro(id(a.id)):await obterPublico(z.string().url().max(2000).parse(a.url),AbortSignal.timeout(20000),{maxBytes:8388608});dados={tipo:validarImagem(i.bytes).tipo,base64:Buffer.from(i.bytes).toString('base64')};break;}
          case '/imagem-importar':{const r=await obterPublico(z.string().url().max(2000).parse(a.url),AbortSignal.timeout(20000),{maxBytes:8388608});const i=await imagens.guardar({nome:new URL(r.url).pathname.split('/').at(-1)||'imagem',base64:r.bytes.toString('base64')});dados={...i,url:`/__hub-imagens/ficheiro?id=${i.id}`};break;}
          case '/imagem-guardar':{const i=await imagens.guardar(a.imagem);dados={...i,url:`/__hub-imagens/ficheiro?id=${i.id}`};break;}
          case '/estado':dados=await motor.estado();break;
          case '/percurso':dados=projetarEstado(await motor.estado(),[],false,true);break;
          case '/orcamento':dados=await motor.orcamentarPesquisa(a.pesquisa);break;
          case '/conhecimento':dados=await motor.guardarConhecimento(z.string().max(80).parse(a.siteId),a.conhecimento);break;
          case '/conhecimento-documento':dados=await motor.adicionarDocumentoConhecimento(z.string().max(80).parse(a.siteId),z.number().int().nonnegative().parse(a.revista),a.documento,a.confirmacao===true);break;
          case '/usar-conhecimento':dados=await motor.usarConhecimento(id(a.id),z.number().int().parse(a.versao));break;
          case '/confirmar-estrutura':dados=await motor.confirmarEstrutura(id(a.id),z.number().int().parse(a.versao),a.estrutura,a.confirmacao===true);break;
          case '/orcamento-estrutura':dados=await motor.orcamentarTexto(id(a.id),false,'estrutura');break;
          case '/orcamento-refinamento':dados=await motor.orcamentarTexto(id(a.id),false,'texto',a.revisao);break;
          case '/descartar-proposta':dados=await motor.descartarProposta(id(a.id),z.number().int().positive().parse(a.versao));break;
          case '/orcamento-texto':dados=await motor.orcamentarTexto(id(a.id));break;
          case '/executar':dados=await motor.executar(id(a.id),a.confirmar===true);break;
          case '/resultado':dados=await motor.resultado(id(a.id));break;
          case '/configuracao':dados=await motor.guardarConfiguracao(a.configuracao);break;
          case '/configurar-site':dados=await motor.configurarSite(z.string().max(80).parse(a.siteId),z.number().int().positive().parse(a.revista),a.definicao,a.confirmacao===true);break;
          case '/politica':dados=await motor.guardarPolitica(z.string().max(80).parse(a.siteId),a.politica,z.number().int().parse(a.revista),a.identidade);break;
          case '/pauta':if(a.pauta?.texto?.imagem?.id)await imagens.ficheiro(id(a.pauta.texto.imagem.id));dados=await motor.guardarPauta(a.pauta);break;
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
