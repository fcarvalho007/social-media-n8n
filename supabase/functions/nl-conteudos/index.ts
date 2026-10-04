// Derived content (chronicle carousel) API. Valid session + newsletter staff role on every call.
// Writes use the service role after authorization. Never publishes to social networks:
// "enviar_social" only creates a native draft in the existing social flow.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { z } from "npm:zod@3.25.76";
import { admin, enfileirarCarrossel, gerarProposta, processarJobs, reconciliarEdicoesSemJob, TIPO } from "../_shared/conteudos/jobs.server.ts";
import { legendaComLink, validarCarrossel, type FonteCronica } from "../_shared/conteudos/carrossel.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b ?? null), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const uuid = z.string().uuid();
const carrosselZ = z.object({
  slides: z.array(z.object({ titulo: z.string(), texto: z.string(), fontes: z.array(z.number().int()) }).strict()).min(1).max(12),
  legenda: z.string(),
}).strict();
const urlPdfs = z.string().url().max(1000);
const PREFIXO_PDFS = "/storage/v1/object/public/pdfs/";

/** Exact origin + bucket + owner folder + extension, then owner and MIME checked against storage itself. */
async function validarFicheiros(sb: ReturnType<typeof admin>, userId: string, imagens: string[], pdf: string) {
  const origem = new URL(Deno.env.get("SUPABASE_URL")!).origin;
  const pastas = new Set<string>();
  const verificar = async (u: string, ext: string, mime: string) => {
    const url = new URL(u);
    if (url.origin !== origem || url.search || url.hash || !url.pathname.startsWith(PREFIXO_PDFS)) throw Object.assign(new Error("Endereço de ficheiro inválido."), { status: 400 });
    const nome = decodeURIComponent(url.pathname.slice(PREFIXO_PDFS.length));
    const partes = nome.split("/");
    if (partes.length !== 4 || partes[0] !== userId || partes[1] !== "estudio" || partes.some((p) => !p || p === "." || p === "..") || !/^[\w.-]+$/.test(partes[3]) || !partes[3].toLowerCase().endsWith(ext)) {
      throw Object.assign(new Error("O ficheiro não pertence à pasta do utilizador."), { status: 400 });
    }
    pastas.add(partes[2]);
    const { data } = await sb.rpc("nl_storage_objeto", { _bucket: "pdfs", _nome: nome });
    const o = (data as Array<{ owner_id: string | null; mimetype: string | null }> | null)?.[0];
    if (!o || o.owner_id !== userId || o.mimetype !== mime) throw Object.assign(new Error("Ficheiro inexistente, de outro utilizador ou com tipo inválido."), { status: 400 });
  };
  for (const u of imagens) await verificar(u, ".png", "image/png");
  await verificar(pdf, ".pdf", "application/pdf");
  if (pastas.size !== 1) throw Object.assign(new Error("Os ficheiros têm de vir do mesmo envio."), { status: 400 });
}

