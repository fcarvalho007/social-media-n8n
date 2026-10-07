import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {PlanoGravacao} from '@/features/roteiros/PlanoGravacao';
import {estruturaManual} from '../../supabase/functions/_shared/roteiros/modelo';
afterEach(cleanup);
it('reinicia a sequência a partir do primeiro trecho e aguenta uma lista reduzida',()=>{
 const v=estruturaManual('hva','Teste de ensaio');v.cenas.forEach(c=>{c.locucao=`Texto de ${c.etapa}.`;});const erro=vi.fn();
 const view=render(<PlanoGravacao variante={v} ppm={140} erro={erro}/>);
 fireEvent.click(screen.getByRole('button',{name:'Cena seguinte'}));fireEvent.click(screen.getByRole('button',{name:'Cena seguinte'}));
 expect(screen.getByRole('status')).toHaveTextContent('3 de 3 · Ação');
 fireEvent.click(screen.getByRole('button',{name:'Recomeçar ensaio'}));expect(screen.getByRole('status')).toHaveTextContent('1 de 3 · Gancho');
 fireEvent.click(screen.getByRole('button',{name:'Pausar ensaio'}));
 fireEvent.click(screen.getByRole('button',{name:'Cena seguinte'}));fireEvent.click(screen.getByRole('button',{name:'Cena seguinte'}));
 view.rerender(<PlanoGravacao variante={{...v,cenas:[v.cenas[0]]}} ppm={140} erro={erro}/>);
 expect(screen.getByRole('status')).toHaveTextContent('1 de 1 · Gancho');expect(screen.getByRole('button',{name:'Cena seguinte'})).toBeDisabled();expect(erro).not.toHaveBeenCalled();
});
it('um roteiro vazio não inicia ensaio nem exporta como plano completo',()=>{
 render(<PlanoGravacao variante={estruturaManual('hva','Ainda vazio')} ppm={140} erro={vi.fn()}/>);
 for(const name of ['Ensaiar sequência','Plano PDF','Plano TXT','Copiar plano'])expect(screen.getByRole('button',{name})).toBeDisabled();
});
