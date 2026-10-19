import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ArmazemSeo } from './persistencia';
import type { PautaEditorial, PesquisaGuardada } from '../../src/features/seo/contratos';
import { normalizarSeo } from '../../src/features/seo/politicas';
import { calendarizarLote } from '../../src/features/seo/lotes';
import { guiaInicial } from '../../src/features/seo/sequencia';

export const schemaNovoPlano = z.object({
  id: z.string().uuid(), tema: z.string().trim().min(3).max(200),
  serie:z.object({inicio:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),tetoMicro:z.number().int().positive().max(100000000)}).strict().optional(),
  artigos: z.array(z.object({ siteId: z.string().min(1).max(80), titulo: z.string().trim().min(3).max(200), palavra: z.string().trim().min(2).max(80), pesquisaId: z.string().uuid().nullable() }).strict()).min(1).max(20),
}).strict();

/** One transaction, including idempotency: a retry cannot leave half a multi-site plan. */
export async function criarPlano(repo: ArmazemSeo, bruto: unknown, agora = new Date()) {
  const v = schemaNovoPlano.parse(bruto) as {id:string;tema:string;serie?:{inicio:string;tetoMicro:number};artigos:{siteId:string;titulo:string;palavra:string;pesquisaId:string|null}[]}, assinatura = createHash('sha256').update(JSON.stringify(v)).digest('hex');
  return repo.alterar(async e => {
    const anteriores = e.pautas.filter(p => p.planoId === v.id);
    if (anteriores.length) {
      if (anteriores.some(p => p.planoAssinatura !== assinatura)) throw new Error('Este plano já foi criado com outras opções. Reabre o plano guardado.');
      return anteriores;
    }
    const chaves = new Set<string>(), feitas: PautaEditorial[] = [];
    for (const a of v.artigos) {
      const site = e.sites.find(s => s.id === a.siteId);
      if (!site) throw new Error('Um dos sites de destino já não está disponível.');
      const chave = `${a.siteId}:${normalizarSeo(a.palavra)}`;
      if (chaves.has(chave) || e.pautas.some(p => p.siteId === a.siteId && normalizarSeo(p.palavra) === normalizarSeo(a.palavra))) throw new Error(`Já existe um artigo com «${a.palavra}» em ${site.dominio}. Abre o existente ou escolhe outra palavra-chave.`);
      chaves.add(chave);
      if (a.pesquisaId) {
        const pedido = e.pedidos.find(p => p.resultadoId === a.pesquisaId && p.estado === 'concluido' && p.modo === 'real');
        if (!pedido) throw new Error('A pesquisa escolhida não pertence à biblioteca real deste projeto.');
        const r = await repo.resultado<PesquisaGuardada>(a.pesquisaId);
        if (!r?.dados.palavras.some(p => normalizarSeo(p.palavra) === normalizarSeo(a.palavra))) throw new Error('A palavra-chave não consta da pesquisa escolhida.');
      }
      feitas.push({ ...a, id: randomUUID(), planoId: v.id, temaPlano: v.tema, planoAssinatura: assinatura, origem: a.pesquisaId ? 'keyword' : 'topico', modoOrigem: a.pesquisaId ? 'real' : 'manual', contributo: '', objetivo: '', cta: '', fontes: [], dataPretendida: '', producaoAutomaticaAutorizada: false, estado: 'planeado', versao: 1, criadoEm: agora.toISOString(), alteradoEm: agora.toISOString(), texto: null, proposta: null, aprovacao: null, motivo: null, guia: { ...guiaInicial } });
    }
    if(v.serie){
      const destinos=[...new Set(feitas.map(p=>p.siteId))];
      if((e.lotes?.length??0)+destinos.length>100)throw new Error('O projeto já atingiu o limite de séries.');
      for(const siteId of destinos){
        const site=e.sites.find(s=>s.id===siteId)!,pautas=feitas.filter(p=>p.siteId===siteId),id=randomUUID();
        const datas=calendarizarLote(v.serie.inicio,pautas.length,site.politica,e.pautas.filter(p=>p.siteId===siteId).map(p=>p.dataPretendida).filter(Boolean));
        pautas.forEach((p,i)=>{p.loteId=id;p.dataPretendida=datas[i];});
        (e.lotes??=[]).push({id,pedidoId:randomUUID(),assinaturaEntrada:assinatura,nome:v.tema.slice(0,120),siteId,pautaIds:pautas.map(p=>p.id),ignoradas:[],criadoEm:agora.toISOString(),revista:1,tetoMicro:v.serie.tetoMicro,estado:'preparado',autorizacao:null});
      }
    }
    e.pautas.push(...feitas);
    e.auditoria.push({ id: randomUUID(), em: agora.toISOString(), acao: 'plano_criado', alvo: v.id, detalhe: `${v.tema} · ${feitas.length} artigos · sem redação nem publicação` });
    return feitas;
  });
}

/** Only persisted original paid results. No provider calls; dates never advance on reuse. */
export async function bibliotecaPesquisas(repo: ArmazemSeo) {
  const e = await repo.ler(), ids = [...new Set(e.pedidos.filter(p => p.tipo === 'pesquisa' && p.modo === 'real' && p.estado === 'concluido' && p.resultadoId && !p.cacheDe).reverse().map(p => p.resultadoId!))];
  const resultados: PesquisaGuardada[] = [], indisponiveis: string[] = [];
  for (const id of ids) {
    try { const r = await repo.resultado<PesquisaGuardada>(id); if (r?.pedido?.modo === 'real' && r.dados) resultados.push(r); else indisponiveis.push(id); }
    catch { indisponiveis.push(id); }
  }
  return { resultados, indisponiveis };
}
