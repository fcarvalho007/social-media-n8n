import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MotorSeo } from '../../scripts/seo/motor-local';
import { estruturaAtual, estimarTexto, promptEditorial } from '../../scripts/seo/editorial';
import type { DadosPautaEditorial, FonteEditorial, TextoEditorial } from '@/features/seo/contratos';
import { conhecimentoVazio, guiaInicial, sugerirConhecimento, verificarArtigo } from '@/features/seo/sequencia';

const agora = new Date('2026-10-18T12:00:00Z');
const fonte: FonteEditorial = { id: 'f1', titulo: 'Procedimento de SMS marketing', url: 'https://example.com/guia', excerto: 'A preparação de uma campanha exige definir objetivo, segmentação, mensagem e forma de medição. Usar exemplos hipotéticos claramente identificados. '.repeat(3), aprovada: true, verificadaEm: agora.toISOString() };
const estrutura = { pergunta: 'Como preparar uma campanha de SMS marketing?', titulo: 'Preparar uma campanha de SMS marketing', secoes: [{ titulo: 'Definir um objetivo', pontos: 'Relacionar o objetivo com a necessidade da empresa e com o público.', fonteIds: ['f1'] }, { titulo: 'Preparar a campanha', pontos: 'Definir a mensagem e os critérios de medição antes de enviar.', fonteIds: ['f1'] }], alertas: [] };
const texto: TextoEditorial = { titulo: estrutura.titulo, resumo: 'Um guia prático para preparar a sua campanha de comunicação.', slug: 'campanha-sms-marketing', corpo: '## Definir um objetivo\n\n' + fonte.excerto + '[fonte:f1]\n\n## Preparar a campanha\n\nRelacionar a mensagem com o contexto da empresa e do destinatário. Exemplo hipotético: uma loja prepara um lembrete para um serviço que o cliente pediu.', afirmacoes: [{ trecho: 'A preparação de uma campanha exige definir objetivo, segmentação, mensagem e forma de medição.', fonteIds: ['f1'] }], alertas: [] };
const pauta = (v: Partial<DadosPautaEditorial> = {}): DadosPautaEditorial => ({ versao: 0, siteId: 'sms', titulo: estrutura.titulo, palavra: 'sms marketing', origem: 'topico', contributo: 'Explicar o processo com uma checklist de decisões e um exemplo hipotético aplicado a uma pequena empresa.', objetivo: 'Preparar uma campanha útil.', cta: 'Pedir uma avaliação do contexto da empresa.', fontes: [fonte], dataPretendida: '', pesquisaId: null, producaoAutomaticaAutorizada: true, texto: null, guia: { ...guiaInicial }, ...v });
const motores: MotorSeo[] = [];
function resposta(conteudo: unknown) { return new Response(JSON.stringify({ model: 'deepseek-flash', usage: { prompt_tokens: 500, completion_tokens: 1000 }, choices: [{ message: { content: JSON.stringify(conteudo) } }] })); }
async function novo(f: typeof fetch = vi.fn(async () => resposta(estrutura)) as typeof fetch) {
  const m = new MotorSeo(await mkdtemp(path.join(tmpdir(), 'hub-sequencia-')), () => ({ deepseek: 'teste', login: 'teste', password: 'teste' }), f, () => agora); motores.push(m); await m.iniciar(); await m.repo.alterar(e => { e.configuracao.pausado = false; e.configuracao.automacaoPausada = false; }); return m;
}
afterEach(async () => { await Promise.all(motores.splice(0).map(m => m.fechar())); });
async function politica(m: MotorSeo, sequenciaCompleta: boolean) { const s = (await m.estado()).sites[0]; return m.guardarPolitica(s.id, { ...s.politica, ativa: true, producao: 'automatica', sequenciaCompleta, dias: [0], hora: '00:00' }, s.politica.revista); }

