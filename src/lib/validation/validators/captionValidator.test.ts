import { describe, expect, it, vi } from 'vitest';
import { captionValidator } from './captionValidator';
import { ValidatorContext } from '../types';

describe('captionValidator', () => {
  it('corta apenas a legenda TikTok quando as legendas separadas estão ativas', async () => {
    const setCaption = vi.fn();
    const setNetworkCaption = vi.fn();
    const longCaption = 'Legenda completa. '.repeat(35);
    const ctx: ValidatorContext = {
      selectedFormats: ['instagram_reel', 'tiktok_video'],
      caption: longCaption,
      networkCaptions: {
        instagram: longCaption,
        tiktok: longCaption,
      },
      useSeparateCaptions: true,
      mediaFiles: [],
      hashtags: [],
      scheduledDate: null,
      scheduleAsap: true,
      fixHelpers: {
        setCaption,
        setNetworkCaption,
      },
    };

    const issues = await captionValidator(ctx);
    const tiktokIssue = issues.find((issue) => issue.id === 'caption:tiktok:over-length');

    expect(tiktokIssue).toBeDefined();
    tiktokIssue?.fixAction?.();

    expect(setNetworkCaption).toHaveBeenCalledWith('tiktok', longCaption.slice(0, 300));
    expect(setCaption).not.toHaveBeenCalled();
  });

  it('não acusa TikTok quando a legenda específica está dentro do limite', async () => {
    const longCaption = 'Legenda completa. '.repeat(35);
    const ctx: ValidatorContext = {
      selectedFormats: ['instagram_reel', 'tiktok_video'],
      caption: longCaption,
      networkCaptions: {
        instagram: longCaption,
        tiktok: 'Legenda curta para TikTok.',
      },
      useSeparateCaptions: true,
      mediaFiles: [],
      hashtags: [],
      scheduledDate: null,
      scheduleAsap: true,
    };

    const issues = await captionValidator(ctx);

    expect(issues.some((issue) => issue.id === 'caption:tiktok:over-length')).toBe(false);
  });
});