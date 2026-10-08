// MP4 slide videos: server-side validation, path rules and the social draft carrying videos.
import { describe, expect, it } from "vitest";
import { caminhoFicheiro, linhaRascunho, validarVideo, VIDEO_MAX_BYTES } from "../../supabase/functions/_shared/motor/exportacao";
import { normalizarFonte, estruturarSemIa } from "../../supabase/functions/_shared/motor/proposta";

const f = normalizarFonte("Uma biblioteca abriu uma sala de leitura. A sala tem quarenta lugares.\n\nA biblioteca funciona de segunda a sábado e empresta livros.");
const citacao = { titulo: "Fonte de teste", url: "https://example.com/noticia" };
const marca = { cor: "#334155", origem: "projeto" as const };
const proposta = (formato: "post" | "story" | "carrossel") =>
  estruturarSemIa(f, { formato, titulo: "Uma sala para ler", slides: formato === "carrossel" ? 3 : 1 }, citacao, marca);
const args = (formato: "post" | "story" | "carrossel") => ({
  id: "draft", userId: "u", projectId: "p", proposta: proposta(formato),
  trabalhoId: "t", documentoId: "d", variante: "A" as const, versao: 1, propostaVersao: 1,
});

describe("validação de vídeo gravado no navegador", () => {
  it("aceita MP4 e WebM pelos magic bytes e recusa lixo e tamanhos fora dos limites", () => {
    const mp4 = new Uint8Array(24); mp4.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], 0); // "ftyp" at offset 4
    expect(validarVideo(mp4)).toBe("video/mp4");
    const webm = new Uint8Array(24); webm.set([0x1a, 0x45, 0xdf, 0xa3], 0); // EBML header
    expect(validarVideo(webm)).toBe("video/webm");
    expect(() => validarVideo(new Uint8Array(12).fill(0x42))).toThrow("não é um vídeo");
    expect(() => validarVideo(new Uint8Array(11).fill(0x66))).toThrow("entre 12 bytes e 50 MB");
    const grande = new Uint8Array(VIDEO_MAX_BYTES + 1); grande[4] = 0x66; grande[5] = 0x74; grande[6] = 0x79; grande[7] = 0x70;
    expect(() => validarVideo(grande)).toThrow("entre 12 bytes e 50 MB");
  });

  it("caminho versionado aceita .mp4 e recusa extensões desconhecidas", () => {
    const pid = "0123456789abcdef0123456789abcdef0123"; const did = "fedcba9876543210fedcba9876543210fedcba98";
    const hash = "a".repeat(64);
    expect(caminhoFicheiro(pid, did, 3, "slide-01.mp4", hash)).toBe(`motor/${pid}/${did}/v3/slide-01-${hash.slice(0, 16)}.mp4`);
    expect(() => caminhoFicheiro(pid, did, 3, "slide-01.mov", hash)).toThrow("Caminho inválido.");
  });
});

describe("rascunho social com vídeos de slide", () => {
  it("story: o vídeo substitui o PNG na posição, com o PNG como capa", () => {
    const l = linhaRascunho({ ...args("story"), pngs: ["u1"], mp4s: [{ pagina: 1, url: "v1", png: "u1" }] });
    expect(l.media_items).toHaveLength(1);
    expect(l.media_items[0]).toMatchObject({ url: "v1", type: "video", mediaType: "video", source: "estudio", name: "slide-01.mp4", thumbnailUrl: "u1" });
    expect(l.media_urls).toEqual(["v1"]);
    expect(l.formats).toEqual(["instagram_stories"]);
    expect(l.origem).not.toHaveProperty("pdf_url");
  });

  it("story sem vídeos continua com as imagens estáticas", () => {
    const l = linhaRascunho({ ...args("story"), pngs: ["u1"] });
    expect(l.media_items[0]).toMatchObject({ type: "image", url: "u1", name: "slide-01.png" });
  });

  it("post: um vídeo para Instagram, LinkedIn mantém o PDF fora dos media_items", () => {
    const l = linhaRascunho({ ...args("post"), pngs: ["u1"], pdf: "p", mp4s: [{ pagina: 1, url: "v1", png: "u1" }] });
    expect(l.formats).toEqual(["instagram_image", "linkedin_post"]);
    expect(l.media_items).toHaveLength(1);
    expect(l.media_items[0].type).toBe("video");
    expect(l.origem.pdf_url).toBe("p");
  });

  it("carrossel misto: o vídeo entra na posição do slide e as restantes páginas mantêm-se imagens", () => {
    const l = linhaRascunho({ ...args("carrossel"), pngs: ["u1", "u2", "u3"], pdf: "p", mp4s: [{ pagina: 2, url: "v2", png: "u2" }] });
    expect(l.media_items.map((it: { type: string; url: string }) => [it.type, it.url])).toEqual([["image", "u1"], ["video", "v2"], ["image", "u3"]]);
    expect(l.media_urls).toEqual(["u1", "v2", "u3"]);
    expect(l.media_items[1].name).toBe("slide-02.mp4");
    expect(l.origem.pdf_url).toBe("p");
  });

  it("páginas fora do intervalo dos PNGs são ignoradas (nunca um item órfão)", () => {
    const l = linhaRascunho({ ...args("carrossel"), pngs: ["u1", "u2", "u3"], pdf: "p", mp4s: [{ pagina: 25, url: "v25", png: "x" }] });
    expect(l.media_items).toHaveLength(3);
    expect(l.media_items.every((it: { type: string }) => it.type === "image")).toBe(true);
  });
});
