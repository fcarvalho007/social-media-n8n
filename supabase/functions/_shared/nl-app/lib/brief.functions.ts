// Server functions do Brief — painel interno (Fase 2A).
//
// Todas exigem sessão: nada disto é chamado em páginas públicas. A lógica
// vive em `revista/brief/modelo.server.ts`; aqui só há a fronteira.

import { createServerFn } from "../_shim/start.ts";
import { requireSupabaseAuth } from "../_shim/auth.ts";

import type { BriefDaEdicao, TipoBrief } from "../../newsletter-engine/revista/brief/tipos.ts";

export type { BriefDaEdicao, TipoBrief };

export interface EdicaoParaBriefs {
  id: string;
  numero: number;
  estado: string;
  assunto: string | null;
}

export interface NoticiaParaBrief {
  id: string;
  titulo: string;
  url: string | null;
  categoria: string;
}

/** Edições Revista disponíveis no painel de Briefs. */
export const listarEdicoesBriefFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<EdicaoParaBriefs[]> => {
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { data, error } = await supabaseAdmin
      .from("nl_edicoes")
      .select("id, numero, estado, assunto, template_version")
      .order("numero", { ascending: false })
      .limit(20);
    if (error) throw error;
    return ((data ?? []) as Array<{
      id: string; numero: number; estado: string; assunto: string | null; template_version: string;
    }>)
      .filter((e) => (e.template_version ?? "").startsWith("revista"))
      .map(({ id, numero, estado, assunto }) => ({ id, numero, estado, assunto }));
  });

/** Notícias aprovadas da edição — universo a partir do qual se cria um Brief. */
export const listarNoticiasParaBriefFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId: string }) => ({ edicaoId: String(d?.edicaoId ?? "") }))
  .handler(async ({ data }): Promise<NoticiaParaBrief[]> => {
    if (!data.edicaoId) return [];
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { carregarNoticiasDaEdicao } = await import("../../newsletter-engine/revista/universo.ts");
    const noticias = await carregarNoticiasDaEdicao(supabaseAdmin as never, data.edicaoId);
    return noticias.map((n) => ({ id: n.id, titulo: n.titulo, url: n.url, categoria: n.categoria }));
  });

/** Briefs já associados a uma edição. */
export const listarBriefsDaEdicaoFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId: string }) => ({ edicaoId: String(d?.edicaoId ?? "") }))
  .handler(async ({ data }): Promise<BriefDaEdicao[]> => {
    if (!data.edicaoId) return [];
    const { listarBriefsDaEdicao } = await import("../../newsletter-engine/revista/brief/modelo.server.ts");
    return listarBriefsDaEdicao(data.edicaoId);
  });

/** Cria (ou reutiliza) o Brief de uma notícia e associa-o à edição. */
export const criarBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId: string; noticiaId: string; papel: TipoBrief }) => ({
    edicaoId: String(d?.edicaoId ?? ""),
    noticiaId: String(d?.noticiaId ?? ""),
    papel: d?.papel === "radar" ? ("radar" as const) : ("destaque" as const),
  }))
  .handler(async ({ data }): Promise<{ criado: boolean; slug: string; reutilizado: boolean }> => {
    const { supabaseAdmin } = await import("../_shim/admin.ts");
    const { obterOuCriarBrief, associarBriefAEdicao } = await import(
      "../../newsletter-engine/revista/brief/modelo.server.ts"
    );

    const { data: n, error } = await supabaseAdmin
      .from("nl_noticias")
      .select("id, titulo, url")
      .eq("id", data.noticiaId)
      .single();
    if (error) throw error;
    const noticia = n as { id: string; titulo: string; url: string | null };

    const { brief, criado } = await obterOuCriarBrief({
      noticiaId: noticia.id,
      titulo: noticia.titulo,
      url: noticia.url,
      tipo: data.papel,
    });

    await associarBriefAEdicao({
      briefId: brief.id,
      edicaoId: data.edicaoId,
      papel: data.papel,
      tituloApresentado: noticia.titulo,
    });

    return { criado, slug: brief.slug, reutilizado: !criado };
  });

/** Retira o Brief desta edição (o Brief em si mantém-se). */
export const removerBriefDaEdicaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { briefId: string; edicaoId: string }) => ({
    briefId: String(d?.briefId ?? ""),
    edicaoId: String(d?.edicaoId ?? ""),
  }))
  .handler(async ({ data }) => {
    const { desassociarBriefDaEdicao } = await import("../../newsletter-engine/revista/brief/modelo.server.ts");
    await desassociarBriefDaEdicao(data);
    return { ok: true };
  });