const Body = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("listar") }),
  z.object({ acao: z.literal("obter"), conteudo_id: uuid }),
  z.object({ acao: z.literal("preparar"), edicao_id: uuid }),
  z.object({ acao: z.literal("aceitar_fonte"), conteudo_id: uuid }),
  z.object({ acao: z.literal("processar") }),
  z.object({ acao: z.literal("retomar"), job_id: uuid }),
  z.object({ acao: z.literal("gerar"), conteudo_id: uuid }),
  z.object({ acao: z.literal("guardar"), conteudo_id: uuid, versao: z.number().int().nonnegative(), carrossel: carrosselZ, origem: z.enum(["edicao", "ia_manual"]) }),
  z.object({
    acao: z.literal("enviar_social"), conteudo_id: uuid, versao: z.number().int().positive(),
    imagens: z.array(urlPdfs).min(6).max(8), pdf_url: urlPdfs, substituir: z.boolean().default(false),
  }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Sessão em falta" }, 401);
  const userSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userSb.auth.getUser();
  if (!u?.user) return json({ error: "Sessão inválida" }, 401);
  const { data: staff } = await userSb.rpc("nl_is_staff");
  if (!staff) return json({ error: "Sem permissão para preparar conteúdos" }, 403);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Pedido inválido", detalhe: parsed.error.flatten() }, 400);
  const b = parsed.data;
  const sb = admin();
  const userId = u.user.id;

  const lerConteudo = async (id: string) => {
    const { data, error } = await sb.from("nl_conteudos_derivados").select("*").eq("id", id).maybeSingle();
    if (error || !data) throw Object.assign(new Error("Conteúdo não encontrado"), { status: 404 });
    return data as { id: string; edicao_id: string; fonte: FonteCronica; fonte_aceite_em: string | null; carrossel: unknown; versao: number; social_draft_id: string | null; project_id: string | null };
  };
  const exigirFonte = (c: { fonte: FonteCronica; fonte_aceite_em: string | null }) => {
    if (c.fonte.origem === "historico_actual" && !c.fonte_aceite_em) {
      throw Object.assign(new Error("Esta edição não guardou a crónica integral no envio. Revê e confirma a fonte antes de continuar."), { status: 409 });
    }
  };

  try {
    switch (b.acao) {
      case "listar": {
        const [{ data: conteudos }, { data: jobs }, { data: edicoes }] = await Promise.all([
          sb.from("nl_conteudos_derivados").select("id, edicao_id, tipo, fonte_hash, fonte->>titulo, fonte->>origem, fonte->>numero, fonte_aceite_em, versao, social_draft_id, social_enviado_em, actualizado_em").order("created_at", { ascending: false }).limit(100),
          sb.from("nl_conteudos_jobs").select("id, edicao_id, conteudo_id, estado, origem, erro, tentativas, max_tentativas, proxima_tentativa_em, confirmado_em, created_at").order("created_at", { ascending: false }).limit(100),
          sb.from("nl_edicoes").select("id, numero, assunto, enviada_em").eq("estado", "enviada").order("numero", { ascending: false }).limit(50),
        ]);
        return json({ conteudos: conteudos ?? [], jobs: jobs ?? [], edicoes: edicoes ?? [] });
      }
      case "obter": {
        const c = await lerConteudo(b.conteudo_id);
        const [{ data: versoes }, { data: job }] = await Promise.all([
          sb.from("nl_conteudos_versoes").select("versao, origem, criado_em, criado_por").eq("conteudo_id", c.id).order("versao", { ascending: false }),
          sb.from("nl_conteudos_jobs").select("id, estado, erro, tentativas, max_tentativas, proxima_tentativa_em").eq("conteudo_id", c.id).maybeSingle(),
        ]);
        return json({ conteudo: c, versoes: versoes ?? [], job });
      }
      case "preparar": {
        const r = await enfileirarCarrossel(b.edicao_id, "manual");
        if (!r.ok) return json({ error: r.motivo }, 422);
        const { data: job } = await sb.from("nl_conteudos_jobs").select("conteudo_id").eq("id", r.jobId!).single();
        return json({ conteudo_id: (job as { conteudo_id: string }).conteudo_id, job_id: r.jobId });
      }
      case "aceitar_fonte": {
        const c = await lerConteudo(b.conteudo_id);
        if (c.fonte.origem !== "historico_actual") return json({ ok: true });
        await sb.from("nl_conteudos_derivados").update({ fonte_aceite_por: userId, fonte_aceite_em: new Date().toISOString() }).eq("id", c.id).is("fonte_aceite_em", null);
        await sb.from("nl_conteudos_jobs").update({ estado: "aguarda_confirmacao", erro: null, proxima_tentativa_em: new Date().toISOString() })
          .eq("conteudo_id", c.id).eq("estado", "aguarda_revisao_fonte");
        await sb.from("nl_audit_log").insert({ quem: userId, accao: "Fonte histórica do carrossel confirmada", detalhe: `edição ${c.fonte.numero}` });
        return json({ ok: true });
      }
      case "processar": {
        const rec = await reconciliarEdicoesSemJob(5);
        const r = await processarJobs(2);
        return json({ ...r, ...rec });
      }
      case "retomar": {
        // Never steals an active lease (another worker may be mid-processing).
        const agora = new Date().toISOString();
        const livre = `reservado_ate.is.null,reservado_ate.lt.${agora}`;
        await sb.from("nl_conteudos_jobs").update({ estado: "pendente", tentativas: 0, erro: null, proxima_tentativa_em: agora, reservado_ate: null, lease_token: null })
          .eq("id", b.job_id).in("estado", ["erro", "aguarda_credencial"]).or(livre);
        await sb.from("nl_conteudos_jobs").update({ proxima_tentativa_em: agora })
          .eq("id", b.job_id).eq("estado", "aguarda_confirmacao").or(livre);
        return json(await processarJobs(1));
      }
      case "gerar": {
        // Manual new proposal: returned to the editor, only persisted when the editor saves.
        const c = await lerConteudo(b.conteudo_id);
        exigirFonte(c);
        if (!Deno.env.get("DEEPSEEK_API_KEY")) return json({ error: "A chave DeepSeek ainda não está configurada no servidor." }, 503);
        return json({ carrossel: await gerarProposta(sb, c.fonte) });
      }
      case "guardar": {
        const c = await lerConteudo(b.conteudo_id);
        exigirFonte(c);
        const carrossel = validarCarrossel(b.carrossel, c.fonte);
        const { data: upd, error: casErr } = await sb.rpc("nl_conteudos_guardar_versao", {
          _conteudo_id: c.id, _versao_esperada: b.versao, _carrossel: carrossel, _origem: b.origem, _utilizador: userId, _so_se_vazio: false,
        });
        if (casErr) throw new Error(casErr.message);
        const linhas = upd as Array<{ versao: number; actualizado_em: string }> | null;
        if (!linhas?.length) return json({ error: "Outro editor guardou uma versão mais recente. Recarrega antes de guardar." }, 409);
        return json(linhas[0]);
      }
      case "enviar_social": {
        const c = await lerConteudo(b.conteudo_id);
        exigirFonte(c);
        if (c.versao !== b.versao) return json({ error: "Há uma versão guardada mais recente. Recarrega antes de enviar." }, 409);
        const carrossel = validarCarrossel(c.carrossel, c.fonte);
        if (b.imagens.length !== carrossel.slides.length) return json({ error: "O número de imagens não corresponde aos slides." }, 400);
        const legenda = legendaComLink(carrossel, c.fonte);
        await validarFicheiros(sb, userId, b.imagens, b.pdf_url);
        const existente = async () => {
          const { data } = await sb.from("posts_drafts").select("id")
            .eq("origem->>tipo", TIPO).eq("origem->>conteudo_id", c.id).eq("origem->>versao", String(c.versao)).maybeSingle();
          return (data as { id: string } | null)?.id ?? null;
        };
        if (!b.substituir) {
          const id = await existente();
          if (id) return json({ draft_id: id, existente: true });
        }
        const { data: token } = await sb.rpc("nl_conteudos_reservar_envio_social", { _conteudo_id: c.id, _versao: c.versao, _substituir: b.substituir });
        if (!token) {
          const id = await existente();
          if (id && !b.substituir) return json({ draft_id: id, existente: true });
          return json({ error: "Já está a decorrer um envio deste carrossel. Aguarda uns segundos." }, 409);
        }
        const media_items = b.imagens.map((url, i) => ({ url, type: "image", mediaType: "image", source: "estudio", name: `slide-${String(i + 1).padStart(2, "0")}.png` }));
        const linha = {
          user_id: userId,
          platform: "instagram_carousel",
          format: "instagram_carousel",
          formats: ["instagram_carousel", "linkedin_document"],
          caption: legenda,
          media_urls: b.imagens,
          media_items,
          network_captions: { instagram: legenda, linkedin: legenda },
          use_separate_captions: false,
          publish_immediately: false,
          status: "draft",
          project_id: c.project_id,
          origem: { tipo: TIPO, conteudo_id: c.id, edicao_id: c.edicao_id, numero: c.fonte.numero, versao: c.versao, fonte_hash: c.fonte.hash, url_cronica: c.fonte.url, pdf_url: b.pdf_url },
          ai_metadata: { origem_estudio: TIPO, pdf_linkedin_url: b.pdf_url },
        };
        const q = c.social_draft_id && b.substituir
          ? sb.from("posts_drafts").update(linha).eq("id", c.social_draft_id).select("id")
          : sb.from("posts_drafts").insert(linha).select("id");
        const { data: d, error } = await q;
        if (error?.code === "23505") {
          await sb.from("nl_conteudos_derivados").update({ social_envio_token: null, social_envio_ate: null }).eq("id", c.id).eq("social_envio_token", token);
          return json({ draft_id: await existente(), existente: true });
        }
        if (error || !d?.length) {
          await sb.from("nl_conteudos_derivados").update({ social_envio_token: null, social_envio_ate: null }).eq("id", c.id).eq("social_envio_token", token);
          throw new Error(error?.message ?? "Não foi possível criar o rascunho social.");
        }
        const draftId = (d[0] as { id: string }).id;
        await sb.from("nl_conteudos_derivados")
          .update({ social_draft_id: draftId, social_draft_versao: c.versao, social_enviado_em: new Date().toISOString(), social_envio_token: null, social_envio_ate: null })
          .eq("id", c.id).eq("social_envio_token", token);
        return json({ draft_id: draftId, existente: false });
      }
    }
  } catch (e) {
    const st = (e as { status?: number }).status ?? (/slide|legenda|título|texto|referênc/i.test((e as Error).message) ? 422 : 500);
    return json({ error: (e as Error).message ?? "Erro" }, st);
  }
});
