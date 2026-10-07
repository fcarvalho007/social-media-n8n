import {webcrypto} from 'node:crypto';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {useState} from 'react';
import {MateriaisGravacao} from '@/features/roteiros/MateriaisGravacao';
import {SeletorMateriais} from '@/features/roteiros/SeletorMateriais';
import {estruturaManual,validarDocumento,type VarianteRoteiro} from '../../supabase/functions/_shared/roteiros/modelo';
import {assinaturaMateriais,pendenciasMateriais} from '../../supabase/functions/_shared/roteiros/materiais';
import type {ApiMateriais} from '@/services/roteiros-materiais';
const guardar=vi.fn();const erro=vi.fn();
vi.mock('@/features/motor/GeradorKie',()=>({GeradorKie:({usar}:{usar:(chave:string,nome:string,obter:()=>Promise<string>)=>Promise<void>})=><button onClick={()=>void usar('proposta','Imagem IA',async()=> 'imagem-gerada')}>Receber proposta de imagem</button>}));
const api:ApiMateriais={local:true,listar:vi.fn().mockResolvedValue([]),ler:vi.fn().mockResolvedValue({}),escolher:vi.fn(),carregar:vi.fn()};
beforeAll(()=>vi.stubGlobal('crypto',webcrypto));
afterEach(()=>{cleanup();vi.clearAllMocks();});
function v(){const x=estruturaManual('hva','Ensaio');x.cenas.forEach(c=>{c.locucao='Fala que permanece no roteiro.';c.visual='Corte direto e texto no ecrã.';});return x;}
function Harness({inicial}:{inicial:VarianteRoteiro}){const [x,setX]=useState(inicial);return <MateriaisGravacao variante={x} ppm={140} projectId="projeto" api={api} onMudar={setX} onGuardar={async novo=>{await guardar(novo);setX(novo);}} erro={erro}/>;}
it('revê as escolhas, guarda por passagem e invalida a aprovação após mudar a edição',async()=>{
 render(<Harness inicial={v()}/>);
 expect(screen.getByRole('button',{name:'Exportar plano e materiais'})).toBeDisabled();
 for(const b of screen.getAllByRole('button',{name:'Só apresentador'}))fireEvent.click(b);
 const aprovar=screen.getByRole('button',{name:'Guardar e aprovar sequência'});await waitFor(()=>expect(aprovar).toBeEnabled());fireEvent.click(aprovar);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar plano e materiais'})).toBeEnabled());
 expect(guardar.mock.calls[0][0].cenas.every((c:any)=>c.apoio.tipo==='apresentador')).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Voltar às passagens'}));fireEvent.change(screen.getByLabelText('Instrução de edição · passagem 1'),{target:{value:'Agora outro corte.'}});
 await waitFor(()=>expect(screen.getByRole('button',{name:'Exportar plano e materiais'})).toBeDisabled());
});
it('a falha de gravação mantém exportação bloqueada e mostra o erro',async()=>{
 guardar.mockRejectedValueOnce(new Error('Conflito de versão'));const x=v();x.cenas.forEach(c=>c.apoio={tipo:'apresentador'});render(<Harness inicial={x}/>);
 await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar e aprovar sequência'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Guardar e aprovar sequência'}));
 await waitFor(()=>expect(erro).toHaveBeenCalledWith('Conflito de versão'));expect(screen.getByRole('button',{name:'Exportar plano e materiais'})).toBeDisabled();
});
it('abre biblioteca, carregamento e IA sem fazer geração paga',async()=>{
 render(<Harness inicial={v()}/>);fireEvent.click(screen.getAllByRole('button',{name:'Escolher imagem'})[0]);
 expect(await screen.findByRole('dialog')).toHaveTextContent('Imagem de apoio para esta passagem');expect(screen.getByRole('tab',{name:'Carregar'})).toBeInTheDocument();expect(screen.getByRole('tab',{name:'Gerar com IA'})).toBeInTheDocument();expect(api.listar).toHaveBeenCalledWith('projeto');
});
it('assinatura segue fala, ordem e imagens; rejeita URL arbitrária na definição de apoio',async()=>{
 const x=v();const s=await assinaturaMateriais(x,140);x.cenas.reverse();expect(await assinaturaMateriais(x,140)).not.toBe(s);
 expect(pendenciasMateriais(x)).toHaveLength(3);x.cenas[0].apoio={tipo:'imagem',asset_id:'https://arbitrario.example/img'};
 expect(validarDocumento({variantes:[x],selecionada:x.id})).toBe(false);
});

it('a revisão sobrevive à ordenação de chaves feita pelo JSONB do PostgreSQL',async()=>{
 const x=v();const id=crypto.randomUUID();x.cenas[0].apoio={tipo:'imagem',asset_id:id,nome:'Ficheiro'};const a=await assinaturaMateriais(x,140);
 x.cenas[0].apoio={nome:'Ficheiro',asset_id:id,tipo:'imagem'};expect(await assinaturaMateriais(x,140)).toBe(a);
});

it('receber uma imagem da IA não substitui o material até à escolha explícita',async()=>{
 const imagem={id:'imagem-gerada',mime:'image/png',largura:10,altura:10,dados:'AA==',nome:'Imagem IA'};
 const producao:ApiMateriais={...api,local:false,ler:vi.fn().mockResolvedValue({'imagem-gerada':imagem})};const escolher=vi.fn();
 render(<SeletorMateriais project="projeto" api={producao} prompt="Imagem de apoio" onEscolher={escolher} onFechar={vi.fn()}/>);
 fireEvent.mouseDown(screen.getByRole('tab',{name:'Gerar com IA'}),{button:0,ctrlKey:false});
 fireEvent.click(await screen.findByRole('button',{name:'Receber proposta de imagem'}));
 const usar=await screen.findByRole('button',{name:'Usar esta imagem gerada'});expect(escolher).not.toHaveBeenCalled();fireEvent.click(usar);expect(escolher).toHaveBeenCalledWith(imagem);
});
