import { describe, expect, it, vi } from "vitest";

const lista: Array<Record<string, unknown>> = [];
vi.mock("../../supabase/functions/_shared/newsletter-engine/revista/brief/modelo.server.ts", () => ({
  briefsActivos: async () => true,
  clienteBrief: () => ({}),
  listarBriefsDaEdicao: async () => lista,
  registarVersao: async () => 1,
  transitarEstado: async () => undefined,
}));
vi.mock("../../supabase/functions/_shared/newsletter-engine/revista/destinos.server.ts", () => ({
  baseUrlEdicoes: async () => "https://exemplo.pt",
}));

// Path held in a variable so the app typecheck does not walk the Deno-only send engine.
const MODULO_PUBLICACAO = "../../supabase/functions/_shared/newsletter-engine/revista/brief/publicacao.server.ts";
const { validarBriefsDaEdicao } = await import(
  /* @vite-ignore */ MODULO_PUBLICACAO
);

const brief = (id: string, papel: "destaque" | "radar", pronto: boolean) => ({
  id, noticia_id: id, papel, tipo: papel, estado: pronto ? "aprovado" : "por_gerar",
  titulo_editorial: id, titulo_apresentado: null,
  em_30_segundos: pronto ? [{ texto: "x" }] : [], porque_interessa: pronto ? [{ ordem: 1, rotulo: "a", texto: "b" }] : [],
  leitura_aprovada: pronto ? "Leitura." : "", fonte_url: "https://fonte.pt/a", aprovada_em: pronto ? "2026-10-16" : null,
  verificacao: {}, ia: {}, erro: null,
});

describe("prontidão dos Briefs conta só os Destaques", () => {
  it("3 Destaques prontos e Radar sem Brief: nada bloqueia", async () => {
    lista.splice(0, lista.length, brief("d1", "destaque", true), brief("d2", "destaque", true), brief("d3", "destaque", true), brief("r1", "radar", false));
    const v = await validarBriefsDaEdicao("e", {} as never);
    expect(v.total).toBe(3);
    expect(v.prontos).toHaveLength(3);
    expect([...v.incompletos, ...v.verificacoes, ...v.leiturasPorAprovar]).toEqual([]);
  });

  it("um Destaque sem leitura aprovada continua a bloquear", async () => {
    lista.splice(0, lista.length, brief("d1", "destaque", true), brief("d2", "destaque", true), brief("d3", "destaque", false));
    const v = await validarBriefsDaEdicao("e", {} as never);
    expect(v.prontos).toHaveLength(2);
    expect(v.leiturasPorAprovar).toHaveLength(1);
  });
});
