import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecoveryBanner } from './RecoveryBanner';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
  },
}));

function makeFile(name: string, type = 'image/jpeg'): File {
  return new File([new Uint8Array([0])], name, { type });
}

function makeProps(overrides: Partial<React.ComponentProps<typeof RecoveryBanner>> = {}) {
  return {
    isRecovering: false,
    recoveredPostId: null,
    mediaFiles: [],
    mediaPreviewUrls: [],
    setRecoveredPostId: vi.fn(),
    setMediaPreviewUrls: vi.fn(),
    setMediaFiles: vi.fn(),
    setMediaSources: vi.fn(),
    setMediaAspectRatios: vi.fn(),
    setCaption: vi.fn(),
    setSelectedFormats: vi.fn(),
    setNetworkCaptions: vi.fn(),
    setUseSeparateCaptions: vi.fn(),
    ...overrides,
  };
}

describe('RecoveryBanner', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    toastSuccess.mockReset();
  });

  it('mostra spinner enquanto isRecovering=true', () => {
    render(<RecoveryBanner {...makeProps({ isRecovering: true })} />);
    expect(screen.getByText('A recuperar conteúdo...')).toBeInTheDocument();
  });

  it('não renderiza nada sem recoveredPostId nem loading', () => {
    const { container } = render(<RecoveryBanner {...makeProps()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra contagem correta de ficheiros recuperados', () => {
    const files = [makeFile('a.jpg'), makeFile('b.jpg'), makeFile('c.jpg')];
    render(
      <RecoveryBanner
        {...makeProps({
          recoveredPostId: 'post-1',
          mediaFiles: files,
          mediaPreviewUrls: ['u1', 'u2', 'u3'],
        })}
      />,
    );
    expect(screen.getByText('Conteúdo Recuperado')).toBeInTheDocument();
    expect(screen.getByText('3 ficheiro(s) carregado(s) do post anterior')).toBeInTheDocument();
  });

  it('mostra no máximo 7 thumbnails + indicador "+N" para o resto', () => {
    const urls = Array.from({ length: 10 }, (_, i) => `url-${i}`);
    const files = urls.map((u) => makeFile(`${u}.jpg`));
    render(
      <RecoveryBanner
        {...makeProps({ recoveredPostId: 'p', mediaFiles: files, mediaPreviewUrls: urls })}
      />,
    );
    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(7);
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('renderiza <video> quando mediaFile.type é vídeo', () => {
    const files = [makeFile('clip.mp4', 'video/mp4'), makeFile('photo.jpg', 'image/jpeg')];
    const { container } = render(
      <RecoveryBanner
        {...makeProps({
          recoveredPostId: 'p',
          mediaFiles: files,
          mediaPreviewUrls: ['v1', 'p1'],
        })}
      />,
    );
    expect(container.querySelectorAll('video')).toHaveLength(1);
    expect(container.querySelectorAll('img')).toHaveLength(1);
  });

  it('botão "Limpar" chama todos os setters, navigate e toast', async () => {
    const user = userEvent.setup();
    const props = makeProps({
      recoveredPostId: 'post-42',
      mediaFiles: [makeFile('a.jpg')],
      mediaPreviewUrls: ['u'],
    });
    render(<RecoveryBanner {...props} />);

    await user.click(screen.getByRole('button', { name: /limpar/i }));

    expect(props.setRecoveredPostId).toHaveBeenCalledWith(null);
    expect(props.setMediaPreviewUrls).toHaveBeenCalledWith([]);
    expect(props.setMediaFiles).toHaveBeenCalledWith([]);
    expect(props.setMediaSources).toHaveBeenCalledWith([]);
    expect(props.setMediaAspectRatios).toHaveBeenCalledWith([]);
    expect(props.setCaption).toHaveBeenCalledWith('');
    expect(props.setSelectedFormats).toHaveBeenCalledWith([]);
    expect(props.setNetworkCaptions).toHaveBeenCalledWith({});
    expect(props.setUseSeparateCaptions).toHaveBeenCalledWith(false);
    expect(navigateMock).toHaveBeenCalledWith('/manual-create', { replace: true });
    expect(toastSuccess).toHaveBeenCalledWith('Recuperação limpa');
  });

  it('remover thumbnail individual filtra apenas o índice clicado', async () => {
    const user = userEvent.setup();
    const props = makeProps({
      recoveredPostId: 'p',
      mediaFiles: [makeFile('a.jpg'), makeFile('b.jpg'), makeFile('c.jpg')],
      mediaPreviewUrls: ['u1', 'u2', 'u3'],
    });
    const { container } = render(<RecoveryBanner {...props} />);

    // 3 thumbnails + 1 botão "Limpar"
    const thumbButtons = container.querySelectorAll('.group button');
    expect(thumbButtons).toHaveLength(3);

    // Clica no segundo (índice 1)
    await user.click(thumbButtons[1] as HTMLElement);

    // Confirma que cada setter recebeu uma função filtro
    const updaterFn = (props.setMediaPreviewUrls as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(typeof updaterFn).toBe('function');
    expect(updaterFn(['u1', 'u2', 'u3'])).toEqual(['u1', 'u3']);

    const filesUpdater = (props.setMediaFiles as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(filesUpdater([1, 2, 3])).toEqual([1, 3]);

    expect(toastSuccess).toHaveBeenCalledWith('Imagem removida');
  });

  it('clique no botão de remover não dispara handler de "Limpar"', async () => {
    const user = userEvent.setup();
    const props = makeProps({
      recoveredPostId: 'p',
      mediaFiles: [makeFile('a.jpg')],
      mediaPreviewUrls: ['u'],
    });
    const { container } = render(<RecoveryBanner {...props} />);

    const thumbBtn = container.querySelector('.group button') as HTMLElement;
    await user.click(thumbBtn);

    // Limpar não foi chamado — só o setter de remoção individual
    expect(navigateMock).not.toHaveBeenCalled();
    expect(props.setRecoveredPostId).not.toHaveBeenCalled();
  });
});
