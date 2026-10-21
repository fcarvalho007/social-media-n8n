import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Sidebar, SidebarProvider, useSidebar } from '@/components/ui/sidebar';

function Campos() {
  const { open } = useSidebar();
  return <>
    <output>{open ? 'Visível' : 'Recolhida'}</output>
    <input aria-label="Título" />
    <textarea aria-label="Corpo" />
    <div contentEditable suppressContentEditableWarning role="textbox" aria-label="Editor rico"><span>Texto</span></div>
    <button>Fora do editor</button>
  </>;
}

afterEach(cleanup);
describe('atalho de navegação sem interferir na escrita', () => {
  it.each(['Título', 'Corpo', 'Editor rico'])('preserva Ctrl+B em %s', label => {
    render(<SidebarProvider><Campos /></SidebarProvider>);
    const campo = screen.getByLabelText(label);
    const alvo = label === 'Editor rico' ? campo.querySelector('span')! : campo;
    expect(fireEvent.keyDown(alvo, { key: 'b', ctrlKey: true, cancelable: true })).toBe(true);
    expect(screen.getByText('Visível')).toBeInTheDocument();
  });
  it('alterna fora da escrita e ignora repetição ou outros atalhos', () => {
    render(<SidebarProvider><Campos /></SidebarProvider>);
    const botao = screen.getByRole('button');
    expect(fireEvent.keyDown(botao, { key: 'b', ctrlKey: true, cancelable: true })).toBe(false);
    expect(screen.getByText('Recolhida')).toBeInTheDocument();
    fireEvent.keyDown(botao, { key: 'b', metaKey: true, repeat: true });
    fireEvent.keyDown(botao, { key: 'B', metaKey: true, shiftKey: true });
    expect(screen.getByText('Recolhida')).toBeInTheDocument();
    fireEvent.keyDown(botao, { key: 'b', metaKey: true });
    expect(screen.getByText('Visível')).toBeInTheDocument();
  });
  it('retira a navegação recolhida do teclado e da árvore acessível', () => {
    const r = render(<SidebarProvider defaultOpen={false}><Sidebar><a href="/artigos">Artigos ocultos</a></Sidebar></SidebarProvider>);
    expect(screen.queryByRole('link', { name: 'Artigos ocultos' })).not.toBeInTheDocument();
    const painel = r.container.querySelector('[data-sidebar-container]');
    expect(painel).toHaveAttribute('inert', '');
    expect(painel).toHaveAttribute('aria-hidden', 'true');
  });
});
