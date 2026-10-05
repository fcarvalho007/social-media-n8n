// Server-side PT-PT translation of a frozen source. One paid DeepSeek request per (project, hash);
// valid results are reused; an unknown outcome is never repeated automatically.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { chamarGateway, MENSAGEM_RECUSA, MODELO_IA } from "./gateway.server.ts";
import { normalizarFonte } from "./proposta.ts";
import { detetarIdioma, hashTexto, promptTraducaoSistema, promptTraducaoUtilizador, validarTraducao } from "./traducao.ts";

export type RespostaTraducao =
  | { ok: true; traducao_id: string; hash: string; idioma_origem: string; original: string[]; paragrafos: string[]; reutilizada: boolean }
  | { ok: false; status: number; error: string; estado?: string; traducao_id?: string };

export async function traduzirFonte(sb: SupabaseClient, projectId: string, utilizador: string, texto: string, repetir: boolean): Promise<RespostaTraducao> {
  const fonte = normalizarFonte(texto);
  if (!fonte.paragrafos.length) return { ok: false, status: 400, error: "Texto vazio." };
  const hash = await hashTexto(fonte.texto);
  const det = detetarIdioma(fonte.texto);
  if (det.idioma === "pt" && det.confianca === "alta") return { ok: false, status: 400, error: "O texto já parece estar em português." };

  const existente = await sb.from("mc_traducoes").select("id, estado, resultado, idioma_origem").eq("project_id", projectId).eq("hash_original", hash).maybeSingle();
  if (existente.data?.estado === "valida") {
    return { ok: true, traducao_id: existente.data.id, hash, idioma_origem: existente.data.idioma_origem, original: fonte.paragrafos, paragrafos: existente.data.resultado as string[], reutilizada: true };
  }
  if (!(globalThis as unknown as { Deno?: { env: { get(k: string): string | undefined } } }).Deno?.env.get("DEEPSEEK_API_KEY")) {
    return { ok: false, status: 503, error: "A DeepSeek não está configurada no servidor. Podes avançar com a língua original." };
  }
  const { data: res, error } = await sb.rpc("mc_reservar_traducao", {
    _project_id: projectId, _hash: hash, _origem: det.idioma, _original: fonte.paragrafos, _modelo: MODELO_IA, _repetir: repetir, _utilizador: utilizador,
  });
  if (error) {
    const m: Record<string, [number, string]> = {
      P0004: [409, "Um pedido de tradução anterior ficou sem resultado conhecido; não é repetido automaticamente. Avança com a língua original."],
      P0003: [429, "Limite de pedidos atingido ou tradução inválida já repetida. Avança com a língua original."],
      P0002: [409, "A IA está desligada neste projeto. Define um limite diário em «Limites da IA»."],
    };
    const [s, e] = m[error.code ?? ""] ?? [500, "Não foi possível reservar o pedido de tradução."];
    return { ok: false, status: s, error: e };
  }
  const linha = (res as Array<{ traducao_id: string; estado: string; reutilizada: boolean }>)[0];
  const id = linha.traducao_id;
  const marcar = (patch: Record<string, unknown>) => sb.from("mc_traducoes").update({ ...patch, actualizado_em: new Date().toISOString() }).eq("id", id);

  await marcar({ estado: "pedido_enviado" });
  const r = await chamarGateway(MODELO_IA, promptTraducaoSistema(), promptTraducaoUtilizador(fonte.paragrafos));
  if (r.tipo === "erro_antes_pedido") { await marcar({ estado: "erro_antes_pedido", erro: r.mensagem }); return { ok: false, status: 503, error: r.mensagem, estado: "erro_antes_pedido", traducao_id: id }; }
  if (r.tipo === "recusado") { await marcar({ estado: "recusada", erro: `${r.status}` }); return { ok: false, status: 502, error: MENSAGEM_RECUSA[r.classe], estado: "recusada", traducao_id: id }; }
  if (r.tipo === "desconhecido") { await marcar({ estado: "desconhecido", erro: r.mensagem.slice(0, 900) }); return { ok: false, status: 504, error: "A tradução ficou sem resultado conhecido e não é repetida automaticamente. Avança com a língua original.", estado: "desconhecido", traducao_id: id }; }
  let parsed: unknown = null;
  try { parsed = JSON.parse(r.texto); } catch { /* invalid JSON handled below */ }
  const v = validarTraducao(fonte.paragrafos, parsed);
  if (!v.ok) {
    await marcar({ estado: "invalida", erro: v.motivo, tokens_entrada: r.tokensEntrada, tokens_saida: r.tokensSaida });
    return { ok: false, status: 422, error: `Tradução recusada: ${v.motivo} O original mantém-se.`, estado: "invalida", traducao_id: id };
  }
  await marcar({ estado: "valida", resultado: v.paragrafos, tokens_entrada: r.tokensEntrada, tokens_saida: r.tokensSaida });
  return { ok: true, traducao_id: id, hash, idioma_origem: det.idioma, original: fonte.paragrafos, paragrafos: v.paragrafos, reutilizada: false };
}
