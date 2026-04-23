export type MediaPreviewType = 'image' | 'video' | 'document' | 'unknown';

export interface NormalizedMediaPreview {
  url: string | null;
  thumbnail: string | null;
  displayUrl: string | null;
  mediaType: MediaPreviewType;
}

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
const DOCUMENT_EXTENSIONS = ['.pdf'];

const pickString = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

export const inferMediaType = (url?: string | null, explicitType?: string | null): MediaPreviewType => {
  const type = explicitType?.toLowerCase() || '';
  const lowerUrl = url?.toLowerCase() || '';

  if (type.includes('video')) return 'video';
  if (type.includes('image')) return 'image';
  if (type.includes('pdf') || type.includes('document')) return 'document';

  if (VIDEO_EXTENSIONS.some((extension) => lowerUrl.includes(extension))) return 'video';
  if (DOCUMENT_EXTENSIONS.some((extension) => lowerUrl.includes(extension))) return 'document';
  if (IMAGE_EXTENSIONS.some((extension) => lowerUrl.includes(extension))) return 'image';

  return lowerUrl ? 'image' : 'unknown';
};

export const normalizeMediaPreview = (item: unknown): NormalizedMediaPreview => {
  if (typeof item === 'string') {
    const mediaType = inferMediaType(item);
    return { url: item, thumbnail: null, displayUrl: item, mediaType };
  }

  if (!item || typeof item !== 'object') {
    return { url: null, thumbnail: null, displayUrl: null, mediaType: 'unknown' };
  }

  const media = item as Record<string, unknown>;
  const url = pickString(media.url) || pickString(media.file_url) || pickString(media.publicUrl) || pickString(media.src);
  const thumbnail = pickString(media.thumbnail_url) || pickString(media.thumbnailUrl) || pickString(media.thumbnail) || pickString(media.cover_image_url);
  const preview = pickString(media.preview) || pickString(media.preview_url) || pickString(media.previewUrl);
  const explicitType = pickString(media.type) || pickString(media.file_type) || pickString(media.media_type) || pickString(media.mime_type);
  const displayUrl = thumbnail || preview || url;
  const mediaType = inferMediaType(url || displayUrl, explicitType);

  return { url, thumbnail, displayUrl, mediaType };
};

export const normalizeMediaList = (items: unknown): NormalizedMediaPreview[] => {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeMediaPreview).filter((item) => item.url || item.displayUrl);
};

export const getPrimaryMediaPreview = (items: unknown): NormalizedMediaPreview => {
  return normalizeMediaList(items)[0] || { url: null, thumbnail: null, displayUrl: null, mediaType: 'unknown' };
};