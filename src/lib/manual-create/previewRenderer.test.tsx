import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderFormatPreview } from './previewRenderer';

describe('renderFormatPreview', () => {
  it('usa a legenda específica da rede quando as legendas separadas estão ativas', () => {
    render(
      renderFormatPreview('tiktok_video', {
        caption: 'Legenda global que não deve aparecer.',
        networkCaptions: { tiktok: 'Legenda específica para TikTok.' },
        useSeparateCaptions: true,
        mediaFiles: [],
        mediaPreviewUrls: [],
        mediaItems: [],
      }),
    );

    expect(screen.getByText('Legenda específica para TikTok.')).toBeInTheDocument();
    expect(screen.queryByText('Legenda global que não deve aparecer.')).not.toBeInTheDocument();
  });

  it('mostra o limite real de 300 caracteres no preview do TikTok', () => {
    render(
      renderFormatPreview('tiktok_video', {
        caption: 'abc',
        mediaFiles: [],
        mediaPreviewUrls: [],
        mediaItems: [],
      }),
    );

    expect(screen.getByText('3/300')).toBeInTheDocument();
  });
});