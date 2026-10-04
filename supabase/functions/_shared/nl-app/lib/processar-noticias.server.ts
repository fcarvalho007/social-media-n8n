// Motor de extracção de notícias a partir de texto colado (WhatsApp, emails,
// blocos soltos). Portado da antiga Edge Function `processar-noticias` para
// correr dentro da própria aplicação.
//
// Server-only: só é importado por `processar-noticias.functions.ts`.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  mapCategoria,
  limparLinhasWhatsApp,
  normalizarUrl,
  segmentarMensagensWhatsApp,
  segmentarWhatsAppCopiado,
  desembrulharUrl,
} from "../edge-shared/ia-limpeza.ts";
import { custoUsd } from "../edge-shared/custos-ia.ts";
import { procurarDuplicadosUrl, descreverGemea } from "../edge-shared/dedup-url.ts";
import { motivoTituloLixo, descreverMotivoLixo } from "../edge-shared/ruido-titulo.ts";
import { sanitizarSaidaIA } from "./sanitizar-ia.ts";
import { chamarDeepSeek, parseJsonTolerante } from "./deepseek.server.ts";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Admin = SupabaseClient<any, any, any>;

export const MODELOS_VALIDOS = ["deepseek-flash", "deepseek-v4-pro"] as const;
export type ModeloDeepSeek = (typeof MODELOS_VALIDOS)[number];
export const MODELO_PADRAO: ModeloDeepSeek = "deepseek-flash";

// Nomes antigos ainda guardados em `definicoes_ia` ou em pedidos existentes.
const ALIAS_MODELO: Record<string, ModeloDeepSeek> = {
  "deepseek-v4-flash": "deepseek-flash",
  "deepseek-v4-flash-vision-exp": "deepseek-flash",
  "deepseek-chat": "deepseek-flash",
};

export function normalizarModelo(m: unknown): ModeloDeepSeek {
  if (typeof m !== "string") return MODELO_PADRAO;
  if ((MODELOS_VALIDOS as readonly string[]).includes(m)) return m as ModeloDeepSeek;
  return ALIAS_MODELO[m] ?? MODELO_PADRAO;
}

export const PROMPT_SISTEMA = `És um extrator factual. Trabalha exclusivamente com o conteúdo recebido; não inventes nem pesquises. Devolve APENAS JSON válido com: categoria, titulo, descricao, fonte, url.

Idioma de saída sempre pt-PT (português europeu), independentemente da língua do texto de origem — se vier em inglês, espanhol ou outra, traduz e reinterpreta.

- categoria: uma de INTELIGÊNCIA ARTIFICIAL, GOOGLE, YOUTUBE & VÍDEO, META, LINKEDIN, TIKTOK, X, MEDIA & NEGÓCIOS ONLINE. Heurística: IA/LLMs/OpenAI/Anthropic/Gemini-modelo/tech geral→INTELIGÊNCIA ARTIFICIAL; Google/Search/Chrome/Android/Pixel→GOOGLE; YouTube/Shorts→YOUTUBE & VÍDEO; Facebook/Instagram/WhatsApp/Threads/Meta→META; LinkedIn→LINKEDIN; TikTok→TIKTOK; X/Twitter→X; creators/jornalismo/media/criadores/negócios digitais→MEDIA & NEGÓCIOS ONLINE.

- titulo: pt-PT, começa com exactamente 1 emoji relevante, seguido de espaço. Sentence case: só a 1.ª letra maiúscula, salvo nomes próprios (marcas, pessoas, produtos). Nunca CAIXA ALTA. Máx. ~120 caracteres, sem quebras de linha.

- descricao: pt-PT, 18-30 palavras, objectiva e factual, sem emojis. REGRA DURA: a descrição NUNCA pode ser o título por outras palavras. Tem de acrescentar informação que o título não dá — um número, uma data ou prazo, quem é afectado, uma condição, uma limitação ou a consequência prática. Não reaproveites a estrutura nem as palavras fortes do título. Se o material disponível só permitir repetir o título, escolhe o detalhe mais concreto do corpo do artigo.

- fonte: derivada do domínio do url, sem "www.", com capitalização natural (techcrunch.com → TechCrunch, theverge.com → The Verge, publico.pt → Público).

- url: copiar exactamente o URL do bloco; se url_manual vier preenchido, usa esse. Se não houver URL, devolve string vazia "" — nunca "sem dados" no campo url.

- "sem dados": apenas para campos impossíveis de identificar (ex.: fonte quando não há url); nunca para o campo url.`;

