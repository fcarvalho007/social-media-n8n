import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CuradoriaNoticias, nomeFonteCuradoria, canalCuradoria, type API_CURADORIA } from '@/features/curadoria/CuradoriaNoticias';
import type { NoticiaCurada, FonteCuradoria } from '@/services/curadoria';
const n: NoticiaCurada = { id:'news', titulo:'Uma notícia para reutilizar', descricao:'Factos aprovados pela curadoria.', url:null, categoria:'ia', origem:'rss', editorial_estado:'aprovada', estado_newsletter:'enviada', edicao_id:'old', criado_em:'2026-10-07T08:00:00Z', nivel:'resumo', usos:2, edicoes:['old'] };
const f: FonteCuradoria = { noticia_id:n.id, hash:'canonical-hash', titulo:n.titulo, texto:n.descricao!, url:null, categoria:'ia', origem:'rss', nivel:'resumo', parcial:false };
function api(): typeof API_CURADORIA { return { listar:vi.fn().mockResolvedValue({total:1,itens:[n]}), ler:vi.fn().mockResolvedValue(f), decidir:vi.fn().mockResolvedValue(undefined), selecionarEdicao:vi.fn().mockResolvedValue('copy') }; }
afterEach(cleanup);
describe('curadoria: decisão partilhada e escolha sem geração', () => {
 it('seleção só mostra aprovadas e lê uma cópia ao clicar, sem decidir nem gerar', async () => {
  const a=api(), escolher=vi.fn();render(<MemoryRouter><CuradoriaNoticias api={a} selecionar={escolher}/></MemoryRouter>);
  await screen.findByRole('button',{name:'Usar notícia'});expect(a.listar).toHaveBeenCalledWith(expect.objectContaining({estado:'aprovada'}));expect(a.ler).not.toHaveBeenCalled();expect(escolher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Usar notícia'}));await waitFor(()=>expect(escolher).toHaveBeenCalledWith(f));expect(a.decidir).not.toHaveBeenCalled();expect(a.selecionarEdicao).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Aprovar'})).not.toBeInTheDocument();
 });
 it('aprovação guarda a decisão comum e atualiza a lista', async () => {
  const a=api();render(<MemoryRouter><CuradoriaNoticias api={a}/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Aprovar'}));await waitFor(()=>expect(a.decidir).toHaveBeenCalledWith('news','aprovada'));await waitFor(()=>expect(a.listar).toHaveBeenCalledTimes(2));expect(a.ler).not.toHaveBeenCalled();
 });
 it('a newsletter reutiliza na edição escolhida e não move a edição anterior', async () => {
  const a=api(), depois=vi.fn();render(<MemoryRouter><CuradoriaNoticias api={a} paraEdicao={{id:'new',onSelecionada:depois}}/></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button',{name:'Usar nesta edição'}));await waitFor(()=>expect(a.selecionarEdicao).toHaveBeenCalledWith('news','new'));expect(n.edicao_id).toBe('old');expect(depois).toHaveBeenCalledTimes(1);
 });
 it('não oferece outra seleção da mesma notícia na mesma edição', async () => {
  const a=api();render(<MemoryRouter><CuradoriaNoticias api={a} paraEdicao={{id:'old',onSelecionada:vi.fn()}}/></MemoryRouter>);expect(await screen.findByRole('button',{name:'Já nesta edição'})).toBeDisabled();expect(a.selecionarEdicao).not.toHaveBeenCalled();
 });
 it('falha de leitura tem recuperação e não é apresentada como lista vazia', async () => {
  const a=api();vi.mocked(a.listar).mockRejectedValueOnce(new Error('Ligação indisponível'));render(<MemoryRouter><CuradoriaNoticias api={a}/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('Ligação indisponível');fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByRole('heading',{name:n.titulo});expect(screen.queryByRole('alert')).not.toBeInTheDocument();
 });
 it('prepara ligações para os três formatos com a mesma notícia', async () => {
  const a=api();render(<MemoryRouter><CuradoriaNoticias api={a}/></MemoryRouter>);await screen.findByRole('heading',{name:n.titulo});fireEvent.click(screen.getByRole('radio',{name:'Aprovadas'}));await waitFor(()=>expect(a.listar).toHaveBeenLastCalledWith(expect.objectContaining({estado:'aprovada'})));
  for(const formato of ['carrossel','post','story'])expect(await screen.findByRole('link',{name:`Criar ${formato}`})).toHaveAttribute('href',`/estudio/carrosseis/novo?formato=${formato}&noticia=news`);
 });
});

it('identifica a fonte, o site ou a ausência de origem sem mostrar códigos técnicos', () => {
 expect(nomeFonteCuradoria({fonte_nome:'The Rundown',url:'https://example.org/article'})).toBe('The Rundown');
 expect(nomeFonteCuradoria({url:'https://www.example.org/article'})).toBe('example.org');
 expect(nomeFonteCuradoria({url:null})).toBe('Não identificada no registo original');
 expect(nomeFonteCuradoria({url:'javascript:alert(1)'})).toBe('Não identificada no registo original');
 expect(canalCuradoria({fonte_tipo:'rss',origem:'curadoria_ia'})).toBe('Feed RSS');
 expect(canalCuradoria({origem:'email_newsletter'})).toBe('Newsletter por email');
});
