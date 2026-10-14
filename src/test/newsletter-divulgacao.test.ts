import { describe, expect, it } from "vitest";
import { campanhaReal, carrosselDivulgacao, linkDivulgacao, prepararDivulgacaoBase, validarStory } from "../../supabase/functions/_shared/conteudos/divulgacao";
import { legendaComLink, verificarLeiturasLiterais } from "../../supabase/functions/_shared/conteudos/carrossel";
import { fonteDivulgacao as fonte } from "../dev/divulgacaoFixture";
import { garantirDivulgacao, guardarDivulgacao } from "../../supabase/functions/_shared/conteudos/divulgacao.server";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("divulgação editorial sem IA", () => {
  it("um envio interno não confirma divulgação real, nem quando aparece enviado", () => {
    expect(campanhaReal({ tipo: "teste" })).toBe(false);
    expect(campanhaReal({})).toBe(false);
    expect(campanhaReal({ tipo: "real" })).toBe(true);
    expect(() => prepararDivulgacaoBase({ ...fonte, teste: false }, null)).toThrow("confirmado");
    expect(() => prepararDivulgacaoBase({ ...fonte, teste: false }, "inválida")).toThrow("confirmado");
  });
  it("o teste fica separado e não recebe uma data de envio real", () => {
    const d = prepararDivulgacaoBase(fonte, "2026-10-14T12:00:00Z");
    expect(d.teste).toBe(true); expect(d.confirmado_em).toBeNull(); expect(d.estado).toBe("rascunho");
  });
  it("usa a fonte imutável, com excerto literal e CTA para a crónica", () => {
    const d = prepararDivulgacaoBase({ ...fonte, teste: false }, "2026-10-14T12:00:00Z");
    expect(d.story.titulo).toBe(fonte.titulo); expect(d.story.texto).toBe(fonte.paragrafos[0]);
    expect(d.fonte_hash).toBe(fonte.hash); expect(d.story.url).toContain("utm_content=story_d0");
  });
  it("não repete o título importado como primeiro parágrafo, mesmo com pontuação", () => {
    const d = prepararDivulgacaoBase({ ...fonte, paragrafos: [fonte.titulo + ".", "A crónica", fonte.paragrafos[0]] }, null);
    expect(d.story.texto).toBe(fonte.paragrafos[0]);
    const semCorpo = prepararDivulgacaoBase({ ...fonte, paragrafos: [fonte.titulo + "."] }, null);
    expect(semCorpo.story.texto).toBe("Já podes ler a crónica da edição #319.");
  });
  it("um excerto longo é identificado por reticências, sem inventar texto", () => {
    const d = prepararDivulgacaoBase({ ...fonte, paragrafos: ["Uma frase verdadeira. ".repeat(40)] }, null);
    expect(d.story.texto.length).toBeLessThanOrEqual(260); expect(d.story.texto.endsWith("…")).toBe(true);
    expect("Uma frase verdadeira. ".repeat(40).startsWith(d.story.texto.slice(0, -1))).toBe(true);
  });
  it("o carrossel do dia seguinte tem 8 slides e as três leituras literais", () => {
    const c = carrosselDivulgacao(fonte)!; expect(c.slides).toHaveLength(8);
    expect(() => verificarLeiturasLiterais(c, fonte)).not.toThrow();
    const l = legendaComLink(c, fonte); expect(l).toContain("utm_content=carrossel_d1");
    expect(l).toContain("tek.sapo.pt"); expect(l).toContain("curso-de-inteligencia-artificial");
  });
  it("rejeita links executáveis, credenciais em URLs e texto que não cabe", () => {
    const s = prepararDivulgacaoBase(fonte, null).story;
    expect(() => validarStory({ ...s, url: "javascript:alert(1)" })).toThrow();
    expect(() => linkDivulgacao("https://user:secret@example.com", 319, "story_d0")).toThrow();
    expect(() => validarStory({ ...s, texto: "x".repeat(261) })).toThrow("260");
  });
  it("mantém outros parâmetros e usa uma campanha estável para medir cada peça", () => {
    const u = new URL(linkDivulgacao("https://example.com/x?a=1&utm_source=email#p", 319, "story_d0"));
    expect(u.searchParams.get("a")).toBe("1"); expect(u.hash).toBe("#p");
    expect(u.searchParams.get("utm_source")).toBe("instagram"); expect(u.searchParams.get("utm_campaign")).toBe("digitalsprint_319");
  });
});

// Stateful PostgREST/RPC double: tests the same CAS filters used by the edge function, including races.
function banco(carrossel: unknown = null) {
  const row: Record<string, unknown> = { fonte, carrossel, versao: carrossel ? 1 : 0, divulgacao: null, divulgacao_versao: 0 };
  let rpcCount = 0;
  const sb = {
    from: () => {
      let patch: Record<string, unknown> | null = null;
      const filtros: [string, unknown][] = [];
      const run = () => {
        const ok = filtros.every(([k, v]) => k === "id" || row[k] === v);
        if (patch && ok) Object.assign(row, patch);
        return { data: patch ? ok ? [{ ...row }] : [] : { ...row }, error: null };
      };
      const q = { select: () => q, eq: (k: string, v: unknown) => { filtros.push([k, v]); return q; }, is: (k: string, v: unknown) => { filtros.push([k, v]); return q; }, update: (p: Record<string, unknown>) => { patch = p; return q; }, single: async () => run(), then: (ok: (r: unknown) => unknown) => Promise.resolve(run()).then(ok) };
      return q;
    },
    rpc: async (_nome: string, p: Record<string, unknown>) => {
      rpcCount++; if (!row.carrossel && row.versao === p._versao_esperada) { row.carrossel = p._carrossel; row.versao = Number(row.versao) + 1; }
      return { error: null };
    },
  } as unknown as SupabaseClient;
  return { sb, row, rpcCount: () => rpcCount };
}
describe("persistência e idempotência", () => {
  it("refresh/reconciliação nunca duplicam nem substituem edições humanas", async () => {
    const b = banco(); await garantirDivulgacao(b.sb, "id", null);
    const c = b.row.carrossel; const editado = { ...b.row.divulgacao as object, estado: "revisto" };
    b.row.divulgacao = editado;
    await garantirDivulgacao(b.sb, "id", null);
    expect(b.row.carrossel).toBe(c); expect(b.row.divulgacao).toBe(editado); expect(b.rpcCount()).toBe(1);
  });
  it("dois pedidos simultâneos só preenchem a versão vazia", async () => {
    const b = banco(); await Promise.all([garantirDivulgacao(b.sb, "id", null), garantirDivulgacao(b.sb, "id", null)]);
    expect(b.row.divulgacao_versao).toBe(1); expect(b.row.versao).toBe(1);
  });
  it("preserva o carrossel de teste319 já guardado", async () => {
    const existente = { slides: ["edição humana"] }; const b = banco(existente);
    await garantirDivulgacao(b.sb, "id", null); expect(b.row.carrossel).toBe(existente); expect(b.rpcCount()).toBe(0);
  });
  it("uma gravação desatualizada não apaga o texto de outro editor", async () => {
    const b = banco(); await garantirDivulgacao(b.sb, "id", null);
    const d = b.row.divulgacao as ReturnType<typeof prepararDivulgacaoBase>;
    await guardarDivulgacao(b.sb, "id", 1, { ...d, story: { ...d.story, titulo: "Texto novo" } });
    await expect(guardarDivulgacao(b.sb, "id", 1, d)).rejects.toThrow("Outro editor");
    expect((b.row.divulgacao as typeof d).story.titulo).toBe("Texto novo");
  });
});
