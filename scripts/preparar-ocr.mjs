import { mkdir, copyFile, readdir } from 'node:fs/promises';
// Vendored at build time from pinned npm packages. Documents never go to a CDN.
export async function prepararOcr() {
  const pasta = 'public/ocr/v7';
  await mkdir(pasta, { recursive: true });
  await copyFile('node_modules/tesseract.js/dist/worker.min.js', `${pasta}/worker.min.js`);
  for (const nome of await readdir('node_modules/tesseract.js-core')) {
    if (nome.endsWith('.wasm.js') || nome === 'LICENSE')
      await copyFile(`node_modules/tesseract.js-core/${nome}`, `${pasta}/${nome}`);
  }
  for (const idioma of ['por', 'eng'])
    await copyFile(`node_modules/@tesseract.js-data/${idioma}/4.0.0/${idioma}.traineddata.gz`, `${pasta}/${idioma}.traineddata.gz`);
}
if (process.argv[1]?.endsWith('preparar-ocr.mjs')) await prepararOcr();
