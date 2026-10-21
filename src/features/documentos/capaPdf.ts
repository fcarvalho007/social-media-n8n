import { carregarPdfJs } from '@/lib/carregarPdfJs';

/** Actual first page, not a fabricated AI cover. No external renderer or upload. */
export async function gerarCapaPdf(ficheiro: Blob): Promise<Blob> {
  const pdfjs = await carregarPdfJs();
  const doc = await pdfjs.getDocument({ data:new Uint8Array(await ficheiro.arrayBuffer()),isEvalSupported:false,useSystemFonts:true }).promise;
  try {
    const pagina = await doc.getPage(1); const base = pagina.getViewport({scale:1});
    const viewport = pagina.getViewport({scale:Math.min(1.5,600/base.width)});
    const canvas = document.createElement('canvas'); canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
    const context=canvas.getContext('2d'); if (!context) throw new Error('Este navegador não conseguiu criar a imagem da capa.');
    try {
      await pagina.render({canvasContext:context,viewport,background:'#ffffff'}).promise;
      return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Não foi possível guardar a imagem da capa.')),'image/png'));
    } finally { canvas.width=0; canvas.height=0; pagina.cleanup(); }
  } finally { await doc.destroy(); }
}
