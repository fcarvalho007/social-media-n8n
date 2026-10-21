// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { criarBackup, verificarBackup, assinaturaBackup } from '../../scripts/backend/backup';
import { prepararRestauro, exportarCopia } from '../../scripts/backend/backup-operador';
import { supabaseMemoria } from './apoio/supabase-memoria';
import { estadoInicialSeo } from '@/features/seo/catalogo';
const projeto = '00000000-0000-4000-8000-000000000001', destino = '00000000-0000-4000-8000-000000000002', owner = '00000000-0000-4000-8000-000000000003';
async function base() { const bytes = Buffer.from('%PDF-1.7\noriginal de teste'), hash = createHash('sha256').update(bytes).digest('hex'), id = crypto.randomUUID(); const mem = supabaseMemoria({ hub_operacao: [{ project_id: projeto, pausado: true }], hub_editorial_estados: [{ project_id: projeto, revisao: 1, dados: estadoInicialSeo() }], hub_documentos: [{ id, project_id: projeto, hash, pdf_path: `${projeto}/${hash}/original.pdf`, capa_path: null, dados: { id, ambito: JSON.stringify([owner, projeto]) }, criado_por: owner }] }); mem.objetos.set(`${projeto}/${hash}/original.pdf`, new Blob([bytes])); return { ...mem, bytes, hash, id }; }
describe('backup independente e restauro conservador', () => {
    it('inventaria e verifica hashes reais dos originais', async () => { const m = await base(), c = await criarBackup(m.sb, projeto); expect(c.objetos[0]).toMatchObject({ hash: m.hash, bytes: m.bytes.length }); expect(verificarBackup(c)).toEqual(c); });
    it('recusa criar cópia durante execução ou sem pausa', async () => { const m = await base(); m.tabelas.hub_operacao[0].pausado = false; await expect(criarBackup(m.sb, projeto)).rejects.toThrow('Pausa'); });
    it('falha se faltar um ficheiro, em vez de anunciar backup completo', async () => { const m = await base(); m.objetos.clear(); await expect(criarBackup(m.sb, projeto)).rejects.toThrow('ficheiro'); expect(m.chamadas.some(c => c.nome === 'hub_lease_libertar')).toBe(true); });
    it('deteta adulteração e bloqueia caminhos fora do projeto', async () => { const m = await base(), c = await criarBackup(m.sb, projeto); c.objetos[0].hash += '../../'; const { hash: _, ...resto } = c; c.hash = assinaturaBackup(resto); expect(() => verificarBackup(c)).toThrow('inválido'); });
    it('prepara cópia para projeto novo, com novos ids e automação pausada', async () => { const m = await base(), c = await criarBackup(m.sb, projeto), r = prepararRestauro(c, destino, owner); expect(r.hub_documentos[0].id).not.toBe(m.id); expect(r.hub_documentos[0].pdf_path).toBe(`${destino}/${m.hash}/original.pdf`); expect(r.hub_operacao[0].pausado).toBe(true); expect(() => prepararRestauro(c, projeto, owner)).toThrow('novo e vazio'); });
    it('exporta efetivamente o binário e só conclui com um manifesto verificável', async () => { const m = await base(), pai = await mkdtemp(path.join(tmpdir(), 'hub-backup-test-')), pasta = path.join(pai, 'copia'); await exportarCopia(m.sb, projeto, pasta); expect(await readFile(path.join(pasta, 'objetos', m.hash))).toEqual(m.bytes); expect(verificarBackup(JSON.parse(await readFile(path.join(pasta, 'manifesto.json'), 'utf8'))).projeto).toBe(projeto); });
});
