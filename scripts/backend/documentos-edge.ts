import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DocumentosNuvem } from './documentos';
import { PdfNuvem } from './pdf-wasm';
import type { ContextoBackend } from './seguranca';
import type { JobHub } from './worker';
import type { DocumentoNuvem } from './documentos';
export class DocumentosEdge extends DocumentosNuvem {
    constructor(private banco: SupabaseClient, private pdfium: PdfNuvem) { super(banco, '/tmp/hub', async (bytes, nome) => ({ pdf: { hash: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, ficheiro: nome, paginas: [] }, capa: null })); }
    async guardar(ctx: ContextoBackend, bytes: Uint8Array, meta: Record<string, unknown>) {
        if (bytes.length > 32 * 1024 * 1024)
            throw new Error('O processamento na nuvem aceita PDFs até 32 MB.');
        const salvo = await super.guardar(ctx, bytes, meta);
        if (!salvo.documento.dados.pdf.paginas.length) {
            await this.enfileirar(ctx.projeto, salvo.documento.id, 0);
            const c = await this.banco.from('hub_jobs').upsert({ project_id: ctx.projeto, tipo: 'documento_preparar', dedup: `capa:${salvo.documento.id}`, pedido: { documentoId: salvo.documento.id, inicio: 0, capa: true } }, { onConflict: 'project_id,tipo,dedup', ignoreDuplicates: true });
            if (c.error)
                throw new Error('Original e texto na fila; não foi possível agendar a capa.');
        }
        return salvo;
    }
    private async enfileirar(projeto: string, id: string, inicio: number) {
        const r = await this.banco.from('hub_jobs').upsert({ project_id: projeto, tipo: 'documento_preparar', dedup: `pdf:${id}:${inicio}`, pedido: { documentoId: id, inicio } }, { onConflict: 'project_id,tipo,dedup', ignoreDuplicates: true });
        if (r.error)
            throw new Error('PDF preservado; não foi possível agendar a extração. Reimporta o mesmo ficheiro para retomar.');
    }
    async parte(job: JobHub) {
        try {
            return await this.processarParte(job);
        }
        catch (e) {
            const r = await this.banco.from('hub_documentos').select('*').eq('project_id', job.project_id).eq('id', job.pedido.documentoId).single();
            if (!r.error && r.data) {
                const d = r.data as DocumentoNuvem;
                await this.banco.from('hub_documentos').update({ dados: { ...d.dados, ...(job.pedido.capa ? { capaErro: (e as Error).message } : { processamento: { estado: 'erro', paginas: d.dados.pdf.paginas.length, total: d.dados.processamento?.total, reextracao: job.pedido.reextracao === true, erro: (e as Error).message } }) }, revisao: d.revisao + 1, atualizado_em: new Date().toISOString() }).eq('project_id', job.project_id).eq('id', d.id).eq('revisao', d.revisao);
            }
            throw e;
        }
    }
    private async processarParte(job: JobHub) {
        const id = String(job.pedido.documentoId), inicio = Number(job.pedido.inicio);
        const r = await this.banco.from('hub_documentos').select('*').eq('id', id).eq('project_id', job.project_id).single();
        if (r.error || !r.data)
            throw new Error('Documento não encontrado neste projeto.');
        const d = r.data as DocumentoNuvem;
        const reextracao = job.pedido.reextracao === true;
        if (!reextracao && !job.pedido.capa && d.dados.pdf.paginas.length > inicio) {
            const processamento = (d.dados as unknown as {
                processamento?: {
                    total: number;
                };
            }).processamento;
            const proxima = d.dados.pdf.paginas.length;
            if (processamento && proxima < processamento.total)
                await this.enfileirar(job.project_id, id, proxima);
            return { reutilizado: true };
        }
        if (!reextracao && !job.pedido.capa && d.dados.pdf.paginas.length !== inicio)
            throw new Error('O intervalo do documento mudou. Não foi substituído.');
        const b = await this.banco.storage.from('hub-documentos').download(d.pdf_path);
        if (b.error || !b.data)
            throw new Error('Original privado indisponível.');
        const bytes = new Uint8Array(await b.data.arrayBuffer());
        if (createHash('sha256').update(bytes).digest('hex') !== d.hash)
            throw new Error('O original não corresponde à assinatura guardada.');
        const parte = await this.pdfium.parte(bytes, d.dados.pdf.ficheiro, inicio, job.pedido.capa ? 1 : 5, job.pedido.capa === true), pausa = await this.banco.from('hub_operacao').select('pausado').eq('project_id', job.project_id).single();
        if (pausa.error || pausa.data?.pausado !== false)
            throw new Error('Processamento pausado. O original foi preservado.');
        let capaPath = d.capa_path;
        if (parte.capa) {
            capaPath = `${job.project_id}/${d.hash}/capa-${createHash('sha256').update(parte.capa).digest('hex')}.png`;
            await this.binario(capaPath, parte.capa, 'image/png');
        }
        if (job.pedido.capa) {
            const q = await this.banco.from('hub_documentos').update({ capa_path: capaPath, revisao: d.revisao + 1, atualizado_em: new Date().toISOString() }).eq('project_id', job.project_id).eq('id', id).eq('revisao', d.revisao).select('id');
            if (q.error || q.data?.length !== 1)
                throw new Error('O documento mudou. Atualiza antes de refazer a capa.');
            return { capaCriada: !!capaPath };
        }
        // A second engine may recover malformed fonts. Never replace existing text or OCR.
        const paginas = reextracao ? d.dados.pdf.paginas.map(p => p.texto || p.ocr ? p : parte.pdf.paginas.find(n => n.n === p.n) ?? p) : [...d.dados.pdf.paginas, ...parte.pdf.paginas];
        const dados = { ...d.dados, pdf: { ...d.dados.pdf, paginas }, processamento: { estado: parte.proxima === null ? 'concluido' : 'a_processar', paginas: inicio + parte.pdf.paginas.length, total: parte.total, reextracao } };
        const q = await this.banco.from('hub_documentos').update({ dados, capa_path: capaPath, revisao: d.revisao + 1, atualizado_em: new Date().toISOString() }).eq('project_id', job.project_id).eq('id', id).eq('revisao', d.revisao).select('id');
        if (q.error || q.data?.length !== 1)
            throw new Error('O documento mudou durante a extração. As alterações do leitor foram preservadas.');
        if (reextracao && parte.proxima !== null) return { paginas: inicio + parte.pdf.paginas.length, total: parte.total, continuarPedido: { ...job.pedido, inicio: parte.proxima } };
        if (!job.pedido.capa && parte.proxima !== null)
            await this.enfileirar(job.project_id, id, parte.proxima);
        return { paginas: dados.pdf.paginas.length, total: parte.total, concluido: parte.proxima === null };
    }
    async operar(ctx: ContextoBackend, acao: string, a: Record<string, unknown>) {
        if (acao === 'retomar-processamento' || acao === 'reextrair-texto') {
            if (!ctx.escrever)
                throw new Error('É necessária permissão de edição.');
            const d = await this.obter(ctx, String(a.id));
            const fila = await this.banco.from('hub_jobs').select('id').eq('project_id', ctx.projeto).eq('tipo', 'documento_preparar').contains('pedido', { documentoId: d.id }).in('estado', ['fila', 'em_curso']).limit(1);
            if (fila.error)
                throw new Error('Fila indisponível.');
            if (fila.data?.length)
                return { ok: true };
            const reextracao = acao === 'reextrair-texto' || d.dados.processamento?.reextracao === true;
            if (reextracao && !d.dados.pdf.paginas.length) throw new Error('Aguarda a preparação inicial do PDF.');
            const r = await this.banco.from('hub_jobs').insert({ project_id: ctx.projeto, tipo: 'documento_preparar', dedup: crypto.randomUUID(), pedido: { documentoId: d.id, inicio: reextracao ? 0 : d.dados.pdf.paginas.length, reextracao } });
            if (r.error)
                throw new Error('Não foi possível retomar a extração.');
            await this.banco.from('hub_documentos').update({ dados: { ...d.dados, processamento: { ...d.dados.processamento, estado: 'a_processar', paginas: reextracao ? 0 : d.dados.pdf.paginas.length, reextracao } }, revisao: d.revisao + 1 }).eq('project_id', ctx.projeto).eq('id', d.id).eq('revisao', d.revisao);
            return { ok: true };
        }
        if (acao === 'refazer-capa') {
            const d = await this.obter(ctx, String(a.id));
            if (!ctx.escrever)
                throw new Error('É necessária permissão de edição.');
            const r = await this.banco.from('hub_jobs').insert({ project_id: ctx.projeto, tipo: 'documento_preparar', dedup: crypto.randomUUID(), pedido: { documentoId: d.id, inicio: 0, capa: true } });
            if (r.error)
                throw new Error('Não foi possível enfileirar a capa.');
            return { ok: true };
        }
        return super.operar(ctx, acao, a);
    }
}
