// @vitest-environment node
import { it, expect, vi } from 'vitest';
import { DocumentosEdge } from '../../scripts/backend/documentos-edge';
import { PdfNuvem } from '../../scripts/backend/pdf-wasm';
import { supabaseMemoria } from './apoio/supabase-memoria';
import type { JobHub } from '../../scripts/backend/worker';
import type { DocumentoNuvem } from '../../scripts/backend/documentos';
import type { ContextoBackend } from '../../scripts/backend/seguranca';
it('mantém o total inicial de fontes depois de guardar uma continuação', async () => {
    const projeto = crypto.randomUUID(), userId = crypto.randomUUID();
    const m = supabaseMemoria({ hub_jobs: [{ id: crypto.randomUUID(), project_id: projeto, tipo: 'documentos_recolha', estado: 'fila', pedido: { ids: [3], modo: 'recolher' }, resultado: { total: 3, fontes: [{ fonteId: 1 }, { fonteId: 2 }] } }] });
    const docs = new DocumentosEdge(m.sb, {} as PdfNuvem);
    const tarefas = await docs.operar({ projeto, userId, escrever: true, user: m.sb }, 'tarefas', {}) as { total: number; fontes: unknown[] }[];
    expect(tarefas[0].total).toBe(3);
    expect(tarefas[0].fontes).toHaveLength(2);
});
it('preserva o original antes da extração, continua por páginas e mantém o estado de leitura', async () => { const projeto = crypto.randomUUID(), userId = crypto.randomUUID(), m = supabaseMemoria({ hub_operacao: [{ project_id: projeto, pausado: false }] }), ctx: ContextoBackend = { projeto, userId, escrever: true, user: m.sb }; const parser = { parte: vi.fn(async (_b, _n, inicio) => ({ pdf: { hash: 'h', bytes: 12, ficheiro: 'x.pdf', paginas: [{ n: inicio + 1, estado: 'texto', texto: `Página ${inicio + 1}`, paragrafos: [`Página ${inicio + 1}`] }] }, capa: inicio === 0 ? new Uint8Array([137, 80, 78, 71]) : null, total: 2, proxima: inicio === 0 ? 1 : null })) } as unknown as PdfNuvem; const doc = new DocumentosEdge(m.sb, parser), guardado = await doc.guardar(ctx, Buffer.from('%PDF-1.7\noriginal'), { titulo: 'Relatório', ficheiro: 'x.pdf' }); expect(guardado.documento.dados.pdf.paginas).toEqual([]); expect(m.objetos.size).toBe(1); const id = guardado.documento.id; await doc.parte({ id: crypto.randomUUID(), project_id: projeto, tipo: 'documento_preparar', pedido: { documentoId: id, inicio: 0 }, lease_token: 'token' }); const d = m.tabelas.hub_documentos[0]; (d.dados as Record<string, unknown>).leitura = 'lido'; await doc.parte({ id: crypto.randomUUID(), project_id: projeto, tipo: 'documento_preparar', pedido: { documentoId: id, inicio: 1 }, lease_token: 'token' } as JobHub); expect(d.dados).toMatchObject({ leitura: 'lido', pdf: { paginas: [{ n: 1 }, { n: 2 }] }, processamento: { estado: 'concluido', paginas: 2, total: 2 } }); expect(m.tabelas.hub_jobs).toHaveLength(3); });
it('recupera texto com outro motor sem substituir OCR, títulos, leitura ou páginas já lidas', async () => {
  const projeto=crypto.randomUUID(), userId=crypto.randomUUID(), m=supabaseMemoria({hub_operacao:[{project_id:projeto,pausado:false}]});
  const ctx={projeto,userId,escrever:true,user:m.sb};
  const pagina=(n:number,texto:string)=>({n,estado:texto?'texto' as const:'sem_texto_com_imagem' as const,texto,paragrafos:texto?[texto]:[]});
  const parser={parte:vi.fn(async()=>({pdf:{hash:'ignored',bytes:1,ficheiro:'ignored',paginas:[pagina(1,'Extraído'),pagina(2,'Não substituir'),pagina(3,'Não substituir OCR')]},total:4,proxima:3,capa:null}))} as unknown as PdfNuvem;
  const docs=new DocumentosEdge(m.sb,parser),salvo=await docs.guardar(ctx,Buffer.from('%PDF-1.7\noriginal'),{titulo:'Meu título',ficheiro:'fonte.pdf'}),d=m.tabelas.hub_documentos[0] as unknown as DocumentoNuvem;
  d.dados.pdf.paginas=[pagina(1,''),pagina(2,'Texto original'),{...pagina(3,'OCR guardado'),ocr:{motor:'tesseract-7',confianca:95,idiomas:'por+eng',em:new Date().toISOString()}},pagina(4,'')]; d.dados.leitura='lido';
  const r=await docs.parte({id:crypto.randomUUID(),project_id:projeto,tipo:'documento_preparar',pedido:{documentoId:salvo.documento.id,inicio:0,reextracao:true},lease_token:'t'});
  expect(r).not.toHaveProperty('continuarPedido'); expect(m.tabelas.hub_jobs.at(-1)?.pedido).toMatchObject({inicio:3,reextracao:true}); expect(d.dados.pdf.paginas.map(p=>p.texto)).toEqual(['Extraído','Texto original','OCR guardado','']);
  expect(d.dados.titulo).toBe('Meu título'); expect(d.dados.leitura).toBe('lido'); expect(d.dados.pdf.hash).toBe(salvo.documento.hash); expect(d.dados.processamento).toMatchObject({estado:'a_processar',reextracao:true,paginas:3});
});

