// Durable, idempotent jobs that prepare the chronicle carousel after a newsletter send.
// Key: edition + type + source hash. Acceptance by E-goi is NOT delivery: a job starts in
// "aguarda_confirmacao" and only moves on when E-goi reports the campaign as "sent".
// AI runs only inside the job processor (never in the send response) and never overwrites
// human edits. Publishing to social networks is always a separate human action.
import process from "node:process";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import { carregarFonteCronica, ErroFonte } from "./fonte.server.ts";
import { gerarComReparacao, type Carrossel, type FonteCronica } from "./carrossel.ts";

export const TIPO = "carrossel_cronica";

/**
 * Automatic preparation only covers campaigns accepted by E-goi from this instant on
 * (go-live of the worker). Imported/historical editions are prepared only by an explicit
 * "preparar" action, never retroactively by the worker.
 */
export const AUTO_DESDE = "2026-10-04T11:00:00Z";

export function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

async function identidadeDigitalsprint(sb: SupabaseClient) {
  const { data } = await sb.from("estudio_identidades").select("id, project_id").eq("chave", "digitalsprint").maybeSingle();
  return data as { id: string; project_id: string | null } | null;
}

/** Ensures one content row for the given source. Never touches an existing row. */
export async function garantirConteudo(sb: SupabaseClient, fonte: FonteCronica) {
  const ident = await identidadeDigitalsprint(sb);
  await sb.from("nl_conteudos_derivados").upsert(
    {
      edicao_id: fonte.edicaoId,
      tipo: TIPO,
      fonte,
      fonte_hash: fonte.hash,
      identidade_id: ident?.id ?? null,
      project_id: ident?.project_id ?? null,
    },
    { onConflict: "edicao_id,tipo,fonte_hash", ignoreDuplicates: true },
  );
  const { data, error } = await sb.from("nl_conteudos_derivados").select("id, fonte_aceite_em")
    .eq("edicao_id", fonte.edicaoId).eq("tipo", TIPO).eq("fonte_hash", fonte.hash).single();
  if (error) throw new Error(`Não foi possível registar o conteúdo: ${error.message}`);
  return data as { id: string; fonte_aceite_em: string | null };
}

/**
 * Enqueue (idempotent). Repeated calls for the same campaign/edition/source do nothing.
 * Never throws: a failure here must not change the newsletter send result.
 */
export async function enfileirarCarrossel(
  edicaoId: string,
  origem: "envio" | "reconciliacao" | "manual",
): Promise<{ ok: boolean; jobId?: string; motivo?: string }> {
  const sb = admin();
  try {
    const fonte = await carregarFonteCronica(sb, edicaoId);
    const conteudo = await garantirConteudo(sb, fonte);
    const { data: camps } = await sb.from("nl_egoi_campanhas")
      .select("lista_id, campaign_hash, estado, aceite_em").eq("edicao_id", edicaoId);
    // Candidates only: delivery is always re-confirmed against E-goi by the processor.
    let candidatas = ((camps ?? []) as { lista_id: string; campaign_hash: string | null; estado: string; aceite_em: string | null }[])
      .filter((c) => (c.estado === "aceite" || c.estado === "enviada") && c.campaign_hash);
    if (origem !== "manual") {
      candidatas = candidatas.filter((c) => c.aceite_em && c.aceite_em >= AUTO_DESDE);
      if (!candidatas.length) return { ok: false, motivo: "Sem campanha aceite pela E-goi depois da ativação automática." };
    }
    const aceites = candidatas.map((c) => ({ lista_id: c.lista_id, campaign_hash: c.campaign_hash as string, confirmada: false }));
    // Explicit historical preparation without campaign hashes: relies on server-only send evidence
    // (enviada_em/snapshot are write-protected against client sessions by a DB trigger).
    let semCampanhaMasEnviada = false;
    if (!aceites.length) {
      const { data: ed } = await sb.from("nl_edicoes").select("enviada_em").eq("id", edicaoId).maybeSingle();
      semCampanhaMasEnviada = !!(ed as { enviada_em: string | null } | null)?.enviada_em;
      if (!semCampanhaMasEnviada) return { ok: false, motivo: "Esta edição não tem envio confirmado no servidor." };
    }
    const precisaRevisao = fonte.origem === "historico_actual" && !conteudo.fonte_aceite_em;
    await sb.from("nl_conteudos_jobs").upsert(
      {
        edicao_id: edicaoId,
        tipo: TIPO,
        fonte_hash: fonte.hash,
        conteudo_id: conteudo.id,
        origem,
        estado: precisaRevisao ? "aguarda_revisao_fonte" : semCampanhaMasEnviada ? "pendente" : "aguarda_confirmacao",
        campanhas: aceites,
      },
      { onConflict: "edicao_id,tipo,fonte_hash", ignoreDuplicates: true },
    );
    const { data: job } = await sb.from("nl_conteudos_jobs").select("id")
      .eq("edicao_id", edicaoId).eq("tipo", TIPO).eq("fonte_hash", fonte.hash).maybeSingle();
    return { ok: true, jobId: (job as { id: string } | null)?.id };
  } catch (e) {
    const motivo = e instanceof ErroFonte ? e.message : `Falha ao preparar o carrossel: ${(e as Error).message}`;
    await sb.from("nl_audit_log").insert({ quem: "sistema", accao: "Carrossel da crónica não preparado", detalhe: motivo }).then(() => {}, () => {});
    return { ok: false, motivo };
  }
}

