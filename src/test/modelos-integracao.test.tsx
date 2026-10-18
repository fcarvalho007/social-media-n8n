import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
const h=vi.hoisted(()=>({error:null as Error|null,refetch:vi.fn()}));
vi.mock('@/hooks/useTemplates',()=>({useTemplates:()=>({templates:[],isLoading:false,isFetching:false,error:h.error,refetch:h.refetch,deleteTemplate:{mutate:vi.fn(),isPending:false}})}));
import Templates from '@/pages/Templates';
import {migalhasNavegacao} from '@/lib/navegacao';
beforeEach(()=>{h.error=null;h.refetch.mockClear();});afterEach(cleanup);
describe('modelos dentro da estrutura do Hub',()=>{
 it('reutiliza a área principal do Hub sem introduzir outro cabeçalho ou landmark',()=>{
  render(<main><Templates/></main>);expect(screen.getAllByRole('main')).toHaveLength(1);
  expect(screen.getByRole('heading',{level:1,name:'Modelos de projeto'})).toBeInTheDocument();
  expect(screen.queryByRole('navigation',{name:'Localização atual'})).not.toBeInTheDocument();
  expect(migalhasNavegacao('/templates').map(m=>m.label)).toEqual(['Início','Projetos','Modelos de projeto']);
 });
 it('uma falha da lista tem recuperação em vez de parecer ausência de modelos',()=>{
  h.error=new Error('offline');render(<Templates/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os modelos');
  fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));expect(h.refetch).toHaveBeenCalledOnce();
 });
});
