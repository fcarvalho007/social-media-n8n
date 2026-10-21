import process from 'node:process';
import { setInterval, clearInterval } from 'node:timers';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EstadoSeo } from '../../src/features/seo/contratos';
import { estadoInicialSeo } from '../../src/features/seo/catalogo';
import { validarEstadoPersistido, type ArmazemSeo } from '../seo/persistencia';
/** One database lease per active project; every commit checks the token AND revision. */
export class RepositorioSeoNuvem implements ArmazemSeo {
    get raiz() { return `supabase://${this.projeto}`; }
    private fila: Promise<unknown> = Promise.resolve();
    private token: string | null = null;
    private timer: ReturnType<typeof setInterval> | undefined;
    private perdido = false;
    constructor(private sb: SupabaseClient, readonly projeto: string) { }
    async iniciar() {
        const r = await this.sb.rpc('hub_lease_reservar', { _projeto: this.projeto, _recurso: 'seo', _segundos: 180 });
        if (r.error || !r.data)
            throw new Error('O projeto já está a executar uma operação editorial. Aguarda e atualiza.');
        this.token = String(r.data);
        try {
            const { data, error } = await this.sb.from('hub_editorial_estados').select('dados').eq('project_id', this.projeto).maybeSingle();
            if (error)
                throw new Error('Não foi possível ler o estado editorial.');
            if (!data) {
                await this.gravar(0, estadoInicialSeo());
            }
            else {
                validarEstadoPersistido(data.dados as EstadoSeo);
            }
            this.timer = setInterval(() => { void this.renovar(); }, 30000);
            this.timer.unref();
            // We own the exclusive lease: any pending call belongs to an expired/crashed process.
            await this.alterar(e => {
                for (const p of e.pedidos)
                    if (p.estado === 'em_curso') {
                        p.estado = 'incerto';
                        p.terminadoEm = new Date().toISOString();
                        p.detalhe = 'Processo interrompido. A reserva foi preservada; conferir o fornecedor antes de repetir.';
                    }
                for (const p of e.pautas)
                    if (p.estado === 'a_preparar') {
                        p.estado = 'bloqueado';
                        p.motivo = 'Produção interrompida; confirmar pedido e custo.';
                    }
            });
        }
        catch (e) {
            await this.fechar();
            throw e;
        }
    }
    private async renovar() {
        try {
            const r = await this.sb.rpc('hub_lease_renovar', { _projeto: this.projeto, _recurso: 'seo', _token: this.token });
            if (r.error || r.data !== true)
                this.perdido = true;
        }
        catch {
            this.perdido = true;
        }
    }
    private verificar() {
        if (!this.token || this.perdido)
            throw new Error('A reserva do processo expirou. Nenhuma chamada paga será repetida automaticamente.');
    }
    private async lerRevisao() {
        this.verificar();
        const r = await this.sb.from('hub_editorial_estados').select('dados,revisao').eq('project_id', this.projeto).single();
        if (r.error || !r.data)
            throw new Error('O histórico não pôde ser lido; não será substituído por um estado vazio.');
        validarEstadoPersistido(r.data.dados as EstadoSeo);
        return { estado: r.data.dados as EstadoSeo, revisao: Number(r.data.revisao) };
    }
    private async gravar(revisao: number, dados: EstadoSeo) {
        this.verificar();
        validarEstadoPersistido(dados);
        const r = await this.sb.rpc('hub_estado_guardar', { _projeto: this.projeto, _revisao: revisao, _dados: dados, _token: this.token });
        if (r.error)
            throw new Error('O estado mudou ou a reserva expirou. Atualiza antes de continuar; não repitas pedidos pagos.');
    }
    async ler() { await this.fila; return structuredClone((await this.lerRevisao()).estado); }
    async alterar<T>(fn: (e: EstadoSeo) => T | Promise<T>): Promise<T> {
        const tarefa = this.fila.then(async () => { const { estado, revisao } = await this.lerRevisao(); const r = await fn(estado); await this.gravar(revisao, estado); return structuredClone(r); });
        this.fila = tarefa.then(() => { }, () => { });
        return tarefa;
    }
    private async artefacto(tipo: 'resultado' | 'resposta', chave: string, dados: unknown) {
        this.verificar();
        if (!/^[a-f0-9-]{36}$/.test(chave))
            throw new Error('Identificador inválido.');
        const r = await this.sb.from('hub_editorial_artefactos').insert({ project_id: this.projeto, tipo, chave, dados });
        if (r.error)
            throw new Error('Não foi possível preservar a evidência do fornecedor. Confere o histórico antes de repetir.');
    }
    async guardarResultado(id: string, dados: unknown) { await this.artefacto('resultado', id, dados); }
    async guardarResposta(id: string, dados: unknown) { await this.artefacto('resposta', id, dados); }
    async resultado<T>(id: string): Promise<T> {
        this.verificar();
        const r = await this.sb.from('hub_editorial_artefactos').select('dados').eq('project_id', this.projeto).eq('tipo', 'resultado').eq('chave', id).single();
        if (r.error || !r.data)
            throw new Error('Resultado não encontrado neste projeto.');
        return r.data.dados as T;
    }
    async fechar() {
        clearInterval(this.timer);
        await this.fila;
        const t = this.token;
        this.token = null;
        if (t)
            await this.sb.rpc('hub_lease_libertar', { _projeto: this.projeto, _recurso: 'seo', _token: t });
    }
}
