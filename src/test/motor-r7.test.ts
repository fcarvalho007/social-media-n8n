import { describe, expect, it } from "vitest";
import {
  assetsReferidos, atribuicao, inspecionarImagem, intervalos, ipBloqueado, localBiblioteca, pareceIp, validarMetaFonte, validarUrlLink,
} from "../../supabase/functions/_shared/motor/fontes";
import { pacoteParaExportar } from "../../supabase/functions/_shared/motor/exportacao";
import { classificarFalha } from "../../supabase/functions/_shared/motor/exportacao";
import { comporDocumentos, estruturarSemIa, marcaDoProjeto, normalizarFonte } from "../../supabase/functions/_shared/motor/proposta";
import { estadoInicial, reduzir } from "@/features/editor-grafico/estado";
import { comporFontePdf, textoDaPagina, type PdfLido } from "@/features/motor/fontePdf";

describe("R7 link — destinos", () => {
  it("aceita só https em hosts exatos da lista", () => {
    expect(validarUrlLink("https://tek.sapo.pt/noticias/x").ok).toBe(true);
    expect(validarUrlLink("https://TEK.sapo.pt./a").ok).toBe(true);
    for (const [u, m] of [
      ["http://tek.sapo.pt/a", "protocolo"], ["ftp://tek.sapo.pt", "protocolo"], ["file:///etc/passwd", "protocolo"],
      ["https://user:pw@tek.sapo.pt/", "credenciais"], ["https://tek.sapo.pt:8443/", "porta"],
      ["https://evil.tek.sapo.pt/", "fora_da_lista"], ["https://tek.sapo.pt.evil.com/", "fora_da_lista"], ["https://exemplo.pt/", "fora_da_lista"],
      ["https://127.0.0.1/", "ip"], ["https://2130706433/", "ip"], ["https://0x7f.1/", "ip"], ["https://[::1]/", "ip"], ["https://169.254.169.254/", "ip"],
      ["nada", "formato"],
    ] as const) {
      const r = validarUrlLink(u);
      expect(r.ok, u).toBe(false);
      if (!r.ok) expect(r.motivo, u).toBe(m);
    }
  });
  it("bloqueia IPs privados, loopback, link-local, CGNAT, metadados e IPv6 internos", () => {
    for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "172.16.5.4", "192.168.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "64:ff9b::a00:1", "300.1.1.1"])
      expect(ipBloqueado(ip), ip).toBe(true);
    for (const ip of ["104.18.1.1", "2606:4700::6810:1"]) expect(ipBloqueado(ip), ip).toBe(false);
    expect(pareceIp("017700000001")).toBe(true);
  });
});

describe("R7 metadados de fonte", () => {
  const base = { tipo: "pdf", ficheiro: "R7-misto.pdf", hash: "a".repeat(64), bytes: 1000, total_paginas: 3, editado: false };
  const paginas = [
    { n: 1, estado: "texto", caracteres: 200, paragrafos: [1, 2] },
    { n: 2, estado: "sem_texto_com_imagem", caracteres: 0, paragrafos: null },
    { n: 3, estado: "texto", caracteres: 100, paragrafos: [3, 3] },
  ];
  it("PDF parcial exige confirmação explícita e nomeia as páginas", () => {
    expect(() => validarMetaFonte({ ...base, paginas, parcial_confirmado: false }, "pdf", 3)).toThrow(/páginas 2/);
    const m = validarMetaFonte({ ...base, paginas, parcial_confirmado: true }, "pdf", 3);
    expect(m.tipo === "pdf" && m.paginas_em_falta).toEqual([2]);
    expect(atribuicao(m, null).titulo).toBe("R7-misto.pdf (PDF, pág. 1, 3 de 3)");
  });
  it("recusa correspondência de parágrafos que não confere e PDF sem texto", () => {
    expect(() => validarMetaFonte({ ...base, paginas, parcial_confirmado: true }, "pdf", 5)).toThrow(/correspondência/);
    expect(() => validarMetaFonte({ ...base, total_paginas: 1, paginas: [{ ...paginas[1], n: 1 }], parcial_confirmado: true }, "pdf", 0)).toThrow(/não tem texto/);
  });
  it("link: atribuição com URL final", () => {
    const m = validarMetaFonte({ tipo: "link", modo: "extraido", url: "https://tek.sapo.pt/a", url_final: "https://tek.sapo.pt/b", titulo_pagina: "T", bytes: 10, truncado: false, editado: false, lido_em: null }, "link", 1);
    expect(atribuicao(m, null)).toEqual({ titulo: "T", url: "https://tek.sapo.pt/b" });
    expect(() => validarMetaFonte({ tipo: "link", modo: "x" }, "link", 1)).toThrow();
  });
  it("intervalos de páginas", () => expect(intervalos([1, 2, 3, 5, 7, 8])).toBe("1–3, 5, 7–8"));
});

