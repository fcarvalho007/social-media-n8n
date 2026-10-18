import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Pending from '@/pages/Pending';

type Response = { data: unknown; error: { message: string } | null };
type Request = {
  table: string;
  status?: string;
  id?: string;
  resolve: (response: Response) => void;
};
const h = vi.hoisted(() => ({
  reads: [] as Request[],
  deletes: [] as Request[],
  changes: new Map<string, () => void>(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    let status: string | undefined;
    let id: string | undefined;
    const pending = (requests: Request[]) => new Promise<Response>(resolve => requests.push({ table, status, id, resolve }));
    const query = {
      select: () => query,
      delete: () => query,
      eq: (column: string, value: string) => { if (column === 'status') status = value; else if (column === 'id') id = value; return query; },
      in: (_column: string, values: string[]) => { status = values.join(','); return query; },
      is: () => query,
      not: () => query,
      order: () => pending(h.reads),
      single: () => pending(h.deletes),
    };
    return query;
  },
  channel: () => {
    const channel = {
      on: (_event: string, filter: { table: string }, callback: () => void) => { h.changes.set(filter.table, callback); return channel; },
      subscribe: () => channel,
    };
    return channel;
  },
  removeChannel: vi.fn(),
} }));
vi.mock('sonner', () => ({ toast: { success: h.success, error: h.error } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), debug: vi.fn() } }));
vi.mock('@/hooks/usePendingCounts', () => ({ usePendingCounts: () => ({ counts: { total: 0, stories: 0, carousels: 0, posts: 0 } }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/components/ModeSelector', () => ({ ModeSelector: () => <p>Criar conteúdo localmente</p> }));
vi.mock('@/components/ActionButtons', () => ({ LegadoN8n: () => null }));
vi.mock('@/components/drafts/IniciadosSection', () => ({ IniciadosSection: () => null }));
vi.mock('@/components/PostCardSkeleton', () => ({ PostCardSkeleton: () => null }));
vi.mock('@/components/StoryCardSkeleton', () => ({ StoryCardSkeleton: () => null }));
vi.mock('@/components/PostCard', () => ({ PostCard: ({ post, onDelete, onClick }: { post: { id: string; tema: string }; onDelete: (id: string) => void; onClick: () => void }) => (
  <article><button onClick={onClick}>{post.tema}</button><button onClick={() => onDelete(post.id)}>Eliminar {post.tema}</button></article>
) }));
vi.mock('@/components/StoryCard', () => ({ StoryCard: ({ story, onDelete }: { story: { id: string; tema: string }; onDelete: (id: string) => void }) => (
  <article><p>{story.tema}</p><button onClick={() => onDelete(story.id)}>Eliminar {story.tema}</button></article>
) }));

const post = (id = 'post-1', tema = 'Publicação pendente') => ({ id, tema, caption: null, content_type: 'post', created_at: '2026-10-18T10:00:00Z' });
const story = { id: 'story-1', tema: 'Story pendente', caption: '', created_at: '2026-10-18T09:00:00Z' };
const ok = (data: unknown): Response => ({ data, error: null });
function setup() {
  function Page() {
    const navigate = useNavigate();
    return <><button onClick={() => navigate('/pending?tab=create')}>Abrir criação</button><button onClick={() => navigate('/pending')}>Abrir aprovação</button><Pending /></>;
  }
  render(<MemoryRouter initialEntries={['/pending']}><Page /></MemoryRouter>);
}
async function finish(reads: Request[], posts: unknown[] = [], stories: unknown[] = []) {
  await act(async () => {
    for (const request of reads) request.resolve(ok(request.table === 'posts' ? posts : stories));
  });
}
beforeEach(() => { h.reads.length = 0; h.deletes.length = 0; h.changes.clear(); vi.clearAllMocks(); });
afterEach(cleanup);

describe('fiabilidade da aprovação', () => {
  it('aguarda publicações e Stories antes de mostrar uma lista completa', async () => {
    setup();
    expect(h.reads).toHaveLength(2);
    await act(async () => { h.reads.find(request => request.table === 'posts')!.resolve(ok([post()])); });
    expect(screen.getByRole('status', { name: 'A carregar conteúdo para aprovação' })).toBeInTheDocument();
    expect(screen.queryByText('Publicação pendente')).not.toBeInTheDocument();
    await act(async () => { h.reads.find(request => request.table === 'stories')!.resolve(ok([story])); });
    expect(screen.getByText('Publicação pendente')).toBeInTheDocument();
    expect(screen.getByText('Story pendente')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'A carregar conteúdo para aprovação' })).not.toBeInTheDocument();
  });

  it('ignora respostas antigas depois de mudar de estado', async () => {
    setup();
    const old = [...h.reads];
    const oldRealtime = h.changes.get('posts')!;
    fireEvent.click(screen.getByRole('button', { name: 'Aprovados' }));
    expect(h.reads.slice(2).every(request => request.status === 'approved,published')).toBe(true);
    await finish(h.reads.slice(2), [post('aprovado', 'Publicação aprovada')]);
    expect(screen.getByText('Publicação aprovada')).toBeInTheDocument();
    await finish(old, [post()], [story]);
    act(oldRealtime);
    expect(h.reads).toHaveLength(4);
    expect(screen.getByText('Publicação aprovada')).toBeInTheDocument();
    expect(screen.queryByText('Publicação pendente')).not.toBeInTheDocument();
    expect(screen.queryByText('Story pendente')).not.toBeInTheDocument();
  });

  it('não interpreta uma falha parcial como lista vazia e permite repetir ambas as leituras', async () => {
    setup();
    await act(async () => {
      h.reads[0].resolve(ok([]));
      h.reads[1].resolve({ data: null, error: { message: 'Ligação indisponível' } });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o conteúdo para aprovação');
    expect(screen.queryByText('Nenhum conteúdo encontrado')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(h.reads).toHaveLength(4);
    await finish(h.reads.slice(2), [], [story]);
    expect(screen.getByText('Story pendente')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('invalida leituras ao entrar em criação e volta a consultar ao regressar', async () => {
    setup();
    const old = [...h.reads];
    fireEvent.click(screen.getByRole('button', { name: 'Abrir criação' }));
    await finish(old, [post()]);
    expect(screen.getByText('Criar conteúdo localmente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir aprovação' }));
    expect(screen.getByRole('status', { name: 'A carregar conteúdo para aprovação' })).toBeInTheDocument();
    await finish(h.reads.slice(2));
    expect(screen.getByText('Nenhum conteúdo encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Publicação pendente')).not.toBeInTheDocument();
  });

  it('preserva um cartão quando eliminar falha e impede pedidos duplicados', async () => {
    setup();
    await finish(h.reads, [post()]);
    const remove = screen.getByRole('button', { name: 'Eliminar Publicação pendente' });
    fireEvent.click(remove);
    fireEvent.click(remove);
    expect(h.deletes).toHaveLength(1);
    expect(screen.getByText('A eliminar…')).toBeInTheDocument();
    await act(async () => { h.deletes[0].resolve({ data: null, error: { message: 'Não foi possível eliminar este registo' } }); });
    expect(screen.getByText('Publicação pendente')).toBeInTheDocument();
    expect(h.error).toHaveBeenCalledWith('Falha ao eliminar publicação');
    expect(h.success).not.toHaveBeenCalled();
    fireEvent.click(remove);
    expect(h.deletes).toHaveLength(2);
  });

  it('uma atualização em curso não restaura uma publicação ou Story já eliminados', async () => {
    setup();
    await finish(h.reads, [post()], [story]);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Publicação pendente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Story pendente' }));
    act(() => h.changes.get('posts')!());
    const refresh = h.reads.slice(2);
    await act(async () => { for (const request of h.deletes) request.resolve(ok({ id: request.id })); });
    await finish(refresh, [post()], [story]);
    expect(screen.getByText('Nenhum conteúdo encontrado')).toBeInTheDocument();
    expect(screen.queryByText('Publicação pendente')).not.toBeInTheDocument();
    expect(screen.queryByText('Story pendente')).not.toBeInTheDocument();
    expect(h.success).toHaveBeenCalledTimes(2);
  });

  it('não anuncia uma eliminação sem confirmação do registo afetado', async () => {
    setup();
    await finish(h.reads, [post()], [story]);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Story pendente' }));
    await act(async () => { h.deletes[0].resolve(ok(null)); });
    expect(screen.getByText('Story pendente')).toBeInTheDocument();
    expect(h.error).toHaveBeenCalledWith('Falha ao eliminar story');
    expect(h.success).not.toHaveBeenCalled();
  });

  it('descreve corretamente o estado vazio dos agendados', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Agendados' }));
    await finish(h.reads.slice(2));
    expect(screen.getByText('Não existe conteúdo agendado neste momento')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agendados' })).toHaveAttribute('aria-pressed', 'true');
  });
});
