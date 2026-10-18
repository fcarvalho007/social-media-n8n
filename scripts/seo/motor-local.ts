import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { RepositorioSeo, type ArmazemSeo } from './persistencia';
import { chavePesquisa, exemploPesquisa, normalizarResposta, numero, objeto, pedirDataforseo, prepararPesquisa, vetor } from './dataforseo';
import { estimarPesquisa, OPERACOES_SEO, PRECOS_SEO_EM, diaLisboa } from '../../src/features/seo/precos';
import { bloqueiosProducao, exigeRevisao, normalizarSeo, slotLocal, triagemPublicacao, validarConfig, validarPolitica, schemaConfiguracaoSeo, schemaPoliticaSeo } from '../../src/features/seo/politicas';
import { assinaturaPauta, assinaturaBaseEstrutura, estruturaAtual, estimarTexto, lerTextoProduzido, lerEstruturaProduzida, produzirTexto, schemaPauta } from './editorial';
import type { ConfigGeralSeo, PoliticaSite, DadosPautaEditorial, EstadoPublicoSeo, EstadoSeo, OrcamentoSeo, PautaEditorial, PedidoSeo, PesquisaGuardada, PesquisaSeo, SiteEditorial } from '../../src/features/seo/contratos';
import type { ConhecimentoMarca, EstruturaArtigo } from '../../src/features/seo/sequencia';
import { schemaConhecimento, schemaEstrutura, guiaInicial, bloqueiosEstrutura, sugerirConhecimento, urlPublicaEditorial, paginaDoSite } from '../../src/features/seo/sequencia';
export interface CredenciaisSeo { login?: string; password?: string; deepseek?: string }
const erro = (m: string): never => { throw new Error(m); };
const siteDe = (e: Pick<EstadoSeo,'sites'>, id: string) => e.sites.find(s=>s.id===id)??erro('Site não encontrado.');
const pautaDe = (e: EstadoSeo,id:string) => e.pautas.find(p=>p.id===id)??erro('Pauta não encontrada.');
function auditar(e:EstadoSeo,acao:string,alvo:string,detalhe:string,agora:Date){e.auditoria.push({id:randomUUID(),em:agora.toISOString(),acao,alvo,detalhe});}
export function verificarLimites(e:EstadoSeo,site:SiteEditorial,micro:number,agora:Date) {
  if(e.configuracao.pausado)throw new Error('Os serviços pagos estão pausados. Define os limites e retoma em Configuração.');
  const dia=diaLisboa(agora),mes=dia.slice(0,7);
  const total=(dos:PedidoSeo[])=>dos.reduce((n,p)=>n+(p.custoMicro??0)+p.reservaMicro,0);
  const reais=e.pedidos.filter(p=>p.modo==='real');
  for(const [nome,valor,limite] of [
    ['por pedido',micro,Math.min(e.configuracao.pedidoMicro,site.politica.pedidoMicro)],
    ['diário do Hub',total(reais.filter(p=>diaLisboa(p.criadoEm)===dia))+micro,e.configuracao.diarioMicro],
    ['mensal do Hub',total(reais.filter(p=>diaLisboa(p.criadoEm).startsWith(mes)))+micro,e.configuracao.mensalMicro],
    ['diário deste site',total(reais.filter(p=>p.siteId===site.id&&diaLisboa(p.criadoEm)===dia))+micro,site.politica.diarioMicro],
    ['mensal deste site',total(reais.filter(p=>p.siteId===site.id&&diaLisboa(p.criadoEm).startsWith(mes)))+micro,site.politica.mensalMicro],
  ] as const)if(valor>limite)throw new Error(`O pedido ultrapassa o limite ${nome}. Pedidos por confirmar também reservam orçamento.`);
}
export class MotorSeo {
  readonly repo:ArmazemSeo; private tarefas=new Map<string,Promise<void>>();private ciclo=false; private fechado=false;private erroMotor:string|null=null;
  constructor(raiz:string,private credenciais:()=>CredenciaisSeo,private f:typeof fetch=fetch,private agora:()=>Date=()=>new Date(),armazem?:ArmazemSeo){this.repo=armazem??new RepositorioSeo(raiz);}
  async iniciar(){await this.repo.iniciar();}
  async fechar(){this.fechado=true;await Promise.allSettled([...this.tarefas.values()]);await this.repo.fechar();}
  async estado():Promise<EstadoPublicoSeo>{const {orcamentos:_,...e}=await this.repo.ler();const c=this.credenciais();return{...e,pautas:e.pautas.map(p=>({...p,estruturaAtual:estruturaAtual(p,siteDe(e,p.siteId))})),ligacao:{dataforseo:!!(c.login&&c.password),deepseek:!!c.deepseek,servidorLigado:true},erroMotor:this.erroMotor};}
  private bloqueiosPagamento(e:EstadoSeo,s:SiteEditorial,micro:number,fornecedor:'dataforseo'|'deepseek') {
    const b:string[]=[];const c=this.credenciais();if(fornecedor==='dataforseo'&&(!c.login||!c.password))b.push('Faltam DATAFORSEO_LOGIN e DATAFORSEO_PASSWORD no servidor local.');
    if(fornecedor==='deepseek'&&!c.deepseek)b.push('Falta DEEPSEEK_API_KEY no servidor local.');
    try{verificarLimites(e,s,micro,this.agora());}catch(x){b.push((x as Error).message);}return b;
  }
  async orcamentarPesquisa(bruto:unknown,automatico=false):Promise<OrcamentoSeo>{
    const p=prepararPesquisa(bruto),agora=this.agora();
    return this.repo.alterar(e=>{const s=siteDe(e,p.siteId),preco=estimarPesquisa(p);
      const cache=p.renovar?undefined:[...e.pedidos].reverse().find(r=>r.pesquisa&&r.estado==='concluido'&&r.resultadoId&&!r.cacheDe&&chavePesquisa(r.pesquisa)===chavePesquisa(p)&&agora.getTime()-new Date(r.criadoEm).getTime()<Math.min(e.configuracao.cacheDias,p.operacao==='serp'?1:30)*86400000);
      const micro=p.modo==='real'&&!cache?preco.total:0;
      const bloqueios=p.modo==='real'&&!cache?this.bloqueiosPagamento(e,s,micro,'dataforseo'):p.modo==='sandbox'&&(!this.credenciais().login||!this.credenciais().password)?['Configura as credenciais DataForSEO para usar o Sandbox do fornecedor.']:[];
      if(p.modo==='real'&&!cache&&e.pedidos.some(r=>r.pesquisa&&!r.cacheDe&&(r.estado==='em_curso'||r.custoMicro===null)&&chavePesquisa(r.pesquisa)===chavePesquisa(p)))bloqueios.push('Já existe um pedido equivalente em curso ou com custo por confirmar. Confere-o antes de repetir.');
      const q:OrcamentoSeo={id:randomUUID(),tipo:'pesquisa',criadoEm:agora.toISOString(),expiraEm:new Date(agora.getTime()+300000).toISOString(),siteId:s.id,pesquisa:p,estimativaMicro:micro,linhas:preco.linhas,fontePrecos:OPERACOES_SEO[p.operacao].precoUrl,precosEm:PRECOS_SEO_EM,cambio:e.configuracao.cambio,cambioData:e.configuracao.cambioData,cacheId:cache?.id??null,usadoPor:null,bloqueios,automatico,assinatura:automatico?`politica:${s.politica.revista}`:undefined};
      e.orcamentos=e.orcamentos.filter(q=>q.usadoPor||new Date(q.expiraEm)>agora);e.orcamentos.push(q);return q;});
  }
  async orcamentarTexto(id:string,automatico=false,tipo:'texto'|'estrutura'='texto'):Promise<OrcamentoSeo>{return this.repo.alterar(e=>{const p=pautaDe(e,id),s=siteDe(e,p.siteId),agora=this.agora(),preco=estimarTexto(p,s,tipo);if(tipo==='texto'&&p.proposta||tipo==='estrutura'&&p.propostaEstrutura)throw new Error('Já existe uma proposta por aplicar. Revê a proposta antes de pedir outra.');if(e.pedidos.some(r=>r.pautaId===p.id&&(r.estado==='em_curso'||r.custoMicro===null)))throw new Error('Existe uma produção anterior por confirmar. Confere o custo antes de repetir.');const bloqueios=[...bloqueiosProducao(p,s),...(tipo==='texto'&&!estruturaAtual(p,s)?['Confirma uma estrutura atual antes de redigir o artigo.']:[]),...this.bloqueiosPagamento(e,s,preco.total,'deepseek')];
    const q:OrcamentoSeo={id:randomUUID(),tipo,criadoEm:agora.toISOString(),expiraEm:new Date(agora.getTime()+300000).toISOString(),siteId:s.id,pautaId:p.id,pautaVersao:p.versao,assinatura:assinaturaPauta(p,s),estimativaMicro:preco.total,linhas:preco.linhas,fontePrecos:'https://api-docs.deepseek.com/quick_start/pricing/',precosEm:'2026-09-10',cambio:e.configuracao.cambio,cambioData:e.configuracao.cambioData,cacheId:null,usadoPor:null,bloqueios,automatico};e.orcamentos.push(q);return q;});}
  async executar(id:string,confirmacao:boolean,consentimento='Aprovação explícita deste orçamento'):Promise<PedidoSeo>{
    if(this.erroMotor)throw new Error(this.erroMotor);
    if(this.fechado)throw new Error('O motor está a encerrar. Reabre a aplicação local antes de iniciar outro pedido.');
    if(!confirmacao)throw new Error('Confirma o custo potencial antes de executar.');
    const r=await this.repo.alterar(e=>{const q=e.orcamentos.find(q=>q.id===id)??erro('Orçamento não encontrado.');
      if(q.usadoPor)return e.pedidos.find(p=>p.id===q.usadoPor)??erro('O pedido anterior precisa de conferência. Não foi repetido.');
      if(new Date(q.expiraEm)<=this.agora())throw new Error('O orçamento expirou. Pede uma nova estimativa.');
      const s=siteDe(e,q.siteId);if(q.automatico&&(e.configuracao.automacaoPausada||!s.politica.ativa||s.politica.producao!=='automatica'))throw new Error('A automação está pausada para este site.');
      if(q.automatico&&q.tipo==='pesquisa'&&q.assinatura!==`politica:${s.politica.revista}`)throw new Error('A política mudou. É necessário um novo orçamento automático.');
      const real=q.tipo!=='pesquisa'||q.pesquisa?.modo==='real';
      if(q.pesquisa?.modo==='real'&&!q.cacheId&&e.pedidos.some(r=>r.pesquisa&&!r.cacheDe&&(r.estado==='em_curso'||r.custoMicro===null)&&chavePesquisa(r.pesquisa)===chavePesquisa(q.pesquisa!)))throw new Error('Já existe um pedido equivalente por confirmar. Consulta o histórico antes de repetir.');
      if(real&&!q.cacheId){verificarLimites(e,s,q.estimativaMicro,this.agora());const b=this.bloqueiosPagamento(e,s,q.estimativaMicro,q.tipo!=='pesquisa'?'deepseek':'dataforseo');if(b.length)throw new Error(b.join(' '));}
      if(q.tipo!=='pesquisa'){const p=pautaDe(e,q.pautaId!);if(e.pedidos.some(r=>r.pautaId===p.id&&(r.estado==='em_curso'||r.custoMicro===null)))throw new Error('Existe uma produção anterior por confirmar. Confere o histórico antes de repetir.');if(q.pautaVersao!==p.versao||q.assinatura!==assinaturaPauta(p,s))throw new Error('O artigo ou a política mudou. Revê o novo orçamento antes de produzir.');const b=bloqueiosProducao(p,s);if(q.tipo==='texto'&&!estruturaAtual(p,s))b.push('Confirma uma estrutura atual antes de redigir o artigo.');if(b.length)throw new Error(b.join(' '));if(p.estado==='a_preparar')throw new Error('Já existe uma proposta em preparação.');p.estado='a_preparar';p.motivo=null;}
      if(q.pesquisa?.operacao==='volume'&&e.pedidos.filter(p=>p.operacao==='volume'&&new Date(p.criadoEm).getTime()>this.agora().getTime()-60000&&!p.cacheDe).length>=12)throw new Error('Aguarda um minuto: o limite Google Ads é de 12 pedidos por minuto.');
      if(e.pedidos.filter(p=>p.estado==='em_curso'&&p.modo!=='exemplo').length>=3&&!q.cacheId)throw new Error('Há três pedidos em curso. Aguarda a conclusão antes de iniciar outro.');
      const p:PedidoSeo={id:randomUUID(),orcamentoId:q.id,siteId:q.siteId,tipo:q.tipo,operacao:q.tipo==='estrutura'?'preparar_estrutura':q.tipo==='texto'?'redigir_artigo':q.pesquisa!.operacao,fornecedor:q.tipo!=='pesquisa'?'deepseek':q.pesquisa?.modo==='exemplo'?'local':'dataforseo',modo:q.tipo!=='pesquisa'?'real':q.pesquisa!.modo,criadoEm:this.agora().toISOString(),terminadoEm:null,estado:'em_curso',estimativaMicro:q.estimativaMicro,custoMicro:null,custoOrigem:'desconhecido',reservaMicro:q.estimativaMicro,cambio:q.cambio,cambioData:q.cambioData,unidades:null,taskId:null,codigoFornecedor:null,detalhe:'Pedido registado antes do envio ao fornecedor.',cacheDe:q.cacheId,pesquisa:q.pesquisa,pautaId:q.pautaId,resultadoId:null,automatico:q.automatico,consentimento,precosEm:q.precosEm,linhas:q.linhas,fontePrecos:q.fontePrecos};q.usadoPor=p.id;e.pedidos.push(p);auditar(e,'pedido_autorizado',p.id,`${p.operacao} · reserva ${p.reservaMicro} micro-USD · ${consentimento}`,this.agora());return p;});
    if(r.estado==='em_curso'&&!this.tarefas.has(r.id)){const tarefa=this.processar(r).catch(()=>{}).finally(()=>this.tarefas.delete(r.id));this.tarefas.set(r.id,tarefa);}return r;
  }
  async aguardar(id:string){await this.tarefas.get(id);return(await this.repo.ler()).pedidos.find(p=>p.id===id);}
  private async processar(p:PedidoSeo){
    let custo:number|null=null,origem:PedidoSeo['custoOrigem']='desconhecido',taskId:string|null=null,codigo:number|null=null,unidades:number|null=null,resultadoId:string|null=null;
    let tokens:PedidoSeo['tokens'],modelo:string|undefined;
    try{
      if(p.cacheDe){custo=0;origem='cache';const e=await this.repo.ler(),original=e.pedidos.find(x=>x.id===p.cacheDe)??erro('O resultado em cache deixou de estar disponível.');await this.repo.resultado(original.resultadoId!);resultadoId=original.resultadoId;custo=0;origem='cache';}
      else if(p.tipo==='pesquisa'){
        const pesquisa=p.pesquisa!;let dados;
        if(p.modo==='exemplo'){dados=exemploPesquisa(pesquisa);custo=0;origem='simulado';}
        else{
          if(p.modo==='sandbox'){custo=0;origem='simulado';}
          const c=this.credenciais();const {raw,http}=await pedirDataforseo(pesquisa,{login:c.login??'',password:c.password??''},this.f);
          const task=objeto(vetor(raw.tasks)[0]);custo=p.modo==='sandbox'?0:numero(raw.cost)!==null?Math.round(Number(raw.cost)*1e6):numero(task.cost)!==null?Math.round(Number(task.cost)*1e6):null;origem=p.modo==='sandbox'?'simulado':custo===null?'desconhecido':'api';taskId=typeof task.id==='string'?task.id:null;codigo=numero(task.status_code??raw.status_code);
          // Preserve billing evidence before parsing or saving the result; failures may still be billable.
          await this.repo.alterar(e=>{const r=e.pedidos.find(r=>r.id===p.id)!;Object.assign(r,{custoMicro:custo,custoOrigem:origem,taskId,codigoFornecedor:codigo,reservaMicro:custo===null?r.reservaMicro:0});});
          await this.repo.guardarResposta(p.id,raw);
          if(http<200||http>=300||raw.status_code!==20000||task.status_code!==20000)throw new Error(`O fornecedor não concluiu a pesquisa (HTTP ${http}, código ${codigo??'indisponível'}). O custo recebido foi conservado.`);
          dados=normalizarResposta(raw,pesquisa);
        }
        resultadoId=randomUUID();unidades=dados.palavras.length||dados.serp.length;
        await this.repo.guardarResultado(resultadoId,{id:resultadoId,pedidoId:p.id,pedido:pesquisa,recolhidaEm:this.agora().toISOString(),dados} satisfies PesquisaGuardada);
      }else{
        const e=await this.repo.ler(),pauta=pautaDe(e,p.pautaId!),s=siteDe(e,p.siteId),c=this.credenciais();
        const resp=await produzirTexto(pauta,s,c.deepseek!,new Date(p.criadoEm),this.f,p.tipo==='estrutura'?'estrutura':'texto');custo=resp.custo;origem=custo===null?'desconhecido':'tokens';tokens=resp.tokens;modelo=resp.modelo;
        await this.repo.alterar(e=>{const r=e.pedidos.find(r=>r.id===p.id)!;Object.assign(r,{custoMicro:custo,custoOrigem:origem,tokens,modelo,reservaMicro:custo===null?r.reservaMicro:0});});
        await this.repo.guardarResposta(p.id,resp.raw);
        if(p.tipo==='estrutura'){
          const conteudo=lerEstruturaProduzida(resp.raw);resultadoId=randomUUID();await this.repo.guardarResultado(resultadoId,conteudo);
          await this.repo.alterar(e=>{const atual=pautaDe(e,p.pautaId!),site=siteDe(e,atual.siteId),q=e.orcamentos.find(q=>q.id===p.orcamentoId)!;
            const proposta={conteudo,assinaturaBase:assinaturaBaseEstrutura(pauta,s),confirmadaEm:'',origem:'automatica' as const};
            atual.propostaEstrutura=proposta;atual.estado='aguarda_revisao';atual.motivo='Estrutura proposta. Revê antes de confirmar; o plano anterior foi preservado.';
            if(p.automatico&&atual.versao===q.pautaVersao&&!atual.estrutura&&!atual.texto&&assinaturaPauta(atual,site)===q.assinatura&&!bloqueiosEstrutura(conteudo,atual.fontes).length){atual.estrutura={...proposta,confirmadaEm:this.agora().toISOString()};atual.propostaEstrutura=null;atual.versao++;atual.estado='planeado';atual.alteradoEm=this.agora().toISOString();atual.motivo='Estrutura preparada na sequência autorizada. Segue-se a redação, sujeita a novo orçamento.';}
          });
        }else{
        const texto=lerTextoProduzido(resp.raw,pauta.fontes);resultadoId=randomUUID();await this.repo.guardarResultado(resultadoId,texto);
        await this.repo.alterar(e=>{const atual=pautaDe(e,p.pautaId!);atual.proposta=texto;atual.estado='aguarda_revisao';atual.motivo='Proposta pronta. Revê e aplica; o texto anterior foi preservado.';
          const q=e.orcamentos.find(q=>q.id===p.orcamentoId)!;
          if(p.automatico&&atual.versao===q.pautaVersao&&!atual.texto&&assinaturaPauta(atual,siteDe(e,atual.siteId))===q.assinatura){atual.texto=texto;atual.proposta=null;atual.versao++;atual.alteradoEm=this.agora().toISOString();const s=siteDe(e,atual.siteId),b=triagemPublicacao(atual,s);atual.estado=!b.length&&!exigeRevisao(atual,s)?'pronto_automatico':'aguarda_revisao';atual.motivo=b.length?b.join(' '):'Preparado pelo motor. Publicação externa desligada nesta versão local.';}
        });
        }
      }
      await this.repo.alterar(e=>{const r=e.pedidos.find(r=>r.id===p.id)!;Object.assign(r,{estado:'concluido',terminadoEm:this.agora().toISOString(),custoMicro:custo,custoOrigem:origem,taskId,codigoFornecedor:codigo,unidades,resultadoId,tokens,modelo,reservaMicro:custo===null?r.reservaMicro:0,detalhe:p.cacheDe?'Resultado reutilizado. Não foi feito um novo pedido ao fornecedor.':p.modo==='exemplo'?'Exemplo local, sem consulta ou custo externo.':p.modo==='sandbox'?'Resposta fixa de Sandbox; não representa métricas de mercado.':'Concluído. O registo conserva a origem do custo e a resposta do fornecedor.'});if(custo!==null&&custo>p.estimativaMicro){e.configuracao.pausado=true;auditar(e,'custo_superior_estimativa',p.id,'Serviços pagos pausados: o custo reportado ultrapassou a reserva. Revê a tabela e os limites.',this.agora());}});
    }catch(x){await this.repo.alterar(e=>{const r=e.pedidos.find(r=>r.id===p.id)!;Object.assign(r,{estado:custo===null?'incerto':'falhou',terminadoEm:this.agora().toISOString(),custoMicro:custo,custoOrigem:origem,taskId,codigoFornecedor:codigo,tokens,modelo,reservaMicro:custo===null?r.reservaMicro:0,detalhe:(x as Error).message});if(p.pautaId){const a=pautaDe(e,p.pautaId);a.estado='bloqueado';a.motivo=r.detalhe;}if(custo===null&&p.modo==='real')auditar(e,'custo_por_confirmar',p.id,'Orçamento reservado. Sem repetição automática.',this.agora());if(custo!==null&&custo>p.estimativaMicro){e.configuracao.pausado=true;e.configuracao.revista++;auditar(e,'custo_superior_estimativa',p.id,'Serviços pagos pausados devido ao custo reportado.',this.agora());}}).catch(()=>{this.erroMotor='Não foi possível concluir o registo em disco. Novos pedidos pagos foram bloqueados; reabre o servidor depois de recuperar espaço e conferir o histórico.';});}
  }
  async resultado(id:string){const e=await this.repo.ler();if(!e.pedidos.some(p=>p.resultadoId===id))throw new Error('Resultado não encontrado.');return this.repo.resultado(id);}
  async guardarConfiguracao(bruto:unknown){const c=schemaConfiguracaoSeo.parse(bruto) as ConfigGeralSeo;validarConfig(c);return this.repo.alterar(e=>{if(c.revista!==e.configuracao.revista)throw new Error('A configuração mudou noutro separador. Reabre os limites antes de guardar.');e.configuracao={...c,revista:c.revista+1};auditar(e,'configuracao','hub',JSON.stringify(c),this.agora());return e.configuracao;});}
  async guardarPolitica(id:string,bruto:unknown,revista:number,identidade?:unknown){const voz=identidade===undefined?null:z.object({publico:z.string().trim().min(10).max(6000),voz:z.string().trim().min(10).max(6000),objetivo:z.string().trim().min(10).max(6000),oferta:z.string().trim().min(10).max(6000)}).strict().parse(identidade);const p=schemaPoliticaSeo.parse(bruto) as PoliticaSite;return this.repo.alterar(e=>{const s=siteDe(e,id);if(revista!==s.politica.revista)throw new Error('A política mudou noutro separador. Reabre a configuração antes de guardar.');validarPolitica(s,p);if(voz)Object.assign(s,voz);s.politica={...p,revista:s.politica.revista+1};for(const a of e.pautas.filter(a=>a.siteId===id&&a.aprovacao)){a.aprovacao=null;a.estado='aguarda_revisao';a.motivo='Política alterada. É necessária nova revisão.';}auditar(e,'politica_site',id,JSON.stringify(s.politica),this.agora());return s;});}
  async guardarPauta(bruto:unknown){const v=schemaPauta.parse(bruto) as DadosPautaEditorial;return this.repo.alterar(async e=>{const s=siteDe(e,v.siteId);if(v.fontes.reduce((n,f)=>n+f.excerto.length,0)>40000)throw new Error('Usa até 40 000 caracteres de fontes por pauta.');if(new Set(v.fontes.map(f=>f.id)).size!==v.fontes.length)throw new Error('Cada fonte precisa de um identificador diferente.');for(const f of v.fontes)if(f.aprovada&&(!Number.isFinite(Date.parse(f.verificadaEm))||Date.parse(f.verificadaEm)>this.agora().getTime()+300000))throw new Error('Indica uma data de verificação válida para cada fonte aprovada.');
    const antigo=v.id?pautaDe(e,v.id):null;if(antigo&&antigo.versao!==v.versao)throw new Error('A pauta mudou noutro separador. O teu texto continua no formulário; reabre a versão guardada antes de aplicar alterações.');
    const pesquisa=v.pesquisaId?e.pedidos.find(p=>p.resultadoId===v.pesquisaId):null;if(v.pesquisaId&&!pesquisa)throw new Error('A pesquisa de origem não está disponível.');
    if(!antigo&&e.pautas.some(a=>a.siteId===s.id&&v.palavra&&normalizarSeo(a.palavra)===normalizarSeo(v.palavra)))throw new Error('Este site já tem uma pauta para a mesma keyword. Revê a existente para evitar sobreposição.');
    const resultado=pesquisa?.resultadoId?await this.repo.resultado<PesquisaGuardada>(pesquisa.resultadoId):null;
    const pesquisaContexto=resultado?{recolhidaEm:resultado.recolhidaEm,mercado:resultado.pedido.mercado,consulta:resultado.pedido.termos.join(', '),perguntas:resultado.dados.perguntas.slice(0,15),resultados:resultado.dados.serp.slice(0,10)}:null;
    const agora=this.agora().toISOString();const p:PautaEditorial={...v,id:antigo?.id??randomUUID(),modoOrigem:antigo&&(antigo.modoOrigem==='exemplo'||antigo.modoOrigem==='sandbox')?antigo.modoOrigem:pesquisa?.modo??'manual',estado:antigo?.estado==='a_preparar'?'a_preparar':v.texto?'aguarda_revisao':'planeado',versao:(antigo?.versao??0)+1,criadoEm:antigo?.criadoEm??agora,alteradoEm:agora,proposta:antigo?.proposta??null,pesquisaContexto,guia:v.guia??antigo?.guia??{...guiaInicial},estrutura:antigo?.estrutura??null,propostaEstrutura:antigo?.propostaEstrutura??null,aprovacao:null,motivo:antigo?.aprovacao?'Conteúdo alterado. É necessária nova revisão.':null};
    if(antigo)e.pautas[e.pautas.findIndex(a=>a.id===antigo.id)]=p;else e.pautas.push(p);auditar(e,'pauta_guardada',p.id,`Versão ${p.versao} · ${p.siteId}`,this.agora());return p;});}
  async planear(id:string,palavras:string[],siteId:string){const resultado=await this.resultado(id) as PesquisaGuardada;if(!resultado?.dados?.palavras)throw new Error('Escolhe uma pesquisa de keywords.');if(!Array.isArray(palavras)||!palavras.length||palavras.length>20)throw new Error('Escolhe entre 1 e 20 keywords para o plano.');const validas=new Set(resultado.dados.palavras.map(p=>p.palavra));const feitas:PautaEditorial[]=[];for(const palavra of [...new Set(palavras)]){if(!validas.has(palavra))throw new Error('Uma keyword não pertence ao resultado escolhido.');const e=await this.repo.ler();const anterior=e.pautas.find(p=>p.siteId===siteId&&normalizarSeo(p.palavra)===normalizarSeo(palavra));if(anterior){feitas.push(anterior);continue;}feitas.push(await this.guardarPauta({versao:0,siteId,titulo:palavra,palavra,origem:'keyword',contributo:'',objetivo:'',cta:'',dataPretendida:'',pesquisaId:id,producaoAutomaticaAutorizada:false,fontes:[],texto:null}));}return feitas;}
  async aplicarProposta(id:string,versao:number){return this.repo.alterar(e=>{const p=pautaDe(e,id);if(p.versao!==versao)throw new Error('A pauta mudou. Revê a versão atual antes de aplicar.');if(!p.proposta)throw new Error('Não há proposta por aplicar.');p.texto=p.proposta;p.proposta=null;p.versao++;p.aprovacao=null;p.estado='aguarda_revisao';p.alteradoEm=this.agora().toISOString();auditar(e,'proposta_aplicada',id,`Versão ${p.versao}`,this.agora());return p;});}
  async aprovar(id:string,versao:number,confirmacao=false){if(!confirmacao)throw new Error('Confirma que reveste o texto, as fontes e o destino desta versão.');return this.repo.alterar(e=>{const p=pautaDe(e,id),s=siteDe(e,p.siteId);if(p.versao!==versao)throw new Error('O conteúdo mudou. Revê a versão atual antes de aprovar.');const b=triagemPublicacao(p,s);if(b.length)throw new Error(b.join(' '));p.aprovacao={assinatura:assinaturaPauta(p,s),em:this.agora().toISOString(),versao:p.versao};p.estado='aprovado';p.motivo='Esta versão foi aprovada. Nenhum pedido foi enviado ao WordPress.';auditar(e,'pauta_aprovada',id,`Versão ${p.versao} · ${p.aprovacao.assinatura}`,this.agora());return p;});}
  async reconciliar(id:string,micro:number,nota:string){if(!Number.isSafeInteger(micro)||micro<0||micro>1000000000||typeof nota!=='string'||nota.trim().length<20||nota.length>2000)throw new Error('Indica o custo em micro-USD e uma referência de conferência com pelo menos 20 caracteres.');return this.repo.alterar(e=>{const p=e.pedidos.find(p=>p.id===id)??erro('Pedido não encontrado.');if(p.estado==='em_curso'||p.modo!=='real')throw new Error('Este pedido ainda está em curso ou é apenas um teste.');if(p.custoMicro!==null)throw new Error('Este pedido já tem custo registado. A evidência original não pode ser substituída.');p.custoMicro=micro;p.custoOrigem='manual';p.reservaMicro=0;auditar(e,'custo_conferido',p.id,`${micro} micro-USD · ${nota.trim()}`,this.agora());return p;});}
  async pausar(){return this.repo.alterar(e=>{e.configuracao.pausado=true;e.configuracao.automacaoPausada=true;e.configuracao.revista++;auditar(e,'pausa_geral','hub','Novos pedidos e ciclos pausados. Pedidos já enviados podem terminar e ser cobrados.',this.agora());return e.configuracao;});}
  async guardarConhecimento(siteId:string, bruto:unknown) {
    const c=schemaConhecimento.parse(bruto) as ConhecimentoMarca,agora=this.agora();
    if(new Set(c.referencias.map(f=>f.id)).size!==c.referencias.length||new Set(c.paginas.map(p=>p.id)).size!==c.paginas.length)throw new Error('Usa identificadores distintos no conhecimento.');
    for(const f of c.referencias){if(!urlPublicaEditorial(f.url))throw new Error('As referências precisam de URLs públicas HTTPS, sem credenciais ou parâmetros.');if(f.aprovada&&(f.excerto.trim().length<200||!f.titulo.trim()))throw new Error('Uma referência aprovada precisa de título e pelo menos 200 caracteres de excerto.');}
    for(const item of [...c.referencias,...c.paginas])if(item.aprovada&&(!Number.isFinite(Date.parse(item.verificadaEm))||Date.parse(item.verificadaEm)>agora.getTime()+300000))throw new Error('Confirma uma data válida para cada elemento aprovado.');
    return this.repo.alterar(e=>{const s=siteDe(e,siteId);if((s.conhecimento?.revista??0)!==c.revista)throw new Error('O conhecimento mudou noutro separador. Reabre a marca antes de guardar.');
      if(c.paginas.some(p=>!paginaDoSite(p.url,s)))throw new Error('O inventário só aceita páginas canónicas HTTPS deste site, sem parâmetros ou páginas de acesso.');
      if(new Set(c.paginas.map(p=>p.url)).size!==c.paginas.length)throw new Error('Esta URL já está no inventário.');
      s.conhecimento={...c,revista:c.revista+1};for(const p of e.pautas.filter(p=>p.siteId===siteId&&p.aprovacao)){p.aprovacao=null;p.estado='aguarda_revisao';p.motivo='Conhecimento da marca alterado. É necessária nova revisão.';}
      auditar(e,'conhecimento_marca',siteId,`Revisão ${s.conhecimento.revista} · ${c.referencias.length} referências · ${c.paginas.length} páginas`,agora);return s;
    });
  }
  async usarConhecimento(id:string,versao:number){return this.repo.alterar(e=>{const p=pautaDe(e,id);if(p.versao!==versao)throw new Error('A pauta mudou. Reabre antes de acrescentar referências.');if(p.estado==='a_preparar')throw new Error('Aguarda a operação em curso.');const fontes=sugerirConhecimento(p,siteDe(e,p.siteId)).fontes;let adicionadas=0;
    for(const f of fontes){if(p.fontes.length>=8||p.fontes.some(x=>x.url===f.url)||p.fontes.reduce((n,x)=>n+x.excerto.length,0)+f.excerto.length>40000)continue;let id=`marca-${f.id}`;while(p.fontes.some(x=>x.id===id))id+='x';p.fontes.push({...f,id});adicionadas++;}
    if(!adicionadas)throw new Error('Não há novas referências aprovadas com correspondência neste tema. Completa o conhecimento ou as fontes da pauta.');
    p.versao++;p.aprovacao=null;p.alteradoEm=this.agora().toISOString();p.motivo=`${adicionadas} referências previamente aprovadas acrescentadas. Confirma a relevância para esta pauta.`;auditar(e,'referencias_reutilizadas',id,p.motivo,this.agora());return p;
  });}
  async confirmarEstrutura(id:string,versao:number,bruto:unknown,confirmacao:boolean){if(!confirmacao)throw new Error('Confirma a pergunta, a estrutura e o suporte das fontes.');const r=schemaEstrutura.parse(bruto) as EstruturaArtigo;return this.repo.alterar(e=>{const p=pautaDe(e,id),s=siteDe(e,p.siteId);if(p.versao!==versao||p.estado==='a_preparar')throw new Error('A pauta mudou ou está em preparação. Reabre a versão atual.');const b=[...bloqueiosProducao(p,s),...bloqueiosEstrutura(r,p.fontes)];if(b.length)throw new Error(b.join(' '));
    p.estrutura={conteudo:r,assinaturaBase:assinaturaBaseEstrutura(p,s),confirmadaEm:this.agora().toISOString(),origem:'humana'};p.propostaEstrutura=null;p.versao++;p.aprovacao=null;p.alteradoEm=this.agora().toISOString();p.motivo='Estrutura confirmada para o brief e as fontes atuais.';p.estado=p.texto?'aguarda_revisao':'planeado';auditar(e,'estrutura_confirmada',id,`Versão ${p.versao}`,this.agora());return p;
  });}
  async verificarLigacao(){const c=this.credenciais();if(!c.login||!c.password)throw new Error('Configura DATAFORSEO_LOGIN e DATAFORSEO_PASSWORD em .env.seo.local.');const r=await this.f('https://api.dataforseo.com/v3/appendix/user_data',{redirect:'error',headers:{Authorization:`Basic ${Buffer.from(`${c.login}:${c.password}`).toString('base64')}`},signal:AbortSignal.timeout(20000)});const j=objeto(await r.json()),t=objeto(vetor(j.tasks)[0]),info=objeto(vetor(t.result)[0]);if(!r.ok||j.status_code!==20000||t.status_code!==20000)throw new Error('A DataForSEO recusou a ligação. Confere o acesso API e a ligação, sem publicar credenciais.');return this.repo.alterar(e=>{e.conta={verificadaEm:this.agora().toISOString(),saldoUsd:numero(objeto(info.money).balance),custoConsultaMicro:0,tarifaBaseInformativa:true};auditar(e,'ligacao_verificada','dataforseo','User Data · endpoint gratuito; saldo é da conta completa, não apenas deste Hub.',this.agora());return e.conta;});}
  async preverCiclo(){const e=await this.repo.ler();return e.sites.map(s=>({siteId:s.id,slot:slotLocal(this.agora(),s),elegiveis:e.pautas.filter(p=>p.siteId===s.id&&p.estado==='planeado'&&p.producaoAutomaticaAutorizada).length,pendentes:e.pautas.filter(p=>p.siteId===s.id&&p.estado==='planeado').length,pausado:e.configuracao.automacaoPausada||!s.politica.ativa||s.politica.producao!=='automatica'||s.estado==='planeado'}));}
  /** A single paid phase per Cloud invocation; the persisted slot is the checkpoint. */
  async executarEtapaCiclo(){
    if(this.ciclo||this.fechado)return;this.ciclo=true;
    let escolhido:{slot:EstadoSeo['slots'][number];site:SiteEditorial;pauta:PautaEditorial}|undefined;
    try{
      let e=await this.repo.ler();if(e.configuracao.pausado||e.configuracao.automacaoPausada)return;
      for(const sl of e.slots.filter(sl=>sl.estado.startsWith('a_preparar')&&sl.pautaId)){
        const site=siteDe(e,sl.siteId),pauta=pautaDe(e,sl.pautaId!);escolhido={slot:sl,site,pauta};break;
      }
      if(!escolhido)for(const site of e.sites){
        const sl=slotLocal(this.agora(),site);if(!sl||site.estado==='planeado'||!site.politica.ativa||site.politica.producao!=='automatica'||e.slots.some(s=>s.id===sl.id)||e.slots.filter(s=>s.siteId===site.id&&s.pautaId&&diaLisboa(s.em)>=sl.semana).length>=site.politica.limiteSemanal)continue;
        const pauta=e.pautas.find(p=>p.siteId===site.id&&p.estado==='planeado'&&p.producaoAutomaticaAutorizada&&(!p.dataPretendida||p.dataPretendida<=sl.dia));
        const slot={id:sl.id,siteId:site.id,em:this.agora().toISOString(),pautaId:pauta?.id??null,estado:pauta?'a_preparar':'sem_reserva',detalhe:pauta?'Sequência na nuvem iniciada.':'Sem pauta autorizada; nenhum conteúdo inventado para cumprir a cadência.'};
        await this.repo.alterar(e=>{e.slots.push(slot);});if(pauta)escolhido={slot,site,pauta};break;
      }
      if(!escolhido)return;
      const {slot,site:s}=escolhido;let p=escolhido.pauta;
      if(s.estado!=='piloto'||!s.politica.ativa||s.politica.producao!=='automatica'||!p.producaoAutomaticaAutorizada||p.estado!=='planeado'||p.texto)throw new Error('A autorização ou o conteúdo mudou. A sequência exige revisão antes de continuar.');
      const tema=normalizarSeo(`${p.titulo} ${p.palavra} ${p.contributo}`);if(!s.politica.temasPermitidos.some(t=>tema.includes(normalizarSeo(t)))||s.politica.temasExcluidos.some(t=>tema.includes(normalizarSeo(t))))throw new Error('Tema fora da política autorizada.');
      if(s.politica.sequenciaCompleta&&!p.fontes.length){await this.usarConhecimento(p.id,p.versao);p=pautaDe(await this.repo.ler(),p.id);}
      const b=bloqueiosProducao(p,s);if(b.length)throw new Error(b.join(' '));
      const concluirEtapa=async(estado:string,detalhe:string)=>this.repo.alterar(e=>{const sl=e.slots.find(x=>x.id===slot.id)!;sl.estado=estado;sl.detalhe=detalhe;});
      const executar=async(q:OrcamentoSeo)=>{if(q.bloqueios.length)throw new Error(q.bloqueios.join(' '));const pedido=await this.executar(q.id,true,`Política ${s.id} revisão ${s.politica.revista} · sequência na nuvem`),fim=await this.aguardar(pedido.id);if(fim?.estado!=='concluido')throw new Error('Pedido por confirmar. A sequência não repetirá a chamada paga.');};
      if(slot.estado==='a_preparar'&&s.politica.pesquisarAutomaticamente&&p.palavra){await executar(await this.orcamentarPesquisa({siteId:s.id,operacao:'visao',mercado:'PT',termos:[p.palavra],dominio:'',concorrente:'',limite:1,modo:'real',renovar:false},true));await concluirEtapa('a_preparar_estrutura','Pesquisa concluída. A estrutura será avaliada na próxima execução.');return;}
      if(!estruturaAtual(p,s)){
        if(!s.politica.sequenciaCompleta||p.estrutura)throw new Error('A estrutura precisa de confirmação humana.');
        await executar(await this.orcamentarTexto(p.id,true,'estrutura'));
        e=await this.repo.ler();if(!estruturaAtual(pautaDe(e,p.id),siteDe(e,s.id)))throw new Error('A estrutura proposta exige revisão.');
        await concluirEtapa('a_preparar_texto','Estrutura confirmada na sequência autorizada. A redação tem orçamento separado.');return;
      }
      await executar(await this.orcamentarTexto(p.id,true));await concluirEtapa('terminado','Texto preparado. Publicação sujeita à política e à aprovação da versão.');
    }catch(x){if(escolhido)await this.repo.alterar(e=>{const p=pautaDe(e,escolhido!.pauta.id);p.estado='bloqueado';p.motivo=(x as Error).message;const sl=e.slots.find(s=>s.id===escolhido!.slot.id)!;sl.estado='bloqueado';sl.detalhe=p.motivo;});else throw x;}
    finally{this.ciclo=false;}
  }
  async executarCiclo(){if(this.ciclo||this.fechado)return;this.ciclo=true;try{for(const original of (await this.repo.ler()).sites){const e=await this.repo.ler(),s=siteDe(e,original.id),slot=slotLocal(this.agora(),s);if(e.configuracao.automacaoPausada||!s.politica.ativa||s.politica.producao!=='automatica'||s.estado==='planeado'||!slot||e.slots.some(x=>x.id===slot.id))continue;
      if(e.slots.filter(x=>x.siteId===s.id&&x.pautaId&&diaLisboa(x.em)>=slot.semana).length>=s.politica.limiteSemanal)continue;
      const pauta=e.pautas.find(p=>p.siteId===s.id&&p.estado==='planeado'&&p.producaoAutomaticaAutorizada&&(!p.dataPretendida||p.dataPretendida<=slot.dia));
      await this.repo.alterar(e=>{e.slots.push({id:slot.id,siteId:s.id,em:this.agora().toISOString(),pautaId:pauta?.id??null,estado:pauta?'a_preparar':'sem_reserva',detalhe:pauta?'Ciclo local registado antes de iniciar serviços.':'Sem pauta autorizada. Nada foi gerado para preencher a cadência.'});});if(!pauta)continue;
      try{const texto=normalizarSeo(`${pauta.titulo} ${pauta.palavra} ${pauta.contributo}`);if(!s.politica.temasPermitidos.some(t=>texto.includes(normalizarSeo(t))))throw new Error('Tema fora da lista autorizada para automação.');if(s.politica.temasExcluidos.some(t=>texto.includes(normalizarSeo(t))))throw new Error('Tema excluído da automação. É necessária preparação manual.');
        if(s.politica.sequenciaCompleta&&!pauta.fontes.length){await this.usarConhecimento(pauta.id,pauta.versao);Object.assign(pauta,pautaDe(await this.repo.ler(),pauta.id));}const b=bloqueiosProducao(pauta,s);if(b.length)throw new Error(b.join(' '));if(pauta.texto)throw new Error('Já existe texto humano. A automação não o substitui.');
        if(s.politica.pesquisarAutomaticamente&&pauta.palavra){const q=await this.orcamentarPesquisa({siteId:s.id,operacao:'visao',mercado:'PT',termos:[pauta.palavra],dominio:'',concorrente:'',limite:1,modo:'real',renovar:false},true);if(q.bloqueios.length)throw new Error(q.bloqueios.join(' '));const r=await this.executar(q.id,true,`Política ${s.id} revisão ${s.politica.revista} · pesquisa automática`);const fim=await this.aguardar(r.id);if(fim?.estado!=='concluido')throw new Error('Pesquisa automática por confirmar. A redação foi interrompida.');}
        const atual=pautaDe(await this.repo.ler(),pauta.id);
        if(!estruturaAtual(atual,s)){
          if(!s.politica.sequenciaCompleta)throw new Error('Falta a estrutura confirmada. Prepara-a manualmente ou autoriza a sequência completa na política.');
          if(atual.estrutura)throw new Error('A estrutura existente mudou de contexto. É necessária revisão humana antes de a substituir.');
          const q=await this.orcamentarTexto(pauta.id,true,'estrutura');if(q.bloqueios.length)throw new Error(q.bloqueios.join(' '));const r=await this.executar(q.id,true,`Política ${s.id} revisão ${s.politica.revista} · estrutura automática`);const fim=await this.aguardar(r.id);if(fim?.estado!=='concluido'||!estruturaAtual(pautaDe(await this.repo.ler(),pauta.id),siteDe(await this.repo.ler(),s.id)))throw new Error('A estrutura precisa de revisão. A redação não foi iniciada.');
        }
        const q=await this.orcamentarTexto(pauta.id,true);if(q.bloqueios.length)throw new Error(q.bloqueios.join(' '));const r=await this.executar(q.id,true,`Política ${s.id} revisão ${s.politica.revista} · redação automática`);const produzido=await this.aguardar(r.id);if(produzido?.estado!=='concluido')throw new Error('A redação não foi concluída. Confere o pedido e o custo antes de retomar.');await this.repo.alterar(e=>{const x=e.slots.find(x=>x.id===slot.id)!;x.estado='terminado';x.detalhe='Ciclo concluído. Consulta a pauta e o custo; publicação externa desligada.';});
      }catch(x){await this.repo.alterar(e=>{const p=pautaDe(e,pauta.id);p.estado='bloqueado';p.motivo=(x as Error).message;const sl=e.slots.find(x=>x.id===slot.id)!;sl.estado='bloqueado';sl.detalhe=p.motivo;});}
    }}finally{this.ciclo=false;}}
}