describe("R7 PDF no navegador — composição por página", () => {
  const pdf: PdfLido = { ficheiro: "R7.pdf", hash: "b".repeat(64), bytes: 10, paginas: [
    { n: 1, estado: "texto", texto: "Primeiro parágrafo.\n\nSegundo parágrafo.", paragrafos: ["Primeiro parágrafo.", "Segundo parágrafo."] },
    { n: 2, estado: "sem_texto_com_imagem", texto: "", paragrafos: [] },
    { n: 3, estado: "texto", texto: "Terceiro.", paragrafos: ["Terceiro."] },
  ] };
  it("mapeia parágrafos por página e marca páginas em falta/excluídas", () => {
    const c = comporFontePdf(pdf, new Set(), false);
    expect(normalizarFonte(c.texto).paragrafos).toHaveLength(3);
    expect(c.meta.paginas.map((p) => p.paragrafos)).toEqual([[1, 2], null, [3, 3]]);
    expect(c.meta.paginas_em_falta).toEqual([2]);
    const e = comporFontePdf(pdf, new Set([1]), true);
    expect(e.meta.paginas[0].estado).toBe("excluida");
    expect(e.meta.paginas[2].paragrafos).toEqual([1, 1]);
    expect(() => validarMetaFonte(e.meta, "pdf", 1)).not.toThrow();
  });
  it("junta linhas e separa parágrafos por espaço vertical", () => {
    const t = textoDaPagina([
      { str: "Linha um", hasEOL: true, transform: [0, 0, 0, 0, 0, 700], height: 10 },
      { str: "continua.", hasEOL: true, transform: [0, 0, 0, 0, 0, 688], height: 10 },
      { str: "Novo bloco.", transform: [0, 0, 0, 0, 0, 650], height: 10 },
    ]);
    expect(t).toBe("Linha um continua.\n\nNovo bloco.");
  });
});

// 1x1 PNG / minimal JPEG header
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0, 20, 0, 30, 3, 0, 0, 0, 0, 0]);

describe("R8a imagens autorizadas", () => {
  it("lê tipo e dimensões só do cabeçalho; recusa SVG/GIF", () => {
    expect(inspecionarImagem(PNG)).toEqual({ mime: "image/png", largura: 1, altura: 1 });
    expect(inspecionarImagem(JPG)).toEqual({ mime: "image/jpeg", largura: 30, altura: 20 });
    expect(() => inspecionarImagem(new TextEncoder().encode("<svg onload=alert(1)></svg>"))).toThrow(/PNG ou JPEG/);
    expect(() => inspecionarImagem(new TextEncoder().encode("GIF89a........"))).toThrow(/PNG ou JPEG/);
  });
  it("só aceita URLs públicos do próprio armazenamento nos buckets da biblioteca", () => {
    const base = "https://abc.supabase.co";
    expect(localBiblioteca(`${base}/storage/v1/object/public/publications/u/a%20b.png`, base)).toEqual({ bucket: "publications", path: "u/a b.png" });
    expect(localBiblioteca(`${base}/storage/v1/object/public/nl-import-staging/x.png`, base)).toBeNull();
    expect(localBiblioteca(`https://evil.com/storage/v1/object/public/publications/x.png`, base)).toBeNull();
    expect(localBiblioteca(`${base}/storage/v1/object/public/publications/../x.png`, base)).toBeNull();
    expect(localBiblioteca(`${base}/storage/v1/object/public/publications/x.png?download=1`, base)).toBeNull();
  });
  it("adicionar imagem cria camada de capa atrás do texto e exporta com o recurso verificado", () => {
    const f = normalizarFonte("Um facto sintético R8 para testar imagens no desenho do carrossel.\n\nSegundo facto sintético.");
    const p = estruturarSemIa(f, { slides: 3 }, { titulo: null, url: null }, marcaDoProjeto(null));
    const docs = comporDocumentos(p);
    const pac = { v: 1 as const, id: "t", nome: "t", sintetico: false, conteudo: { slides: p.slides }, assets: {}, variantes: docs };
    const asset = { id: "11111111-1111-4111-8111-111111111111", mime: "image/png" as const, largura: 1, altura: 1, dados: btoa(String.fromCharCode(...PNG)) };
    const s = reduzir(estadoInicial(pac), { tipo: "adicionarImagem", asset, nome: "capa" });
    const camadas = s.pacote.variantes.A.paginas[0].camadas;
    const img = camadas.find((c) => c.tipo === "imagem")!;
    expect(img.z).toBeLessThan(Math.min(...camadas.filter((c) => c.tipo !== "imagem").map((c) => c.z)));
    const docComImg = s.pacote.variantes.A;
    expect(assetsReferidos([docComImg])).toEqual([asset.id]);
    // Without the resolved asset the export fails as a definitive document error (never drawn incomplete).
    let erro: unknown;
    try { pacoteParaExportar("d", p, "A", docComImg); } catch (e) { erro = e; }
    expect(classificarFalha(erro).classe).toBe("documento");
    expect(pacoteParaExportar("d", p, "A", docComImg, { [asset.id]: asset }).assets[asset.id].mime).toBe("image/png");
  });
});