export type IaResultado = {
  categoria?: string;
  titulo?: string;
  descricao?: string;
  fonte?: string;
  url?: string;
};

export type Usage = { cacheHit: number; cacheMiss: number; saida: number };

export type AvisoRepeticao = {
  id: string;
  titulo: string;
  estado: string;
  edicao_numero: number | null;
  score: number;
};

export type ItemExtraido = {
  titulo: string;
  descricao: string;
  url: string;
  categoria: string;
  /** Notícia já existente com título muito parecido. Só avisa; não bloqueia. */
  avisoRepeticao?: AvisoRepeticao | null;
};

/** Acima deste valor de similaridade de título tratamos como possível repetição. */
export const LIMIAR_TITULO_PARECIDO = 0.55;

/** Fase 1 (pg_trgm, grátis): devolve o melhor candidato parecido, se houver. */
export async function procurarTituloParecido(
  admin: Admin,
  titulo: string,
  categoria: string,
): Promise<AvisoRepeticao | null> {
  try {
    const { data } = await admin.rpc("nl_encontrar_candidatos_repeticao", {
      _titulo: titulo,
      _categoria: categoria,
    });
    const melhor = (data ?? [])[0] as
      | { id: string; titulo: string; edicao_numero: number | null; score: number }
      | undefined;
    if (!melhor || typeof melhor.score !== "number" || melhor.score < LIMIAR_TITULO_PARECIDO) return null;
    return {
      id: melhor.id,
      titulo: melhor.titulo ?? "",
      estado: melhor.edicao_numero ? "enviada" : "pendente",
      edicao_numero: melhor.edicao_numero ?? null,
      score: melhor.score,
    };
  } catch {
    return null;
  }
}

type EstadoBloco = "extraida" | "duplicada" | "sem_url" | "ia_vazia" | "ia_erro" | "fallback" | "ruido";

export type Diagnostico = {
  ordem: number;
  preview: string;
  estado: EstadoBloco;
  motivo?: string;
  url?: string;
};

/* ─── Utilitários de segmentação ─── */

