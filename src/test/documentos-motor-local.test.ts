// @vitest-environment node
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { mkdtemp,readFile,rm,writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import type { FonteDocumento,TarefaDocumentos } from '@/features/documentos/contratos';
vi.mock('../../scripts/documentos/obter',async()=>({...await vi.importActual('../../scripts/documentos/obter'),obterPublico:vi.fn()}));
vi.mock('../../scripts/documentos/robots',()=>({Robots:class{async verificar(){}},ErroRobots:class extends Error{}}));
import { obterPublico } from '../../scripts/documentos/obter';
import { MotorDocumentos } from '../../scripts/documentos/motor-local';

let pasta:string;
const fonte=(id=1):FonteDocumento=>({id,name:`Fonte ${id}`,url:`https://fonte${id}.example.org/research`,alternative_urls:[],group_category:'labs_ia',region:'international',priority:'high',active:false,tags:[],display_order:id});
async function terminar(j:TarefaDocumentos){const fim=Date.now()+5000;while(j.estado==='em_curso'&&Date.now()<fim)await new Promise(r=>setTimeout(r,5));expect(j.estado).toBe('concluida');}
beforeEach(async()=>{
  pasta=await mkdtemp(path.join(os.tmpdir(),'hub-documentos-test-'));vi.mocked(obterPublico).mockReset();
  vi.mocked(obterPublico).mockImplementation(async url=>({url,tipo:url.includes('/download')?'application/pdf':'text/html',status:200,bytes:Buffer.from(url.includes('/download')?`%PDF-1.7\n${url}`:'<article><h2>Um relatório sobre IA e organizações</h2><a href="/download">Descarregar PDF</a></article>')}));
});
afterEach(async()=>{await rm(pasta,{recursive:true,force:true});});
describe('recolha local durável: prova, limites e recuperação',()=>{
  it('um clique descarrega em disco mas não finge que o texto e a capa já foram extraídos',async()=>{
    const motor=new MotorDocumentos(pasta,[fonte()]);const j=await motor.iniciar('projeto-a',[1],'recolher');await motor.aguardar(j.id,j.ambito);await terminar(j);
    expect(j.pdfs).toHaveLength(1);expect(j.pdfs[0].estado).toBe('descarregado');expect(j.pdfs[0].capaCriada).toBeUndefined();
    expect((await motor.binario(j.id,'projeto-a',j.pdfs[0].hash)).toString()).toContain('%PDF-');
    await motor.confirmar(j.id,'projeto-a',j.pdfs[0].hash,'doc-local',undefined,true);
    expect(JSON.parse(await readFile(path.join(pasta,`tarefa-${j.id}.json`),'utf8')).pdfs[0]).toMatchObject({estado:'guardado',capaCriada:true,documentoId:'doc-local'});
  });
  it('o diagnóstico encontra candidatos sem descarregar os binários',async()=>{
    const motor=new MotorDocumentos(pasta,[fonte()]);const j=await motor.iniciar('a',[1],'diagnostico');await motor.aguardar(j.id,j.ambito);await terminar(j);expect(j.descobertas.some(d=>d.tipo==='pdf')).toBe(true);expect(j.pdfs).toHaveLength(0);expect(obterPublico).toHaveBeenCalledTimes(1);
  });
  it('os resultados e ficheiros não atravessam projetos, nem permitem caminhos arbitrários',async()=>{
    const motor=new MotorDocumentos(pasta,[fonte()]);const j=await motor.iniciar('a',[1],'recolher');await motor.aguardar(j.id,j.ambito);await terminar(j);
    expect(await motor.listar('b')).toEqual([]);await expect(motor.binario(j.id,'b',j.pdfs[0].hash)).rejects.toThrow('projeto');await expect(motor.binario(j.id,'a','../../segredo')).rejects.toThrow('não encontrado');
  });
  it('um reinício transforma uma tarefa incompleta em retomável e conserva o cursor por fonte',async()=>{
    const motor=new MotorDocumentos(pasta,[fonte(1),fonte(2)]);await motor.listar('a');
    const id=randomUUID();const j:TarefaDocumentos={id,ambito:'a',modo:'diagnostico',estado:'em_curso',iniciadaEm:new Date().toISOString(),atual:'página',total:2,fontes:[{fonteId:1,nome:'Fonte 1',url:fonte(1).url,estado:'concluida',paginas:1,pdfs:0,novidades:0,detalhes:[]},{fonteId:2,nome:'Fonte 2',url:fonte(2).url,estado:'a_consultar',paginas:0,pdfs:0,novidades:0,detalhes:[]}],descobertas:[],pdfs:[],erros:[]};
    await writeFile(path.join(pasta,`tarefa-${id}.json`),JSON.stringify(j));const novo=new MotorDocumentos(pasta,[fonte(1),fonte(2)]);
    expect((await novo.ler(id,'a')).estado).toBe('interrompida');const r=await novo.retomar(id,'a');await novo.aguardar(r.id,r.ambito);await terminar(r);
    expect(vi.mocked(obterPublico).mock.calls.every(([url])=>url.includes('fonte2'))).toBe(true);expect(r.fontes[0].paginas).toBe(1);
  });
  it('a repetição de uma ligação é marcada como já detetada, não como publicação de hoje',async()=>{
    const motor=new MotorDocumentos(pasta,[fonte()]);const a=await motor.iniciar('a',[1],'diagnostico');await motor.aguardar(a.id,a.ambito);await terminar(a);const b=await motor.iniciar('a',[1],'diagnostico');await motor.aguardar(b.id,b.ambito);await terminar(b);
    expect(b.descobertas[0].nova).toBe(false);expect(b.descobertas[0].publicadoEm).toBeNull();
  });
  it('fontes inválidas/internas são reportadas sem qualquer pedido de rede',async()=>{
    const motor=new MotorDocumentos(pasta,[{...fonte(),url:'[REDACTED_INTERNAL_URL]'}]);const j=await motor.iniciar('a',[1],'recolher');await motor.aguardar(j.id,j.ambito);await terminar(j);expect(j.fontes[0].estado).toBe('bloqueada');expect(obterPublico).not.toHaveBeenCalled();
  });
  it('não descarrega HTML disfarçado de PDF nem apresenta erro como zero resultados bem sucedidos',async()=>{
    vi.mocked(obterPublico).mockImplementation(async url=>({url,tipo:'text/html',status:200,bytes:Buffer.from(url.includes('/download')?'<html>Login</html>':'<a href="/download">Download PDF</a>')}));
    const motor=new MotorDocumentos(pasta,[fonte()]);const j=await motor.iniciar('a',[1],'recolher');await motor.aguardar(j.id,j.ambito);await terminar(j);expect(j.pdfs).toHaveLength(0);expect(j.fontes[0].estado).toBe('limitada');expect(j.fontes[0].detalhes.join(' ')).toContain('não é um PDF');
  });
  it('os limites globais de descarga são respeitados mesmo com três fontes concorrentes',async()=>{
    vi.mocked(obterPublico).mockImplementation(async url=>({url,tipo:url.includes('/download')?'application/pdf':'text/html',status:200,bytes:Buffer.from(url.includes('/download')?`%PDF-1.7\n${url}`:'<a href="/download/1">PDF 1</a><a href="/download/2">PDF 2</a><a href="/download/3">PDF 3</a><a href="/download/4">PDF 4</a>')}));
    const fontes=[1,2,3,4,5].map(fonte);const motor=new MotorDocumentos(pasta,fontes);const j=await motor.iniciar('a',fontes.map(f=>f.id),'recolher');await motor.aguardar(j.id,j.ambito);await terminar(j);expect(j.pdfs).toHaveLength(12);
  });
  it('uma ligação que falha não gasta um lugar entre os três PDFs que podem ser guardados',async()=>{
    vi.mocked(obterPublico).mockImplementation(async url=>({url,tipo:'text/html',status:200,bytes:Buffer.from(url.includes('/download/bad')?'<html>Login</html>':url.includes('/download/')?`%PDF-1.7\n${url}`:'<a href="/download/bad">PDF 1</a><a href="/download/bad2">PDF 2</a><a href="/download/ok1">PDF 3</a><a href="/download/ok2">PDF 4</a>')}));
    const motor=new MotorDocumentos(pasta,[fonte()]);const j=await motor.iniciar('a',[1],'recolher');await motor.aguardar(j.id,'a');expect(j.pdfs).toHaveLength(2);expect(j.fontes[0].estado).toBe('limitada');
  });
  it('as recolhas seguintes dão prioridade aos candidatos ainda não descarregados',async()=>{
    vi.mocked(obterPublico).mockImplementation(async url=>({url,tipo:url.includes('/download')?'application/pdf':'text/html',status:200,bytes:Buffer.from(url.includes('/download')?`%PDF-1.7\n${url}`:'<a href="/download/1">PDF 1</a><a href="/download/2">PDF 2</a><a href="/download/3">PDF 3</a><a href="/download/4">PDF 4</a>')}));
    const motor=new MotorDocumentos(pasta,[fonte()]);const a=await motor.iniciar('a',[1],'recolher');await motor.aguardar(a.id,'a');expect(a.pdfs.some(p=>p.url.endsWith('/4'))).toBe(false);
    const b=await motor.iniciar('a',[1],'recolher');await motor.aguardar(b.id,'a');expect(b.pdfs[0].url).toContain('/download/4');
  });
});

it('só descarrega o candidato escolhido e conserva a decisão após reiniciar',async()=>{
 const m=new MotorDocumentos(pasta,[fonte()]),j=await m.iniciar('a',[1],'diagnostico');await m.aguardar(j.id,'a');const d=j.descobertas[0];expect(j.pdfs).toHaveLength(0);
 await m.decidir(j.id,'a',d.url,'ignorar');expect((await new MotorDocumentos(pasta,[fonte()]).ler(j.id,'a')).descobertas[0].decisao).toBe('ignorado');
 const p=await m.descarregarCandidato(j.id,'a',d.url);expect(p.estado).toBe('descarregado');expect(p.categoria).toBe('labs_ia');expect(j.descobertas[0].decisao).toBeUndefined();
 await expect(m.descarregarCandidato(j.id,'b',d.url)).rejects.toThrow('projeto');await expect(m.descarregarCandidato(j.id,'a','https://other.example/x.pdf')).rejects.toThrow('não pertence');
});
it('remove candidatos de todas as pesquisas do projeto sem apagar ficheiros partilhados com outro projeto',async()=>{
 const m=new MotorDocumentos(pasta,[fonte()]);const a=await m.iniciar('a',[1],'recolher');await m.aguardar(a.id,'a');const b=await m.iniciar('b',[1],'recolher');await m.aguardar(b.id,'b');const d=a.descobertas[0],hash=a.pdfs[0].hash;
 const repetida=await m.iniciar('a',[1],'diagnostico');await m.aguardar(repetida.id,'a');await m.decidir(repetida.id,'a',d.url,'remover');expect((await m.ler(a.id,'a')).descobertas).toHaveLength(0);expect(await m.binario(b.id,'b',hash)).toBeInstanceOf(Buffer);
 await m.esquecerDocumento('b',hash);await expect(readFile(path.join(pasta,'pdfs',`${hash}.pdf`))).rejects.toMatchObject({code:'ENOENT'});
});
it('recusa eliminar um resultado que já representa um documento na biblioteca',async()=>{
 const m=new MotorDocumentos(pasta,[fonte()]),j=await m.iniciar('a',[1],'recolher');await m.aguardar(j.id,'a');await m.confirmar(j.id,'a',j.pdfs[0].hash,'documento');await expect(m.decidir(j.id,'a',j.descobertas[0].url,'remover')).rejects.toThrow('biblioteca');expect(j.pdfs).toHaveLength(1);
});
