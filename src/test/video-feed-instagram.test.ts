import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FORMAT_ASPECT_RATIOS, MAX_VIDEO_DURATION } from '@/lib/mediaValidation';
import { NETWORK_POST_FORMATS } from '@/types/social';

describe('Instagram vídeo na feed', () => {
  it('aceita 4:5 e 1:1, não 9:16', () => {
    expect(FORMAT_ASPECT_RATIOS.instagram_feed_video.ratios).toEqual(['4:5', '1:1']);
  });
  it('máximo 90 s e só vídeo', () => {
    expect(MAX_VIDEO_DURATION.instagram_feed_video).toBe(90);
    const f = NETWORK_POST_FORMATS.instagram.find(x => x.format === 'instagram_feed_video');
    expect(f?.requiresVideo).toBe(true);
    expect(f?.maxMedia).toBe(1);
  });
  it('é enviado como Reel partilhado na feed', () => {
    const src = readFileSync('supabase/functions/publish-to-getlate/index.ts', 'utf8');
    expect(src).toMatch(/format === 'instagram_feed_video'[\s\S]{0,200}contentType = 'reels'[\s\S]{0,200}shareToFeed = true/);
  });
});
