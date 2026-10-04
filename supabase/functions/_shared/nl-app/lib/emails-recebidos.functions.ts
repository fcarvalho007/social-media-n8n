import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";

export type MotivoSemResultado =
  | "fonte_inactiva"
  | "sem_html"
  | "sem_blocos"
  | "tudo_duplicado"
  | "ia_sem_resultado"
  | null;

export type ClassificacaoDetalhe = {
  destaques?: number;
  breves?: number;
  ferramentas?: number;
  links?: number;
  patrocinios_ignorados?: number;
  tutoriais_ignorados?: number;
  blocos_total?: number;
  budget_ia?: number;
  chamadas_ia?: number;
  duplicados?: number;
  bloqueadas_repeticao?: number;
  descartados?: Array<{ titulo: string; motivo: string }>;
  motivo_sem_resultado?: MotivoSemResultado;
  fonte_id?: string | null;
  fonte_nome?: string | null;
  processado_em?: string;
};


export type EmailRecebido = {
  id: string;
  remetente: string | null;
  remetente_nome: string | null;
  assunto: string | null;
  classificacao: "confirmacao" | "newsletter" | "outro" | null;
  notas_processadas: number;
  recebido_em: string;
  corpo_html: string | null;
  corpo_texto: string | null;
  classificacao_detalhe: ClassificacaoDetalhe | null;
  processamento_estado?: "por_processar" | "a_processar" | "processado" | "falhou" | null;
  processamento_erro?: string | null;
  processamento_tentativas?: number | null;
  processado_em?: string | null;
};

export type Janela = "24h" | "7d" | "14d" | "tudo";
export type FiltroClasse = "todas" | "newsletter" | "confirmacao" | "outro";

export type ListaEmailsRecebidos = {
  emails: EmailRecebido[];
  total: number;
  contagens: { newsletter: number; confirmacao: number; outro: number; total: number };
};

export type FiltrosListagem = {
  janela?: Janela;
  fonte?: string | null;
  classe?: FiltroClasse;
  q?: string | null;
};

function inicioJanela(j: Janela | undefined): string | null {
  const agora = Date.now();
  switch (j) {
    case "24h": return new Date(agora - 24 * 3600 * 1000).toISOString();
    case "7d":  return new Date(agora - 7 * 24 * 3600 * 1000).toISOString();
    case "tudo": return null;
    case "14d":
    default: return new Date(agora - 14 * 24 * 3600 * 1000).toISOString();
  }
}

export const listarEmailsRecebidos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: FiltrosListagem | undefined) => data ?? {})
  .handler(async ({ data, context }): Promise<ListaEmailsRecebidos> => {
    const desde = inicioJanela(data.janela);
    const fonte = data.fonte?.trim() || null;
    const termo = data.q?.trim().replace(/[,%]/g, " ") || null;

    const aplicarFiltros = <T extends {
      gte: (c: string, v: string) => T;
      or: (s: string) => T;
      ilike: (c: string, v: string) => T;
    }>(q: T): T => {
      let r = q;
      if (desde) r = r.gte("recebido_em", desde);
      if (fonte) r = r.or(`remetente.eq.${fonte},remetente_nome.eq.${fonte}`);
      if (termo) r = r.ilike("assunto", `%${termo}%`);
      return r;
    };

    const contar = async (classe: FiltroClasse) => {
      let q = context.supabase.from("nl_emails_recebidos").select("id", { count: "exact", head: true });
      q = aplicarFiltros(q);
      if (classe !== "todas") q = q.eq("classificacao", classe);
      const { count } = await q;
      return count ?? 0;
    };

    const [totalCount, cNews, cConf, cOutro] = await Promise.all([
      contar("todas"), contar("newsletter"), contar("confirmacao"), contar("outro"),
    ]);

    let listQ = context.supabase
      .from("nl_emails_recebidos")
      .select("id, remetente, remetente_nome, assunto, classificacao, notas_processadas, recebido_em, corpo_html, corpo_texto, classificacao_detalhe, processamento_estado, processamento_erro, processamento_tentativas, processado_em");
    listQ = aplicarFiltros(listQ);
    if (data.classe && data.classe !== "todas") listQ = listQ.eq("classificacao", data.classe);
    const { data: rows, error } = await listQ.order("recebido_em", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);

    return {
      emails: (rows ?? []) as EmailRecebido[],
      total: totalCount,
      contagens: { total: totalCount, newsletter: cNews, confirmacao: cConf, outro: cOutro },
    };
  });


