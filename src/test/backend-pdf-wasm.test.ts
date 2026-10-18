// @vitest-environment node
import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PdfNuvem } from '../../scripts/backend/pdf-wasm';
const objeto = (n: number, s: string) => `${n} 0 obj\n${s}\nendobj\n`;
function pdfTeste() {
    const t = 'BT /F1 22 Tf 30 300 Td (Hub documento verificavel) Tj ET';
    let p = '%PDF-1.4\n';
    for (const [n, s] of [[1, '<< /Type /Catalog /Pages 2 0 R >>'], [2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'], [3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>'], [4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'], [5, `<< /Length ${t.length} >>\nstream\n${t}\nendstream`]] as const)
        p += objeto(n, s);
    return Buffer.from(p + 'trailer\n<< /Root 1 0 R >>\n%%EOF');
}
it('extrai texto e renderiza PNG em WebAssembly sem canvas nem executáveis', async () => { const m = new PdfNuvem(() => readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm')), r = await m.parte(pdfTeste(), 'teste.pdf'); expect(r.total).toBe(1); expect(r.proxima).toBeNull(); expect(r.pdf.paginas[0].texto).toContain('Hub documento verificavel'); expect(Buffer.from(r.capa!.subarray(0, 8)).toString('hex')).toBe('89504e470d0a1a0a'); }, 20000);
it('recusa intervalos e PDFs excessivos antes de alocar memória', async () => { const m = new PdfNuvem(async () => new Uint8Array()); await expect(m.parte(pdfTeste(), 'x', -1)).rejects.toThrow('Intervalo'); await expect(m.parte(new Uint8Array(33 * 1024 * 1024), 'x')).rejects.toThrow('32 MB'); });
