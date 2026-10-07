import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ModeSelector } from '@/components/ModeSelector';
import { LegadoN8n } from '@/components/ActionButtons';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('entrada Criar', () => {
  it('apresenta os dois percursos e os três formatos assistidos reais', () => {
    const selecionar = vi.fn();
    render(
      <MemoryRouter>
        <ModeSelector onModeSelect={selecionar} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Criar manualmente' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Criar com assistência de IA' })).toBeInTheDocument();
    expect(screen.queryByText(/Em construção/i)).not.toBeInTheDocument();

    const carrossel = screen.getByRole('link', { name: /Carrossel/ });
    const post = screen.getByRole('link', { name: /Post/ });
    const story = screen.getByRole('link', { name: /Story/ });
    expect(carrossel).toHaveAttribute('href', '/estudio/carrosseis/novo?formato=carrossel');
    expect(post).toHaveAttribute('href', '/estudio/carrosseis/novo?formato=post');
    expect(story).toHaveAttribute('href', '/estudio/carrosseis/novo?formato=story');

    fireEvent.click(post);
    expect(selecionar).toHaveBeenCalledWith('ia', false);
  });

  it('guarda a preferência e encaminha o modo manual', () => {
    const selecionar = vi.fn();
    render(
      <MemoryRouter>
        <ModeSelector onModeSelect={selecionar} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Definir como predefinição' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar manualmente' }));
    expect(localStorage.getItem('preferredCreationMode')).toBe('manual');
    expect(selecionar).toHaveBeenCalledWith('manual', true);
  });

  it('mantém o n8n recolhido e apenas com o formulário real', () => {
    render(
      <MemoryRouter>
        <LegadoN8n />
      </MemoryRouter>,
    );

    const details = screen.getByText('Versão anterior · n8n').closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByRole('link', { name: /Abrir formulário antigo de carrossel/ })).toHaveAttribute(
      'href',
      expect.stringContaining('docs.google.com/forms'),
    );
    expect(screen.queryByText(/Stories \(n8n\)/)).not.toBeInTheDocument();
  });
});