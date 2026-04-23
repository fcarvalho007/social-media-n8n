import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkCaptionEditor } from './NetworkCaptionEditor';
import { SocialNetwork } from '@/types/social';

function CaptionHarness({ caption }: { caption: string }) {
  const selectedNetworks: SocialNetwork[] = ['instagram', 'facebook', 'youtube', 'linkedin', 'tiktok'];
  const [useSeparateCaptions, setUseSeparateCaptions] = useState(false);
  const [networkCaptions, setNetworkCaptions] = useState<Record<string, string>>({});

  return (
    <NetworkCaptionEditor
      caption={caption}
      onCaptionChange={vi.fn()}
      networkCaptions={networkCaptions}
      onNetworkCaptionChange={(network, next) => {
        setNetworkCaptions((prev) => ({ ...prev, [network]: next }));
      }}
      selectedNetworks={selectedNetworks}
      useSeparateCaptions={useSeparateCaptions}
      onToggleSeparate={(next) => {
        setUseSeparateCaptions(next);
        if (next) {
          const initial: Record<string, string> = {};
          selectedNetworks.forEach((network) => {
            initial[network] = networkCaptions[network] ?? caption;
          });
          setNetworkCaptions(initial);
        }
      }}
    />
  );
}

describe('NetworkCaptionEditor', () => {
  it('copia a legenda completa para todas as redes ao ativar legendas separadas', async () => {
    const user = userEvent.setup();
    const longCaption = 'Legenda completa. '.repeat(35);

    render(<CaptionHarness caption={longCaption} />);

    await user.click(screen.getByRole('switch', { name: /unificada/i }));

    expect(screen.getByPlaceholderText('Legenda para Instagram...')).toHaveValue(longCaption);
    expect(screen.getByPlaceholderText('Legenda para Facebook...')).toHaveValue(longCaption);
    expect(screen.getByPlaceholderText('Legenda para YouTube...')).toHaveValue(longCaption);
    expect(screen.getByPlaceholderText('Legenda para LinkedIn...')).toHaveValue(longCaption);
    expect(screen.getByPlaceholderText('Legenda para TikTok...')).toHaveValue(longCaption);
  });

  it('não corta automaticamente o texto do TikTok durante a edição', async () => {
    const user = userEvent.setup();
    const longCaption = 'Legenda completa. '.repeat(35);
    const revisedTikTokCaption = 'TikTok mantém edição longa. '.repeat(20);

    render(<CaptionHarness caption={longCaption} />);

    await user.click(screen.getByRole('switch', { name: /unificada/i }));
    const tiktokTextarea = screen.getByPlaceholderText('Legenda para TikTok...');

    fireEvent.change(tiktokTextarea, { target: { value: revisedTikTokCaption } });

    expect(tiktokTextarea).toHaveValue(revisedTikTokCaption);
    expect((tiktokTextarea as HTMLTextAreaElement).value.length).toBeGreaterThan(300);
  });

  it('preserva edições por rede ao alternar entre unificada e separadas', async () => {
    const user = userEvent.setup();
    const longCaption = 'Legenda original completa. '.repeat(20);
    const tiktokCaption = 'Versão específica para TikTok com ajuste editorial.';

    render(<CaptionHarness caption={longCaption} />);

    await user.click(screen.getByRole('switch', { name: /unificada/i }));
    fireEvent.change(screen.getByPlaceholderText('Legenda para TikTok...'), {
      target: { value: tiktokCaption },
    });

    await user.click(screen.getByRole('switch', { name: /separadas/i }));
    await user.click(screen.getByRole('switch', { name: /unificada/i }));

    expect(screen.getByPlaceholderText('Legenda para TikTok...')).toHaveValue(tiktokCaption);
    expect(screen.getByPlaceholderText('Legenda para Instagram...')).toHaveValue(longCaption);
  });
});