import { init, type WrappedPdfiumModule } from '@embedpdf/pdfium';
import { encode } from 'fast-png';
import { createHash } from 'node:crypto';
import type { PdfLido } from '../../src/features/motor/fontePdf';
/** No native executable, canvas, browser or remote conversion service. Five pages per invocation. */
export class PdfNuvem {
    private modulo: Promise<WrappedPdfiumModule> | undefined;
    constructor(private wasm: () => Promise<Uint8Array>, private lado = 600, private diagnostico?: (etapa: string) => void) { }
    private abrir() { return this.modulo ??= this.wasm().then(async (wasm) => { const m = await init({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer }); m.PDFiumExt_Init(); return m; }); }
    async parte(bytes: Uint8Array, nome: string, inicio = 0, lote = 5, comCapa = true) {
        if (bytes.length > 32 * 1024 * 1024 || !Buffer.from(bytes.subarray(0, 1024)).includes(Buffer.from('%PDF-')))
            throw new Error('O processamento na nuvem aceita PDFs até 32 MB. O original permanece preservado.');
        if (!Number.isInteger(inicio) || inicio < 0 || !Number.isInteger(lote) || lote < 1 || lote > 5)
            throw new Error('Intervalo de páginas inválido.');
        this.diagnostico?.('inicio');
        const m = await this.abrir(), mem = m.pdfium.wasmExports, ptr = mem.malloc(bytes.length);
        if (!ptr)
            throw new Error('Memória PDF indisponível.');
        const heap = () => (m.pdfium as typeof m.pdfium & {
            HEAPU8: Uint8Array;
        }).HEAPU8;
        let doc = 0;
        try {
            heap().set(bytes, ptr);
            doc = m.FPDF_LoadMemDocument(ptr, bytes.length, '');
            if (!doc)
                throw new Error('PDF inválido ou protegido por senha.');
            const total = m.FPDF_GetPageCount(doc);
            if (total < 1 || total > 600 || inicio >= total)
                throw new Error('PDF fora do limite de 600 páginas.');
            this.diagnostico?.('aberto');
            const paginas: PdfLido['paginas'] = [];
            let capa: Uint8Array | null = null;
            for (let n = inicio; n < Math.min(total, inicio + lote); n++) {
                const pagina = m.FPDF_LoadPage(doc, n);
                if (!pagina)
                    throw new Error(`Não foi possível abrir a página ${n + 1}.`);
                try {
                    const textoPagina = m.FPDFText_LoadPage(pagina);
                    let texto = '';
                    if (textoPagina)
                        try {
                            const chars = m.FPDFText_CountChars(textoPagina);
                            if (chars > 200000)
                                throw new Error('Página com texto excessivo; requer revisão.');
                            const b = mem.malloc((chars + 1) * 2);
                            if (!b)
                                throw new Error('Memória de texto indisponível.');
                            try {
                                const l = m.FPDFText_GetText(textoPagina, 0, chars, b);
                                texto = new TextDecoder('utf-16le').decode(heap().slice(b, b + Math.max(0, l - 1) * 2)).replace(/\0/g, '').trim();
                            }
                            finally {
                                mem.free(b);
                            }
                        }
                        finally {
                            m.FPDFText_ClosePage(textoPagina);
                        }
                    paginas.push({ n: n + 1, estado: texto ? 'texto' : 'sem_texto_com_imagem', texto, paragrafos: texto ? texto.split(/\r?\n\s*\r?\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean) : [] });
                    this.diagnostico?.('texto');
                    if (n === 0 && comCapa) {
                        const w = m.FPDF_GetPageWidthF(pagina), h = m.FPDF_GetPageHeightF(pagina);
                        if (!Number.isFinite(w + h) || w <= 0 || h <= 0 || w / h > 20 || h / w > 20)
                            throw new Error('Dimensões de página inválidas.');
                        const escala = this.lado / Math.max(w, h), width = Math.max(1, Math.round(w * escala)), height = Math.max(1, Math.round(h * escala)), bitmap = m.FPDFBitmap_Create(width, height, 1);
                        if (!bitmap)
                            throw new Error('Memória para a capa indisponível.');
                        try {
                            m.FPDFBitmap_FillRect(bitmap, 0, 0, width, height, 0xffffffff);
                            m.FPDF_RenderPageBitmap(bitmap, pagina, 0, 0, width, height, 0, 1);
                            this.diagnostico?.('render');
                            const buffer = m.FPDFBitmap_GetBuffer(bitmap), stride = m.FPDFBitmap_GetStride(bitmap), rgba = new Uint8Array(width * height * 4);
                            for (let y = 0; y < height; y++)
                                for (let x = 0; x < width; x++) {
                                    const p = buffer + y * stride + x * 4, q = (y * width + x) * 4;
                                    rgba[q] = heap()[p + 2];
                                    rgba[q + 1] = heap()[p + 1];
                                    rgba[q + 2] = heap()[p];
                                    rgba[q + 3] = heap()[p + 3];
                                }
                            capa = encode({ width, height, data: rgba, channels: 4, depth: 8 }, { zlib: { level: 3 } });
                            this.diagnostico?.('png');
                        }
                        finally {
                            m.FPDFBitmap_Destroy(bitmap);
                        }
                    }
                }
                finally {
                    m.FPDF_ClosePage(pagina);
                }
            }
            const pdf: PdfLido = { hash: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, ficheiro: nome.replace(/[\0\r\n/\\]/g, '-').slice(0, 200), paginas };
            return { pdf, capa, total, proxima: inicio + paginas.length < total ? inicio + paginas.length : null };
        }
        finally {
            if (doc)
                m.FPDF_CloseDocument(doc);
            mem.free(ptr);
        }
    }
}
