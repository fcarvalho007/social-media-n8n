import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const novo = readFileSync("src/pages/CarrosselNovo.tsx", "utf8");
const idioma = readFileSync("src/features/motor/PainelIdioma.tsx", "utf8");
describe("recuperação local das escolhas e idioma", () => {
  it("guarda e restaura todas as escolhas rápidas e a decisão de idioma, sem segredos", () => {
    for (const k of ["tomPreset", "publico", "publicoOutro", "angulo", "leituraEsp", "cta", "quantidade", "idiomaEscolha"]) {
      expect(novo).toMatch(new RegExp(`${k}[,:]`));
    }
    expect(novo).toMatch(/setIdiomaInicial\(d\.idiomaEscolha/);
    expect(novo).not.toMatch(/traducaoId[^\n]*guardarRecuperacao/);
  });
  it("tradução só é reutilizada pelo hash atual, revalidada no servidor; sem IA automática", () => {
    expect(idioma).toMatch(/traducaoGuardada\(projectId, h\)/);
    expect(idioma).toMatch(/valida = !!trad && trad\.hash === hash/);
    expect(idioma).toMatch(/O carrossel continua em PT-PT/);
    expect(idioma).not.toMatch(/useEffect\([^)]*traduzir\(/);
  });
});
