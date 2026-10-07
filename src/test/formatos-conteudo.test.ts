import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'opentype.js';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { criarMedidor, paginaParaSvg, validarPacote, transbordos, type FonteOT, type Familia, type Peso } from '../../supabase/functions/_shared/documento-grafico/nucleo';
import { formatoConteudo } from '../../supabase/functions/_shared/documento-grafico/formatos';
import { comporDocumentos, normalizarFonte, estruturarSemIa, validarRespostaModelo, paraPacote } from '../../supabase/functions/_shared/motor/proposta';
import { linhaRascunho } from '../../supabase/functions/_shared/motor/exportacao';
import { promptSistema } from '../../supabase/functions/_shared/motor/gateway.server';
import { estadoInicial, reduzir, inserirSlide } from '@/features/editor-grafico/estado';
import { alinharNaPagina, encaixar } from '@/features/editor-grafico/operacoes';
import { aplicarSistema, PALETAS, sistemaPadrao } from '../../supabase/functions/_shared/motor/sistema';
import { ESTILOS } from '../../supabase/functions/_shared/motor/estilos';
import { FICHEIROS_EXTRA } from '@/features/editor-grafico/fontes';
const ler = (f: string) => { const b = readFileSync(`public${f}`); return parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer) as unknown as FonteOT; };
const extras: Partial<Record<Familia, Partial<Record<Peso, FonteOT>>>> = {};
for (const [fam, pesos] of Object.entries(FICHEIROS_EXTRA)) for (const [p, f] of Object.entries(pesos ?? {})) (extras[fam as Familia] ??= {})[Number(p) as Peso] = ler(f as string);
const m = criarMedidor({ 400: ler('/fontes/WorkSans-Regular.ttf'), 700: ler('/fontes/WorkSans-Bold.ttf') }, extras);
const f = normalizarFonte('Uma biblioteca abriu uma sala de leitura. A sala tem quarenta lugares.\n\nA biblioteca funciona de segunda a sábado e empresta livros.');
const citacao = { titulo: 'Fonte de teste', url: 'https://example.com/noticia' };
const marca = { cor: '#334155', origem: 'projeto' as const };
function trabalho(formato: 'post' | 'story' | 'carrossel' = 'story') { const p = estruturarSemIa(f, { formato, titulo: 'Uma sala para ler', slides: formato === 'carrossel' ? 3 : 1 }, citacao, marca); return { p, pacote: paraPacote('local-fixture', p.titulo, p, comporDocumentos(p, f.paragrafos)) }; }

