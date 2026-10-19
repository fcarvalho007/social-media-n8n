import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AnalyticsSidebar } from '@/components/analytics/AnalyticsSidebar';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('atalhos de secção dos resultados', () => {
  it('só apresenta o perfil quando essa secção existe no painel', () => {
    const r = render(<AnalyticsSidebar />);
    expect(screen.queryByRole('button', { name: 'Perfil' })).not.toBeInTheDocument();
    r.rerender(<AnalyticsSidebar perfilVisivel />);
    expect(screen.getByRole('button', { name: 'Perfil' })).toBeVisible();
  });
  it('leva à secção certa e respeita a preferência por movimento reduzido', () => {
    const scroll = vi.fn();
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    render(<><AnalyticsSidebar /><section id="engagement-chart">Dados de interações</section></>);
    Object.assign(document.getElementById('engagement-chart')!, { scrollIntoView: scroll });
    fireEvent.click(screen.getByRole('button', { name: 'Interações' }));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(screen.getByRole('button', { name: 'Interações' })).toHaveAttribute('aria-current', 'location');
  });
  it('atualiza a localização observada e liberta o observador ao sair', () => {
    let observar: IntersectionObserverCallback | undefined;
    const desligar = vi.fn();
    vi.stubGlobal('IntersectionObserver', class { constructor(cb: IntersectionObserverCallback) { observar = cb; } observe() {} disconnect = desligar; });
    const r = render(<><AnalyticsSidebar /><section id="top-posts">Publicações existentes</section></>);
    const target = document.getElementById('top-posts')!, rect = target.getBoundingClientRect();
    act(() => observar?.([{ isIntersecting: true, target, boundingClientRect: rect, intersectionRect: rect, rootBounds: null, intersectionRatio: 1, time: 0 }], {} as IntersectionObserver));
    expect(screen.getByRole('button', { name: 'Melhores publicações' })).toHaveAttribute('aria-current', 'location');
    r.unmount();
    expect(desligar).toHaveBeenCalledOnce();
  });
});
