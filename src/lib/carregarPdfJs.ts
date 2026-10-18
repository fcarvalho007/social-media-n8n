import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let carregamento: Promise<typeof import('pdfjs-dist')> | undefined;

/** Plain article/source helpers do not need the PDF parser until an actual file is opened. */
export function carregarPdfJs() {
  return carregamento ??= import('pdfjs-dist').then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    return pdfjs;
  }).catch(erro => { carregamento = undefined; throw erro; });
}
