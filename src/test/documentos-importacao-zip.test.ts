// @vitest-environment node
import { it, expect } from 'vitest';
import JSZip from 'jszip';
import { conferirZip } from '../features/documentos/importacao-zip';
it('verifica diretório e limites antes de descomprimir o acervo', async () => {
  const zip = new JSZip(); zip.file('catalogo.json', '{}'); const b = await zip.generateAsync({ type: 'arraybuffer' });
  expect(() => conferirZip(b)).not.toThrow();
  const v = new DataView(b); let i = 0; while (v.getUint32(i, true) !== 0x02014b50) i++;
  v.setUint32(i + 24, 2000000000, true); expect(() => conferirZip(b)).toThrow('limites');
});
it('recusa caminhos que saiam do pacote e ZIPs truncados', async () => {
  const zip = new JSZip(); zip.file('../fora.pdf', 'x'); const b = await zip.generateAsync({ type: 'arraybuffer' });
  expect(() => conferirZip(b)).toThrow('Caminho'); expect(() => conferirZip(b.slice(0, 10))).toThrow();
});
