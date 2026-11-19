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

import { validateFormat } from '@/lib/formatValidation';
const vid = (n = 'v.mp4') => new File(['x'], n, { type: 'video/mp4' });
const img = (n = 'i.jpg') => new File(['x'], n, { type: 'image/jpeg' });

describe('regras de validação', () => {
  it('vídeo na feed com um vídeo de 30 s é válido', () => {
    expect(validateFormat('instagram_feed_video', 'Olá', [vid()], 30).valid).toBe(true);
  });
  it('vídeo na feed com mais de 90 s dá erro', () => {
    expect(validateFormat('instagram_feed_video', 'Olá', [vid()], 120).errors).toContain('Vídeo excede 90 segundos');
  });
  it('vídeo na feed com imagem dá erro', () => {
    expect(validateFormat('instagram_feed_video', 'Olá', [img()]).valid).toBe(false);
  });
  it('LinkedIn não mistura vídeo com imagens', () => {
    expect(validateFormat('linkedin_post', 'Olá', [vid(), img()]).errors).toContain('O LinkedIn aceita um vídeo ou até 9 imagens, não ambos.');
  });
  it('LinkedIn aceita um vídeo sozinho', () => {
    expect(validateFormat('linkedin_post', 'Olá', [vid()], 60).valid).toBe(true);
  });
});
