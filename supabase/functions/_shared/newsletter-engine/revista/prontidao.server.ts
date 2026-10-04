import process from "node:process";
// Prontidão (readiness) do workflow Revista — Fase E3.
//
// Um único sítio responde à pergunta «esta edição pode seguir?». É lido pelo
// modal de envio (para mostrar o resumo humano antes da confirmação) e também
// pelo próprio servidor, antes de qualquer escrita externa: assim o bloqueio
// existe mesmo que o cliente seja contornado.
//
// Regra de ouro: só bloqueia o que é mesmo crítico. Backup, Rank Math e
// diagnósticos acessórios nunca impedem o envio.

import { encontrarDominiosBloqueados, lerListaDominios } from "./dominios-bloqueados.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

import { composeRevistaEdition, lerSnapshotRevista } from "./compose.server.ts";
import { estadoDestinos, urlCanonicaEdicao, caminhoCanonicoEdicao } from "./destinos.server.ts";
import { rotuloWorkflow, type EstadoWorkflow } from "./prontidao-rotulos.ts";
import { briefsActivos } from "./brief/modelo.server.ts";
import { validarBriefsDaEdicao } from "./brief/publicacao.server.ts";

export { rotuloWorkflow };
export type { EstadoWorkflow };

export type EstadoArea = "pronta" | "nao_aplicavel" | "aviso" | "bloqueada";

export type AccaoProntidao =
  | "publicar_cronica"
  | "actualizar_cronica"
  | "repetir_cronica"
  | "corrigir_url_cronica"
  | "corrigir_editorial"
  | "definir_assunto"
  | "escolher_listas"
  | "gerar_brief"
  | "rever_leitura"
  | "reformular_brief"
  | "reverificar_brief"
  | "corrigir_fonte";

export type ChaveArea =
  | "cronica"
  | "web"
  | "editorial"
  | "briefs"
  | "leituras"
  | "factualidade"
  | "fontes"
  | "snapshot"
  | "email"
  | "egoi"
  | "backup";

export interface AreaProntidao {
  chave: ChaveArea;
  rotulo: string;
  estado: EstadoArea;
  mensagem: string;
  accao?: AccaoProntidao;
  /**
   * «bloqueio» impede mesmo o envio (não há «enviar mesmo assim»);
   * «aviso» é confirmável por quem envia. Só as áreas dos Briefs e o
   * endereço da edição web bloqueiam.
   */
  severidade?: "bloqueio" | "aviso";
}


export interface Prontidao {
  ok: boolean;
  /** Mensagens dos bloqueios críticos, pela ordem em que devem ser resolvidos. */
  bloqueios: string[];
  /** Subconjunto sem hipótese de confirmação: o envio não pode seguir. */
  bloqueiosRigidos: string[];
  areas: AreaProntidao[];
  estadoWorkflow: EstadoWorkflow;
  /** Verdadeiro quando a edição não é Revista (o Clássico não usa isto). */
  naoAplicavel: boolean;
}


