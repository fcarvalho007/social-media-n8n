import { describe, expect, it } from 'vitest';
import { ambitoAcervo, descobrirCandidatos, excertoReferenciado, pesquisarDocumento, temAssinaturaPdf, type DocumentoAcervo } from '@/features/documentos/modelo';
import { lerArtigoAcervo, lerFonteAcervo, prepararArtigoAcervo, prepararFonte } from '@/features/documentos/transferencia';

const d: DocumentoAcervo = { id: 'doc', ambito: ambitoAcervo('u', 'p'), titulo: 'Relatório de formação', origem: 'https://example.org/download?id=4', recolhidoEm: '2026-10-18T12:00:00Z', publicadoEm: null, ficheiro: new Blob(), pdf: { ficheiro: 'relatorio.pdf', hash: 'abc', bytes: 1000, paginas: [
  { n: 1, estado: 'texto', texto: 'Uma fonte educativa com texto suficiente para preparar uma publicação.', paragrafos: ['Uma fonte educativa com texto suficiente para preparar uma publicação.'] },
  { n: 2, estado: 'sem_texto_com_imagem', texto: '', paragrafos: [] },
  { n: 3, estado: 'texto', texto: 'Esta página não deve ser incluída quando a seleção contém apenas a primeira.', paragrafos: ['Esta página não deve ser incluída quando a seleção contém apenas a primeira.'] },
] } };

describe('acervo de PDFs: descoberta e proveniência', () => {
  it('descobre downloads sem extensão, query strings e embeds; não inventa URLs', () => {
    const links = descobrirCandidatos(`<a href="/download?id=4">Descarregar PDF</a><a href="/download?id=4#page=2">PDF</a><a href="/reports/a.PDF?token=public">Relatório</a><object type="application/pdf" data="/ficheiro/7"></object><a href="/artigo">Artigo</a><a href="javascript:alert(1)">PDF</a>`, 'https://example.org/publicacoes/');
    expect(links.map(c => c.url)).toEqual(['https://example.org/download?id=4', 'https://example.org/reports/a.PDF?token=public', 'https://example.org/ficheiro/7']);
  });
  it('um nome .pdf e um MIME não substituem a assinatura real', () => {
    expect(temAssinaturaPdf(new TextEncoder().encode('<html>Login em documento.pdf</html>'))).toBe(false);
    expect(temAssinaturaPdf(new TextEncoder().encode('%PDF-1.7\n'))).toBe(true);
  });
  it('usa o título da página quando a ligação tem apenas o nome genérico View PDF', () => {
    expect(descobrirCandidatos('<title>Relatório de IA</title><a href="/download/4">View PDF</a>', 'https://example.org')[0].titulo).toBe('Relatório de IA');
  });
  it('pesquisa o texto sem depender de maiúsculas ou acentos', () => {
    expect(pesquisarDocumento(d, 'FORMACAO')).toBe(true); expect(pesquisarDocumento(d, 'educativa')).toBe(true); expect(pesquisarDocumento(d, 'ausente')).toBe(false);
  });
  it('só inclui páginas escolhidas, com fonte, data de recolha e hash; não inventa data de publicação', () => {
    const txt = excertoReferenciado(d, new Set([1, 2]));
    expect(txt).toContain('[Página 1]'); expect(txt).not.toContain('[Página 2]'); expect(txt).not.toContain('Esta página'); expect(txt).toContain('SHA-256: abc'); expect(d.publicadoEm).toBeNull();
  });
  it('a transferência preserva PDF e exclusões; outra conta não a aceita', () => {
    const f = prepararFonte(d, new Set([1]), 'u', 'p');
    expect(f.excluidas).toEqual([3]); expect(f.pdf.paginas[1].estado).toBe('sem_texto_com_imagem');
    expect(f.texto).not.toContain('Esta página'); expect(f.referencia).toContain('Páginas: 1');
    expect(lerFonteAcervo({ fonteAcervo: f }, 'outra')).toBeNull(); expect(lerFonteAcervo({ fonteAcervo: f }, 'u')).toEqual(f);
  });
  it('recusa uma seleção vazia e uma fonte acima do limite antes de sair do acervo', () => {
    expect(() => prepararFonte(d, new Set(), 'u', 'p')).toThrow('40 caracteres');
    const grande = { ...d, pdf: { ...d.pdf, paginas: [{ ...d.pdf.paginas[0], paragrafos: ['x'.repeat(20001)] }] } };
    expect(() => prepararFonte(grande, new Set([1]), 'u', 'p')).toThrow('20 000');
  });
  it('o âmbito não colide nem mistura contas e projetos', () => {
    expect(ambitoAcervo('ab', 'c')).not.toBe(ambitoAcervo('a', 'bc')); expect(ambitoAcervo('u', 'p')).not.toBe(ambitoAcervo('outro', 'p'));
  });
  it('relatórios extensos chegam ao compositor como excerto referenciado, sem metadados acima dos limites nem um history.state enorme',()=>{
    const extenso={...d,pdf:{...d.pdf,bytes:20*1024*1024,paginas:[...d.pdf.paginas,...Array.from({length:80},(_,i)=>({...d.pdf.paginas[0],n:i+4}))]}};
    const f=prepararFonte(extenso,new Set([1]),'u','p');expect(f.modo).toBe('excerto');expect(f.pdf.paginas).toEqual([]);expect(f.referencia).toContain('Páginas: 1');expect(f.referencia).toContain('SHA-256: abc');
  });
  it('a notícia mantém a origem e a indicação de fonte parcial sem se fazer passar por um PDF',()=>{
    const f=prepararArtigoAcervo({titulo:'Fonte real',texto:'Texto lido',url:'https://example.org/article',origem:'https://example.org/research',fonteNome:'Fonte',publicadoEm:null,parcial:true,hash:'abc'},'u','p');
    expect(f.artigo).toContain('Fonte parcial');expect(f.artigo).toContain('publicação: não verificada');expect(f.artigo).not.toContain('Páginas:');expect(lerArtigoAcervo({fonteArtigo:f},'u')).toEqual(f);expect(lerArtigoAcervo({fonteArtigo:f},'outra')).toBeNull();
  });
});
