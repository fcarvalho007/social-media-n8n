import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AssistenteSite } from '@/features/seo/AssistenteSite';
import { SITES_INICIAIS } from '@/features/seo/catalogo';
import type { SiteEditorial } from '@/features/seo/contratos';
import { chaveRecuperacao } from '@/lib/recuperacaoLocal';
const mocks = vi.hoisted(() => ({ api: vi.fn(), guardada: vi.fn() }));
vi.mock('@/features/seo/api', () => ({ apiSeo: mocks.api }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id:'conta-teste' } }) }));
beforeEach(() => { vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }); localStorage.clear(); mocks.api.mockReset(); mocks.guardada.mockReset().mockResolvedValue(undefined); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function montar(site = SITES_INICIAIS[0], passo = 0, projetoId = 'projeto-a', podeEditar = true) {
  return render(<MemoryRouter initialEntries={[`/artigos/sites/${site.id}?passo=${passo}`]}><AssistenteSite site={site} projetoId={projetoId} podeEditar={podeEditar} aoGuardar={mocks.guardada} /></MemoryRouter>);
}
function confirmar() { fireEvent.click(screen.getByRole('checkbox', { name:/Revi estas definições/ })); }
function resultado(s = SITES_INICIAIS[0]): SiteEditorial { return { ...structuredClone(s), politica:{...s.politica,revista:s.politica.revista+1}, configuracaoGuiada:{concluidaEm:'2026-10-18T18:00:00Z',revista:s.politica.revista+1} }; }
describe('assistente de configuração de sites', () => {
  it('começa com os dados existentes e não grava ou consulta IA ao abrir', () => {
    montar(); expect(screen.getByLabelText('Para quem escreves?')).toHaveValue(SITES_INICIAIS[0].publico); expect(mocks.api).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name:'Continuar'})); expect(screen.getByLabelText('Como deve soar este site?')).toHaveValue(SITES_INICIAIS[0].voz); expect(mocks.api).not.toHaveBeenCalled();
  });
  it('valida o passo atual sem perder o texto e permite corrigir', () => {
    montar(); fireEvent.change(screen.getByLabelText('Para quem escreves?'), {target:{value:'Curto'}}); fireEvent.click(screen.getByRole('button', {name:'Continuar'}));
    expect(screen.getByText(/Público: escreve pelo menos 10/)).toBeVisible(); expect(screen.getByLabelText('Para quem escreves?')).toHaveValue('Curto'); expect(mocks.api).not.toHaveBeenCalled();
  });
  it('permite escrever temas em várias linhas sem apagar a nova linha durante a edição', () => {
    montar(SITES_INICIAIS[0],2); fireEvent.change(screen.getByLabelText('Temas a trabalhar'),{target:{value:'Primeiro tema\n'}}); expect(screen.getByLabelText('Temas a trabalhar')).toHaveValue('Primeiro tema\n');
    fireEvent.change(screen.getByLabelText('Temas a trabalhar'),{target:{value:'Primeiro tema\nSegundo tema'}}); expect(screen.getByLabelText('Temas a trabalhar')).toHaveValue('Primeiro tema\nSegundo tema');
  });
  it('mantém a aprovação humana do site pessoal e bloqueia modos automáticos em destinos planeados', () => {
    const app = montar(SITES_INICIAIS.find(s=>s.id==='frederico')!,4); expect(screen.getByText('Aprovação humana obrigatória')).toBeVisible(); expect(screen.queryByLabelText('Quem aprova a publicação?')).not.toBeInTheDocument(); app.unmount();
    montar(SITES_INICIAIS.find(s=>s.id==='ensino')!,4); expect(screen.getByLabelText('Quando preparar os textos?')).toBeDisabled(); expect(screen.getByLabelText('Quem aprova a publicação?')).toBeDisabled();
  });
  it('faz coincidir a frequência com os dias e conserva as restantes decisões', () => {
    montar(SITES_INICIAIS[0],4); fireEvent.change(screen.getByLabelText('Artigos por semana'),{target:{value:'3'}}); fireEvent.click(screen.getByRole('button',{name:'Continuar'})); expect(screen.getByText('Escolhe 3 dias para o ritmo semanal definido.')).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Segunda-feira'})); fireEvent.click(screen.getByRole('button',{name:'Continuar'})); expect(screen.getByRole('heading',{name:'Rever e guardar'})).toBeVisible(); expect(screen.getByText(/3 artigos por semana/)).toBeVisible();
  });
  it('exige revisão explícita e grava uma vez com o projeto capturado', async () => {
    mocks.api.mockResolvedValue(resultado()); montar(SITES_INICIAIS[0],5); expect(screen.getByRole('button',{name:'Guardar definições do site'})).toBeDisabled(); confirmar();
    fireEvent.click(screen.getByRole('button',{name:'Guardar definições do site'})); await screen.findByRole('heading',{name:'Configuração guardada'});
    expect(mocks.api).toHaveBeenCalledOnce(); expect(mocks.api).toHaveBeenCalledWith('configurar-site',expect.objectContaining({siteId:'sms',revista:1,confirmacao:true,definicao:expect.objectContaining({publico:SITES_INICIAIS[0].publico})}),{projeto:'projeto-a'}); expect(mocks.guardada).toHaveBeenCalledOnce(); expect(screen.getByText(/política deste site continua inativa/)).toBeVisible();
  });
  it('um duplo submit não cria duas gravações concorrentes', async () => {
    let resolver!: (s:SiteEditorial)=>void; mocks.api.mockImplementation(()=>new Promise(r=>{resolver=r;})); const app=montar(SITES_INICIAIS[0],5); confirmar();
    const form = app.container.querySelector('form')!; fireEvent.submit(form); fireEvent.submit(form); expect(mocks.api).toHaveBeenCalledOnce(); resolver(resultado()); await screen.findByRole('heading',{name:'Configuração guardada'});
  });
  it('preserva as alterações e permite repetir quando a gravação falha', async () => {
    mocks.api.mockRejectedValue(new Error('Não foi possível contactar o servidor.')); montar(); fireEvent.change(screen.getByLabelText('Para quem escreves?'),{target:{value:'Uma definição nova e útil do público da marca.'}}); fireEvent.click(screen.getByRole('button',{name:/Rever e guardar$/})); confirmar(); fireEvent.click(screen.getByRole('button',{name:'Guardar definições do site'}));
    await screen.findByText(/Não foi possível contactar o servidor/); expect(screen.getByText('Uma definição nova e útil do público da marca.')).toBeVisible(); expect(screen.getByRole('button',{name:'Guardar definições do site'})).toBeEnabled(); expect(mocks.guardada).not.toHaveBeenCalled();
  });
  it('recupera o passo e as alterações após fechar, separando projetos', () => {
    const app=montar(SITES_INICIAIS[0],1); fireEvent.change(screen.getByLabelText('Como deve soar este site?'),{target:{value:'Uma nova voz guardada apenas no rascunho local.'}}); app.unmount();
    const outro=montar(SITES_INICIAIS[0],0,'projeto-b'); expect(screen.queryByText('Há alterações por concluir neste navegador')).not.toBeInTheDocument(); outro.unmount();
    montar(); expect(screen.getByText('Há alterações por concluir neste navegador')).toBeVisible(); fireEvent.click(screen.getByRole('button',{name:'Continuar o rascunho'})); expect(screen.getByLabelText('Como deve soar este site?')).toHaveValue('Uma nova voz guardada apenas no rascunho local.'); expect(mocks.api).not.toHaveBeenCalled();
  });
  it('uma atualização concorrente bloqueia guardar e não substitui trabalho humano', () => {
    const site=structuredClone(SITES_INICIAIS[0]); const app=montar(site); fireEvent.change(screen.getByLabelText('Para quem escreves?'),{target:{value:'O meu texto ainda não foi guardado no motor.'}});
    app.rerender(<MemoryRouter><AssistenteSite site={{...site,politica:{...site.politica,revista:2}}} projetoId="projeto-a" podeEditar aoGuardar={mocks.guardada}/></MemoryRouter>);
    expect(screen.getByText('Este site mudou noutro separador')).toBeVisible(); expect(screen.getByLabelText('Para quem escreves?')).toHaveValue('O meu texto ainda não foi guardado no motor.'); expect(screen.getByRole('button',{name:'Continuar'})).toBeDisabled();
    expect(localStorage.getItem(chaveRecuperacao('conta-teste','configurar-site','sms','projeto-a'))).toContain('O meu texto ainda não foi guardado');
  });
  it('distingue uma falha de atualização da lista de uma gravação já confirmada', async () => {
    mocks.api.mockResolvedValue(resultado()); mocks.guardada.mockRejectedValue(new Error('leitura falhou')); montar(SITES_INICIAIS[0],5); confirmar(); fireEvent.click(screen.getByRole('button',{name:'Guardar definições do site'}));
    await screen.findByText(/A configuração foi guardada. Não foi possível atualizar a lista/); expect(screen.getByRole('heading',{name:'Configuração guardada'})).toBeVisible(); expect(screen.queryByText('Não foi possível guardar')).not.toBeInTheDocument();
  });
  it('leitores podem consultar mas não editar ou guardar', () => {
    montar(SITES_INICIAIS[0],5,'projeto-a',false); expect(screen.getByRole('checkbox',{name:/Revi estas definições/})).toBeDisabled(); expect(screen.getByRole('button',{name:'Guardar definições do site'})).toBeDisabled(); expect(mocks.api).not.toHaveBeenCalled();
  });
  it('ir diretamente para o resumo não permite guardar uma configuração incompleta', async () => {
    const s={...structuredClone(SITES_INICIAIS[0]),publico:'A definir antes de ativar.'}; montar(s,5); confirmar(); fireEvent.click(screen.getByRole('button',{name:'Guardar definições do site'}));
    await waitFor(()=>expect(screen.getByText('Há definições por completar')).toBeVisible()); expect(mocks.api).not.toHaveBeenCalled();
  });
});