function admin(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

/* ─────────── validação do URL público da crónica ─────────── */

/**
 * O CTA da crónica tem de apontar para o artigo público real.
 * Rejeita rascunhos, permalinks internos (`?p=`, `?page_id=`) e placeholders.
 */
export function urlCronicaPublica(url: string | null | undefined): { ok: boolean; motivo?: string } {
  const v = (url ?? "").trim();
  if (!v) return { ok: false, motivo: "Falta o URL público da crónica." };
  if (!/^https:\/\/\S+$/i.test(v)) return { ok: false, motivo: "O URL da crónica tem de começar por https://." };
  if (/[?&](p|page_id|preview|preview_id)=/i.test(v)) {
    return { ok: false, motivo: "O URL da crónica ainda é um link interno de rascunho." };
  }
  if (/preview=true|\/\?p=|exemplo\.|example\.|localhost|lorem/i.test(v)) {
    return { ok: false, motivo: "O URL da crónica não é um endereço público válido." };
  }
  return { ok: true };
}

/** Compara ignorando barra final e protocolo, para não dar falsos alarmes. */
function mesmaUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  const n = (s: string | null | undefined) =>
    (s ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return !!n(a) && n(a) === n(b);
}

/* ─────────── avaliação ─────────── */

export interface OpcoesProntidao {
  /** Listas E-goi escolhidas no modal (quando ainda não houve envio). */
  listaIds?: string[];
}

export async function avaliarProntidao(
  edicaoId: string,
  opcoes?: OpcoesProntidao,
): Promise<Prontidao> {
  const sb = admin();

  const { data: edRaw } = await sb
    .from("nl_edicoes")
    .select("numero, assunto, estado, template_version, envio_em_curso")
    .eq("id", edicaoId)
    .maybeSingle();
  const ed = edRaw as
    | { numero: number; assunto: string | null; estado: string; template_version: string | null; envio_em_curso: string | null }
    | null;

  if (!ed) throw new Error("Edição não encontrada");
  if (ed.template_version !== "revista") {
    return {
      ok: true, bloqueios: [], bloqueiosRigidos: [], areas: [],
      estadoWorkflow: "a_validar", naoAplicavel: true,
    };
  }

  const [destinos, snapshot, estrutura] = await Promise.all([
    estadoDestinos(edicaoId),
    lerSnapshotRevista(edicaoId),
    composeRevistaEdition(edicaoId, { ignorarSnapshot: true }).catch(() => null),
  ]);

  const areas: AreaProntidao[] = [];
  const bloqueios: string[] = [];
  const bloqueiosRigidos: string[] = [];
  const bloquear = (a: AreaProntidao) => {
    const area: AreaProntidao = { severidade: "aviso", ...a };
    areas.push(area);
    bloqueios.push(area.mensagem);
    if (area.severidade === "bloqueio") bloqueiosRigidos.push(area.mensagem);
  };

  /* — domínios em lista negra na E-goi: a campanha seria pausada — */
  const { data: cfgDom } = await sb.from("nl_configuracoes").select("valor").eq("chave", "dominios_bloqueados_egoi").maybeSingle();
  const achados = estrutura
    ? encontrarDominiosBloqueados(estrutura, lerListaDominios((cfgDom as { valor: string | null } | null)?.valor))
    : [];
  if (achados.length > 0) {
    bloquear({
      chave: "egoi",
      rotulo: "Domínios bloqueados",
      estado: "bloqueada",
      severidade: "bloqueio",
      mensagem: `A edição tem links para ${achados.join(", ")}, um domínio em lista negra na E-goi. Retira esses links antes de enviar.`,
    });
  }

  /* — crónica em FredericoCarvalho.pt — */
  const cron = destinos.cronica;
  const urlComposta = (estrutura?.cronica.urlProvisoria ? "" : estrutura?.cronica.url) || cron.url || "";
  const validaUrl = urlCronicaPublica(urlComposta);

  if (cron.estado === "erro") {
    bloquear({
      chave: "cronica",
      rotulo: "Crónica",
      estado: "bloqueada",
      mensagem: "A publicação da crónica falhou. Tenta novamente antes de enviar.",
      accao: "repetir_cronica",
    });
  } else if (cron.estado === "desactualizada") {
    bloquear({
      chave: "cronica",
      rotulo: "Crónica",
      estado: "bloqueada",
      mensagem: "A crónica tem alterações por publicar.",
      accao: "actualizar_cronica",
    });
  } else if (cron.estado === "publicada") {
    if (!validaUrl.ok) {
      bloquear({
        chave: "cronica",
        rotulo: "Crónica",
        estado: "bloqueada",
        mensagem: validaUrl.motivo!,
        accao: "corrigir_url_cronica",
      });
    } else if (cron.url && !mesmaUrl(cron.url, urlComposta)) {
      // Existe artigo publicado, mas a edição continua a apontar para um URL
      // antigo colado à mão: o email levaria o link errado.
      bloquear({
        chave: "cronica",
        rotulo: "Crónica",
        estado: "bloqueada",
        mensagem: "O URL da crónica não corresponde ao artigo publicado.",
        accao: "corrigir_url_cronica",
      });
    } else {
      areas.push({
        chave: "cronica",
        rotulo: "Crónica",
        estado: "pronta",
        mensagem: "Crónica publicada e atualizada",
      });
    }
  } else if (cron.estado === "manual" && validaUrl.ok) {
    areas.push({
      chave: "cronica",
      rotulo: "Crónica",
      estado: "pronta",
      mensagem: "Crónica com URL público definido",
    });
  } else {
    // Inclui «nao_configurada», «pendente» e «rascunho»: nesta fase a primeira
    // publicação pública é sempre confirmada por uma pessoa, no painel.
    bloquear({
      chave: "cronica",
      rotulo: "Crónica",
      estado: "bloqueada",
      mensagem: "Crónica ainda não publicada",
      accao: "publicar_cronica",
    });
  }

  /* — edição web — */
  let urlWeb = "";
  try {
    urlWeb = await urlCanonicaEdicao(ed.numero, sb);
  } catch {
    urlWeb = "";
  }
  if (!urlWeb || !urlWeb.startsWith("https://") || !urlWeb.endsWith(caminhoCanonicoEdicao(ed.numero))) {
    bloquear({
      chave: "web",
      rotulo: "Edição web",
      estado: "bloqueada",
      mensagem: "O endereço da edição web não pôde ser resolvido.",
      severidade: "bloqueio",
    });
  } else {
    areas.push({ chave: "web", rotulo: "Edição web", estado: "pronta", mensagem: "Edição web pronta" });
  }

  /* — conteúdo editorial — */
  const problemas = estrutura?.problemas ?? ["Não foi possível compor a edição."];
  if (problemas.length) {
    bloquear({
      chave: "editorial",
      rotulo: "Conteúdo",
      estado: "bloqueada",
      mensagem: problemas[0],
      accao: "corrigir_editorial",
    });
  } else {
    areas.push({
      chave: "editorial",
      rotulo: "Conteúdo",
      estado: "pronta",
      mensagem: `${estrutura!.destaques.length} destaques · ${estrutura!.radar.length} Radar`,
    });
  }

  /* — Briefs, leituras, factualidade e fontes (Fase 3B) — */
  const activos = await briefsActivos(sb).catch(() => false);
  if (!activos) {
    for (const [chave, rotulo] of [
      ["briefs", "Briefs"],
      ["leituras", "Leituras"],
      ["factualidade", "Factualidade"],
      ["fontes", "Fontes"],
    ] as Array<[ChaveArea, string]>) {
      areas.push({ chave, rotulo, estado: "nao_aplicavel", mensagem: "Briefs desligados nesta edição" });
    }
  } else {
    const val = await validarBriefsDaEdicao(edicaoId, sb).catch(() => null);
    const nDestaques = estrutura?.destaques.length ?? 0;
    const nRadar = estrutura?.radar.length ?? 0;
    const total = nDestaques + nRadar;

    if (!val) {
      bloquear({
        chave: "briefs",
        rotulo: "Briefs",
        estado: "bloqueada",
        mensagem: "Não foi possível ler os Briefs desta edição.",
        severidade: "bloqueio",
        accao: "gerar_brief",
      });
    } else {
      const comBrief = val.prontos.length;
      if (comBrief < total) {
        const emFalta = [...val.incompletos, ...val.verificacoes][0]?.motivo;
        bloquear({
          chave: "briefs",
          rotulo: "Briefs",
          estado: "bloqueada",
          mensagem: `Faltam Briefs prontos: ${comBrief}/${total}.${emFalta ? ` ${emFalta}` : ""}`,
          severidade: "bloqueio",
          accao: "gerar_brief",
        });
      } else {
        areas.push({
          chave: "briefs",
          rotulo: "Briefs",
          estado: "pronta",
          mensagem: `${comBrief}/${total} Briefs prontos`,
        });
      }

      const leiturasOk = nDestaques - val.leiturasPorAprovar.length;
      if (val.leiturasPorAprovar.length) {
        bloquear({
          chave: "leituras",
          rotulo: "Leituras",
          estado: "bloqueada",
          mensagem: `Leituras por aprovar: ${leiturasOk}/${nDestaques}.`,
          severidade: "bloqueio",
          accao: "rever_leitura",
        });
      } else {
        areas.push({
          chave: "leituras",
          rotulo: "Leituras",
          estado: "pronta",
          mensagem: `${nDestaques}/${nDestaques} leituras aprovadas`,
        });
      }

      const problemasFacto = [...val.verificacoes, ...val.incompletos];
      if (problemasFacto.length) {
        bloquear({
          chave: "factualidade",
          rotulo: "Factualidade",
          estado: "bloqueada",
          mensagem: `Factualidade por resolver: ${val.factualidadeOk}/${val.total}. ${problemasFacto[0].motivo}`,
          severidade: "bloqueio",
          accao: problemasFacto[0].motivo.includes("perto do original")
            ? "reformular_brief"
            : "reverificar_brief",
        });
      } else {
        areas.push({
          chave: "factualidade",
          rotulo: "Factualidade",
          estado: "pronta",
          mensagem: `${val.factualidadeOk}/${val.total} peças verificadas`,
        });
      }

      if (val.fontes.length) {
        bloquear({
          chave: "fontes",
          rotulo: "Fontes",
          estado: "bloqueada",
          mensagem: `Fontes por corrigir: ${val.fontesOk}/${val.total}. ${val.fontes[0].motivo}`,
          severidade: "bloqueio",
          accao: "corrigir_fonte",
        });
      } else {
        areas.push({
          chave: "fontes",
          rotulo: "Fontes",
          estado: "pronta",
          mensagem: `${val.fontesOk}/${val.total} fontes válidas`,
        });
      }
    }
  }

  /* — snapshot — */
  if (snapshot?.estado === "bloqueado") {
    areas.push({
      chave: "snapshot",
      rotulo: "Versão fixada",
      estado: "pronta",
      mensagem: "Versão já fixada — será reutilizada tal como está",
    });
  } else if (snapshot) {
    if (!snapshot.email_html.trim()) {
      bloquear({
        chave: "snapshot",
        rotulo: "Versão fixada",
        estado: "bloqueada",
        mensagem: "A versão preparada da edição está incompleta.",
      });
    } else {
      areas.push({
        chave: "snapshot",
        rotulo: "Versão fixada",
        estado: "pronta",
        mensagem: "Versão preparada e pronta",
      });
    }
  } else {
    areas.push({
      chave: "snapshot",
      rotulo: "Versão fixada",
      estado: "pronta",
      mensagem: "A versão da edição será fixada no envio",
    });
  }

  /* — email — */
  const assunto = (ed.assunto ?? "").trim();
  if (assunto.length < 10) {
    bloquear({
      chave: "email",
      rotulo: "Email",
      estado: "bloqueada",
      mensagem: "O email ainda não tem assunto.",
      accao: "definir_assunto",
    });
  } else {
    areas.push({ chave: "email", rotulo: "Email", estado: "pronta", mensagem: "Email preparado" });
  }

  /* — E-goi — */
  const listas = (opcoes?.listaIds ?? []).filter(Boolean);
  if (!opcoes?.listaIds) {
    // Leitura fora do modal (cabeçalho): a escolha de listas ainda nem existe.
    areas.push({
      chave: "egoi",
      rotulo: "Listas",
      estado: "nao_aplicavel",
      mensagem: "Listas escolhidas no momento do envio",
    });
  } else if (listas.length === 0) {
    bloquear({
      chave: "egoi",
      rotulo: "Listas",
      estado: "bloqueada",
      mensagem: "Escolhe pelo menos uma lista de envio.",
      accao: "escolher_listas",
    });
  } else {
    areas.push({
      chave: "egoi",
      rotulo: "Listas",
      estado: "pronta",
      mensagem: `${listas.length} lista${listas.length === 1 ? "" : "s"} E-goi`,
    });
  }


  /* — backup (nunca bloqueia) — */
  if (destinos.backup.estado === "nao_configurado") {
    areas.push({
      chave: "backup",
      rotulo: "Cópia de segurança",
      estado: "nao_aplicavel",
      mensagem: "Cópia de segurança não configurada",
    });
  } else if (destinos.backup.estado === "erro") {
    areas.push({
      chave: "backup",
      rotulo: "Cópia de segurança",
      estado: "aviso",
      mensagem: "A última cópia de segurança falhou — o envio continua",
    });
  } else {
    areas.push({
      chave: "backup",
      rotulo: "Cópia de segurança",
      estado: "aviso",
      mensagem: destinos.backup.external_id
        ? "Cópia de segurança será atualizada em segundo plano"
        : "Cópia de segurança será criada em segundo plano",
    });
  }

  const ok = bloqueios.length === 0;
  const estadoWorkflow = derivarEstadoWorkflow({
    estadoEdicao: ed.estado,
    envioEmCurso: ed.envio_em_curso,
    estadoEmail: destinos.email.estado,
    snapshotBloqueado: snapshot?.estado === "bloqueado",
    ok,
  });

  return { ok, bloqueios, bloqueiosRigidos, areas, estadoWorkflow, naoAplicavel: false };
}

/**
 * Estado global humano do workflow. Derivado — não substitui nem duplica os
 * estados por destino, que continuam a ser a fonte de verdade operacional.
 */
export function derivarEstadoWorkflow(i: {
  estadoEdicao: string;
  envioEmCurso: string | null;
  estadoEmail: string;
  snapshotBloqueado: boolean;
  ok: boolean;
}): EstadoWorkflow {
  if (i.estadoEdicao === "enviada" && i.estadoEmail !== "parcial") return "enviada";
  if (i.estadoEmail === "erro") return "erro";
  if (i.envioEmCurso) return i.snapshotBloqueado ? "a_enviar" : "a_preparar";
  if (i.estadoEmail === "parcial" || (i.snapshotBloqueado && i.estadoEdicao !== "enviada")) {
    return "envio_parcial";
  }
  return i.ok ? "pronta_para_enviar" : "a_validar";
}