describe('sequência editorial com custos e preservação', () => {
  it('separa o orçamento da estrutura e bloqueia redação prematura', async () => {
    const m = await novo(), p = await m.guardarPauta(pauta());
    const q = await m.orcamentarTexto(p.id, false, 'estrutura'), textoQ = await m.orcamentarTexto(p.id);
    expect(q.tipo).toBe('estrutura'); expect(q.linhas[1].quantidade).toBe(1800); expect(textoQ.linhas[1].quantidade).toBe(4000); expect(textoQ.bloqueios.join()).toContain('estrutura');
  });
  it('a proposta manual de estrutura não substitui o plano nem o texto', async () => {
    const f = vi.fn(async () => resposta(estrutura)) as typeof fetch, m = await novo(f), p = await m.guardarPauta(pauta({ texto }));
    const q = await m.orcamentarTexto(p.id, false, 'estrutura'), r = await m.executar(q.id, true); await m.aguardar(r.id);
    const fim = (await m.estado()).pautas[0]; expect(fim.estrutura).toBeNull(); expect(fim.propostaEstrutura?.conteudo).toEqual(estrutura); expect(fim.texto).toEqual(texto); expect((await m.estado()).pedidos[0].custoOrigem).toBe('tokens');
    await expect(m.orcamentarTexto(p.id, false, 'estrutura')).rejects.toThrow('proposta');
  });
  it('alterar o brief ou o conhecimento invalida a estrutura confirmada', async () => {
    const m = await novo(), p = await m.guardarPauta(pauta()), confirmado = await m.confirmarEstrutura(p.id, p.versao, estrutura, true), s = (await m.estado()).sites[0];
    expect(estruturaAtual(confirmado, s)).toBe(true);
    const editado = await m.guardarPauta({ ...pauta(), id: p.id, versao: confirmado.versao, guia: { ...guiaInicial, formato: 'tutorial' } }); expect(estruturaAtual(editado, s)).toBe(false);
    const novoPlano = await m.confirmarEstrutura(p.id, editado.versao, estrutura, true); await m.guardarConhecimento(s.id, { ...conhecimentoVazio(), instrucoes: 'Escrever para equipas pequenas.' });
    expect(estruturaAtual(novoPlano, (await m.estado()).sites[0])).toBe(false);
  });
  it('não confirma uma estrutura com lacunas ou fontes desconhecidas', async () => {
    const m = await novo(), p = await m.guardarPauta(pauta());
    await expect(m.confirmarEstrutura(p.id, p.versao, estrutura, false)).rejects.toThrow('Confirma');
    await expect(m.confirmarEstrutura(p.id, p.versao, { ...estrutura, alertas: ['Falta evidência.'] }, true)).rejects.toThrow('evidência');
    await expect(m.confirmarEstrutura(p.id, p.versao, { ...estrutura, secoes: estrutura.secoes.map(x => ({ ...x, fonteIds: ['inexistente'] })) }, true)).rejects.toThrow('fontes aprovadas');
  });
  it('as políticas antigas não passam a fazer duas chamadas sem autorização', async () => {
    const f = vi.fn() as typeof fetch, m = await novo(f); await m.guardarPauta(pauta()); await politica(m, false); await m.executarCiclo();
    expect(f).not.toHaveBeenCalled(); expect((await m.estado()).slots[0].detalhe).toContain('sequência completa');
  });
  it('a sequência autorizada faz estrutura e texto uma única vez, com dois registos', async () => {
    const f = vi.fn(async (_url, init) => { const b = JSON.parse(String(init?.body)); return resposta(b.messages[0].content.includes('APENAS a estrutura') ? estrutura : texto); }) as typeof fetch;
    const m = await novo(f); await m.guardarPauta(pauta()); await politica(m, true); await m.executarCiclo(); await m.executarCiclo();
    const e = await m.estado(); expect(f).toHaveBeenCalledTimes(2); expect(e.pedidos.map(p => p.tipo)).toEqual(['estrutura', 'texto']); expect(e.pedidos.every(p => p.custoMicro === 675 && p.reservaMicro === 0)).toBe(true); expect(e.pautas[0].estado).toBe('aguarda_revisao'); expect(e.pautas[0].estruturaAtual).toBe(true); expect(e.slots).toHaveLength(1);
  });
  it('uma estrutura com lacuna interrompe a sequência antes de pagar redação', async () => {
    const f = vi.fn(async () => resposta({ ...estrutura, alertas: ['Falta um exemplo sustentado.'] })) as typeof fetch, m = await novo(f); await m.guardarPauta(pauta()); await politica(m, true); await m.executarCiclo();
    expect(f).toHaveBeenCalledTimes(1); const e = await m.estado(); expect(e.pautas[0].texto).toBeNull(); expect(e.pautas[0].propostaEstrutura).toBeTruthy(); expect(e.slots[0].estado).toBe('bloqueado');
  });
  it('cada etapa volta a verificar o limite antes de gastar', async () => {
    const f = vi.fn(async () => resposta(estrutura)) as typeof fetch, m = await novo(f), p = await m.guardarPauta(pauta()); await politica(m, true);
    const e = await m.estado(), maximo = estimarTexto(p, e.sites[0], 'estrutura').total;
    await m.repo.alterar(e => { e.configuracao.pedidoMicro = maximo; e.sites[0].politica.pedidoMicro = maximo; }); await m.executarCiclo();
    expect(f).toHaveBeenCalledTimes(1); expect((await m.estado()).slots[0].detalhe).toContain('limite por pedido');
  });
  it('não substitui uma estrutura humana na cadência automática', async () => {
    const f = vi.fn() as typeof fetch, m = await novo(f), p = await m.guardarPauta(pauta()); await m.confirmarEstrutura(p.id, p.versao, estrutura, true); await politica(m, true); await m.executarCiclo();
    expect(f).not.toHaveBeenCalled(); expect((await m.estado()).pautas[0].estrutura?.origem).toBe('humana');
  });
});

