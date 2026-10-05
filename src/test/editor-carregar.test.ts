import { describe, expect, it } from "vitest";
import { assinatura, LIMITES_CARREGAR, validarDimensoes, validarFicheiro } from "@/features/editor-grafico/carregar";
import { estadoInicial, reduzir } from "@/features/editor-grafico/estado";
import { FIXTURES } from "@/features/editor-grafico/fixtures";
import { carregarImagem, nomeCarregado } from "../../supabase/functions/_shared/motor/fontes.server";

// 1×1 synthetic PNG (fixture only).
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
const png = Uint8Array.from(atob(PNG_B64), (c) => c.charCodeAt(0));
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>');
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0]);

describe("carregar imagem: validação antes de enviar", () => {
  it("reconhece PNG, JPEG e WebP pela assinatura; recusa SVG", () => {
    expect(assinatura(png)).toBe("image/png");
    expect(assinatura(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(assinatura(webp)).toBe("image/webp");
    expect(assinatura(svg)).toBeNull();
  });
  it("recusa tipo não permitido, SVG disfarçado, tipo trocado, vazio e > 10 MB", () => {
    expect(validarFicheiro({ type: "image/svg+xml", size: 100 }, svg)).toMatchObject({ ok: false });
    expect(validarFicheiro({ type: "image/png", size: 100 }, svg)).toEqual({ ok: false, erro: "O ficheiro não é uma imagem JPG, PNG ou WebP válida." });
    expect(validarFicheiro({ type: "image/jpeg", size: 100 }, png)).toEqual({ ok: false, erro: "O tipo do ficheiro não corresponde ao conteúdo." });
    expect(validarFicheiro({ type: "image/png", size: 0 }, png)).toMatchObject({ ok: false });
    expect(validarFicheiro({ type: "image/png", size: LIMITES_CARREGAR.maxBytes + 1 }, png)).toEqual({ ok: false, erro: "A imagem ultrapassa 10 MB." });
    expect(validarFicheiro({ type: "image/png", size: png.length }, png)).toEqual({ ok: true, mime: "image/png" });
  });
  it("limita dimensões", () => {
    expect(validarDimensoes(8001, 10)).not.toBeNull();
    expect(validarDimensoes(7000, 7000)).not.toBeNull();
    expect(validarDimensoes(1080, 1350)).toBeNull();
  });
});

function sbFalso() {
  const linhas: Record<string, unknown>[] = [];
  const uploads: string[] = [];
  const consulta = () => {
    const filtros: Record<string, unknown> = {};
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => { filtros[k] = v; return q; },
      maybeSingle: async () => ({ data: linhas.find((l) => l.project_id === filtros.project_id && l.hash === filtros.hash) ?? null }),
      insert: (r: Record<string, unknown>) => ({ select: () => ({ single: async () => { const n = { id: `a${linhas.length}`, ...r }; linhas.push(n); return { data: n, error: null }; } }) }),
    };
    return q;
  };
  const sb = { from: consulta, storage: { from: () => ({ upload: async (p: string) => { uploads.push(p); return { error: null }; } }) } };
  return { sb: sb as never, linhas, uploads };
}

describe("carregar imagem: servidor", () => {
  it("guarda PNG como asset do projeto com origem upload e é idempotente", async () => {
    const f = sbFalso();
    const a = await carregarImagem(f.sb, { projectId: "p1", userId: "u1", dados: PNG_B64, nome: "../foto<script>.png" });
    expect(f.linhas[0]).toMatchObject({ project_id: "p1", origem: "upload", media_id: null, mime: "image/png", largura: 1, altura: 1, criado_por: "u1", bucket: "motor-assets" });
    expect(a.nome).toBe("Carregada por ti · fotoscript.png");
    await carregarImagem(f.sb, { projectId: "p1", userId: "u1", dados: PNG_B64, nome: "x.png" });
    expect(f.linhas).toHaveLength(1);
    expect(f.uploads).toHaveLength(1);
  });
  it("recusa SVG, WebP não convertido, base64 inválido e excesso de tamanho sem gravar", async () => {
    const f = sbFalso();
    const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
    await expect(carregarImagem(f.sb, { projectId: "p1", userId: "u1", dados: b64(svg), nome: "a.svg" })).rejects.toThrow();
    await expect(carregarImagem(f.sb, { projectId: "p1", userId: "u1", dados: b64(webp), nome: "a.webp" })).rejects.toThrow();
    await expect(carregarImagem(f.sb, { projectId: "p1", userId: "u1", dados: "não é base64!", nome: "a" })).rejects.toThrow();
    await expect(carregarImagem(f.sb, { projectId: "p1", userId: "u1", dados: "A".repeat(9_000_000), nome: "a" })).rejects.toThrow(/6 MB/);
    expect(f.linhas).toHaveLength(0);
    expect(f.uploads).toHaveLength(0);
  });
  it("nome nunca fica vazio nem com caminho", () => {
    expect(nomeCarregado("")).toBe("Carregada por ti · imagem");
    expect(nomeCarregado("C:\\pasta\\x.jpg")).toBe("Carregada por ti · x.jpg");
  });
});

describe("carregar imagem: editor", () => {
  const asset = { id: "up1", mime: "image/png" as const, largura: 1000, altura: 500, dados: PNG_B64 };
  it("largar fica dentro da página e proporcional; clique vai para fundo; desfazer remove", () => {
    const s0 = estadoInicial(FIXTURES[0]);
    const n0 = s0.pacote.variantes[s0.variante].paginas[s0.pagina].camadas.length;
    const s1 = reduzir(s0, { tipo: "adicionarImagem", asset, nome: "Carregada por ti · x.png", pos: { x: 1080, y: 1350 } });
    const c = s1.pacote.variantes[s1.variante].paginas[s1.pagina].camadas.at(-1)!;
    expect(c.tipo).toBe("imagem");
    expect(c.x + c.w).toBeLessThanOrEqual(1080);
    expect(c.y + c.h).toBeLessThanOrEqual(1350);
    expect(c.w / c.h).toBeCloseTo(2, 2);
    expect(s1.pacote.assets.up1).toBeDefined();
    const fundo = reduzir(s0, { tipo: "adicionarImagem", asset, nome: "x" }).pacote.variantes[s0.variante].paginas[s0.pagina].camadas.at(-1)!;
    expect(fundo).toMatchObject({ x: 0, y: 0, w: 1080, h: 1350 });
    const s2 = reduzir(s1, { tipo: "desfazer" });
    expect(s2.pacote.variantes[s2.variante].paginas[s2.pagina].camadas).toHaveLength(n0);
  });
});