/** Grava o conteúdo editorial escrito à mão (sem IA nesta fase). */
export const guardarConteudoBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    id: string;
    em30: string[];
    porqueInteressa: Array<{ rotulo: string; texto: string }>;
    leitura: string;
    fonteUrl: string;
    publisher: string;
  }) => ({
    id: String(d?.id ?? ""),
    em30: Array.isArray(d?.em30) ? d.em30.map(String) : [],
    porqueInteressa: Array.isArray(d?.porqueInteressa)
      ? d.porqueInteressa.map((i) => ({ rotulo: String(i?.rotulo ?? ""), texto: String(i?.texto ?? "") }))
      : [],
    leitura: String(d?.leitura ?? ""),
    fonteUrl: String(d?.fonteUrl ?? ""),
    publisher: String(d?.publisher ?? ""),
  }))
  .handler(async ({ data }) => {
    const { actualizarConteudo } = await import("../../newsletter-engine/revista/brief/modelo.server.ts");
    const b = await actualizarConteudo(data.id, {
      em_30_segundos: data.em30.filter((t) => t.trim()).map((texto) => ({ texto: texto.trim() })),
      porque_interessa: data.porqueInteressa
        .filter((i) => i.texto.trim())
        .map((i, idx) => ({ ordem: idx + 1, rotulo: i.rotulo.trim(), texto: i.texto.trim() })),
      leitura_aprovada: data.leitura,
      fonte_url: data.fonteUrl.trim() || null,
      fonte_publisher: data.publisher.trim() || null,
    });
    return { estado: b.estado, aprovada: Boolean(b.aprovada_em) };
  });

/** Aprovação explícita da leitura de um Destaque. */
export const aprovarLeituraBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; texto: string }) => ({
    id: String(d?.id ?? ""),
    texto: String(d?.texto ?? ""),
  }))
  .handler(async ({ data, context }) => {
    const { aprovarLeitura, registarVersao } = await import(
      "../../newsletter-engine/revista/brief/modelo.server.ts"
    );
    const quem = (context.claims?.email as string | undefined) ?? context.userId;
    const b = await aprovarLeitura({ id: data.id, texto: data.texto, quem });
    await registarVersao({ id: data.id, motivo: "Leitura aprovada", quem });
    return { estado: b.estado, aprovadaEm: b.aprovada_em };
  });

/** Volta a pôr a leitura por rever. */
export const revogarLeituraBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const { revogarAprovacao } = await import("../../newsletter-engine/revista/brief/modelo.server.ts");
    const b = await revogarAprovacao(data.id);
    return { estado: b.estado };
  });

/* ─────────── motor editorial (Fase 2B) ─────────── */

const COMPONENTES = ["tudo", "em_30_segundos", "porque_interessa", "leitura_sugerida"] as const;
const INTENCOES = [
  "normal",
  "mais_pragmatico",
  "mais_curto",
  "menos_opinativo",
  "outro_angulo",
  "simplificar",
] as const;

export type ComponenteBriefUi = (typeof COMPONENTES)[number];
export type IntencaoBriefUi = (typeof INTENCOES)[number];

export interface ResultadoGeracaoUi {
  estado: string;
  bloqueado: boolean;
  motivos: string[];
  erro: string | null;
}

/** Gera ou regenera o Brief (tudo ou apenas uma peça). */
export const gerarBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; componente?: string; intencao?: string }) => ({
    id: String(d?.id ?? ""),
    componente: (COMPONENTES as readonly string[]).includes(String(d?.componente))
      ? (String(d?.componente) as ComponenteBriefUi)
      : ("tudo" as const),
    intencao: (INTENCOES as readonly string[]).includes(String(d?.intencao))
      ? (String(d?.intencao) as IntencaoBriefUi)
      : ("normal" as const),
  }))
  .handler(async ({ data }): Promise<ResultadoGeracaoUi> => {
    const { gerarBrief } = await import("../../newsletter-engine/revista/brief/motor.server.ts");
    const r = await gerarBrief({
      briefId: data.id,
      componente: data.componente,
      intencao: data.intencao,
    });
    return {
      estado: r.brief.estado,
      bloqueado: r.bloqueado,
      motivos: r.motivos,
      erro: r.brief.erro,
    };
  });

/** Reformula quando a proximidade com o original bloqueou o Brief. */
export const reformularBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }): Promise<ResultadoGeracaoUi> => {
    const { reformularBrief } = await import("../../newsletter-engine/revista/brief/motor.server.ts");
    const r = await reformularBrief(data.id);
    return { estado: r.brief.estado, bloqueado: r.bloqueado, motivos: r.motivos, erro: r.brief.erro };
  });

/** Nova passagem de verificação, sem reescrever texto. */
export const reverificarBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }): Promise<ResultadoGeracaoUi> => {
    const { reverificarBrief } = await import("../../newsletter-engine/revista/brief/motor.server.ts");
    const r = await reverificarBrief(data.id);
    return { estado: r.brief.estado, bloqueado: r.bloqueado, motivos: r.motivos, erro: r.brief.erro };
  });

/* ─────────── workflow editorial na edição (Fase 2C) ─────────── */

export interface EstadoBriefEdicao {
  briefId: string;
  noticiaId: string | null;
  papel: TipoBrief;
  estado: string;
  rotulo: string;
  aprovada: boolean;
  titulo: string;
  slug: string;
  fonteUrl: string | null;
  fontePublisher: string | null;
  em30: string[];
  porqueInteressa: Array<{ rotulo: string; texto: string }>;
  leitura: string;
  pullQuote: string;
  motivos: string[];
  precisaAtencao: boolean;
  erro: string | null;
  actualizadoEm: string;
}