describe('conhecimento por marca, arquivo e revisão', () => {
  it('apenas fontes aprovadas e com correspondência são reutilizadas', async () => {
    const m = await novo(), s = (await m.estado()).sites[0];
    await m.guardarConhecimento(s.id, { ...conhecimentoVazio(), referencias: [{ ...fonte, id: 'aprovada' }, { ...fonte, id: 'nao', aprovada: false }] });
    const site = (await m.estado()).sites[0]; expect(sugerirConhecimento(pauta(), site).fontes.map(f => f.id)).toEqual(['aprovada']); expect(sugerirConhecimento({ titulo: 'Receita de bacalhau', palavra: 'bacalhau' }, site).fontes).toEqual([]);
    const p = await m.guardarPauta(pauta({ fontes: [] })), alterado = await m.usarConhecimento(p.id, p.versao); expect(alterado.fontes).toHaveLength(1); expect(alterado.fontes[0].id).toBe('marca-aprovada'); await expect(m.usarConhecimento(p.id, p.versao)).rejects.toThrow('mudou');
  });
  it('recusa inventário de outro domínio, parâmetros e páginas de acesso', async () => {
    const m = await novo(); for (const url of ['https://evil.example/artigo', 'https://smsonline.pt/wp-admin/', 'https://smsonline.pt/artigo?token=segredo']) await expect(m.guardarConhecimento('sms', { ...conhecimentoVazio(), paginas: [{ id: 'p1', titulo: 'Página existente', tema: 'SMS marketing', keyword: 'sms marketing', url, tipo: 'artigo', aprovada: false, verificadaEm: '' }] })).rejects.toThrow('inventário');
  });
  it('impede revisão concorrente do conhecimento e mantém o destino pessoal', async () => {
    const m = await novo(); await m.guardarConhecimento('frederico', { ...conhecimentoVazio(), instrucoes: 'Só experiência autorizada.' });
    await expect(m.guardarConhecimento('frederico', conhecimentoVazio())).rejects.toThrow('mudou'); const s = (await m.estado()).sites.find(s => s.id === 'frederico')!; expect(s.revisaoObrigatoria).toBe(true); expect(s.politica.publicacao).toBe('humana');
  });
  it('o prompt usa formato, estrutura, vocabulário e páginas só desta marca', async () => {
    const m = await novo(), p = await m.guardarPauta(pauta()), e = await m.estado(), s = e.sites[0]; s.conhecimento = { ...conhecimentoVazio(), instrucoes: 'Usar linguagem concreta.', evitar: ['revolucionário'], paginas: [{ id: 'p1', titulo: 'Exemplos SMS marketing', tema: 'SMS marketing para empresas', url: 'https://smsonline.pt/exemplos/', tipo: 'recurso', keyword: '', aprovada: true, verificadaEm: agora.toISOString() }] };
    const prompt = promptEditorial(p, s), dados = JSON.parse(prompt.utilizador); expect(dados.marca.instrucoes).toContain('concreta'); expect(dados.artigo.guia.formato).toBe('guia'); expect(dados.ligacoesInternas[0].url).toBe('https://smsonline.pt/exemplos/'); expect(prompt.sistema).toContain('Não inventes URLs');
  });
  it('deteta a keyword existente e permite preparar atualização para a URL aprovada', async () => {
    const m = await novo(), p = await m.guardarPauta(pauta({ texto })), s = (await m.estado()).sites[0]; s.conhecimento = { ...conhecimentoVazio(), paginas: [{ id: 'p1', titulo: texto.titulo, tema: 'SMS marketing', keyword: p.palavra, tipo: 'artigo', url: 'https://smsonline.pt/campanha/', aprovada: true, verificadaEm: agora.toISOString() }] };
    expect(verificarArtigo(p, s).find(v => v.id === 'arquivo')?.nivel).toBe('bloqueio'); p.guia = { ...guiaInicial, acao: 'atualizar', urlExistente: 'https://smsonline.pt/campanha/' }; expect(verificarArtigo(p, s).filter(v => ['arquivo', 'atualizar'].includes(v.id)).every(v => v.nivel === 'ok')).toBe(true);
  });
  it('bloqueia HTML e ligações internas inventadas antes da aprovação', async () => {
    const m = await novo(), p = await m.guardarPauta(pauta({ texto: { ...texto, corpo: texto.corpo + '\n\n[Oferta](https://smsonline.pt/inventada/) <script>alert(1)</script>' } }));
    await expect(m.aprovar(p.id, p.versao, true)).rejects.toThrow('HTML'); const v = verificarArtigo(p, (await m.estado()).sites[0]); expect(v.find(x => x.id === 'links')?.nivel).toBe('bloqueio');
  });
  it('interrompe antes de pagar se já existir uma página aprovada para a keyword', async () => {
    const f=vi.fn() as typeof fetch,m=await novo(f),p=await m.guardarPauta(pauta());
    await m.guardarConhecimento('sms',{...conhecimentoVazio(),paginas:[{id:'existente',titulo:p.titulo,tema:'SMS marketing para empresas',keyword:p.palavra,url:'https://smsonline.pt/campanha/',tipo:'artigo',aprovada:true,verificadaEm:agora.toISOString()}]});
    const q=await m.orcamentarTexto(p.id,false,'estrutura');expect(q.bloqueios.join()).toContain('Já existe conteúdo');await expect(m.executar(q.id,true)).rejects.toThrow('Já existe conteúdo');expect(f).not.toHaveBeenCalled();
  });
  it('ligações externas desconhecidas impedem aprovação',async()=>{
    const m=await novo(),p=await m.guardarPauta(pauta({texto:{...texto,corpo:texto.corpo+'\n\n[Estudo inventado](https://inexistente.example/estudo)'}}));await expect(m.aprovar(p.id,p.versao,true)).rejects.toThrow('ligações externas');
  });
  it('retirar a pesquisa de demonstração não converte a pauta em origem real', async () => {
    const m = await novo(), q = await m.orcamentarPesquisa({ siteId: 'sms', operacao: 'sugestoes', mercado: 'PT', termos: ['sms marketing'], dominio: '', concorrente: '', limite: 20, modo: 'exemplo', renovar: false }), r = await m.executar(q.id, true); await m.aguardar(r.id);
    const id = (await m.estado()).pedidos[0].resultadoId!, [p] = await m.planear(id, ['sms marketing'], 'sms'), alterado = await m.guardarPauta({ ...pauta(), id: p.id, versao: p.versao, pesquisaId: null });
    expect(alterado.modoOrigem).toBe('exemplo'); expect((await m.orcamentarTexto(p.id, false, 'estrutura')).bloqueios.join()).toContain('demonstração');
  });
});

