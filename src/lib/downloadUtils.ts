import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Download failed publication assets as a ZIP file
 */
export async function downloadFailedPublicationAssets(
  mediaFiles: File[],
  caption: string,
  fileName?: string
): Promise<void> {
  const zip = new JSZip();
  
  // Add media files
  for (let i = 0; i < mediaFiles.length; i++) {
    const file = mediaFiles[i];
    const extension = file.name.split('.').pop() || 'file';
    zip.file(`media-${i + 1}.${extension}`, file);
  }
  
  // Add caption as text file
  if (caption.trim()) {
    zip.file('caption.txt', caption);
  }
  
  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const name = fileName || `publicacao-${Date.now()}`;
  saveAs(blob, `${name}.zip`);
}

/**
 * Download a single file
 */
export function downloadSingleFile(file: File): void {
  saveAs(file, file.name);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
