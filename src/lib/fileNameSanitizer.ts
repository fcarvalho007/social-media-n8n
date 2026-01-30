/**
 * Sanitize filename for Supabase Storage compatibility
 * 
 * - Remove accents and special characters
 * - Replace spaces with hyphens
 * - Remove consecutive underscores/hyphens
 * - Preserve file extension
 * - Limit total length
 */
export function sanitizeFileName(fileName: string): string {
  // Separate name and extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : '';

  let sanitized = name
    // Normalize unicode (decompose accents)
    .normalize('NFD')
    // Remove accent marks
    .replace(/[\u0300-\u036f]/g, '')
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Replace underscores with hyphens for consistency
    .replace(/_+/g, '-')
    // Remove any character that's not alphanumeric or hyphen
    .replace(/[^a-zA-Z0-9-]/g, '')
    // Replace multiple consecutive hyphens with single
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Truncate to reasonable length (50 chars max for name)
    .slice(0, 50)
    // Fallback if empty
    || 'file';

  return sanitized + extension.toLowerCase();
}

/**
 * Generate safe storage path for uploads
 */
export function generateSafeStoragePath(userId: string, file: File): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFileName(file.name);
  return `${userId}/${timestamp}-${sanitizedName}`;
}
