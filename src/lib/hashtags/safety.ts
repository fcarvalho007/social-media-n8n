import { SuggestedHashtag } from '@/types/aiEditorial';

const BANNED_OR_RISKY = new Set([
  'followforfollow', 'likeforlike', 'instagood', 'spam', 'giveaway', 'freefollowers',
  'ganharseguidores', 'seguidoresgratis', 'likesgratis', 'adult', 'nsfw', 'casino',
]);

export const NETWORK_HASHTAG_LIMITS = {
  instagram: { max: 30, recommended: 15 },
  tiktok: { max: 5, recommended: 5 },
  linkedin: { max: 5, recommended: 5 },
  x: { max: 2, recommended: 2 },
  facebook: { max: 3, recommended: 3 },
} as const;

export function normalizeHashtag(value: string) {
  const clean = value.trim().replace(/^#+/, '').replace(/\s+/g, '').replace(/[^\p{L}\p{N}_]/gu, '');
  return clean ? `#${clean}` : '';
}

export function getHashtagsFromText(text: string) {
  return text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
}

export function applySafety(tag: SuggestedHashtag): SuggestedHashtag {
  const normalized = normalizeHashtag(tag.tag);
  const key = normalized.replace(/^#/, '').toLowerCase();
  if (BANNED_OR_RISKY.has(key)) {
    return { ...tag, tag: normalized, status: 'banned', riskReason: 'Hashtag marcada como spam ou arriscada.', source: 'internal_safety' };
  }
  return { ...tag, tag: normalized, status: tag.status ?? 'neutral' };
}