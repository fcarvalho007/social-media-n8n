import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConteudoArtigo } from '@/features/seo/ConteudoArtigo';
import { ConhecimentoEditor } from '@/features/seo/ConhecimentoEditor';
import { EstruturaEditor } from '@/features/seo/EstruturaEditor';
import { SITES_INICIAIS } from '@/features/seo/catalogo';
import type { PautaEditorial } from '@/features/seo/contratos';
const { pedido } = vi.hoisted(() => ({ pedido: vi.fn() }));
vi.mock('@/features/seo/api', () => ({ apiSeo: pedido }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
beforeEach(()=>{vi.stubGlobal('ResizeObserver',class { observe(){} unobserve(){} disconnect(){} });});
afterEach(() => { cleanup(); pedido.mockReset(); vi.unstubAllGlobals(); });

describe('editorial: prévia segura e edição preservada', () => {
  it('renderiza texto e referências sem executar HTML ou URLs de script', () => {
    const { container } = render(<ConteudoArtigo corpo={'<img src=x onerror=alert(1)>\n\n[Entrar](javascript:alert(1))\n\n**Critérios úteis** [fonte:f1]'} fontes={[{ id: 'f1', titulo: 'Fonte original', url: 'https://example.com/fonte', excerto: '', aprovada: true, verificadaEm: '' }]} />);
    expect(container.querySelector('img')).toBeNull(); expect(container.querySelector('script')).toBeNull(); expect(container.querySelector('a[href^="javascript:"]')).toBeNull(); expect(screen.getByRole('link', { name: '[Fonte original]' })).toHaveAttribute('href', 'https://example.com/fonte'); expect(screen.getByText('Critérios úteis').tagName).toBe('STRONG');
  });
  it('ligações com credenciais não se tornam ligações clicáveis', () => {
    const { container } = render(<ConteudoArtigo corpo={'[Página](https://user:segredo@example.com/path)'} fontes={[]} />); expect(container.querySelector('a')).toBeNull();
  });
  it('adicionar uma referência não submete o formulário nem executa um serviço', () => {
    render(<ConhecimentoEditor site={SITES_INICIAIS[0]} atualizar={vi.fn()} />); fireEvent.click(screen.getByRole('button', { name: 'Adicionar referência' })); expect(screen.getByLabelText('Título da referência')).toBeVisible();fireEvent.change(screen.getByLabelText('Título da referência'),{target:{value:'Referência editorial'}});expect(screen.getByLabelText('Título da referência')).toBeVisible(); expect(pedido).not.toHaveBeenCalled(); expect(screen.getByText(/Alterações por guardar/)).toBeVisible();
  });
  it('uma atualização concorrente não apaga uma estrutura que está a ser escrita', () => {
    const p: PautaEditorial = { id: 'p1', siteId: 'sms', titulo: 'Campanha SMS', palavra: 'sms marketing', origem: 'topico', contributo: 'Contributo a rever.', objetivo: '', cta: '', fontes: [], dataPretendida: '', pesquisaId: null, modoOrigem: 'manual', estado: 'planeado', versao: 1, criadoEm: '', alteradoEm: '', texto: null, proposta: null, aprovacao: null, motivo: null, producaoAutomaticaAutorizada: false };
    const props = { pauta: p, sujo: false, orcamentar: vi.fn(), atualizar: vi.fn(), onGuardada: vi.fn() };
    const { rerender } = render(<EstruturaEditor {...props} />); fireEvent.change(screen.getByLabelText('Pergunta principal do leitor'), { target: { value: 'Como preparar uma campanha útil?' } }); rerender(<EstruturaEditor {...props} pauta={{ ...p, versao: 2 }} />);
    expect(screen.getByLabelText('Pergunta principal do leitor')).toHaveValue('Como preparar uma campanha útil?'); expect(screen.getByText(/A pauta mudou/)).toBeVisible(); expect(screen.getByRole('button', { name: 'Confirmar estrutura' })).toBeDisabled(); expect(pedido).not.toHaveBeenCalled();
  });
});