async function egoiKey(sb: SupabaseClient): Promise<string> {
  const { lerConfig } = await import("../newsletter-engine/sincronizar-egoi.server.ts");
  const config = await lerConfig(sb);
  return (config.egoi_api_key || process.env.EGOI_API_KEY || "").trim();
}

/** Delivery confirmation: only E-goi "sent" counts; API errors are returned, never read as "waiting". */
async function estadoBrutoCampanha(apiKey: string, hash: string): Promise<{ bruto: string } | { erro: string }> {
  const { consultarEstadoCampanha } = await import("../newsletter-engine/egoi-estado.ts");
  const r = await consultarEstadoCampanha(apiKey, hash);
  return r.ok ? { bruto: r.bruto } : { erro: r.mensagem };
}

function backoff(tentativas: number) {
  return new Date(Date.now() + Math.min(60, 2 ** tentativas) * 60_000).toISOString();
}

type Lease = { id: string; lease_token: string };

/** Final write for a reserved job: only the holder of the current lease may write; releases the lease. */
async function gravarJob(sb: SupabaseClient, job: Lease, campos: Record<string, unknown>): Promise<boolean> {
  const { data } = await sb.from("nl_conteudos_jobs")
    .update({ ...campos, reservado_ate: null, lease_token: null, actualizado_em: new Date().toISOString() })
    .eq("id", job.id).eq("lease_token", job.lease_token).select("id");
  return !!data?.length;
}

/** Marks a_processar while keeping (and extending) the lease, so a crash is recovered only after it expires. */
async function manterLease(sb: SupabaseClient, job: Lease, campos: Record<string, unknown> = {}): Promise<boolean> {
  const { data } = await sb.from("nl_conteudos_jobs")
    .update({ ...campos, reservado_ate: new Date(Date.now() + 10 * 60_000).toISOString(), actualizado_em: new Date().toISOString() })
    .eq("id", job.id).eq("lease_token", job.lease_token).gt("reservado_ate", new Date().toISOString()).select("id");
  return !!data?.length;
}

/** Calls DeepSeek (max one guided repair), logs cost for every call incl. invalid answers, returns a validated carousel. */
export async function gerarProposta(sb: SupabaseClient, fonte: FonteCronica): Promise<Carrossel> {
  const { chamarDeepSeek, parseJsonTolerante } = await import("../newsletter-engine/deepseek.server.ts");
  const { custoUsd } = await import("../newsletter-engine/custos-ia.ts");
  let inicio = Date.now();
  return gerarComReparacao(fonte, {
    chamar: (system, user) => { inicio = Date.now(); return chamarDeepSeek(system, user, { responseJson: true, temperatura: 0.4 }); },
    parse: (t) => parseJsonTolerante(t),
    registar: async (r, erro) => {
      const { error } = await sb.from("nl_ia_uso").insert({
        modelo: r.modelo,
        tokens_entrada_cache_hit: r.usage.cacheHit,
        tokens_entrada_cache_miss: r.usage.cacheMiss,
        tokens_saida: r.usage.saida,
        custo_usd: custoUsd(r.modelo, r.usage.cacheHit, r.usage.cacheMiss, r.usage.saida),
        origem: TIPO,
        edicao_id: fonte.edicaoId,
        duracao_ms: Date.now() - inicio,
        sucesso: !erro,
        erro,
      });
      if (error) console.error("[carrossel] falha a registar nl_ia_uso:", error.message);
    },
  });
}

