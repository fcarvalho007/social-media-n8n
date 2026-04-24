import { describe, it, expect } from 'vitest';
import { getAltTextSupportContext } from './altTextSupport';

describe('getAltTextSupportContext', () => {
  it('retorna estado vazio quando não há formatos seleccionados', () => {
    const ctx = getAltTextSupportContext([]);
    expect(ctx.hasSupported).toBe(false);
    expect(ctx.hasUnsupported).toBe(false);
    expect(ctx.microcopy).toBeNull();
  });

  it('não mostra microtexto quando todos os formatos suportam alt-text', () => {
    const ctx = getAltTextSupportContext(['instagram_image']);
    expect(ctx.hasSupported).toBe(true);
    expect(ctx.hasUnsupported).toBe(false);
    expect(ctx.microcopy).toBeNull();
  });

  it('marca hasSupported=false quando nenhum formato suporta', () => {
    const ctx = getAltTextSupportContext(['instagram_stories']);
    expect(ctx.hasSupported).toBe(false);
    expect(ctx.hasUnsupported).toBe(true);
    expect(ctx.microcopy).toBeNull();
  });

  it('mistura simples: Instagram suporta + TikTok ignora', () => {
    const ctx = getAltTextSupportContext(['instagram_image', 'tiktok_video']);
    expect(ctx.microcopy).toBe('Usado em Instagram. Ignorado em TikTok.');
  });

  it('combina múltiplas redes suportadas com Stories ignorado', () => {
    const ctx = getAltTextSupportContext(['instagram_image', 'linkedin_post', 'instagram_stories']);
    expect(ctx.microcopy).toBe('Usado em Instagram e LinkedIn. Ignorado em Stories.');
  });

  it('lida com 2 itens em ambos os lados', () => {
    const ctx = getAltTextSupportContext([
      'instagram_image',
      'linkedin_post',
      'instagram_stories',
      'tiktok_video',
    ]);
    expect(ctx.microcopy).toBe('Usado em Instagram e LinkedIn. Ignorado em Stories e TikTok.');
  });

  it('colapsa para "N redes" quando ignorados são mais de 2 distintos', () => {
    const ctx = getAltTextSupportContext([
      'instagram_image',
      'linkedin_post',
      'facebook_image',
      'instagram_stories',
      'tiktok_video',
      'youtube_video',
    ]);
    expect(ctx.microcopy).toBe('Usado em 3 redes. Ignorado em 3 redes.');
  });

  it('deduplica redes repetidas (instagram_image + instagram_carousel)', () => {
    const ctx = getAltTextSupportContext(['instagram_image', 'instagram_carousel']);
    expect(ctx.hasSupported).toBe(true);
    expect(ctx.hasUnsupported).toBe(false);
    expect(ctx.microcopy).toBeNull();
  });
});
