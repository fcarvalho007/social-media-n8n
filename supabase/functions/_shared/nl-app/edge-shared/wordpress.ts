// Publicador para WordPress via LearnDash (`ldlms/v2/sfwd-lessons`).
// Cada edição é criada como Lição associada a um curso (default 4251).
// Se a edição já tem `wordpress_post_id`, actualiza (PUT) em vez de criar (POST) —
// garante que "Criar rascunho" e "Criar e enviar" partilham a mesma Lição.

import { gerarHtmlWordpress } from "./gerar-html-wordpress.ts";
// deno-lint-ignore no-explicit-any
type Admin = any;

export type ConfigWp = { courseId: number };

export function lerConfigWp(map: Record<string, string>): ConfigWp {
  const raw = (map.wordpress_learndash_course_id ?? "4251").trim();
  const n = Number.parseInt(raw, 10);
  return { courseId: Number.isFinite(n) && n > 0 ? n : 4251 };
}

export interface PublicarInput {
  edicaoId: string;
  numero: number;
  assunto: string;
  siteUrl: string;
  user: string;
  password: string;
  config: ConfigWp;
  status?: "draft" | "publish";
  existingPostId?: number | null;
}

export type PublicarOk = { ok: true; post_id: number; post_url: string; status: string; actualizada: boolean };
export type PublicarErro = { ok: false; status?: number; mensagem: string; detalhe?: unknown };

export async function publicarNoWordpress(input: PublicarInput): Promise<PublicarOk | PublicarErro> {
  const { html, tituloLesson } = await gerarHtmlWordpress(input.edicaoId);
  const base = input.siteUrl.replace(/\/+$/, "");
  const auth = "Basic " + btoa(`${input.user}:${input.password}`);
  const status = input.status ?? "draft";
  const actualizar = Number.isFinite(input.existingPostId ?? NaN) && (input.existingPostId ?? 0) > 0;

  const payload: Record<string, unknown> = {
    title: tituloLesson,
    content: html,
    status,
    course: input.config.courseId,
    assignment_auto_approve: false,
  };

  const url = actualizar
    ? `${base}/wp-json/ldlms/v2/sfwd-lessons/${input.existingPostId}`
    : `${base}/wp-json/ldlms/v2/sfwd-lessons`;
  const method = actualizar ? "PUT" : "POST";

  const r = await fetch(url, {
    method,
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (body as { message?: string })?.message ?? r.statusText;
    return { ok: false, status: r.status, mensagem: `LearnDash: ${msg}`, detalhe: body };
  }
  const b = body as { id?: number; link?: string; permalink?: string; url?: string; guid?: { rendered?: string } };
  const id = b?.id ?? (actualizar ? input.existingPostId! : undefined);
  const urlPost = b?.link ?? b?.permalink ?? b?.url ?? b?.guid?.rendered ?? "";
  if (!id) return { ok: false, mensagem: "LearnDash: resposta sem id de lição", detalhe: body };
  return { ok: true, post_id: id, post_url: urlPost, status, actualizada: actualizar };
}

/**
 * Publica ou actualiza a Lição no WordPress, lendo/gravando o `wordpress_post_id`
 * da edição. Devolve um resumo estável usado pelas Edge Functions e pelo editor.
 */
export async function publicarOuActualizarLicaoEdicao(
  admin: Admin,
  opts: {
    edicaoId: string;
    status: "draft" | "publish";
    config: ConfigWp;
    siteUrl: string;
    user: string;
    password: string;
    quem?: string | null;
  },
): Promise<
  | { ok: true; tentado: true; post_id: number; post_url: string; status: string; actualizada: boolean }
  | { ok: false; tentado: true; mensagem: string; post_url: string | null }
> {
  const { data: ed } = await admin
    .from("nl_edicoes")
    .select("numero, assunto, wordpress_post_id")
    .eq("id", opts.edicaoId)
    .maybeSingle();
  const existingPostId = (ed as { wordpress_post_id: number | null } | null)?.wordpress_post_id ?? null;

  const r = await publicarNoWordpress({
    edicaoId: opts.edicaoId,
    numero: (ed as { numero: number } | null)?.numero ?? 0,
    assunto: (ed as { assunto: string } | null)?.assunto ?? "",
    siteUrl: opts.siteUrl,
    user: opts.user,
    password: opts.password,
    config: opts.config,
    status: opts.status,
    existingPostId,
  });

  if (!r.ok) {
    if (opts.quem) {
      await admin.from("nl_audit_log").insert({
        quem: opts.quem,
        accao: `WordPress falhou (${opts.status})`,
        detalhe: r.mensagem,
      });
    }
    return { ok: false, tentado: true, mensagem: r.mensagem, post_url: null };
  }

  await admin
    .from("nl_edicoes")
    .update({ wordpress_post_id: r.post_id, wordpress_post_url: r.post_url })
    .eq("id", opts.edicaoId);

  if (opts.quem) {
    await admin.from("nl_audit_log").insert({
      quem: opts.quem,
      accao: r.actualizada
        ? `WordPress actualizado (${r.status})`
        : `WordPress criado (${r.status})`,
      detalhe: r.post_url || `post_id ${r.post_id}`,
    });
  }

  return { ok: true, tentado: true, post_id: r.post_id, post_url: r.post_url, status: r.status, actualizada: r.actualizada };
}
