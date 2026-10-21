// @vitest-environment node
import { it, expect } from 'vitest';
import { extrairPdfServidor } from '../../scripts/backend/pdf';
export function pdfTeste() {
    const objetos = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    const stream = 'BT /F1 22 Tf 30 300 Td (Hub documento verificavel) Tj ET';
    objetos.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    let s = '%PDF-1.4\n';
    const offsets = [0];
    for (const [o, i] of objetos.map((o, i) => [o, i] as const)) {
        offsets.push(Buffer.byteLength(s));
        s += `${i + 1} 0 obj\n${o}\nendobj\n`;
    }
    const xref = Buffer.byteLength(s);
    s += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(s);
}
it('extrai texto por página e uma capa PNG real com o Poppler', async () => { const r = await extrairPdfServidor(pdfTeste(), 'documento.pdf'); expect(r.pdf.paginas).toHaveLength(1); expect(r.pdf.paginas[0].texto).toContain('Hub documento verificavel'); expect(Buffer.from(r.capa!.subarray(0, 8)).toString('hex')).toBe('89504e470d0a1a0a'); }, 20000);
it('recusa binários que não sejam PDFs antes de iniciar conversões', async () => { await expect(extrairPdfServidor(Buffer.from('sem pdf'), 'x')).rejects.toThrow('PDF válido'); });
