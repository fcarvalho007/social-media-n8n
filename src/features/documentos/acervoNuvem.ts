import { apiBackend, pedidoBackend } from '@/lib/backendHub';
import type { DocumentoAcervo, Recolha } from './modelo';
import type { MetadadosPdfTracker } from './legado';
interface RegistoDocumento {
    id: string;
    dados: Omit<DocumentoAcervo, 'ficheiro' | 'capa'>;
    revisao: number;
    capa_url?: string;
}
const revisoes = new Map<string, number>();
export function projetoAcervo(ambito: string) {
    let a: unknown;
    try {
        a = JSON.parse(ambito);
    }
    catch {
        throw new Error('Contexto de documento inválido.');
    }
    if (!Array.isArray(a) || a.length !== 2 || !a.every(x => typeof x === 'string'))
        throw new Error('Contexto de documento inválido.');
    return a[1] as string;
}
function documento(r: RegistoDocumento, ambito: string): DocumentoAcervo { revisoes.set(`${ambito}:${r.id}`, r.revisao); return { ...r.dados, id: r.id, ambito, capaUrl: r.capa_url, ficheiro: new Blob([], { type: 'application/pdf' }) }; }
export async function listarNuvem<T extends DocumentoAcervo | Recolha>(tabela: 'documentos' | 'recolhas', ambito: string): Promise<T[]> {
    const dados = await apiBackend<(RegistoDocumento | {
        dados: Recolha;
    })[]>(`/documentos/${tabela === 'documentos' ? 'acervo' : 'recolhas'}`, { ambito }, { projeto: projetoAcervo(ambito) });
    return dados.map(r => tabela === 'documentos' ? documento(r as RegistoDocumento, ambito) : r.dados) as T[];
}
export async function encontrarNuvem(ambito: string, hash: string) { const d = await apiBackend<RegistoDocumento | null>('/documentos/encontrar', { ambito, hash }, { projeto: projetoAcervo(ambito) }); return d ? documento(d, ambito) : null; }
export async function guardarFicheiroNuvem(f: File, ambito: string, metadados: Record<string, unknown> = {}) {
    const form = new FormData();
    form.set('pdf', f);
    form.set('metadados', JSON.stringify(metadados));
    const r = await (await pedidoBackend('/documentos/guardar', form, { projeto: projetoAcervo(ambito), timeout: 120000 })).json() as {
        documento: RegistoDocumento;
        duplicado: boolean;
    };
    return { documento: documento(r.documento, ambito), duplicado: r.duplicado };
}
export async function ficheiroNuvem(d: DocumentoAcervo, capa = false) { return (await pedidoBackend('/documentos/ficheiro', { id: d.id, capa, ambito: d.ambito }, { projeto: projetoAcervo(d.ambito) })).blob(); }
export async function alterarNuvem(id: string, ambito: string, campo: 'titulo' | 'leitura', valor: string) {
    const revisao = revisoes.get(`${ambito}:${id}`);
    if (!revisao)
        throw new Error('Atualiza o acervo antes de guardar.');
    await apiBackend('/documentos/alterar', { id, ambito, campo, valor, revisao }, { projeto: projetoAcervo(ambito) });
    revisoes.set(`${ambito}:${id}`, revisao + 1);
}
export async function guardarRecolhaNuvem(r: Recolha) { await apiBackend('/documentos/guardar-recolha', { recolha: r }, { projeto: projetoAcervo(r.ambito) }); }
export async function refazerCapaNuvem(id: string, ambito: string) { await apiBackend('/documentos/refazer-capa', { id, ambito }, { projeto: projetoAcervo(ambito), timeout: 120000 }); }
export async function guardarLegadoNuvem(id: string, ambito: string, legado: MetadadosPdfTracker) { const r = await apiBackend<RegistoDocumento>('/documentos/legado', { id, ambito, legado, revisao: revisoes.get(`${ambito}:${id}`) }, { projeto: projetoAcervo(ambito) }); return documento(r, ambito); }
/** Poll tiny revision records; fetch only changed documents, never the full text corpus again. */
export async function atualizarAlteradosNuvem(ambito: string, atuais: DocumentoAcervo[]) {
    const versoes = await apiBackend<{
        id: string;
        revisao: number;
    }[]>('/documentos/versoes', { ambito }, { projeto: projetoAcervo(ambito) });
    const mudados = versoes.filter(v => revisoes.get(`${ambito}:${v.id}`) !== v.revisao);
    if (!mudados.length)
        return atuais;
    const novos = await Promise.all(mudados.map(async (v) => documento(await apiBackend<RegistoDocumento>('/documentos/documento', { id: v.id, ambito }, { projeto: projetoAcervo(ambito) }), ambito)));
    return [...atuais.filter(d => !novos.some(n => n.id === d.id)), ...novos];
}
export async function renovarCapasNuvem(ambito: string) { return apiBackend<{
    id: string;
    capa_url?: string;
}[]>('/documentos/capas', { ambito }, { projeto: projetoAcervo(ambito) }); }