describe('sequência na nuvem por etapas persistidas',()=>{
 it('faz uma chamada por execução e não repete fases concluídas',async()=>{
  const f=vi.fn(async(_url,init)=>{const b=JSON.parse(String(init?.body));return resposta(b.messages[0].content.includes('APENAS a estrutura')?estrutura:texto);})as typeof fetch,m=await novo(f);await m.guardarPauta(pauta());await politica(m,true);
  await m.executarEtapaCiclo();expect(f).toHaveBeenCalledTimes(1);expect((await m.estado()).slots[0].estado).toBe('a_preparar_texto');expect((await m.estado()).pautas[0].texto).toBeNull();
  await m.executarEtapaCiclo();expect(f).toHaveBeenCalledTimes(2);await m.executarEtapaCiclo();expect(f).toHaveBeenCalledTimes(2);const e=await m.estado();expect(e.slots[0].estado).toBe('terminado');expect(e.pedidos.map(p=>p.tipo)).toEqual(['estrutura','texto']);expect(e.pautas[0].estado).toBe('aguarda_revisao');
 });
 it('uma pausa entre etapas impede a redação sem perder a estrutura',async()=>{
  const f=vi.fn(async()=>resposta(estrutura))as typeof fetch,m=await novo(f);await m.guardarPauta(pauta());await politica(m,true);await m.executarEtapaCiclo();await m.pausar();await m.executarEtapaCiclo();expect(f).toHaveBeenCalledTimes(1);expect((await m.estado()).pautas[0].estruturaAtual).toBe(true);
 });
});
