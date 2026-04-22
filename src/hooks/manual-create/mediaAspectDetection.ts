/**
 * Aspect-ratio detection helpers shared across the manual-create flow.
 *
 * Extracted from ManualCreate.tsx (Phase 1 refactor) so the upload/recovery
 * hooks can use them without circular imports.
 */

/** Detect image aspect ratio from a File, mapped to common ratios. */
export async function detectImageAspectRatio(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      URL.revokeObjectURL(url);

      const ratio = w / h;

      // 1:1 = 1.0
      if (ratio >= 0.92 && ratio <= 1.08) resolve('1:1');
      // 3:4 = 0.75 (wider tolerance for Grid Splitter crops)
      else if (ratio >= 0.68 && ratio <= 0.82) resolve('3:4');
      // 4:5 = 0.8 (narrower window since 3:4 covers more)
      else if (ratio >= 0.82 && ratio <= 0.88) resolve('4:5');
      // 4:3 = 1.33
      else if (ratio >= 1.25 && ratio <= 1.42) resolve('4:3');
      // 16:9 = 1.78
      else if (ratio >= 1.65 && ratio <= 1.9) resolve('16:9');
      // 9:16 = 0.5625
      else if (ratio >= 0.5 && ratio <= 0.62) resolve('9:16');
      // Fallbacks
      else if (ratio < 1) resolve('3:4');
      else resolve('4:3');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('3:4');
    };

    img.src = url;
  });
}

/** Detect video aspect ratio from a File, mapped to common ratios. */
export async function detectVideoAspectRatio(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const { videoWidth: w, videoHeight: h } = video;
      URL.revokeObjectURL(url);

      const ratio = w / h;

      if (ratio >= 0.95 && ratio <= 1.05) resolve('1:1');
      else if (ratio >= 0.72 && ratio <= 0.78) resolve('3:4');
      else if (ratio >= 0.78 && ratio <= 0.82) resolve('4:5');
      else if (ratio >= 1.28 && ratio <= 1.38) resolve('4:3');
      else if (ratio >= 1.7 && ratio <= 1.82) resolve('16:9');
      else if (ratio >= 0.54 && ratio <= 0.58) resolve('9:16');
      else if (ratio < 1) resolve('9:16');
      else resolve('16:9');
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('9:16');
    };

    video.src = url;
  });
}
