import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PainelNoticiasExtraidas, PainelFerramentasExtraidas } from '@/newsletter/routes/_authenticated/emails';
import type { EmailRecebido } from '@/newsletter/lib/emails-recebidos.functions';
const m=vi.hoisted(()=>({noticias:vi.fn(),ferramentas:vi.fn()}));
vi.mock('@/newsletter/lib/emails-recebidos.functions',async original=>({...await original<object>(),listarNoticiasDoEmail:(...args:unknown[])=>m.noticias(...args)}));
vi.mock('@/newsletter/lib/ferramentas.functions',async original=>({...await original<object>(),listarFerramentasDoEmail:(...args:unknown[])=>m.ferramentas(...args)}));
const email={id:'email-1'} as EmailRecebido;
let qc:QueryClient;
beforeEach(()=>{m.noticias.mockReset();m.ferramentas.mockReset();qc=new QueryClient({defaultOptions:{queries:{retry:false}}});});
afterEach(()=>{cleanup();qc.clear();});
it('uma falha de notícias extraídas não aparece como zero e pode recuperar sem reprocessar o email',async()=>{
 m.noticias.mockRejectedValueOnce(new Error('Falha 500')).mockResolvedValueOnce({noticias:[{id:'noticia-1',titulo:'Descoberta recebida',estado:'aprovada'}]});
 render(<QueryClientProvider client={qc}><PainelNoticiasExtraidas email={email}/></QueryClientProvider>);
 expect(await screen.findByRole('alert')).toHaveTextContent('O email original foi preservado');expect(screen.queryByText('· 0 itens')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Tentar consultar notícias novamente'}));
 await screen.findByText('· 1 item');fireEvent.click(screen.getByRole('button',{name:/Notícias extraídas/}));
 expect(screen.getByRole('link',{name:'Abrir'})).toHaveAttribute('href','/curadoria?noticia=noticia-1');expect(screen.queryByRole('alert')).not.toBeInTheDocument();expect(m.noticias).toHaveBeenCalledTimes(2);
});
it('falhas ao ler ferramentas não desaparecem como se não existissem resultados',async()=>{
 m.ferramentas.mockRejectedValueOnce(new Error('Falha de rede'));
 render(<QueryClientProvider client={qc}><PainelFerramentasExtraidas email={email}/></QueryClientProvider>);
 expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as ferramentas extraídas');expect(screen.getByRole('link',{name:'Ver diretório →'}).closest('button')).toBeNull();
});
