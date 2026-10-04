// Fictitious contacts only (example.test). Run: deno test supabase/functions/_shared/nl-egoi-tokens_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1";
import { type ArmazemProgresso, type ClienteEgoi, type ContactoEgoi, executarLote, type Falha, PAGINA, type Progresso, repetirFalhas, tagCampo, verificarProntidao } from "./nl-egoi-tokens.ts";

const CAMPO = 7, L = "lista-ficticia";
const tok = (e: string) => `tok:${e}`;

function egoiFalso(n: number, opts: { falhar?: Set<string>; truncar?: boolean; formato?: string; semCampo?: boolean } = {}) {
  const contactos: Array<ContactoEgoi> = Array.from({ length: n }, (_, i) => ({ id: `c${i}`, email: i === 3 ? null : `pessoa${i}@example.test`, valorCampo: null }));
  const chamadas = { listar: [] as number[], escritas: 0 };
  const c: ClienteEgoi = {
    lerCampos: () => Promise.resolve(opts.semCampo ? [] : [{ field_id: String(CAMPO), name: "token", format: opts.formato ?? "text", type: "extra" }]),
    listar: (_l, offset, limit) => { chamadas.listar.push(offset); return Promise.resolve({ total: contactos.length, itens: contactos.slice(offset, offset + limit).map((x) => ({ ...x })) }); },
    lerContacto: (_l, id) => Promise.resolve(contactos.find((x) => x.id === id) ?? null),
    escrever: (_l, id, _c, v) => {
      chamadas.escritas++;
      if (opts.falhar?.has(id)) return Promise.resolve({ ok: false, status: 500 });
      const x = contactos.find((y) => y.id === id)!; x.valorCampo = opts.truncar ? v.slice(0, 5) : v;
      return Promise.resolve({ ok: true, status: 200 });
    },
  };
  return { c, contactos, chamadas };
}

function armazemMemoria(): ArmazemProgresso & { linhas: Map<string, Progresso & { lease?: string }>; falhas: Map<string, Falha & { resolvida: boolean }> } {
  const linhas = new Map<string, Progresso & { lease?: string }>(), falhas = new Map<string, Falha & { resolvida: boolean }>();
  const k = (l: string, c: number) => `${l}|${c}`;
  return {
    linhas, falhas,
    ler: (l, c) => Promise.resolve(linhas.has(k(l, c)) ? { ...linhas.get(k(l, c))! } : null),
    iniciar(l, c, fp, recomecar) {
      if (recomecar || !linhas.has(k(l, c))) {
        linhas.set(k(l, c), { egoi_lista_id: l, campo_id: c, estado: "por_iniciar", campo_validado: false, campo_meta: null, segredo_fp: fp, offset_proximo: 0, processados: 0, actualizados: 0, ja_correctos: 0, ignorados: 0, total_egoi: null, verificado_leitura: false, ultimo_erro: null, concluido_em: null });
        if (recomecar) falhas.clear();
      }
      return Promise.resolve({ ...linhas.get(k(l, c))! });
    },
    reservar(l, c) { const r = linhas.get(k(l, c))!; if (r.lease) return Promise.resolve(null); r.lease = crypto.randomUUID(); return Promise.resolve(r.lease); },
    guardar(t, p) { const r = linhas.get(k(p.egoi_lista_id, p.campo_id))!; if (r.lease !== t) return Promise.resolve(false); linhas.set(k(p.egoi_lista_id, p.campo_id), { ...p, lease: t }); return Promise.resolve(true); },
    libertar(l, c, t) { const r = linhas.get(k(l, c)); if (r?.lease === t) delete r.lease; return Promise.resolve(); },
    registarFalha(_l, _c, id, motivo) { const f = falhas.get(id); falhas.set(id, { contact_id: id, motivo, tentativas: (f?.tentativas ?? 0) + 1, resolvida: false }); return Promise.resolve(); },
    resolverFalha(_l, _c, id) { const f = falhas.get(id); if (f) f.resolvida = true; return Promise.resolve(); },
    falhasPendentes: () => Promise.resolve([...falhas.values()].filter((f) => !f.resolvida)),
    contarFalhas: () => Promise.resolve([...falhas.values()].filter((f) => !f.resolvida).length),
  };
}

