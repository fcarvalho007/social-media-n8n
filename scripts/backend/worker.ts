import { setInterval, clearInterval } from 'node:timers';
import path from 'node:path';
import { diaLisboa } from '../../src/features/seo/precos';
import { mkdir, rm } from 'node:fs/promises';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MotorDocumentos } from '../documentos/motor-local';
import fontes from '../documentos/fontes-originais.json';
import type { TarefaDocumentos } from '../../src/features/documentos/contratos';
import type { ContextoBackend } from './seguranca';
import { DocumentosNuvem } from './documentos';
import { ServicoSeo } from './seo';
export interface JobHub {
    id: string;
    project_id: string;
    tipo: 'seo_ciclo' | 'documentos_recolha' | 'wordpress' | 'documento_preparar';
    pedido: Record<string, unknown>;
    resultado?: Partial<TarefaDocumentos>;
    lease_token: string;
}
export class WorkerHub {
    private agendadoEm = '';
    private parar = false;
    private timer: ReturnType<typeof setTimeout> | undefined;
    private atual: Promise<void> = Promise.resolve();
    constructor(private sb: SupabaseClient, private seo: ServicoSeo, private documentos: DocumentosNuvem, private pasta: string, private publicar?: (j: JobHub) => Promise<unknown>, private automaticoWp: (site: string) => boolean = () => false, private prepararDocumento?: (j: JobHub) => Promise<unknown>) { }
    iniciar() { this.parar = false; this.agendar(); }
    private agendar() {
        this.timer = setTimeout(() => {
            this.atual = this.passo().catch(() => { }).finally(() => {
                if (!this.parar)
                    this.agendar();
            });
        }, 5000);
        this.timer.unref();
    }
    async fechar() { this.parar = true; clearTimeout(this.timer); await this.atual; }
    private async permitido(projeto: string) { const r = await this.sb.from('hub_operacao').select('pausado').eq('project_id', projeto).maybeSingle(); return !r.error && r.data?.pausado === false; }
    async programar() {
        const minutoAtual = new Date().toISOString().slice(0, 16);
        if (minutoAtual === this.agendadoEm)
            return;
        this.agendadoEm = minutoAtual;
        const r = await this.sb.from('hub_operacao').select('project_id,agenda_documentos').eq('pausado', false);
        if (r.error)
            throw new Error('Não foi possível consultar o agendamento.');
        for (const p of r.data ?? []) {
            const a = p.agenda_documentos;
            if (a?.ativa === true) {
                const agora = new Date(), dia = diaLisboa(agora), semana = new Date(dia + 'T12:00:00Z').getUTCDay(), hora = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(agora);
                if (Array.isArray(a.dias) && a.dias.includes(semana) && typeof a.hora === 'string' && hora >= a.hora) {
                    const owner = await this.sb.from('projects').select('owner_id').eq('id', p.project_id).single();
                    if (owner.error || !owner.data)
                        throw new Error('Proprietário da recolha indisponível.');
                    const tarefa = await this.sb.from('hub_jobs').upsert({ project_id: p.project_id, tipo: 'documentos_recolha', dedup: `agenda:${dia}`, pedido: { ids: fontes.filter(f => f.active).slice(0, 12).map(f => f.id), modo: 'recolher', userId: owner.data.owner_id } }, { onConflict: 'project_id,tipo,dedup', ignoreDuplicates: true });
                    if (tarefa.error)
                        throw new Error('Não foi possível guardar a recolha agendada.');
                }
            }
            const e = await this.sb.from('hub_editorial_estados').select('dados').eq('project_id', p.project_id).maybeSingle();
            const dados = e.data?.dados;
            if (e.error || !dados || dados.configuracao?.automacaoPausada !== false || dados.configuracao?.pausado !== false)
                continue;
            for (const pauta of dados.pautas ?? []) {
                const site = dados.sites?.find((s: {
                    id: string;
                }) => s.id === pauta.siteId);
                if (pauta.estado !== 'pronto_automatico' || !site || site.revisaoObrigatoria || site.id === 'frederico' || site.politica.publicacao !== 'automatica' || !this.automaticoWp(site.id))
                    continue;
                const wp = await this.sb.from('hub_jobs').upsert({ project_id: p.project_id, tipo: 'wordpress', dedup: `publicar:${pauta.id}:${pauta.versao}`, pedido: { pautaId: pauta.id, versao: pauta.versao, destino: 'publish', confirmar: true } }, { onConflict: 'project_id,tipo,dedup', ignoreDuplicates: true });
                if (wp.error)
                    throw new Error('Não foi possível registar a publicação autorizada.');
            }
            const minuto = minutoAtual;
            const pendentes = await this.sb.from('hub_jobs').select('id').eq('project_id', p.project_id).eq('tipo', 'seo_ciclo').in('estado', ['fila', 'em_curso']).limit(1);
            if (pendentes.error || pendentes.data?.length)
                continue;
            const gravado = await this.sb.from('hub_jobs').upsert({ project_id: p.project_id, tipo: 'seo_ciclo', dedup: `ciclo:${minuto}`, pedido: {} }, { onConflict: 'project_id,tipo,dedup', ignoreDuplicates: true });
            if (gravado.error)
                throw new Error('Não foi possível persistir o ciclo.');
        }
    }
    async passo() {
        await this.programar();
        const q = await this.sb.rpc('hub_job_reservar', { _tipos: this.prepararDocumento ? ['seo_ciclo', 'documentos_recolha', 'wordpress', 'documento_preparar'] : ['seo_ciclo', 'documentos_recolha', 'wordpress'] });
        if (q.error)
            throw new Error('A fila persistente está indisponível.');
        const job = q.data?.[0] as JobHub | undefined;
        if (!job)
            return;
        let vivo = true, renovando = false;
        const renovar = async () => {
            if (renovando)
                return;
            renovando = true;
            try {
                const r = await this.sb.rpc('hub_job_renovar', { _id: job.id, _token: job.lease_token });
                if (r.error || r.data !== true)
                    vivo = false;
            }
            catch {
                vivo = false;
            }
            finally {
                renovando = false;
            }
        };
        const timer = setInterval(() => void renovar(), 15000);
        timer.unref();
        const continuar = async () => vivo && !this.parar && await this.permitido(job.project_id);
        try {
            if (!await continuar())
                throw new Error('Trabalho pausado antes de iniciar.');
            let resultado: unknown;
            if (job.tipo === 'seo_ciclo') {
                await this.seo.ciclo(job.project_id);
                resultado = { concluido: true };
            }
            else if (job.tipo === 'documentos_recolha')
                resultado = await this.recolher(job, continuar);
            else if (job.tipo === 'documento_preparar' && this.prepararDocumento)
                resultado = await this.prepararDocumento(job);
            else if (this.publicar)
                resultado = await this.publicar(job);
            else
                throw new Error('Publicador WordPress não configurado.');
            if (resultado && typeof resultado === 'object' && 'continuarPedido' in resultado) {
                const r = await this.sb.rpc('hub_job_adiar', { _id: job.id, _token: job.lease_token, _pedido: resultado.continuarPedido, _resultado: resultado });
                if (r.error || r.data !== true)
                    throw new Error('Não foi possível guardar a continuação da recolha.');
                return;
            }
            const fim = await this.sb.rpc('hub_job_concluir', { _id: job.id, _token: job.lease_token, _estado: 'concluido', _resultado: resultado });
            if (fim.error || fim.data !== true)
                throw new Error('Resultado não confirmado pela reserva atual.');
        }
        catch (e) {
            await this.sb.rpc('hub_job_concluir', { _id: job.id, _token: job.lease_token, _estado: 'incerto', _resultado: { erro: (e as Error).message } });
        }
        finally {
            clearInterval(timer);
        }
    }
    private async recolher(job: JobHub, continuar: () => Promise<boolean>) {
        const owner = await this.sb.from('projects').select('owner_id').eq('id', job.project_id).single();
        if (owner.error || !owner.data || owner.data.owner_id !== job.pedido.userId)
            throw new Error('A autoria do trabalho não corresponde ao projeto.');
        const ctx: ContextoBackend = { userId: String(owner.data.owner_id), projeto: job.project_id, escrever: true, user: this.sb };
        const pasta = path.join(this.pasta, job.id);
        // Edge /tmp is isolated by the platform; chmod is blocklisted there.
        await mkdir(pasta, { recursive: true, ...(!this.prepararDocumento ? { mode: 0o700 } : {}) });
        const motor = new MotorDocumentos(pasta, fontes, continuar, { temporarioIsolado: !!this.prepararDocumento }), ambito = JSON.stringify([ctx.userId, ctx.projeto]);
        let tarefa: TarefaDocumentos | undefined;
        const anteriores = job.resultado, ids = job.pedido.ids as number[], agregar = () => ({ ...structuredClone(tarefa!), id: job.id, total: anteriores?.total ?? ids.length, fontes: [...(anteriores?.fontes ?? []), ...(tarefa?.fontes ?? [])], descobertas: [...(anteriores?.descobertas ?? []), ...(tarefa?.descobertas ?? [])], pdfs: [...(anteriores?.pdfs ?? []), ...(tarefa?.pdfs ?? [])].filter((p, i, a) => a.findIndex(x => x.hash === p.hash) === i), erros: [...(anteriores?.erros ?? []), ...(tarefa?.erros ?? [])] });
        const progresso = async () => {
            if (!tarefa)
                return;
            const resultado = agregar();
            resultado.pdfs = resultado.pdfs.filter(p => p.estado === 'guardado' || p.estado === 'erro');
            await this.sb.rpc('hub_job_progresso', { _id: job.id, _token: job.lease_token, _resultado: resultado });
        };
        let timer: ReturnType<typeof setInterval> | undefined;
        try {
            tarefa = await motor.iniciar(ambito, this.prepararDocumento ? ids.slice(0, 1) : ids, job.pedido.modo as 'diagnostico' | 'recolher');
            timer = setInterval(() => void progresso(), 5000);
            timer.unref();
            await motor.aguardar(tarefa.id, ambito);
            for (const p of tarefa.pdfs) {
                if (!await continuar())
                    throw new Error('Recolha pausada; os ficheiros já persistidos foram preservados.');
                try {
                    const salvo = await this.documentos.guardar(ctx, await motor.binario(tarefa.id, ambito, p.hash), { ficheiro: new URL(p.url).pathname.split('/').at(-1), titulo: p.titulo, origem: p.url, fonteNome: p.nomeFonte, categoria: p.categoria });
                    p.estado = 'guardado';
                    p.documentoId = salvo.documento.id;
                    p.capaCriada = !!salvo.documento.capa_path;
                    p.capaErro = salvo.documento.dados.capaErro;
                }
                catch (e) {
                    p.estado = 'erro';
                    p.erro = (e as Error).message;
                }
                await progresso();
            }
            if (tarefa.estado === 'interrompida')
                throw new Error('Recolha interrompida. Resultados parciais preservados.');
            return this.prepararDocumento && ids.length > 1 ? { ...agregar(), continuarPedido: { ...job.pedido, ids: ids.slice(1) } } : agregar();
        }
        finally {
            clearInterval(timer);
            await progresso();
            await rm(pasta, { recursive: true, force: true });
        }
    }
}
