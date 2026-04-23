/**
 * videoFrameExtractor
 * -------------------
 * Extrai um frame (~0.5s) de um ficheiro de vídeo (`File` ou URL `string`)
 * e devolve-o como `File` JPEG (qualidade 0.9). Usado para gerar thumbnails
 * em previews (LinkedIn Document) e para preencher capas no fluxo de
 * publicação (Getlate exige primeira imagem para certos formatos).
 *
 * Foi consolidado a partir de 3 cópias duplicadas:
 *   - src/pages/ManualCreate.tsx
 *   - src/hooks/usePublishWithProgress.ts
 *   - src/components/manual-post/LinkedInDocumentPreview.tsx (variante URL)
 */
export async function extractVideoFrame(
  videoFile: File | string,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    const cleanup = () => {
      if (typeof videoFile !== 'string') {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => {
            cleanup();
            if (blob) {
              const fileName =
                typeof videoFile === 'string'
                  ? 'video-frame.jpg'
                  : videoFile.name.replace(/\.[^.]+$/, '-frame.jpg');
              resolve(
                new File([blob], fileName, { type: 'image/jpeg' }),
              );
            } else {
              reject(new Error('Could not create blob from canvas'));
            }
          },
          'image/jpeg',
          0.9,
        );
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Could not load video'));
    };

    video.src =
      typeof videoFile === 'string'
        ? videoFile
        : URL.createObjectURL(videoFile);
    video.load();
  });
}

/**
 * Variante que devolve um Object URL pronto a usar em `<img src>`.
 * Útil para previews onde não precisas do `File` (ex.: LinkedInDocumentPreview).
 * O caller é responsável por chamar `URL.revokeObjectURL()` quando terminar.
 */
export async function extractVideoFrameUrl(videoFile: File): Promise<string> {
  const frame = await extractVideoFrame(videoFile);
  return URL.createObjectURL(frame);
}