describe('contrato de conteúdo estático, editor e exportação', () => {
  it('mantém os documentos antigos e recusa formatos/dimensões incoerentes', () => {
    expect(formatoConteudo(undefined)).toBe('carrossel');
    expect(() => formatoConteudo('video')).toThrow();
    const { pacote } = trabalho(); expect(validarPacote(pacote, { real: true }).variantes.A.altura).toBe(1920);
    const wrong = structuredClone(pacote); wrong.variantes.A.altura = 1350;
    expect(() => validarPacote(wrong, { real: true })).toThrow('1080×1920');
    const duplicate = structuredClone(pacote); duplicate.variantes.A.paginas.push(duplicate.variantes.A.paginas[0]);
    expect(() => validarPacote(duplicate, { real: true })).toThrow('uma página');
    const carousel = trabalho('carrossel'); expect(carousel.pacote.variantes.A.formato).toBeUndefined();
    expect(validarPacote(carousel.pacote, { real: true }).variantes.A.altura).toBe(1350);
  });
  it('estrutura uma peça autónoma sem inventar factos, com fonte e referência', () => {
    for (const formato of ['post', 'story'] as const) {
      const { p, pacote } = trabalho(formato);
      expect(p.slides).toHaveLength(1); expect(p.slides[0].fontes).toEqual([1]); expect(f.texto).toContain(p.slides[0].texto);
      expect(transbordos(pacote, 'A', m)).toHaveLength(0);
      expect(pacote.variantes.A.paginas[0].camadas.some((c) => c.id === 'num')).toBe(false);
    }
    expect(promptSistema(null, null, false, null, 'story')).toContain('Exatamente UMA');
    const one = { titulo: 'Notícia', slides: [{ papel: 'capa', titulo: 'Sala nova', texto: 'Quarenta lugares', fontes: [1] }], legenda: 'Uma notícia da biblioteca.' };
    expect(validarRespostaModelo(JSON.stringify(one), f, 1, 'story').slides).toHaveLength(1);
    expect(() => validarRespostaModelo(JSON.stringify(one), f, 1)).toThrow();
    expect(() => validarRespostaModelo(JSON.stringify({ ...one, slides: [one.slides[0], one.slides[0]] }), f, 1, 'post')).toThrow();
    expect(() => validarRespostaModelo(JSON.stringify({ ...one, slides: [{ ...one.slides[0], fontes: [99] }] }), f, 1, 'post')).toThrow();
  });
  it('editor usa altura real para encaixar/alinha e bloqueia páginas adicionais', () => {
    const { pacote } = trabalho(); const d = pacote.variantes.A;
    const c = d.paginas[0].camadas[0];
    expect(alinharNaPagina(c, 'base', d).y).toBe(1920 - c.h);
    expect(encaixar(0, 1908, 100, 12, [], 10, d).y).toBe(1908);
    expect(inserirSlide(pacote, 'A', 0, 'texto')).toBeNull();
    expect(reduzir(estadoInicial(pacote), { tipo: 'duplicarPagina', indice: 0 }).pacote.variantes.A.paginas).toHaveLength(1);
    const e = reduzir(estadoInicial(pacote), { tipo: 'adicionarImagem', asset: { id: 'a', mime: 'image/png', largura: 100, altura: 100, dados: 'a' }, nome: 'Fundo', modo: 'fundo' });
    expect(e.pacote.variantes.A.paginas[0].camadas.find((c) => c.tipo === 'imagem')?.h).toBe(1920);
  });
  it('os seis modelos preservam o formato e texto do story sem transbordo', () => {
    const { pacote } = trabalho();
    for (const estilo of ESTILOS) {
      const out = aplicarSistema(pacote, { ...sistemaPadrao(1, estilo.id), imagens: 'manual' }, m, undefined, {}, { ajustes: 'recriar' });
      expect(out.pacote.variantes.A.altura).toBe(1920); expect(out.pacote.conteudo).toEqual(pacote.conteudo);
      expect(out.recusadas, estilo.id).toHaveLength(0);
      expect(transbordos(out.pacote, 'A', m), estilo.id).toHaveLength(0);
    }
  });
  it('renderiza PNG verdadeiro com as mesmas dimensões do documento', async () => {
    const wasm = readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm');
    await initWasm(wasm).catch((e: Error) => { if (!/already/i.test(e.message)) throw e; });
    for (const formato of ['post', 'story'] as const) {
      const { pacote } = trabalho(formato); const svg = paginaParaSvg(pacote, 'A', 0, m);
      const b = new Resvg(svg).render().asPng(); const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
      expect(v.getUint32(16)).toBe(1080); expect(v.getUint32(20)).toBe(formato === 'story' ? 1920 : 1350);
    }
  });
  it('handoff prepara só o formato/destino certo; story e post não precisam de PDF', () => {
    const args = { id: 'draft', userId: 'u', projectId: 'p', pngs: ['https://example.com/imagem.png'], trabalhoId: 't', documentoId: 'd', variante: 'A' as const, versao: 1, propostaVersao: 1 };
    const story = linhaRascunho({ ...args, proposta: trabalho().p });
    expect(story.formats).toEqual(['instagram_stories']); expect(story.publish_immediately).toBe(false); expect(story.origem).not.toHaveProperty('pdf_url');
    const post = linhaRascunho({ ...args, proposta: trabalho('post').p });
    expect(post.formats).toEqual(['instagram_image', 'linkedin_post']);
    expect(() => linhaRascunho({ ...args, pngs: ['a', 'b'], proposta: trabalho('story').p })).toThrow();
    expect(() => linhaRascunho({ ...args, proposta: trabalho('carrossel').p })).toThrow('PDF');
  });
});
