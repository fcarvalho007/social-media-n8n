import { mkdir, readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { estadoInicialSeo } from '../../src/features/seo/catalogo';
import { validarEstadoPersistido } from '../seo/persistencia';
import { documentosLegado, tituloLegado, estadoLeitura, type CatalogoPdfTracker } from '../../src/features/documentos/legado';
import { extrairPdfServidor } from './pdf';
import { assinaturaBackup, verificarBackup, type CopiaHub } from './backup';
const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
/** Offline, portable migration. Never reads credential files or contacts providers. */
export async function prepararMigracaoLocal(raiz: string, pasta: string, extrair = extrairPdfServidor) {
    const projeto = randomUUID(), owner = randomUUID(), em = new Date().toISOString();
    const catalogo = JSON.parse(await readFile(path.join(raiz, '.documentos-local/legado/catalogo.json'), 'utf8')) as CatalogoPdfTracker;
    if (catalogo.versao !== 1 || !Array.isArray(catalogo.entradas) || catalogo.entradas.length > 2000)
        throw new Error('Catálogo local inválido.');
    const entradas = documentosLegado(catalogo), pendencias = catalogo.entradas.filter(e => !e.hash);
    const hashes = new Set(entradas.map(e => e.hash));
    // Include PDFs discovered later, even if they have no legacy metadata.
    for (const f of await readdir(path.join(raiz, '.documentos-local/pdfs')))
        if (/^[a-f0-9]{64}\.pdf$/.test(f) && !hashes.has(f.slice(0, 64)))
            entradas.push({ id: f, url: '', nome: f, registos: [], orfao: true, hash: f.slice(0, 64) });
    let estado;
    try {
        estado = JSON.parse(await readFile(path.join(raiz, '.seo-local/estado.json'), 'utf8'));
    }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT')
            estado = estadoInicialSeo();
        else
            throw e;
    }
    validarEstadoPersistido(estado);
    estado.configuracao.pausado = true;
    estado.configuracao.automacaoPausada = true;
    for (const p of estado.pedidos)
        if (p.estado === 'em_curso') {
            p.estado = 'incerto';
            p.terminadoEm = em;
            p.detalhe = 'Migração: conferir o pedido anterior; a reserva de custo foi preservada.';
        }
    for (const p of estado.pautas) {
        p.aprovacao = null;
        p.producaoAutomaticaAutorizada = false;
        if (['aprovado', 'pronto_automatico', 'a_preparar'].includes(p.estado))
            p.estado = 'aguarda_revisao';
    }
    await mkdir(path.dirname(pasta), { recursive: true, mode: 0o700 });
    await mkdir(pasta, { mode: 0o700 });
    await mkdir(path.join(pasta, 'objetos'), { mode: 0o700 });
    const tabelas: CopiaHub['tabelas'] = { hub_editorial_estados: [{ project_id: projeto, revisao: 1, dados: estado, atualizado_em: em }], hub_editorial_artefactos: [], hub_documentos: [], hub_recolhas: [], hub_operacao: [{ project_id: projeto, pausado: true, atualizado_em: em }], hub_jobs: [], hub_publicacoes: [] }, objetos: CopiaHub['objetos'] = [];
    if (pendencias.length)
        tabelas.hub_editorial_artefactos.push({ project_id: projeto, tipo: 'resposta', chave: 'migracao-legado-pendencias', dados: { exportadoEm: catalogo.exportadoEm, entradas: pendencias }, criado_em: em });
    const guardar = async (bytes: Uint8Array, caminho: string) => { const h = hash(bytes); await writeFile(path.join(pasta, 'objetos', h), bytes, { mode: 0o600 }); objetos.push({ path: caminho, hash: h, bytes: bytes.length }); };
    for (const e of entradas) {
        if (!e.hash || !/^[a-f0-9]{64}$/.test(e.hash))
            throw new Error('Hash de PDF inválido.');
        const origem = path.join(raiz, '.documentos-local/pdfs', e.hash + '.pdf');
        if ((await stat(origem)).size > 50 * 1024 * 1024)
            throw new Error('PDF fora do limite de migração.');
        const bytes = await readFile(origem);
        if (hash(bytes) !== e.hash)
            throw new Error('O binário local não corresponde ao catálogo.');
        const { pdf, capa, capaErro } = await extrair(bytes, e.nome), id = randomUUID(), pdfPath = `${projeto}/${e.hash}/original.pdf`, capaPath = capa ? `${projeto}/${e.hash}/capa-${hash(capa)}.png` : null;
        await guardar(bytes, pdfPath);
        if (capa && capaPath)
            await guardar(capa, capaPath);
        const legado = { projeto: catalogo.projeto, exportadoEm: catalogo.exportadoEm, objeto: e.nome, orfao: e.orfao, registos: e.registos };
        const dados = { id, ambito: JSON.stringify([owner, projeto]), titulo: tituloLegado(e), origem: e.url || null, recolhidoEm: em, publicadoEm: null, pdf, legado, leitura: estadoLeitura({ legado }), ...(capaErro ? { capaErro } : {}) };
        tabelas.hub_documentos.push({ id, project_id: projeto, hash: e.hash, dados, pdf_path: pdfPath, capa_path: capaPath, revisao: 1, criado_por: owner, criado_em: em, atualizado_em: em });
    }
    for (const [pastaArtefactos, tipo] of [['resultados', 'resultado'], ['respostas', 'resposta']] as const) {
        let ficheiros: string[] = [];
        try {
            ficheiros = await readdir(path.join(raiz, '.seo-local', pastaArtefactos));
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
                throw e;
        }
        for (const f of ficheiros) {
            if (!/^[a-f0-9-]{36}\.json$/.test(f))
                continue;
            const dados = JSON.parse(await readFile(path.join(raiz, '.seo-local', pastaArtefactos, f), 'utf8'));
            tabelas.hub_editorial_artefactos.push({ project_id: projeto, tipo, chave: f.slice(0, -5), dados, criado_em: em });
        }
    }
    const conteudo = { versao: 1 as const, projeto, em, tabelas, objetos }, copia = { ...conteudo, hash: assinaturaBackup(conteudo) };
    verificarBackup(copia);
    await writeFile(path.join(pasta, 'manifesto.json'), JSON.stringify(copia), { mode: 0o600, flag: 'wx' });
    return { referenciasSemBinario: pendencias.length, documentos: tabelas.hub_documentos.length, capas: tabelas.hub_documentos.filter(d => d.capa_path).length, artefactos: tabelas.hub_editorial_artefactos.length, pautas: estado.pautas.length, hash: copia.hash, pausado: true };
}