export function extrairUrl(bloco: string): string | null {
  const m = bloco.match(/https?:\/\/[^\s<>"')]+/i);
  if (!m) return null;
  const bruto = m[0].replace(/[.,;:!?)]+$/, "");
  return desembrulharUrl(bruto);
}

function isRotuloPreview(linha: string): { host: string } | null {
  const t = linha.trim();
  if (/https?:\/\//i.test(t)) return null;
  const m = t.match(/^(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\/?$/i);
  return m ? { host: m[1].toLowerCase() } : null;
}

function blocoTemUrlDoHost(bloco: string, host: string): boolean {
  const m = bloco.match(/https?:\/\/([^\s<>"')/]+)/i);
  if (!m) return false;
  return m[1].toLowerCase().replace(/^www\./, "").endsWith(host.replace(/^www\./, ""));
}

export type ModoSegmentacao = "whatsapp" | "whatsapp_copiado" | "generico";

export function separarBlocos(texto: string): { blocos: string[]; modo: ModoSegmentacao } {
  const wa = segmentarMensagensWhatsApp(texto);
  if (wa && wa.length > 0) return { blocos: wa, modo: "whatsapp" };

  const copiado = segmentarWhatsAppCopiado(texto);
  if (copiado && copiado.length > 0) return { blocos: copiado, modo: "whatsapp_copiado" };

  const limpo = limparLinhasWhatsApp(texto);
  const cru = limpo.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b.length > 0);
  const fundidos: string[] = [];
  for (let i = 0; i < cru.length; i++) {
    const b = cru[i];
    const linhas = b.split("\n").map((x) => x.trim()).filter(Boolean);
    const temUrl = /https?:\/\//i.test(b);
    const rotulo = linhas.length > 0 ? isRotuloPreview(linhas[linhas.length - 1]) : null;
    if (!temUrl && rotulo && i + 1 < cru.length && blocoTemUrlDoHost(cru[i + 1], rotulo.host)) {
      fundidos.push(`${b}\n\n${cru[i + 1]}`);
      i += 1;
      continue;
    }
    fundidos.push(b);
  }

  // Parágrafos sem URL são contexto da notícia seguinte: agrega-os ao próximo
  // parágrafo que tenha link, em vez de os descartar por "sem URL".
  const agregados: string[] = [];
  let pendente: string[] = [];
  for (const b of fundidos) {
    if (/https?:\/\//i.test(b)) {
      agregados.push([...pendente, b].join("\n\n").trim());
      pendente = [];
    } else {
      pendente.push(b);
    }
  }
  if (pendente.length > 0) agregados.push(pendente.join("\n\n").trim());

  return {
    blocos: agregados.filter((b) => b.replace(/[^\p{L}\p{N}]/gu, "").length >= 20),
    modo: "generico",
  };
}


/* ─── IA ─── */

export async function extrairComIA(
  modelo: ModeloDeepSeek,
  bloco: string,
  urlManual: string | undefined,
): Promise<{ resultado: IaResultado | null; usage: Usage }> {
  const conteudo = urlManual ? `Bloco:\n${bloco}\n\nurl_manual: ${urlManual}` : `Bloco:\n${bloco}`;
  const r = await chamarDeepSeek(PROMPT_SISTEMA, conteudo, { modelo, responseJson: true });
  return { resultado: parseJsonTolerante<IaResultado>(r.conteudo), usage: r.usage };
}

export async function registarUso(
  admin: Admin,
  modelo: string,
  usage: Usage,
  origem: string,
  edicaoId: string | null,
): Promise<void> {
  try {
    await admin.from("nl_ia_uso").insert({
      modelo,
      tokens_entrada_cache_hit: usage.cacheHit,
      tokens_entrada_cache_miss: usage.cacheMiss,
      tokens_saida: usage.saida,
      custo_usd: custoUsd(modelo, usage.cacheHit, usage.cacheMiss, usage.saida),
      origem,
      edicao_id: edicaoId,
    });
  } catch (e) {
    console.error("Falha a registar ia_uso:", (e as Error).message);
  }
}

/* ─── Acção: extrair ─── */

export type ResultadoExtraccao = {
  ok: boolean;
  mensagem?: string;
  itens: ItemExtraido[];
  duplicadas: number;
  ignoradas: number;
  fallbacks: number;
  aviso: string | null;
  diagnostico: Diagnostico[];
  modo: ModoSegmentacao;
  blocos: number;
};

const LIMITE_BLOCOS = 20;

export async function extrairNoticiasDoTexto(
  admin: Admin,
  modelo: ModeloDeepSeek,
  quem: string,
  texto: string,
  urlManual: string | undefined,
): Promise<ResultadoExtraccao> {
  const { blocos: blocosTodos, modo } = separarBlocos(texto);
  const vazio = {
    itens: [], duplicadas: 0, ignoradas: 0, fallbacks: 0, aviso: null,
    diagnostico: [], modo, blocos: blocosTodos.length,
  };
  if (blocosTodos.length === 0) {
    return { ok: false, mensagem: "Texto sem conteúdo útil.", ...vazio };
  }


  const excedido = blocosTodos.length > LIMITE_BLOCOS;
  const blocos = excedido ? blocosTodos.slice(0, LIMITE_BLOCOS) : blocosTodos;
  const aviso = excedido
    ? `Só processei as primeiras ${LIMITE_BLOCOS} — cola o resto numa segunda vez.`
    : null;

  const podeUsarManual = blocos.length === 1 && !!urlManual;
  let ignoradas = 0;
  let duplicadas = 0;
  let fallbacks = 0;
  const erros: string[] = [];

  // Dedup contra a BD por URL normalizado (coluna `url_norm`, preenchida por
  // trigger). Apanha variantes com utm/www/barra final sem varrer por host.
  const candidatos = blocos
    .map((b) => extrairUrl(b) ?? (podeUsarManual ? urlManual ?? null : null))
    .filter((u): u is string => !!u);
  const gemeasUrl = await procurarDuplicadosUrl(admin, candidatos);
  const existentes = new Set<string>(gemeasUrl.keys());


  const vistos = new Set<string>();
  const itens: ItemExtraido[] = [];
  const diagnostico: Diagnostico[] = [];
  const previewDe = (b: string) => b.replace(/\s+/g, " ").trim().slice(0, 90);

  const fallbackDeterministico = (bloco: string, url: string): ItemExtraido | null => {
    const linhas = bloco.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const tituloBruto = sanitizarSaidaIA(linhas[0] ?? "").slice(0, 120);
    const restante = sanitizarSaidaIA(linhas.slice(1).join(" ").replace(url, "").trim()).slice(0, 180);
    if (!tituloBruto) return null;
    return { titulo: tituloBruto, descricao: restante, categoria: "ia", url };
  };

  for (let i = 0; i < blocos.length; i++) {
    const bloco = blocos[i];
    const ordem = i + 1;
    const preview = previewDe(bloco);
    const urlDetectado = extrairUrl(bloco);
    const urlEfectivo = urlDetectado ?? (podeUsarManual ? urlManual! : null);
    if (!urlEfectivo) {
      ignoradas += 1;
      diagnostico.push({ ordem, preview, estado: "sem_url", motivo: "Bloco sem URL." });
      continue;
    }
    const k = normalizarUrl(urlEfectivo);
    if (vistos.has(k) || existentes.has(k)) {
      duplicadas += 1;
      diagnostico.push({
        ordem, preview, estado: "duplicada", url: urlEfectivo,
        motivo: gemeasUrl.has(k)
          ? `URL já existe: ${descreverGemea(gemeasUrl.get(k)!)}`
          : "URL repetido dentro desta colagem.",
      });
      continue;
    }
    vistos.add(k);

    let ia: IaResultado | null = null;
    let erroIa: string | null = null;
    try {
      const chamada = await extrairComIA(modelo, bloco, urlDetectado ? undefined : urlManual);
      await registarUso(admin, modelo, chamada.usage, "colagem_manual", null);
      ia = chamada.resultado;
    } catch (e) {
      erroIa = (e as Error).message;
      erros.push(erroIa);
    }

    if (!ia) {
      const fb = fallbackDeterministico(bloco, urlEfectivo);
      if (fb) {
        itens.push(fb);
        fallbacks += 1;
        diagnostico.push({
          ordem, preview, estado: "fallback", url: fb.url,
          motivo: erroIa
            ? `IA falhou (${erroIa.slice(0, 80)}) — usei a 1.ª linha como título.`
            : "IA sem resposta — usei a 1.ª linha como título.",
        });
      } else {
        ignoradas += 1;
        diagnostico.push({
          ordem, preview,
          estado: erroIa ? "ia_erro" : "ia_vazia",
          motivo: erroIa ?? "IA devolveu vazio e não consegui recuperar um título.",
          url: urlEfectivo,
        });
      }
      continue;
    }

    const titulo = (typeof ia.titulo === "string" && ia.titulo.trim()) || "sem dados";
    const descricao = (typeof ia.descricao === "string" && ia.descricao.trim()) || "";
    const categoria = mapCategoria(ia.categoria);
    const urlBruto = typeof ia.url === "string" && /^https?:\/\//i.test(ia.url) ? ia.url : urlEfectivo;
    const urlFinal = desembrulharUrl(urlBruto);
    const kFinal = normalizarUrl(urlFinal);
    if (kFinal !== k && (vistos.has(kFinal) || existentes.has(kFinal))) {
      duplicadas += 1;
      diagnostico.push({
        ordem, preview, estado: "duplicada", url: urlFinal,
        motivo: gemeasUrl.has(kFinal)
          ? `URL já existe: ${descreverGemea(gemeasUrl.get(kFinal)!)}`
          : "URL final duplicado após a IA.",
      });
      continue;
    }
    vistos.add(kFinal);

    const tituloFinal = titulo.slice(0, 240);

    // Páginas institucionais («Termos de serviço», «Política de privacidade»,
    // «Sobre nós») e títulos sem conteúdo não são notícia: saem já aqui.
    const motivoLixo = motivoTituloLixo(tituloFinal, descricao, urlFinal);
    if (motivoLixo) {
      ignoradas += 1;
      diagnostico.push({
        ordem, preview, estado: "ruido", url: urlFinal,
        motivo: `Descartada — ${descreverMotivoLixo(motivoLixo)}.`,
      });
      continue;
    }

    const avisoRepeticao = await procurarTituloParecido(admin, tituloFinal, categoria);
    itens.push({ titulo: tituloFinal, descricao, url: urlFinal, categoria, avisoRepeticao });
    diagnostico.push({
      ordem, preview, estado: "extraida", url: urlFinal,
      motivo: avisoRepeticao
        ? `Possível repetição de «${avisoRepeticao.titulo}»${avisoRepeticao.edicao_numero ? ` (edição #${avisoRepeticao.edicao_numero})` : ""}.`
        : undefined,
    });
  }

  await admin.from("nl_audit_log").insert({
    quem,
    accao: "noticias_ia_extraidas",
    detalhe: {
      detectadas: itens.length, ignoradas, duplicadas, fallbacks,
      blocos: blocos.length, total_blocos: blocosTodos.length, modo, modelo,
      erros: erros.slice(0, 5),
    },
  });

  if (itens.length === 0 && erros.length > 0) {
    return { ok: false, mensagem: erros[0], itens: [], duplicadas, ignoradas, fallbacks, aviso, diagnostico, modo, blocos: blocos.length };
  }
  return { ok: true, itens, duplicadas, ignoradas, fallbacks, aviso, diagnostico, modo, blocos: blocos.length };
}

/* ─── Acção: confirmar ─── */

export type ResultadoConfirmacao = {
  ok: boolean;
  mensagem?: string;
  quantidade: number;
  duplicadas: number;
  /** Explicação por notícia ignorada por já existir. */
  duplicadas_detalhe?: string[];
  ids: string[];
};

export async function confirmarNoticiasNaFila(
  admin: Admin,
  modelo: ModeloDeepSeek,
  quem: string,
  itens: ItemExtraido[],
): Promise<ResultadoConfirmacao> {
  const normalizados = itens
    .map((i) => ({
      titulo: String(i.titulo ?? "").slice(0, 240),
      descricao: String(i.descricao ?? ""),
      url: String(i.url ?? ""),
      categoria: String(i.categoria ?? "ia"),
    }))
    .filter((i) => i.titulo && /^https?:\/\//i.test(i.url))
    // Rede de segurança: mesmo que o utilizador confirme, nada institucional entra.
    .filter((i) => !motivoTituloLixo(i.titulo, i.descricao, i.url));

  // Última verificação antes de gravar: o URL pode ter entrado entretanto
  // (curadoria automática, email, outro separador aberto).
  const urls = normalizados.map((i) => i.url);
  const gemeas = await procurarDuplicadosUrl(admin, urls);
  const existentes = new Set<string>(gemeas.keys());
  const duplicadasDetalhe: string[] = [];

  const vistos = new Set<string>();
  let duplicadas = 0;
  const paraInserir = normalizados.filter((i) => {
    const k = normalizarUrl(i.url);
    if (vistos.has(k) || existentes.has(k)) {
      duplicadas += 1;
      const g = gemeas.get(k);
      duplicadasDetalhe.push(g ? `«${i.titulo}» → ${descreverGemea(g)}` : `«${i.titulo}» → repetida na lista`);
      return false;
    }
    vistos.add(k);
    return true;
  });

  let quantidade = 0;
  let ids: string[] = [];
  let erroMsg: string | null = null;

  if (paraInserir.length > 0) {
    const { confirmarRepeticaoIA } = await import(
      "../edge-shared/deteccao-repeticao.ts"
    );

    let fase2Activa = true;
    try {
      const { data: cfg } = await admin
        .from("nl_configuracoes").select("valor").eq("chave", "deteccao_repeticao_ia_activa").maybeSingle();
      if (cfg && cfg.valor === "false") fase2Activa = false;
    } catch {
      /* default: activo */
    }

    const chamarChatDedup = async (system: string, user: string) => {
      try {
        const r = await chamarDeepSeek(system, user, { modelo: MODELO_PADRAO, temperatura: 0 });
        if (!r.conteudo) return null;
        return { conteudo: r.conteudo, usage: r.usage, modelo: r.modelo };
      } catch {
        return null;
      }
    };

    const linhas: Record<string, unknown>[] = [];
    for (const i of paraInserir) {
      let repeticaoDe: string | null = null;
      let repeticaoScore: number | null = null;
      const hit = await confirmarRepeticaoIA(
        admin as never,
        { titulo: i.titulo, descricao: i.descricao, categoria: i.categoria },
        chamarChatDedup,
        {
          fase2Activa,
          origem: "confirmar_repeticao",
          onFase1IgnoradaPorConfig: async (candidatos) => {
            try {
              await admin.from("nl_audit_log").insert({
                quem,
                accao: "repeticao_fase1_ignorada_por_config",
                detalhe: {
                  titulo: i.titulo,
                  categoria: i.categoria,
                  url: i.url,
                  candidatos: candidatos.slice(0, 3).map((c) => ({
                    id: c.id, titulo: c.titulo, score: c.score, edicao_numero: c.edicao_numero,
                  })),
                },
              });
            } catch {
              /* nunca bloqueia */
            }
          },
        },
      );
      if (hit) {
        repeticaoDe = hit.candidato_id;
        repeticaoScore = hit.score_trgm;
      }

      linhas.push({
        titulo: i.titulo,
        descricao: i.descricao,
        url: i.url,
        categoria: i.categoria,
        origem: "manual_ia",
        estado: "pendente",
        destino: "news",
        destaque: false,
        ordem: 0,
        edicao_id: null,
        repeticao_de: repeticaoDe,
        repeticao_score: repeticaoScore,
        repeticao_verificada_em: new Date().toISOString(),
      });
    }

    const { data: inseridas, error } = await admin.from("nl_noticias").insert(linhas).select("id");
    if (error) erroMsg = error.message;
    else {
      quantidade = inseridas?.length ?? linhas.length;
      ids = (inseridas ?? []).map((r: { id: string }) => r.id);
    }
  }

  await admin.from("nl_audit_log").insert({
    quem,
    accao: "noticias_ia_confirmadas",
    detalhe: {
      quantidade, duplicadas, submetidas: itens.length, modelo, erro: erroMsg,
      duplicadas_detalhe: duplicadasDetalhe.slice(0, 20),
    },
  });

  if (quantidade === 0 && erroMsg) {
    return { ok: false, mensagem: erroMsg, quantidade: 0, duplicadas, duplicadas_detalhe: duplicadasDetalhe, ids: [] };
  }
  return { ok: true, quantidade, duplicadas, duplicadas_detalhe: duplicadasDetalhe, ids };
}