/** Bounded processor (max 5 jobs per run, atomic lease). Safe to call repeatedly. */
export async function processarJobs(limite = 2): Promise<{ processados: number }> {
  const sb = admin();
  const { data: jobs, error } = await sb.rpc("nl_reservar_jobs_conteudos", { _limite: limite });
  if (error) throw new Error(error.message);
  let processados = 0;
  for (const job of (jobs ?? []) as Array<{
    id: string; lease_token: string; edicao_id: string; conteudo_id: string; estado: string; tentativas: number; max_tentativas: number;
    campanhas: Array<{ lista_id: string; campaign_hash: string; confirmada: boolean }>;
  }>) {
    processados++;
    try {
      if (job.estado === "aguarda_confirmacao") {
        const key = await egoiKey(sb);
        if (!key) {
          await gravarJob(sb, job, { erro: "A aguardar a chave E-goi para confirmar a entrega.", proxima_tentativa_em: backoff(4) });
          continue;
        }
        const campanhas = [...job.campanhas];
        const errosApi: string[] = [];
        for (const c of campanhas) {
          if (c.confirmada) continue;
          const r = await estadoBrutoCampanha(key, c.campaign_hash);
          if ("erro" in r) errosApi.push(r.erro);
          else c.confirmada = r.bruto === "sent";
        }
        if (campanhas.length && campanhas.some((c) => c.confirmada)) {
          await gravarJob(sb, job, { campanhas, estado: "pendente", confirmado_em: new Date().toISOString(), erro: null, proxima_tentativa_em: new Date().toISOString() });
        } else if (errosApi.length) {
          await gravarJob(sb, job, { campanhas, erro: `Não foi possível confirmar a entrega na E-goi: ${errosApi.join(" | ").slice(0, 400)}`, proxima_tentativa_em: backoff(3) });
        } else {
          await gravarJob(sb, job, { campanhas, erro: "A E-goi aceitou o envio mas ainda não o confirmou como entregue.", proxima_tentativa_em: backoff(2) });
        }
        continue;
      }
      // pendente | aguarda_credencial
      if (!process.env.DEEPSEEK_API_KEY) {
        await gravarJob(sb, job, { estado: "aguarda_credencial", erro: "A aguardar a chave DeepSeek. O estado fica guardado.", proxima_tentativa_em: backoff(4) });
        continue;
      }
      const { data: row } = await sb.from("nl_conteudos_derivados").select("fonte, carrossel, versao").eq("id", job.conteudo_id).single();
      const c = row as { fonte: FonteCronica; carrossel: unknown; versao: number };
      if (c.carrossel) {
        // A human (or a previous attempt) already has a draft: never overwrite.
        await gravarJob(sb, job, { estado: "concluido", erro: null });
        continue;
      }
      if (!(await manterLease(sb, job, { estado: "a_processar" }))) continue; // lease lost to another worker
      const carrossel = await gerarProposta(sb, c.fonte);
      // A stale worker (lease expired/reassigned) must not finalise someone else's job.
      if (!(await manterLease(sb, job))) continue;
      // Atomic CAS: only fills an empty carousel at the expected version, history row in the same transaction.
      const { error: casErr } = await sb.rpc("nl_conteudos_guardar_versao", {
        _conteudo_id: job.conteudo_id, _versao_esperada: c.versao, _carrossel: carrossel,
        _origem: "ia_automatica", _utilizador: null, _so_se_vazio: true,
      });
      if (casErr) throw new Error(casErr.message);
      await gravarJob(sb, job, { estado: "concluido", erro: null });
    } catch (e) {
      const msg = (e as Error).message ?? "Erro";
      const tentativas = job.tentativas + 1;
      const semCredencial = /DEEPSEEK_API_KEY|recusou a chave|Sem saldo/i.test(msg);
      await gravarJob(sb, job, {
        estado: semCredencial ? "aguarda_credencial" : tentativas >= job.max_tentativas ? "erro" : "pendente",
        tentativas: semCredencial ? job.tentativas : tentativas,
        erro: msg.slice(0, 500),
        proxima_tentativa_em: backoff(semCredencial ? 4 : tentativas),
      });
    }
  }
  return { processados };
}

/**
 * Recovers editions whose campaigns E-goi accepted after AUTO_DESDE but which have no job
 * yet (bounded). Never looks at nl_edicoes.estado and never touches historical editions.
 */
export async function reconciliarEdicoesSemJob(limite = 10) {
  const sb = admin();
  const { data } = await sb.from("nl_egoi_campanhas").select("edicao_id")
    .in("estado", ["aceite", "enviada"]).not("campaign_hash", "is", null).gte("aceite_em", AUTO_DESDE).limit(200);
  const ids = [...new Set(((data ?? []) as { edicao_id: string }[]).map((r) => r.edicao_id))];
  if (!ids.length) return { enfileiradas: 0 };
  const { data: comJob } = await sb.from("nl_conteudos_jobs").select("edicao_id").eq("tipo", TIPO).in("edicao_id", ids);
  const ja = new Set(((comJob ?? []) as { edicao_id: string }[]).map((r) => r.edicao_id));
  let enfileiradas = 0;
  for (const id of ids.filter((i) => !ja.has(i)).slice(0, limite)) {
    if ((await enfileirarCarrossel(id, "reconciliacao")).ok) enfileiradas++;
  }
  return { enfileiradas };
}

/** Editions with campaigns still "aceite" (accepted, not delivered) since AUTO_DESDE. */
export async function edicoesPorConfirmar(limite = 5): Promise<string[]> {
  const sb = admin();
  const { data } = await sb.from("nl_egoi_campanhas").select("edicao_id")
    .eq("estado", "aceite").not("campaign_hash", "is", null).gte("aceite_em", AUTO_DESDE).limit(100);
  return [...new Set(((data ?? []) as { edicao_id: string }[]).map((r) => r.edicao_id))].slice(0, limite);
}