Deno.test("merge code oficial do campo extra", () => assertEquals(tagCampo(7), "!extra_field_7"));

Deno.test("retoma do offset guardado sem voltar ao início e conclui", async () => {
  const e = egoiFalso(230), a = armazemMemoria();
  const deps = { egoi: e.c, armazem: a, criarToken: tok };
  const r1 = await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp", limite: 100 });
  assertEquals(r1.offset, 100); assert(!r1.terminou);
  const r2 = await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp", limite: 100 });
  assertEquals(r2.offset, 200);
  assertEquals(e.chamadas.listar.filter((o) => o === 0).length, 1, "nunca recomeça do zero");
  const r3 = await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp", limite: 100 });
  assert(r3.terminou); assertEquals(r3.offset, 230);
  assertEquals(e.contactos.filter((c) => c.email && c.valorCampo === tok(c.email)).length, 229);
  assertEquals((await a.ler(L, CAMPO))!.ignorados, 1);
  assertEquals(await verificarProntidao(deps, { listas: [{ egoi_lista_id: L, nome: "Teste" }], campo: CAMPO, fp: "fp" }), []);
});

Deno.test("falhas ficam registadas, o offset avança e repetir resolve-as", async () => {
  const falhar = new Set(["c5", "c60"]);
  const e = egoiFalso(80, { falhar }), a = armazemMemoria(), deps = { egoi: e.c, armazem: a, criarToken: tok };
  const r = await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp" });
  assert(r.terminou); assertEquals(r.falhas_pendentes, 2);
  const bloq = await verificarProntidao(deps, { listas: [{ egoi_lista_id: L, nome: "Teste" }], campo: CAMPO, fp: "fp" });
  assert(bloq[0].includes("2 contacto(s) com falha"));
  falhar.clear();
  const rep = await repetirFalhas(deps, { lista: L, campo: CAMPO, fp: "fp" });
  assertEquals(rep.resolvidas, 2);
  assertEquals(await verificarProntidao(deps, { listas: [{ egoi_lista_id: L, nome: "Teste" }], campo: CAMPO, fp: "fp" }), []);
});

Deno.test("contactos novos bloqueiam o envio e a retoma só relê a sobreposição", async () => {
  const e = egoiFalso(120), a = armazemMemoria(), deps = { egoi: e.c, armazem: a, criarToken: tok };
  await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp" });
  e.contactos.push({ id: "novo", email: "nova@example.test", valorCampo: null });
  const p = await verificarProntidao(deps, { listas: [{ egoi_lista_id: L, nome: "Teste" }], campo: CAMPO, fp: "fp" });
  assert(p[0].includes("1 contacto(s) novos"));
  const antes = e.chamadas.escritas;
  const r = await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp" });
  assert(r.terminou); assertEquals(e.chamadas.escritas - antes, 1, "só escreve o contacto novo");
  assert(Math.min(...e.chamadas.listar.slice(-2)) >= 121 - PAGINA - 1);
});

Deno.test("campo inexistente, formato errado ou valor truncado bloqueiam", async () => {
  for (const opts of [{ semCampo: true }, { formato: "number" }, { truncar: true }]) {
    const e = egoiFalso(10, opts), a = armazemMemoria(), deps = { egoi: e.c, armazem: a, criarToken: tok };
    const r = await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp" });
    assertEquals(r.estado, "campo_invalido");
    assert(e.chamadas.escritas <= 1, "pára na primeira escrita inválida");
    const p = await verificarProntidao(deps, { listas: [{ egoi_lista_id: L, nome: "Teste" }], campo: CAMPO, fp: "fp" });
    assert(p.length === 1);
  }
});

Deno.test("segredo rodado ou execução concorrente não avançam", async () => {
  const e = egoiFalso(10), a = armazemMemoria(), deps = { egoi: e.c, armazem: a, criarToken: tok };
  await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp" });
  assertEquals((await executarLote(deps, { lista: L, campo: CAMPO, fp: "outro" })).estado, "segredo_mudou");
  await a.reservar(L, CAMPO, 60);
  assertEquals((await executarLote(deps, { lista: L, campo: CAMPO, fp: "fp" })).estado, "ocupada");
});
