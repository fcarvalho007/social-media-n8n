import { describe, expect, it } from "vitest";
import { progressoLote } from "@/newsletter/features/newsletter/partilhado/FilaEntrada";
import { readFileSync } from "node:fs";

describe("fila de entrada da curadoria", () => {
  it("conta os itens interpretados pela descida da fila", () => {
    expect(progressoLote(100, 88, 30)).toBe(12);
  });
  it("nunca passa do tamanho do lote nem fica negativo", () => {
    expect(progressoLote(100, 40, 30)).toBe(30);
    expect(progressoLote(100, 120, 30)).toBe(0);
    expect(progressoLote(null, 10, 30)).toBe(0);
  });
  it("só processa itens dos últimos 7 dias, do mais recente para o mais antigo", () => {
    const src = readFileSync("supabase/functions/_shared/nl-app/lib/fila-curadoria.server.ts", "utf8");
    expect(src).toContain("export const DIAS_MAX_PROCESSAR = 7;");
    const lote = src.slice(src.indexOf("export async function processarLote"));
    expect(lote.indexOf('.gte("publicado_em"')).toBeGreaterThan(0);
    expect(lote).toContain('.order("publicado_em", { ascending: false })');
  });
});

import { novasRecolha } from "@/newsletter/features/newsletter/partilhado/modais/Fontes";
describe("recolha das fontes", () => {
  it("conta as novas na fila como recolhidas", () => {
    expect(novasRecolha({ inseridas: 0, na_fila: 72 })).toBe(72);
    expect(novasRecolha({ inseridas: 3 })).toBe(3);
  });
});

import { atrasoEmails } from "@/newsletter/routes/_authenticated/emails";
describe("chegada de emails", () => {
  const agora = Date.parse("2026-10-09T14:00:00Z");
  it("fica a vermelho quando nada chega há mais de 2 dias", () => {
    expect(atrasoEmails("2026-10-03T16:32:00Z", agora)).toBe(true);
    expect(atrasoEmails(null, agora)).toBe(true);
  });
  it("não avisa com um email recente", () => {
    expect(atrasoEmails("2026-10-08T14:00:00Z", agora)).toBe(false);
  });
});
