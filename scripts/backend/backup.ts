import { setInterval, clearInterval } from 'node:timers';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
const TABELAS = ['hub_editorial_estados', 'hub_editorial_artefactos', 'hub_documentos', 'hub_recolhas', 'hub_operacao', 'hub_jobs', 'hub_publicacoes'] as const;
export interface CopiaHub {
    versao: 1;
    projeto: string;
    em: string;
    tabelas: Record<string, Record<string, unknown>[]>;
    objetos: {
        path: string;
        hash: string;
        bytes: number;
    }[];
    hash: string;
}
export const assinaturaBackup = (valor: unknown) => createHash('sha256').update(JSON.stringify(valor)).digest('hex');
export async function criarBackup(sb: SupabaseClient, projeto: string): Promise<CopiaHub> {
    const pausa = await sb.from('hub_operacao').select('pausado').eq('project_id', projeto).maybeSingle();
    if (pausa.error || pausa.data?.pausado !== true)
        throw new Error('Pausa o serviço antes de criar uma cópia.');
    const lease = await sb.rpc('hub_lease_reservar', { _projeto: projeto, _recurso: 'backup', _segundos: 600 });
    if (lease.error || !lease.data)
        throw new Error('Já existe uma cópia ou restauro em curso.');
    let perdido = false;
    const renovar = async () => {
        try {
            const r = await sb.rpc('hub_lease_renovar', { _projeto: projeto, _recurso: 'backup', _token: lease.data });
            if (r.error || r.data !== true)
                perdido = true;
        }
        catch {
            perdido = true;
        }
    };
    const timer = setInterval(() => void renovar(), 30000);
    timer.unref();
    const verificar = () => {
        if (perdido)
            throw new Error('A reserva da cópia expirou; nenhuma cópia foi confirmada.');
    };
    try {
        const tabelas: Record<string, Record<string, unknown>[]> = {};
        for (const tabela of TABELAS) {
            const dados: Record<string, unknown>[] = [];
            for (let offset = 0;; offset += 500) {
                verificar();
                let q = sb.from(tabela).select('*').eq('project_id', projeto).order(tabela === 'hub_editorial_estados' || tabela === 'hub_operacao' ? 'project_id' : tabela === 'hub_editorial_artefactos' ? 'chave' : 'id').range(offset, offset + 499);
                if (tabela === 'hub_editorial_artefactos')
                    q = q.neq('tipo', 'backup');
                const r = await q;
                if (r.error)
                    throw new Error('Backup interrompido: não foi possível ler todas as tabelas.');
                dados.push(...(r.data ?? []));
                if ((r.data ?? []).length < 500)
                    break;
            }
            tabelas[tabela] = dados;
        }
        if (tabelas.hub_jobs.some(j => j.estado === 'em_curso' || j.estado === 'fila'))
            throw new Error('Pausa e termina os trabalhos antes de criar uma cópia consistente.');
        verificar();
        const objetos: CopiaHub['objetos'] = [];
        for (const d of tabelas.hub_documentos) {
            for (const campo of ['pdf_path', 'capa_path']) {
                verificar();
                const p = d[campo];
                if (typeof p !== 'string')
                    continue;
                const r = await sb.storage.from('hub-documentos').download(p);
                if (r.error || !r.data)
                    throw new Error('Backup interrompido: ficheiro privado em falta.');
                const bytes = new Uint8Array(await r.data.arrayBuffer());
                objetos.push({ path: p, hash: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.byteLength });
            }
        }
        await renovar();
        verificar();
        const conteudo = { versao: 1 as const, projeto, em: new Date().toISOString(), tabelas, objetos };
        return { ...conteudo, hash: assinaturaBackup(conteudo) };
    }
    finally {
        clearInterval(timer);
        await sb.rpc('hub_lease_libertar', { _projeto: projeto, _recurso: 'backup', _token: lease.data });
    }
}
export function verificarBackup(c: CopiaHub) {
    z.string().uuid().parse(c.projeto);
    const { hash, ...dados } = c;
    if (c.versao !== 1 || assinaturaBackup(dados) !== hash)
        throw new Error('A assinatura da cópia não corresponde ao conteúdo.');
    if (Object.keys(c.tabelas).some(t => !TABELAS.includes(t as typeof TABELAS[number])) || TABELAS.some(t => !Array.isArray(c.tabelas[t])))
        throw new Error('Tabelas de backup inválidas.');
    for (const linhas of Object.values(c.tabelas))
        if (linhas.some(r => r.project_id !== c.projeto))
            throw new Error('A cópia mistura projetos.');
    for (const o of c.objetos)
        if (!new RegExp(`^${c.projeto}/[a-f0-9]{64}/(?:original\\.pdf|capa-[a-f0-9]{64}\\.png)$`).test(o.path) || !/^[a-f0-9]{64}$/.test(o.hash) || !Number.isSafeInteger(o.bytes) || o.bytes < 1 || o.bytes > 50 * 1024 * 1024)
            throw new Error('Objeto de backup inválido.');
    return c;
}
export async function guardarBackup(sb: SupabaseClient, projeto: string) {
    const b = await criarBackup(sb, projeto);
    const r = await sb.from('hub_editorial_artefactos').insert({ project_id: projeto, tipo: 'backup', chave: `${b.em}:${b.hash.slice(0, 16)}`, dados: b });
    if (r.error)
        throw new Error('A cópia não foi confirmada.');
    return { em: b.em, hash: b.hash, documentos: b.tabelas.hub_documentos.length, objetos: b.objetos.length };
}
