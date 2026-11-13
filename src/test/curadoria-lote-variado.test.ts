import { describe, expect, it } from "vitest";
import { chaveFonteFila, escolherLoteVariado } from "../../supabase/functions/_shared/nl-app/edge-shared/seleccao-diversa";

const data = (h: number) => new Date(Date.UTC(2026, 10, 11, h)).toISOString();
const sej = Array.from({ length: 14 }, (_, i) => ({ origem: "rss", fonte_id: "sej", publicado_em: data(20 - i / 10) }));
const tnw = Array.from({ length: 5 }, () => ({ origem: "rss", fonte_id: "tnw", publicado_em: data(15) }));
const emails = [
  ...Array.from({ length: 6 }, (_, i) => ({ origem: "email", fonte_id: null, fonte_nome: `EMARKETER <x${i}@insight.emarketer.com>`, publicado_em: data(5) })),
  { origem: "email", fonte_id: null, fonte_nome: "MarketingCharts <news@marketingcharts.com>", publicado_em: data(4) },
  { origem: "email", fonte_id: null, fonte_nome: "NYT <nytdirect@nytimes.com>", publicado_em: data(3) },
];

describe("lote variado da fila de curadoria", () => {
  it("nunca põe mais de 2 da mesma fonte quando há outras", () => {
    const { porFonte } = escolherLoteVariado([...sej, ...tnw, ...emails], 8, 2);
    expect(Math.max(...Object.values(porFonte))).toBeLessThanOrEqual(2);
  });
  it("reserva pelo menos um terço do lote para emails", () => {
    const { seleccionados } = escolherLoteVariado([...sej, ...tnw, ...emails], 9, 2);
    expect(seleccionados.filter((i) => i.origem === "email").length).toBeGreaterThanOrEqual(3);
  });
  it("trata remetentes da EMARKETER como uma só fonte", () => {
    expect(chaveFonteFila(emails[0])).toBe(chaveFonteFila(emails[5]));
  });
  it("só passa o tecto quando não há outras fontes", () => {
    expect(escolherLoteVariado(sej, 5, 2).seleccionados).toHaveLength(5);
  });
});