/** Estado dos Briefs de uma edição — o que o Editor Revista precisa de saber. */
export const estadoBriefsDaEdicaoFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId: string }) => ({ edicaoId: String(d?.edicaoId ?? "") }))
  .handler(async ({ data }): Promise<EstadoBriefEdicao[]> => {
    if (!data.edicaoId) return [];
    const { listarBriefsDaEdicao } = await import("../../newsletter-engine/revista/brief/modelo.server.ts");
    const { avaliarAtencao, rotuloEstadoCurto, rotuloMotivoAtencao } = await import(
      "../../newsletter-engine/revista/brief/atencao.ts"
    );

    const briefs = await listarBriefsDaEdicao(data.edicaoId);
    return briefs.map((b) => {
      const atencao = avaliarAtencao(b);
      const aprovada = Boolean(b.aprovada_em);
      return {
        briefId: b.id,
        noticiaId: b.noticia_id,
        papel: b.papel,
        estado: b.estado,
        rotulo: rotuloEstadoCurto(b.papel, b.estado, aprovada),
        aprovada,
        titulo: b.titulo_apresentado ?? "",
        slug: b.slug,
        fonteUrl: b.fonte_url,
        fontePublisher: b.fonte_publisher,
        em30: b.em_30_segundos.map((p) => p.texto),
        porqueInteressa: b.porque_interessa.map((i) => ({ rotulo: i.rotulo, texto: i.texto })),
        leitura: b.leitura_aprovada.trim() || b.leitura_sugerida,
        pullQuote: b.pull_quote_sugerida,
        motivos: atencao.motivos.map(rotuloMotivoAtencao),
        precisaAtencao: atencao.precisa,
        erro: b.erro,
        actualizadoEm: b.updated_at,
      };
    });
  });

/** Acompanha a escolha editorial: Destaque, Radar ou fora do email. */
export const sincronizarBriefPapelFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId: string; noticiaId: string; papel: string | null }) => ({
    edicaoId: String(d?.edicaoId ?? ""),
    noticiaId: String(d?.noticiaId ?? ""),
    papel: d?.papel === "destaque" || d?.papel === "radar" ? (d.papel as TipoBrief) : null,
  }))
  .handler(async ({ data }): Promise<{ briefId: string | null; criado: boolean }> => {
    if (!data.edicaoId || !data.noticiaId) return { briefId: null, criado: false };
    const { sincronizarPapelBrief } = await import("../../newsletter-engine/revista/brief/modelo.server.ts");
    return sincronizarPapelBrief(data);
  });

/** Autosave do texto da leitura em revisão. */
export const guardarLeituraBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; texto: string }) => ({
    id: String(d?.id ?? ""),
    texto: String(d?.texto ?? ""),
  }))
  .handler(async ({ data }) => {
    const { guardarLeituraSugerida } = await import("../../newsletter-engine/revista/brief/modelo.server.ts");
    return guardarLeituraSugerida(data);
  });

/**
 * Reconcilia todos os Briefs de uma edição com as escolhas já feitas em
 * «A Atualidade». Idempotente — serve para edições anteriores a esta fase.
 */
export const sincronizarBriefsDaEdicaoFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { edicaoId: string }) => ({ edicaoId: String(d?.edicaoId ?? "") }))
  .handler(async ({ data }): Promise<{ sincronizados: number }> => {
    if (!data.edicaoId) return { sincronizados: 0 };
    const { sincronizarPapelBrief, clienteBrief } = await import(
      "../../newsletter-engine/revista/brief/modelo.server.ts"
    );
    const db = clienteBrief();
    const { data: itens, error } = await db
      .from("nl_revista_itens")
      .select("noticia_id, papel")
      .eq("edicao_id", data.edicaoId);
    if (error) throw error;

    let n = 0;
    for (const it of (itens ?? []) as Array<{ noticia_id: string; papel: string }>) {
      if (it.papel !== "destaque" && it.papel !== "radar") continue;
      try {
        await sincronizarPapelBrief({
          edicaoId: data.edicaoId,
          noticiaId: it.noticia_id,
          papel: it.papel,
        });
        n += 1;
      } catch {
        // uma notícia problemática não impede as restantes
      }
    }
    return { sincronizados: n };
  });

/** Identidade editorial pública do Brief: título canónico e tese. */
export const guardarIdentidadeBriefFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; tituloEditorial: string; teseEditorial: string }) => ({
    id: String(d?.id ?? ""),
    tituloEditorial: String(d?.tituloEditorial ?? ""),
    teseEditorial: String(d?.teseEditorial ?? ""),
  }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { guardarIdentidadeEditorial } = await import(
      "../../newsletter-engine/revista/brief/modelo.server.ts"
    );
    await guardarIdentidadeEditorial({
      id: data.id,
      tituloEditorial: data.tituloEditorial,
      teseEditorial: data.teseEditorial,
    });
    return { ok: true };
  });
