import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { PdfLido } from '../../src/features/motor/fontePdf';
const executar = promisify(execFile);
const ferramenta = (nome: string) => {
    const pasta = process.env.HUB_POPPLER_DIR;
    if (pasta && !path.isAbsolute(pasta))
        throw new Error('HUB_POPPLER_DIR exige uma pasta absoluta do servidor.');
    return pasta ? path.join(pasta, nome) : nome;
};
/** Native parser in the worker container. No shell, user path or outbound PDF conversion service. */
export async function extrairPdfServidor(bytes: Uint8Array, nome: string): Promise<{
    pdf: PdfLido;
    capa: Uint8Array | null;
    capaErro?: string;
}> {
    if (bytes.byteLength < 8 || bytes.byteLength > 50 * 1024 * 1024 || !Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from('%PDF-')))
        throw new Error('O ficheiro não é um PDF válido até 50 MB.');
    const pasta = await mkdtemp(path.join(tmpdir(), 'hub-pdf-'));
    const original = path.join(pasta, 'original.pdf');
    try {
        await writeFile(original, bytes, { mode: 0o600 });
        const opcoes = { timeout: 45000, maxBuffer: 12 * 1024 * 1024, env: { PATH: process.env.PATH, LANG: 'C.UTF-8', HOME: pasta }, cwd: pasta };
        const info = (await executar(ferramenta('pdfinfo'), [original], opcoes)).stdout;
        const total = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
        if (!Number.isSafeInteger(total) || total < 1 || total > 600 || /^Encrypted:\s+yes/m.test(info))
            throw new Error('PDF protegido ou fora do limite de 600 páginas.');
        const texto = (await executar(ferramenta('pdftotext'), ['-layout', '-enc', 'UTF-8', original, '-'], opcoes)).stdout;
        const partes = texto.split('\f');
        const paginas = Array.from({ length: total }, (_, i) => { const t = (partes[i] ?? '').replace(/\0/g, '').trim(); return { n: i + 1, estado: t ? 'texto' as const : 'sem_texto_com_imagem' as const, texto: t, paragrafos: t ? t.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean) : [] }; });
        const pdf: PdfLido = { hash: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.byteLength, ficheiro: nome.replace(/[\r\n/\\\0]/g, '-').slice(0, 200), paginas, titulo: info.match(/^Title:\s+(.+)/m)?.[1]?.trim().slice(0, 250) };
        try {
            await executar(ferramenta('pdftoppm'), ['-f', '1', '-singlefile', '-scale-to', '1200', '-png', original, path.join(pasta, 'capa')], opcoes);
            return { pdf, capa: await readFile(path.join(pasta, 'capa.png')) };
        }
        catch {
            return { pdf, capa: null, capaErro: 'Texto preservado; não foi possível gerar a capa no worker.' };
        }
    }
    catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT')
            throw new Error('Instala Poppler no worker (pdfinfo/pdftotext/pdftoppm). O ficheiro original não foi publicado.');
        throw e;
    }
    finally {
        await rm(pasta, { recursive: true, force: true });
    }
}
