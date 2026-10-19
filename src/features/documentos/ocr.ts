import { carregarPdfJs } from '@/lib/carregarPdfJs';
import type { ResultadoOcr } from './ocr-modelo';
import { MAX_BYTES_PDF_NUVEM } from './contratos';

export async function esperarOcr<T>(trabalho: Promise<T>, signal: AbortSignal, limite = 90000): Promise<T> {
  signal.throwIfAborted();
  let timer: ReturnType<typeof setTimeout>; let cancelar: () => void;
  const interrompido = new Promise<never>((_, reject) => {
    cancelar = () => reject(new DOMException('OCR interrompido', 'AbortError'));
    signal.addEventListener('abort', cancelar, { once: true });
    timer = setTimeout(() => reject(new Error('O OCR excedeu o tempo por página. Tenta uma digitalização mais nítida.')), limite);
  });
  try { return await Promise.race([trabalho, interrompido]); }
  finally { clearTimeout(timer!); signal.removeEventListener('abort', cancelar!); }
}

/** Private, sequential recognition in a dedicated Web Worker; checkpoint after each page. */
export async function reconhecerPdf(ficheiro: Blob, hash: string, numeros: number[], opcoes: {
  signal: AbortSignal; progresso: (mensagem: string) => void; guardar: (r: ResultadoOcr) => Promise<void>;
}) {
  if (ficheiro.size > MAX_BYTES_PDF_NUVEM || numeros.length > 10 || !numeros.length || new Set(numeros).size !== numeros.length)
    throw new Error('Reconhece até 10 páginas por passagem num PDF até 32 MB. Podes continuar a seguir.');
  const bytes = new Uint8Array(await ficheiro.arrayBuffer());
  const assinatura = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (assinatura !== hash) throw new Error('O original não corresponde ao documento guardado.');
  opcoes.signal.throwIfAborted();
  const pdfjs = await carregarPdfJs();
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: false }).promise;
  let worker: Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>> | undefined;
  let numero = 0;
  const cancelar = () => { void worker?.terminate(); };
  try {
    if (numeros.some(n => !Number.isInteger(n) || n < 1 || n > doc.numPages)) throw new Error('Página de OCR inválida.');
    opcoes.progresso('A preparar reconhecimento em português e inglês…');
    const { createWorker } = await import('tesseract.js');
    const base = new URL('/ocr/v7/', location.origin).href;
    const preparar = createWorker('por+eng', 1, { workerPath: `${base}worker.min.js`, corePath: base, langPath: base, workerBlobURL: false,
      logger: m => { if (m.status === 'recognizing text') opcoes.progresso(`OCR · página ${numero} · ${Math.round(m.progress * 100)}%`); } });
    let abandonado = false;
    void preparar.then(w => { if (abandonado) void w.terminate(); }).catch(() => {});
    try { worker = await esperarOcr(preparar, opcoes.signal); } catch(e) { abandonado = true; throw e; }
    opcoes.signal.addEventListener('abort', cancelar, { once: true });
    await worker.setParameters({ user_defined_dpi: '200' });
    for (const n of numeros) {
      opcoes.signal.throwIfAborted(); numero = n;
      const pagina = await doc.getPage(n), base = pagina.getViewport({ scale: 1 });
      if (!Number.isFinite(base.width + base.height) || Math.min(base.width, base.height) <= 0) throw new Error('Dimensões de página inválidas.');
      const viewport = pagina.getViewport({ scale: Math.min(200 / 72, 2400 / Math.max(base.width, base.height)) });
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      try {
        const context = canvas.getContext('2d'); if (!context) throw new Error('Não foi possível abrir a imagem para OCR.');
        await pagina.render({ canvasContext: context, viewport, background: '#ffffff' }).promise;
        opcoes.signal.throwIfAborted();
        const { data } = await esperarOcr(worker.recognize(canvas, { rotateAuto: true }, { text: true }), opcoes.signal);
        opcoes.signal.throwIfAborted();
        opcoes.progresso(`A guardar texto reconhecido da página ${n}…`);
        await opcoes.guardar({ n, texto: data.text, confianca: Math.max(0, Math.min(100, data.confidence || 0)) });
      } finally { canvas.width = 0; canvas.height = 0; pagina.cleanup(); }
    }
  } finally { opcoes.signal.removeEventListener('abort', cancelar); await worker?.terminate(); await doc.destroy(); }
}
