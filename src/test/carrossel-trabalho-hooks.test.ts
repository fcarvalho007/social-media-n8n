import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Regression guard: CarrosselTrabalho must call every hook before its first
// top-level early return (loading/error), otherwise React throws
// "Rendered more hooks than during the previous render" on load.
describe("CarrosselTrabalho hook order", () => {
  it("has no hook calls after the first top-level early return", () => {
    const src = readFileSync(resolve(__dirname, "../pages/CarrosselTrabalho.tsx"), "utf8");
    const inicio = src.indexOf("export default function CarrosselTrabalho");
    expect(inicio).toBeGreaterThan(-1);
    const corpo = src.slice(inicio);
    const linhas = corpo.split("\n");
    const iReturn = linhas.findIndex((l) => /^ {2}if \(.*\) return\b/.test(l) || /^ {2}return\b/.test(l));
    expect(iReturn).toBeGreaterThan(0);
    const depois = linhas.slice(iReturn).filter((l) => /^ {2}(const|let)?.*\buse(State|Effect|Ref|Memo|Callback|LayoutEffect|Context)\(/.test(l) && /^ {2}\S/.test(l));
    expect(depois).toEqual([]);
  });
});
