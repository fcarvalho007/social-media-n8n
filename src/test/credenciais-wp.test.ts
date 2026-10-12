import { describe, it, expect } from "vitest";
import { normalizarCredenciaisWp, mensagemErroWp } from "../../supabase/functions/_shared/newsletter-engine/credenciais-wp";

describe("credenciais WordPress", () => {
  it("limpa espaços e aspas", () => {
    expect(normalizarCredenciaisWp('  "frederico" \n', " abcd EFGH ijkl MNOP qrst UVWX ")).toEqual({
      utilizador: "frederico", password: "abcd EFGH ijkl MNOP qrst UVWX", trocadas: false,
    });
  });
  it("troca quando o utilizador é claramente uma palavra-passe de aplicação", () => {
    const r = normalizarCredenciaisWp("abcd EFGH ijkl MNOP qrst UVWX", "frederico");
    expect(r).toEqual({ utilizador: "frederico", password: "abcd EFGH ijkl MNOP qrst UVWX", trocadas: true });
  });
  it("não troca valores normais", () => {
    expect(normalizarCredenciaisWp("frederico", "segredo").trocadas).toBe(false);
  });
  it("tira HTML da mensagem do site", () => {
    const m = mensagemErroWp(401, "<strong>Erro:</strong> Nome de utilizador desconhecido.");
    expect(m).not.toContain("<strong>");
    expect(m).toContain("wordpress_site_username");
  });
});
