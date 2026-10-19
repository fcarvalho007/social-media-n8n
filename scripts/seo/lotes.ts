import { randomUUID, createHash } from 'node:crypto';
import type { MotorSeo } from './motor-local';
import { schemaCriarLote, calendarizarLote } from '../../src/features/seo/lotes';
import { normalizarSeo } from '../../src/features/seo/politicas';
import { guiaInicial } from '../../src/features/seo/sequencia';
import { bloqueiosProducao } from '../../src/features/seo/politicas';
import { estruturaAtual } from './editorial';
import type { PesquisaGuardada, PautaEditorial } from '../../src/features/seo/contratos';

export class LotesEditorial {
  constructor(private motor: MotorSeo, private agora=()=>new Date()) {}
  async proximaEtapa(id:string) {
    const e=await this.motor.repo.ler(),l=e.lotes?.find(l=>l.id===id);if(!l)throw new Error('Lote não encontrado.');
    const s=e.sites.find(s=>s.id===l.siteId)!;
    const candidatas=e.pautas.filter(p=>l.pautaIds.includes(p.id)&&!p.texto&&!p.proposta&&!p.propostaEstrutura&&p.estado!=='a_preparar');
    for(const original of candidatas){
      let p=original;
      if(!p.fontes.length){try{p=await this.motor.usarConhecimento(p.id,p.versao);}catch{/* A missing reference is a visible brief blocker, not permission to invent one. */}}
      if(bloqueiosProducao(p,s).length)continue;
      if(p.estrutura&&!estruturaAtual(p,s))continue;
      return this.motor.orcamentarTexto(p.id,false,estruturaAtual(p,s)?'texto':'estrutura');
    }
    throw new Error('Não há uma etapa pronta. Completa os briefs e as fontes ou revê as estruturas propostas nas pautas.');
  }
  async criar(bruto: unknown) {
    const v=schemaCriarLote.parse(bruto), assinatura=createHash('sha256').update(JSON.stringify(v)).digest('hex');
    return this.motor.repo.alterar(async e=>{
      const anterior=e.lotes?.find(l=>l.pedidoId===v.pedidoId);
      if (anterior) { if(anterior.assinaturaEntrada!==assinatura) throw new Error('Este pedido já foi usado com outros dados. Reabre o formulário.'); return anterior; }
      const s=e.sites.find(s=>s.id===v.siteId); if(!s || s.estado!=='piloto') throw new Error('Escolhe um site configurado para preparar o lote.');
      if((e.lotes?.length??0)>=100) throw new Error('O projeto já tem 100 lotes.');
      const pesquisa=v.pesquisaId?e.pedidos.find(p=>p.resultadoId===v.pesquisaId&&p.estado==='concluido'):null;
      if(v.pesquisaId&&!pesquisa) throw new Error('A pesquisa de origem não está disponível.');
      const resultado=pesquisa?.resultadoId?await this.motor.repo.resultado<PesquisaGuardada>(pesquisa.resultadoId):null;
      if(resultado&&v.temas.some(t=>!resultado.dados.palavras.some(p=>p.palavra===t))) throw new Error('Uma keyword não pertence à pesquisa selecionada.');
      const vistos=new Set(e.pautas.filter(p=>p.siteId===s.id).map(p=>normalizarSeo(p.palavra||p.titulo))), temas:string[]=[], ignoradas:string[]=[];
      for(const t of v.temas) { const chave=normalizarSeo(t); if(vistos.has(chave)) ignoradas.push(t); else { vistos.add(chave); temas.push(t); } }
      if(!temas.length) throw new Error('Todos os temas já estão no plano deste site. Revê as pautas existentes.');
      const datas=calendarizarLote(v.inicio,temas.length,s.politica,e.pautas.filter(p=>p.siteId===s.id).map(p=>p.dataPretendida).filter(Boolean));
      const id=randomUUID(), em=this.agora().toISOString();
      const pautas:PautaEditorial[]=temas.map((t,i)=>({id:randomUUID(),loteId:id,siteId:s.id,titulo:t,palavra:t,origem:resultado?'keyword':'topico',contributo:v.contributo,objetivo:v.objetivo,cta:v.cta,fontes:[],dataPretendida:datas[i],pesquisaId:v.pesquisaId,modoOrigem:pesquisa?.modo??'manual',estado:'planeado',versao:1,criadoEm:em,alteradoEm:em,texto:null,proposta:null,aprovacao:null,motivo:null,producaoAutomaticaAutorizada:false,guia:{...guiaInicial},estrutura:null,propostaEstrutura:null,pesquisaContexto:resultado?{recolhidaEm:resultado.recolhidaEm,mercado:resultado.pedido.mercado,consulta:resultado.pedido.termos.join(', '),perguntas:resultado.dados.perguntas.slice(0,15),resultados:resultado.dados.serp.slice(0,10)}:null}));
      const lote={id,pedidoId:v.pedidoId,assinaturaEntrada:assinatura,nome:v.nome,siteId:s.id,pautaIds:pautas.map(p=>p.id),ignoradas,criadoEm:em,revista:1,tetoMicro:v.tetoMicro,estado:'preparado' as const,autorizacao:null};
      e.pautas.push(...pautas); (e.lotes??=[]).push(lote); e.auditoria.push({id:randomUUID(),em,acao:'lote_criado',alvo:id,detalhe:`${pautas.length} pautas; ${ignoradas.length} temas já existentes ignorados; sem pedidos pagos.`}); return lote;
    });
  }
  async configurar(id:string,revista:number,tetoMicro:number,autorizar:boolean,confirmacao:boolean) {
    if(!confirmacao || !Number.isSafeInteger(tetoMicro) || tetoMicro<1 || tetoMicro>100000000) throw new Error('Confirma o teto e as regras do lote.');
    return this.motor.repo.alterar(e=>{
      const l=e.lotes?.find(l=>l.id===id); if(!l||l.revista!==revista) throw new Error('O lote mudou. Reabre a versão atual.');
      const s=e.sites.find(s=>s.id===l.siteId)!;
      if(autorizar&&(s.estado!=='piloto'||!s.politica.ativa||s.politica.producao!=='automatica')) throw new Error('Configura primeiro a produção automática na política deste site.');
      if(e.pedidos.some(p=>l.pautaIds.includes(p.pautaId??'')&&p.estado==='em_curso')) throw new Error('Aguarda a operação em curso antes de alterar o lote.');
      l.tetoMicro=tetoMicro;l.revista++;l.estado=autorizar?'autorizado':'pausado';l.autorizacao=autorizar?{politica:s.politica.revista,conhecimento:s.conhecimento?.revista??0,em:this.agora().toISOString()}:null;
      for(const p of e.pautas.filter(p=>l.pautaIds.includes(p.id))) p.producaoAutomaticaAutorizada=autorizar;
      e.auditoria.push({id:randomUUID(),em:this.agora().toISOString(),acao:autorizar?'lote_autorizado':'lote_pausado',alvo:id,detalhe:`Teto ${tetoMicro} micro-USD. Publicação mantém a aprovação do site.`});return l;
    });
  }
}