it('recupera todas as páginas por tarefas independentes e não duplica continuações repetidas', async () => {
  const projeto = crypto.randomUUID(), userId = crypto.randomUUID();
  const m = supabaseMemoria({ hub_operacao: [{ project_id: projeto, pausado: false }] });
  const pagina = (n: number, texto = '') => ({ n, texto, estado: texto ? 'texto' as const : 'sem_texto_com_imagem' as const, paragrafos: texto ? [texto] : [] });
  const parser = { parte: vi.fn(async (_b, _nome, inicio: number) => ({ pdf: { paginas: Array.from({ length: Math.min(5, 12 - inicio) }, (_, i) => pagina(inicio + i + 1, `Texto ${inicio + i + 1}`)) }, total: 12, proxima: inicio + 5 < 12 ? inicio + 5 : null, capa: null })) } as unknown as PdfNuvem;
  const docs = new DocumentosEdge(m.sb, parser);
  const salvo = await docs.guardar({ projeto, userId, escrever: true, user: m.sb }, Buffer.from('%PDF-1.7\noriginal'), { titulo: 'Relatório', ficheiro: 'fonte.pdf' });
  const d = m.tabelas.hub_documentos[0] as unknown as DocumentoNuvem;
  d.dados.pdf.paginas = Array.from({ length: 12 }, (_, i) => pagina(i + 1));
  const primeiro: JobHub = { id: crypto.randomUUID(), project_id: projeto, tipo: 'documento_preparar', pedido: { documentoId: salvo.documento.id, inicio: 0, reextracao: true, reextracaoId: 'ensaio' }, lease_token: 't' };
  await docs.parte(primeiro);
  await docs.parte(primeiro);
  const segunda = m.tabelas.hub_jobs.filter(j => (j.pedido as Record<string, unknown>).inicio === 5);
  expect(segunda).toHaveLength(1);
  expect(segunda[0].pedido).toMatchObject({ reextracao: true, reextracaoId: 'ensaio' });
  await docs.parte({ ...segunda[0], lease_token: 't' } as unknown as JobHub);
  const terceira = m.tabelas.hub_jobs.at(-1)!;
  expect(terceira.pedido).toMatchObject({ inicio: 10, reextracao: true, reextracaoId: 'ensaio' });
  await docs.parte({ ...terceira, lease_token: 't' } as unknown as JobHub);
  expect(d.dados.pdf.paginas.map(p => p.texto)).toEqual(Array.from({ length: 12 }, (_, i) => `Texto ${i + 1}`));
  expect(d.dados.processamento).toMatchObject({ estado: 'concluido', paginas: 12, total: 12 });
  expect(m.chamadas.some(c => c.nome === 'hub_job_adiar')).toBe(false);
});

it('retoma um job incerto sem repetir uma tarefa ativa nem apagar texto existente', async () => {
  const projeto = crypto.randomUUID(), userId = crypto.randomUUID();
  const m = supabaseMemoria({ hub_operacao: [{ project_id: projeto, pausado: false }] });
  const ctx = { projeto, userId, escrever: true, user: m.sb };
  const docs = new DocumentosEdge(m.sb, {} as PdfNuvem);
  const salvo = await docs.guardar(ctx, Buffer.from('%PDF-1.7\noriginal'), { titulo: 'Relatório', ficheiro: 'fonte.pdf' });
  const d = m.tabelas.hub_documentos[0] as unknown as DocumentoNuvem;
  d.dados.pdf.paginas = [{ n: 1, estado: 'texto', texto: 'Texto preservado', paragrafos: ['Texto preservado'] }];
  d.dados.processamento = { estado: 'a_processar', paginas: 1, total: 2, reextracao: true };
  m.tabelas.hub_jobs.forEach(j => { j.estado = 'incerto'; });
  const antes = m.tabelas.hub_jobs.length;
  await docs.operar(ctx, 'reextrair-texto', { id: salvo.documento.id });
  expect(m.tabelas.hub_jobs).toHaveLength(antes + 1);
  expect(m.tabelas.hub_jobs.at(-1)?.pedido).toMatchObject({ documentoId: salvo.documento.id, inicio: 0, reextracao: true });
  m.tabelas.hub_jobs.at(-1)!.estado = 'fila';
  await docs.operar(ctx, 'reextrair-texto', { id: salvo.documento.id });
  expect(m.tabelas.hub_jobs).toHaveLength(antes + 1);
  expect(d.dados.pdf.paginas[0].texto).toBe('Texto preservado');
});
