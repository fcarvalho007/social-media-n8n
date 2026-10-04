import { describe, expect, it } from "vitest";
import { paraBaseDestino, reescreverAvatar } from "../../supabase/functions/_shared/nl-destino-urls";

const BASE = "https://destino.example.test";

describe("reescreverAvatar", () => {
  it("reescreve os avatares conhecidos (png e jpg, com e sem host) e conta", () => {
    const html = `<img src="https://origem.example.test/__l5e/assets-v1/64e62b56-bcaf-4d4a-b6d3-d80d1568af05/frederico-avatar.png">
<img src="/__l5e/assets-v1/cadec3e2-5dd7-4a75-b8dc-14c0202c4200/frederico-avatar.jpg?v=1">
<a href="https://origem.example.test/subscricao?t=TOKEN_ANTIGO">gerir</a>`;
    const r = reescreverAvatar(html, BASE + "/");
    expect(r.n).toBe(2);
    expect(r.valor.match(/destino\.example\.test\/nl\/frederico-avatar\.png/g)).toHaveLength(2);
    expect(r.valor).not.toContain("__l5e");
    expect(r.valor).toContain("https://origem.example.test/subscricao?t=TOKEN_ANTIGO");
  });
  it("não toca em recursos desconhecidos", () => {
    const s = "https://x.example.test/__l5e/assets-v1/00000000-0000-0000-0000-000000000000/outro.png";
    expect(reescreverAvatar(s, BASE)).toEqual({ valor: s, n: 0 });
  });
});

describe("paraBaseDestino", () => {
  it("move edições e briefs históricos para a base de destino", () => {
    expect(paraBaseDestino("https://edicoes.digitalsprint.pt/edicoes/7#cronica", BASE)).toBe(`${BASE}/edicoes/7#cronica`);
    expect(paraBaseDestino("https://edicoes.digitalsprint.pt/brief/abc", BASE)).toBe(`${BASE}/brief/abc`);
  });
  it("mantém outros endereços", () => {
    expect(paraBaseDestino("https://digitalsprint.pt/artigo", BASE)).toBe("https://digitalsprint.pt/artigo");
  });
});
