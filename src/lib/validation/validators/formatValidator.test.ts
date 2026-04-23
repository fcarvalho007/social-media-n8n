import { describe, expect, it } from 'vitest';
import { formatValidator } from './formatValidator';
import { ValidatorContext } from '../types';

describe('formatValidator', () => {
  it('não duplica erros de tamanho de legenda vindos da validação legada', async () => {
    const ctx: ValidatorContext = {
      selectedFormats: ['tiktok_video'],
      caption: 'Legenda longa. '.repeat(40),
      networkCaptions: { tiktok: 'Legenda curta para TikTok.' },
      useSeparateCaptions: true,
      mediaFiles: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })],
      hashtags: [],
      scheduledDate: null,
      scheduleAsap: true,
    };

    const issues = await formatValidator(ctx);

    expect(issues.some((issue) => issue.description.includes('Legenda excede'))).toBe(false);
  });
});