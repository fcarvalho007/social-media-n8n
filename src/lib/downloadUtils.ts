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
 * Download publication assets from URLs as a ZIP file
 */
export async function downloadPublicationAssets(
  mediaUrls: string[],
  caption: string,
  tema?: string,
  hashtags?: string[]
): Promise<void> {
  const zip = new JSZip();
  
  // Download and add media files
  for (let i = 0; i < mediaUrls.length; i++) {
    const url = mediaUrls[i];
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
        zip.file(`media-${i + 1}.${extension}`, blob);
      }
    } catch (err) {
      console.warn(`Failed to download media ${i + 1}:`, err);
    }
  }
  
  // Add caption as text file
  if (caption?.trim()) {
    zip.file('caption.txt', caption);
  }
  
  // Add hashtags as text file
  if (hashtags && hashtags.length > 0) {
    zip.file('hashtags.txt', hashtags.join(' '));
  }
  
  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const name = tema?.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30) || `publicacao-${Date.now()}`;
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