export type FonteEmail = { chave: string; nome: string | null; email: string | null; total: number; ultimo: string };

export const listarFontesEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FonteEmail[]> => {
    const desde = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await context.supabase
      .from("nl_emails_recebidos")
      .select("remetente, remetente_nome, recebido_em")
      .gte("recebido_em", desde)
      .order("recebido_em", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const mapa = new Map<string, FonteEmail>();
    for (const r of data ?? []) {
      const email = (r.remetente ?? "").trim();
      const nome = (r.remetente_nome ?? "").trim();
      const chave = email || nome;
      if (!chave) continue;
      const existente = mapa.get(chave);
      if (existente) {
        existente.total += 1;
      } else {
        mapa.set(chave, {
          chave,
          nome: nome || null,
          email: email || null,
          total: 1,
          ultimo: r.recebido_em as string,
        });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  });

export const apagarEmailRecebido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("id inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase.from("nl_emails_recebidos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    // Regista audit (best-effort; ignora erro se ausência de perfil)
    try {
      const { data: perfil } = await context.supabase
        .from("nl_perfis").select("nome").eq("id", context.userId).maybeSingle();
      await context.supabase.from("nl_audit_log").insert({
        quem: (perfil?.nome as string | undefined) ?? "utilizador",
        accao: "email_recebido_apagado",
        detalhe: { id: data.id },
      });
    } catch { /* noop */ }

    return { ok: true };
  });

export type NoticiaDoEmail = {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string | null;
  categoria: string | null;
  estado: "pendente" | "aprovada" | "rejeitada" | "enviada" | null;
  destaque: boolean | null;
  edicao_id: string | null;
  edicao_numero: number | null;
  created_at: string;
};

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export type MotivoIgnorado = {
  accao: string;
  detalhe: JsonValue | null;
  criado_em: string;
};

export type FonteDoEmail = {
  id: string;
  nome: string;
  activa: boolean;
} | null;

export type NoticiasDoEmail = {
  noticias: NoticiaDoEmail[];
  motivo_ignorado: MotivoIgnorado | null;
  motivo_sem_resultado: MotivoSemResultado;
  fonte: FonteDoEmail;
};

export const listarNoticiasDoEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { emailId: string }) => {
    if (!data?.emailId || typeof data.emailId !== "string") throw new Error("emailId inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<NoticiasDoEmail> => {
    const { data: rows, error } = await context.supabase
      .from("nl_noticias")
      .select("id, titulo, descricao, url, categoria, estado, destaque, edicao_id, created_at, nl_edicoes(numero)")
      .eq("email_recebido_id", data.emailId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const noticias: NoticiaDoEmail[] = (rows ?? []).map((r) => {
      const rec = r as Record<string, unknown> & { edicoes?: { numero?: number } | null };
      return {
        id: rec.id as string,
        titulo: (rec.titulo as string) ?? "",
        descricao: (rec.descricao as string | null) ?? null,
        url: (rec.url as string | null) ?? null,
        categoria: (rec.categoria as string | null) ?? null,
        estado: (rec.estado as NoticiaDoEmail["estado"]) ?? null,
        destaque: (rec.destaque as boolean | null) ?? null,
        edicao_id: (rec.edicao_id as string | null) ?? null,
        edicao_numero: rec.edicoes?.numero ?? null,
        created_at: rec.created_at as string,
      };
    });

    let motivo_ignorado: MotivoIgnorado | null = null;
    let motivo_sem_resultado: MotivoSemResultado = null;
    let fonte: FonteDoEmail = null;

    const { data: emailRow } = await context.supabase
      .from("nl_emails_recebidos")
      .select("remetente, assunto, recebido_em, classificacao_detalhe")
      .eq("id", data.emailId)
      .maybeSingle();

    if (emailRow) {
      const det = (emailRow.classificacao_detalhe ?? {}) as ClassificacaoDetalhe;
      motivo_sem_resultado = (det.motivo_sem_resultado ?? null) as MotivoSemResultado;

      const remetente = (emailRow.remetente as string | null)?.toLowerCase() ?? null;
      if (remetente) {
        const { data: fRow } = await context.supabase
          .from("nl_fontes_curadoria")
          .select("id, nome, activa")
          .eq("tipo", "newsletter")
          .eq("remetente_email", remetente)
          .maybeSingle();
        if (fRow) {
          fonte = {
            id: fRow.id as string,
            nome: (fRow.nome as string) ?? remetente,
            activa: Boolean(fRow.activa),
          };
        }
      }

      if (noticias.length === 0) {
        // Pista adicional no audit_log (confirmação, duplicado, fonte inactiva).
        const inicio = new Date(new Date(emailRow.recebido_em as string).getTime() - 5 * 60 * 1000).toISOString();
        const fim = new Date(new Date(emailRow.recebido_em as string).getTime() + 5 * 60 * 1000).toISOString();
        const { data: audit } = await context.supabase
          .from("nl_audit_log")
          .select("accao, detalhe, criado_em")
          .in("accao", [
            "email_ignorado_confirmacao",
            "email_ignorado_duplicado",
            "email_ignorado_fonte_inactiva",
          ])
          .gte("criado_em", inicio)
          .lte("criado_em", fim)
          .order("criado_em", { ascending: false })
          .limit(5);
        const alvo = (audit ?? []).find((a) => {
          const d = (a.detalhe ?? {}) as Record<string, unknown>;
          return d.assunto === emailRow.assunto
            || d.email_original_id === data.emailId
            || d.email_recebido_id === data.emailId;
        });
        if (alvo) {
          motivo_ignorado = {
            accao: alvo.accao as string,
            detalhe: (alvo.detalhe ?? null) as JsonValue | null,
            criado_em: alvo.criado_em as string,
          };
        }
      }
    }

    return { noticias, motivo_ignorado, motivo_sem_resultado, fonte };
  });

export type ResultadoReprocessar = {
  ok: true;
  noticias_inseridas: number;
  ferramentas_inseridas: number;
  formato: string;
  usou_fallback: boolean;
  motivo_sem_resultado: MotivoSemResultado;
};

async function garantirAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<string> {
  const { data: perfil } = await supabase
    .from("nl_perfis").select("nome, papel").eq("id", userId).maybeSingle();
  if ((perfil?.papel as string | undefined) !== "admin") {
    throw new Error("Apenas admins podem reprocessar emails");
  }
  return (perfil?.nome as string | undefined) ?? "utilizador";
}

export const reprocessarEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string; forcar?: boolean }) => {
    if (!data?.id) throw new Error("id inválido");
    return data;
  })
  .handler(async ({ data, context }): Promise<ResultadoReprocessar> => {
    const quem = await garantirAdmin(context.supabase, context.userId);
    const { reprocessarEmailGuardado } = await import("./reprocessar-email.server.ts");
    const res = await reprocessarEmailGuardado(
      context.supabase as never,
      data.id,
      quem,
      // Reprocessar é uma acção manual explícita: ignora o estado da fonte.
      data.forcar !== false,
    );
    return { ...res, motivo_sem_resultado: res.motivo_sem_resultado as MotivoSemResultado };
  });

/** Activa a fonte do email e volta a correr o pipeline num só passo. */
export const activarFonteEReprocessar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { emailId: string; fonteId: string }) => {
    if (!data?.emailId || !data?.fonteId) throw new Error("Dados inválidos");
    return data;
  })
  .handler(async ({ data, context }): Promise<ResultadoReprocessar> => {
    const quem = await garantirAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { error } = await supabaseAdmin
      .from("nl_fontes_curadoria")
      .update({ activa: true } as never)
      .eq("id", data.fonteId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("nl_audit_log").insert({
      quem,
      accao: "fonte_activada",
      detalhe: { fonte_id: data.fonteId, email_id: data.emailId },
    });

    const { reprocessarEmailGuardado } = await import("./reprocessar-email.server.ts");
    const res = await reprocessarEmailGuardado(context.supabase as never, data.emailId, quem, true);
    return { ...res, motivo_sem_resultado: res.motivo_sem_resultado as MotivoSemResultado };
  });

