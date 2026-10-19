import { Buffer } from 'node:buffer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { MotorDocumentos } from '../documentos/motor-local';
import fontes from '../documentos/fontes-originais.json';
import { obterPublico } from '../documentos/obter';
import { FalhaHttp, ambitoAutorizado, exigirEscrita, uuid, type ContextoBackend } from './seguranca';
import { extrairPdfServidor } from './pdf';
import type { DocumentoAcervo } from '../../src/features/documentos/modelo';
import { validarPreparacaoPdf } from './documentos-preparacao';
import { paginaComOcr, resultadoOcrSchema } from '../../src/features/documentos/ocr-modelo';
import { estadoLeitura } from '../../src/features/documentos/legado';
const hashZ = z.string().regex(/^[a-f0-9]{64}$/), texto = z.string().trim().min(1).max(250);
export interface DocumentoNuvem {
    id: string;
    hash: string;
    dados: Omit<DocumentoAcervo, 'ficheiro' | 'capa'>;
    pdf_path: string;
    capa_path: string | null;
    revisao: number;
}
export class DocumentosNuvem {
    private capasAssinadas = new Map<string, {
        url: string;
        ate: number;
    }>();
    constructor(private sb: SupabaseClient, readonly pasta: string, private extrair: typeof extrairPdfServidor = extrairPdfServidor) { }
    protected async binario(caminho: string, bytes: Uint8Array, tipo: string) {
        const r = await this.sb.storage.from('hub-documentos').upload(caminho, bytes, { contentType: tipo, upsert: false });
        if (r.error) {
            const anterior = await this.sb.storage.from('hub-documentos').download(caminho);
            if (anterior.error || !anterior.data || createHash('sha256').update(new Uint8Array(await anterior.data.arrayBuffer())).digest('hex') !== createHash('sha256').update(bytes).digest('hex'))
                throw new Error('Não foi possível preservar o ficheiro na nuvem.');
        }
    }
    async guardar(ctx: ContextoBackend, bytes: Uint8Array, meta: Record<string, unknown>) {
        exigirEscrita(ctx);
        if (bytes.byteLength > 50 * 1024 * 1024 || !Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from('%PDF-')))
            throw new Error('O ficheiro não é um PDF até 50 MB.');
        const hash = createHash('sha256').update(bytes).digest('hex');
        const existente = await this.encontrar(ctx, hash);
        if (existente) return { documento: existente, duplicado: true };
        const preparado = meta.preparacao === undefined ? null : validarPreparacaoPdf(meta.preparacao, hash, bytes.length);
        // Keep the verified binary durable before CPU-intensive text/cover extraction.
        await this.binario(`${ctx.projeto}/${hash}/original.pdf`, bytes, 'application/pdf');
        const { pdf, capa, capaErro } = preparado ? { ...preparado, capaErro: undefined } : await this.extrair(bytes, typeof meta.ficheiro === 'string' ? meta.ficheiro : 'documento.pdf');
        const id = crypto.randomUUID(), pdf_path = `${ctx.projeto}/${pdf.hash}/original.pdf`;
        const capa_path = capa ? `${ctx.projeto}/${pdf.hash}/capa-${createHash('sha256').update(capa).digest('hex')}.png` : null;
        if (capa && capa_path)
            await this.binario(capa_path, capa, 'image/png');
        const origem = typeof meta.origem === 'string' ? z.string().url().max(2000).parse(meta.origem) : null;
        const dados = { id, ambito: JSON.stringify([ctx.userId, ctx.projeto]), titulo: texto.parse(meta.titulo ?? pdf.titulo ?? pdf.ficheiro), origem, recolhidoEm: new Date().toISOString(), publicadoEm: null, pdf, leitura: 'por_ler', capaErro,
            ...(preparado ? { processamento: { estado: 'concluido', paginas: pdf.paginas.length, total: pdf.paginas.length }, extracao: { motor: 'pdfjs-4.10.38', origem: 'navegador', em: new Date().toISOString() } } : {}),
            ...(typeof meta.fonteNome === 'string' ? { fonteNome: meta.fonteNome.slice(0, 250) } : {}), ...(typeof meta.categoria === 'string' ? { categoria: meta.categoria.slice(0, 100) } : {}) };
        const r = await this.sb.from('hub_documentos').insert({ id, project_id: ctx.projeto, hash: pdf.hash, dados, pdf_path, capa_path, criado_por: ctx.userId }).select('*').single();
        if (r.error) {
            const outro = await this.encontrar(ctx, pdf.hash);
            if (outro)
                return { documento: outro, duplicado: true };
            throw new Error('O binário foi preservado; os metadados não foram confirmados. Tenta importar novamente.');
        }
        return { documento: await this.assinar(r.data as DocumentoNuvem), duplicado: false };
    }
    async listar(ctx: ContextoBackend, tabela: 'documentos' | 'recolhas') {
        const linhas: Record<string, unknown>[] = [];
        for (let offset = 0;; offset += 100) {
            const r = await this.sb.from(tabela === 'documentos' ? 'hub_documentos' : 'hub_recolhas').select('*').eq('project_id', ctx.projeto).order('criado_em', { ascending: false }).order('id').range(offset, offset + 99);
            if (r.error)
                throw new Error('Não foi possível ler todo o acervo privado.');
            linhas.push(...(r.data ?? []));
            if ((r.data ?? []).length < 100)
                break;
        }
        return tabela === 'documentos' ? Promise.all(linhas.map(d => this.assinar(d as unknown as DocumentoNuvem))) : linhas;
    }
    protected async assinar(d: DocumentoNuvem) {
        if (!d.capa_path)
            return d;
        const cache = this.capasAssinadas.get(d.capa_path);
        if (cache && cache.ate > Date.now())
            return { ...d, capa_url: cache.url };
        const r = await this.sb.storage.from('hub-documentos').createSignedUrl(d.capa_path, 900);
        if (r.error)
            return d;
        this.capasAssinadas.set(d.capa_path, { url: r.data.signedUrl, ate: Date.now() + 720000 });
        if (this.capasAssinadas.size > 1000)
            for (const [k, v] of this.capasAssinadas)
                if (v.ate < Date.now())
                    this.capasAssinadas.delete(k);
        return { ...d, capa_url: r.data.signedUrl };
    }
    async encontrar(ctx: ContextoBackend, hash: string) {
        hashZ.parse(hash);
        const r = await this.sb.from('hub_documentos').select('*').eq('project_id', ctx.projeto).eq('hash', hash).maybeSingle();
        if (r.error)
            throw new Error('Não foi possível verificar duplicados.');
        return r.data ? this.assinar(r.data as DocumentoNuvem) : null;
    }
    async obter(ctx: ContextoBackend, id: string) {
        uuid.parse(id);
        const r = await this.sb.from('hub_documentos').select('*').eq('project_id', ctx.projeto).eq('id', id).single();
        if (r.error || !r.data)
            throw new FalhaHttp('Documento não encontrado neste projeto.', 404);
        return r.data as DocumentoNuvem;
    }
    async ficheiro(ctx: ContextoBackend, id: string, capa = false) {
        const d = await this.obter(ctx, id), p = capa ? d.capa_path : d.pdf_path;
        if (!p)
            throw new FalhaHttp('Capa ainda indisponível.', 404);
        const r = await this.sb.storage.from('hub-documentos').download(p);
        if (r.error || !r.data)
            throw new Error('Ficheiro privado indisponível.');
        return r.data;
    }
    async alterar(ctx: ContextoBackend, a: Record<string, unknown>) {
        exigirEscrita(ctx);
        const d = await this.obter(ctx, uuid.parse(a.id)), versao = z.number().int().positive().parse(a.revisao);
        const campo = z.enum(['titulo', 'leitura']).parse(a.campo);
        const valor = campo === 'titulo' ? texto.parse(a.valor) : z.enum(['por_ler', 'lido', 'arquivado']).parse(a.valor);
        const r = await this.sb.from('hub_documentos').update({ dados: { ...d.dados, [campo]: valor }, revisao: versao + 1, atualizado_em: new Date().toISOString() }).eq('id', d.id).eq('project_id', ctx.projeto).eq('revisao', versao).select('id');
        if (r.error || r.data?.length !== 1)
            throw new FalhaHttp('O documento mudou noutro separador. Atualiza antes de guardar.', 409);
        return { ok: true };
    }
    async operar(ctx: ContextoBackend, acao: string, a: Record<string, unknown>) {
        if (a.ambito !== undefined)
            ambitoAutorizado(ctx, a.ambito);
        if (acao === 'capas') {
            const linhas: {
                id: string;
                capa_path: string | null;
            }[] = [];
            for (let offset = 0;; offset += 100) {
                const r = await this.sb.from('hub_documentos').select('id,capa_path').eq('project_id', ctx.projeto).order('id').range(offset, offset + 99);
                if (r.error)
                    throw new Error('Não foi possível renovar as capas.');
                linhas.push(...(r.data ?? []));
                if ((r.data ?? []).length < 100)
                    break;
            }
            const paths = linhas.flatMap(d => d.capa_path ? [d.capa_path] : []);
            if (!paths.length)
                return [];
            const r = await this.sb.storage.from('hub-documentos').createSignedUrls(paths, 900);
            if (r.error)
                throw new Error('Não foi possível renovar o acesso às capas.');
            return linhas.map(d => ({ id: d.id, capa_url: r.data.find(x => x.path === d.capa_path)?.signedUrl }));
        }
        if (acao === 'documento')
            return this.assinar(await this.obter(ctx, uuid.parse(a.id)));
        if (acao === 'versoes') {
            const r = await this.sb.from('hub_documentos').select('id,revisao').eq('project_id', ctx.projeto).order('id').limit(5000);
            if (r.error)
                throw new Error('Progresso indisponível.');
            return r.data;
        }
        if (acao === 'acervo')
            return this.listar(ctx, 'documentos');
        if (acao === 'recolhas')
            return this.listar(ctx, 'recolhas');
        if (acao === 'refazer-capa') {
            exigirEscrita(ctx);
            const d = await this.obter(ctx, uuid.parse(a.id)), bytes = new Uint8Array(await (await this.ficheiro(ctx, d.id)).arrayBuffer());
            const { capa } = await this.extrair(bytes, d.dados.pdf.ficheiro);
            if (!capa)
                throw new Error('Não foi possível criar a capa.');
            const p = `${ctx.projeto}/${d.hash}/capa-${createHash('sha256').update(capa).digest('hex')}.png`;
            await this.binario(p, capa, 'image/png');
            const r = await this.sb.from('hub_documentos').update({ capa_path: p, revisao: d.revisao + 1, atualizado_em: new Date().toISOString() }).eq('id', d.id).eq('project_id', ctx.projeto).eq('revisao', d.revisao).select('id');
            if (r.error || r.data?.length !== 1)
                throw new FalhaHttp('O documento mudou. Atualiza antes de repetir.', 409);
            return { ok: true };
        }
        if (acao === 'legado') {
            exigirEscrita(ctx);
            const d = await this.obter(ctx, uuid.parse(a.id));
            const legado = z.object({ projeto: z.string().max(300), exportadoEm: z.string().max(100), objeto: z.string().max(500), orfao: z.boolean(), registos: z.array(z.object({ id: z.number().int(), title: z.string().max(1000), url: z.string().max(2000), tags: z.array(z.string().max(200)).max(100) }).passthrough()).max(100) }).parse(a.legado);
            const unido = { ...legado, registos: [...new Map([...(d.dados.legado?.registos ?? []), ...legado.registos].map(r => [r.id, r])).values()] } as NonNullable<DocumentoAcervo['legado']>;
            const leitura = d.dados.legado ? d.dados.leitura : d.dados.leitura === 'por_ler' ? estadoLeitura({ legado: unido }) : d.dados.leitura;
            const r = await this.sb.from('hub_documentos').update({ dados: { ...d.dados, legado: unido, leitura }, revisao: d.revisao + 1, atualizado_em: new Date().toISOString() }).eq('id', d.id).eq('project_id', ctx.projeto).eq('revisao', z.number().int().parse(a.revisao)).select('*').single();
            if (r.error || !r.data)
                throw new FalhaHttp('O documento mudou. Atualiza os metadados.', 409);
            return this.assinar(r.data as DocumentoNuvem);
        }
        if (acao === 'ocr-pagina') {
            exigirEscrita(ctx);
            const d = await this.obter(ctx, uuid.parse(a.id));
            if (hashZ.parse(a.hash) !== d.hash) throw new FalhaHttp('O original do documento mudou.', 409);
            const resultado = resultadoOcrSchema.parse(a.pagina);
            const pagina = d.dados.pdf.paginas.find(p => p.n === resultado.n);
            if (!pagina) throw new FalhaHttp('A página ainda não foi extraída.', 409);
            if (pagina.ocr && pagina.texto === resultado.texto.replace(/\0/g, '').trim()) return this.assinar(d);
            const nova = paginaComOcr(pagina, resultado);
            const dados = { ...d.dados, pdf: { ...d.dados.pdf, paginas: d.dados.pdf.paginas.map(p => p.n === nova.n ? nova : p) } };
            const r = await this.sb.from('hub_documentos').update({ dados, revisao: d.revisao + 1, atualizado_em: new Date().toISOString() }).eq('project_id', ctx.projeto).eq('id', d.id).eq('revisao', d.revisao).select('*').single();
            if (r.error || !r.data) throw new FalhaHttp('O documento mudou durante o OCR. As alterações foram preservadas; retoma a leitura.', 409);
            return this.assinar(r.data as DocumentoNuvem);
        }
        if (acao === 'encontrar')
            return this.encontrar(ctx, hashZ.parse(a.hash));
        if (acao === 'alterar')
            return this.alterar(ctx, a);
        if (acao === 'legado-resumo') {
            const r = await this.sb.from('hub_editorial_artefactos').select('dados').eq('project_id', ctx.projeto).eq('tipo', 'resposta').eq('chave', 'pdftracker-importacao').maybeSingle();
            if (r.error) throw new Error('Não foi possível ler a conferência da importação.');
            return r.data?.dados ?? null;
        }
        if (acao === 'legado-relatorio') {
            exigirEscrita(ctx);
            const relatorio = z.object({ exportadoEm: z.string().max(100), registos: z.number().int().min(0).max(2000), objetos: z.number().int().min(0).max(2000), hashes: z.array(hashZ).max(2000), pendencias: z.array(z.object({ titulo: z.string().max(1000), ids: z.array(z.number().int()).max(100), erro: z.string().max(3000) }).strict()).max(2000) }).strict().parse(a.relatorio);
            const r = await this.sb.from('hub_editorial_artefactos').upsert({ project_id: ctx.projeto, tipo: 'resposta', chave: 'pdftracker-importacao', dados: relatorio }, { onConflict: 'project_id,tipo,chave' });
            if (r.error) throw new Error('Não foi possível guardar a conferência da importação.');
            return { ok: true };
        }
        if (acao === 'legado/catalogo' || acao === 'diagnostico')
            return null;
        if (acao === 'fontes')
            return fontes;
        if (acao === 'ficheiro')
            return this.ficheiro(ctx, uuid.parse(a.id), a.capa === true);
        if (acao === 'guardar-recolha') {
            exigirEscrita(ctx);
            const r = z.object({ id: uuid, url: z.string().max(2000), em: z.string(), estado: z.string().max(30), detalhe: z.string().max(3000), documentoId: uuid.optional(), ambito: z.string() }).strict().parse(a.recolha);
            ambitoAutorizado(ctx, r.ambito);
            const anterior = await this.sb.from('hub_recolhas').select('id').eq('id', r.id).eq('project_id', ctx.projeto).maybeSingle();
            if (anterior.error)
                throw new Error('Histórico indisponível.');
            const q = anterior.data ? await this.sb.from('hub_recolhas').update({ dados: r }).eq('id', r.id).eq('project_id', ctx.projeto) : await this.sb.from('hub_recolhas').insert({ id: r.id, project_id: ctx.projeto, dados: r });
            if (q.error)
                throw new Error('Não foi possível guardar o histórico.');
            return { ok: true };
        }
        if (acao === 'iniciar') {
            exigirEscrita(ctx);
            const ids = z.array(z.number().int()).min(1).max(12).parse(a.ids), modo = z.enum(['diagnostico', 'recolher']).parse(a.modo);
            // A queued job is durable before this response. Browser closure does not stop it.
            const key = z.string().uuid().parse(a.pedidoId);
            const r = await ctx.user.rpc('hub_enfileirar', { _projeto: ctx.projeto, _tipo: 'documentos_recolha', _dedup: key, _pedido: { ids, modo, userId: ctx.userId } });
            if (r.error)
                throw new Error('Não foi possível enfileirar a recolha. Confirma se a automação está ativa.');
            return { id: r.data, estado: 'fila' };
        }
        if (acao === 'obter') {
            exigirEscrita(ctx);
            return obterPublico(z.string().url().max(2000).parse(a.url), AbortSignal.timeout(35000));
        }
        if (acao === 'tarefas' || acao === 'ler') {
            let q = this.sb.from('hub_jobs').select('*').eq('project_id', ctx.projeto).eq('tipo', 'documentos_recolha').order('criado_em', { ascending: false }).limit(20);
            if (acao === 'ler')
                q = q.eq('id', uuid.parse(a.id));
            const r = await q;
            if (r.error)
                throw new Error('O histórico de recolhas não pôde ser lido.');
            const tarefas = (r.data ?? []).map(j => ({ ...((j.resultado ?? {}) as Record<string, unknown>), id: j.id, ambito: JSON.stringify([ctx.userId, ctx.projeto]), modo: j.pedido.modo, iniciadaEm: j.criado_em, total: j.resultado?.total ?? j.pedido.ids?.length ?? 0,
                estado: ['fila', 'em_curso'].includes(j.estado) ? 'em_curso' : j.estado === 'concluido' ? 'concluida' : 'interrompida', atual: j.resultado?.atual ?? (j.estado === 'fila' ? 'Na fila do servidor…' : 'Consulta o resultado do trabalho.'), fontes: j.resultado?.fontes ?? [], descobertas: j.resultado?.descobertas ?? [], pdfs: j.resultado?.pdfs ?? [], erros: j.resultado?.erros ?? [] }));
            if (acao === 'ler') {
                if (!tarefas[0])
                    throw new FalhaHttp('Recolha não encontrada.', 404);
                return tarefas[0];
            }
            return tarefas;
        }
        if (acao === 'pdf') {
            const r = await this.sb.from('hub_jobs').select('resultado').eq('id', uuid.parse(a.id)).eq('project_id', ctx.projeto).single();
            const h = hashZ.parse(a.hash);
            if (r.error || !r.data?.resultado?.pdfs?.some((p: {
                hash: string;
            }) => p.hash === h))
                throw new FalhaHttp('PDF não encontrado nesta recolha.', 404);
            const b = await this.sb.storage.from('hub-documentos').download(`${ctx.projeto}/${h}/original.pdf`);
            if (b.error || !b.data)
                throw new Error('Ficheiro privado indisponível.');
            return b.data;
        }
        if (acao === 'confirmar')
            return { ok: true };
        if (acao === 'retomar') {
            exigirEscrita(ctx);
            const j = await this.sb.from('hub_jobs').select('*').eq('id', uuid.parse(a.id)).eq('project_id', ctx.projeto).eq('tipo', 'documentos_recolha').single();
            if (j.error || !j.data || !['incerto', 'falhou'].includes(j.data.estado))
                throw new FalhaHttp('Trabalho sem retoma disponível.', 409);
            const novo = await ctx.user.rpc('hub_enfileirar', { _projeto: ctx.projeto, _tipo: 'documentos_recolha', _dedup: uuid.parse(a.pedidoId), _pedido: { ...j.data.pedido, retomaDe: j.data.id } });
            if (novo.error)
                throw new Error('Não foi possível retomar a recolha.');
            return { id: novo.data };
        }
        if (acao === 'artigo') {
            const r = await this.sb.from('hub_jobs').select('resultado').eq('id', uuid.parse(a.id)).eq('project_id', ctx.projeto).single();
            const url = z.string().url().max(2000).parse(a.url);
            const item = r.data?.resultado?.descobertas?.find((d: {
                url: string;
                tipo: string;
            }) => d.url === url && d.tipo === 'artigo');
            if (r.error || !item)
                throw new FalhaHttp('Referência não encontrada nesta recolha.', 404);
            exigirEscrita(ctx);
            const { extrairArtigoPublico } = await import('./ler-artigo');
            return extrairArtigoPublico(url, item);
        }
        throw new FalhaHttp('Operação de documentos desconhecida.', 404);
    }
}
export function motorRecolha(pasta: string) { return new MotorDocumentos(pasta, fontes); }
