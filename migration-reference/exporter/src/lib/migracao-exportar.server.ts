// Read-only export of the newsletter module for migration to an autonomous copy.
// Never writes to the database, storage or external services.
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const VERSAO_PACOTE = "digital-sprint-migracao/1";

/** Import order respecting FKs. `pk` drives deterministic pagination. */
export const TABELAS: { nome: string; pk: string; fks: string[] }[] = [
  { nome: "perfis", pk: "id", fks: ["id -> auth.users.id (remapear)"] },
  { nome: "configuracoes", pk: "chave", fks: [] },
  { nome: "curadoria_config", pk: "id", fks: [] },
  { nome: "curadoria_ferramentas_config", pk: "id", fks: [] },
  { nome: "definicoes_ia", pk: "id", fks: [] },
  { nome: "prioridades_editoriais", pk: "id", fks: [] },
  { nome: "ferramentas_excluidas", pk: "id", fks: [] },
  { nome: "fontes_curadoria", pk: "id", fks: [] },
  { nome: "episodios_podcast", pk: "id", fks: [] },
  { nome: "emails_recebidos", pk: "id", fks: [] },
  { nome: "egoi_listas", pk: "id", fks: [] },
  { nome: "edicoes", pk: "id", fks: ["episodio_podcast_id -> episodios_podcast.id"] },
  { nome: "noticias", pk: "id", fks: ["edicao_id -> edicoes.id", "fonte_id -> fontes_curadoria.id", "email_recebido_id -> emails_recebidos.id", "repeticao_de -> noticias.id (auto-referência: importar a null e actualizar depois)"] },
  { nome: "curadoria_fila", pk: "id", fks: ["fonte_id -> fontes_curadoria.id", "email_recebido_id -> emails_recebidos.id", "noticia_id -> noticias.id"] },
  { nome: "cronicas", pk: "id", fks: ["edicao_id -> edicoes.id"] },
  { nome: "secoes_edicao", pk: "id", fks: ["edicao_id -> edicoes.id"] },
  { nome: "ferramentas_semana", pk: "id", fks: ["edicao_id -> edicoes.id"] },
  { nome: "ferramentas_sugeridas", pk: "id", fks: ["fonte_email_id -> emails_recebidos.id", "fonte_directorio_id -> fontes_curadoria.id", "edicao_usada_id -> edicoes.id", "edicao_aprovada_id -> edicoes.id"] },
  { nome: "revista_edicao", pk: "edicao_id", fks: ["edicao_id -> edicoes.id"] },
  { nome: "revista_itens", pk: "id", fks: ["edicao_id -> edicoes.id", "noticia_id -> noticias.id"] },
  { nome: "briefs", pk: "id", fks: ["noticia_id -> noticias.id"] },
  { nome: "brief_edicoes", pk: "id", fks: ["brief_id -> briefs.id", "edicao_id -> edicoes.id"] },
  { nome: "brief_versoes", pk: "id", fks: ["brief_id -> briefs.id"] },
  { nome: "brief_eventos", pk: "id", fks: [] },
  { nome: "egoi_campanhas", pk: "id", fks: ["edicao_id -> edicoes.id", "lista_id -> egoi_listas.id"] },
  { nome: "subscricao_eventos", pk: "id", fks: ["edicao_id -> edicoes.id"] },
  { nome: "ia_uso", pk: "id", fks: ["edicao_id -> edicoes.id", "brief_id -> briefs.id"] },
  { nome: "audit_log", pk: "id", fks: [] },
];

/** Explicit allowlist of the 16 observed configuration keys. Anything else is excluded. */
export const CONFIG_PERMITIDAS = new Set([
  "brief_indexabilidade", "brief_limites", "briefs_activos", "curadoria_fila_lock",
  "curadoria_modo_manual", "dominios_bloqueados_egoi", "edicoes_base_url", "egoi_remetente_id",
  "frederico_wp_categoria_id", "noticias_aviso_email", "noticias_max_email", "podcast_rss_url",
  "podcast_ultima_sync", "repeticao_limiar_cosseno", "repeticao_limiar_trgm", "wordpress_learndash_course_id",
]);
const CONFIG_NEUTRALIZAR = new Set(["curadoria_fila_lock"]);
const BUCKET = "imagens-edicao";
const PAGINA = 1000;

const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

type Linha = Record<string, unknown>;

async function lerTabela(sb: SupabaseClient, nome: string, pk: string): Promise<Linha[]> {
  const out: Linha[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await sb.from(nome).select("*")
      .order(pk, { ascending: true }).range(de, de + PAGINA - 1);
    if (error) throw new Error(`${nome}: ${error.message}`);
    out.push(...((data ?? []) as Linha[]));
    if (!data || data.length < PAGINA) break;
  }
  return out;
}

async function listarFicheiros(sb: SupabaseClient, prefixo = ""): Promise<string[]> {
  const caminhos: string[] = [];
  for (let off = 0; ; off += 100) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefixo, {
      limit: 100, offset: off, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`listar ${BUCKET}/${prefixo}: ${error.message}`);
    for (const f of data ?? []) {
      const c = prefixo ? `${prefixo}/${f.name}` : f.name;
      if (f.id === null) caminhos.push(...(await listarFicheiros(sb, c)));
      else caminhos.push(c);
    }
    if (!data || data.length < 100) break;
  }
  return caminhos;
}

export async function gerarPacote(sb: SupabaseClient, quem: string) {
  const erros: string[] = [];
  const exclusoes: { tabela: string; motivo: string; chave?: string }[] = [
    { tabela: "auth.users", motivo: "Contas, palavras-passe e sessões não são exportadas." },
    { tabela: "segredos", motivo: "Chaves de API e palavras-passe vivem em variáveis de ambiente; não são exportadas." },
  ];
  const dados: Record<string, Linha[]> = {};
  const tabelasManifest: { nome: string; ordem: number; pk: string; fks: string[]; registos: number; sha256: string }[] = [];

  for (const [i, t] of TABELAS.entries()) {
    let linhas: Linha[] = [];
    try {
      linhas = await lerTabela(sb, t.nome, t.pk);
    } catch (e) {
      erros.push((e as Error).message);
    }
    if (t.nome === "configuracoes") {
      linhas = linhas.filter((l) => {
        const k = String(l.chave);
        if (!CONFIG_PERMITIDAS.has(k)) {
          exclusoes.push({ tabela: "configuracoes", chave: k, motivo: "Fora da lista de chaves permitidas." });
          return false;
        }
        return true;
      }).map((l) => CONFIG_NEUTRALIZAR.has(String(l.chave))
        ? (exclusoes.push({ tabela: "configuracoes", chave: String(l.chave), motivo: "Bloqueio temporário: exportado sem valor para não ficar activo no destino." }), { ...l, valor: null })
        : l);
    }
    dados[t.nome] = linhas;
    tabelasManifest.push({ nome: t.nome, ordem: i + 1, pk: t.pk, fks: t.fks, registos: linhas.length, sha256: sha256(JSON.stringify(linhas)) });
  }

  const ficheiros: { bucket: string; caminho: string; content_type: string; bytes: number; sha256: string; base64: string }[] = [];
  try {
    const caminhos = await listarFicheiros(sb);
    for (const c of caminhos) {
      const { data, error } = await sb.storage.from(BUCKET).download(c);
      if (error || !data) { erros.push(`ficheiro ${BUCKET}/${c}: ${error?.message ?? "sem conteúdo"}`); continue; }
      const buf = Buffer.from(await data.arrayBuffer());
      ficheiros.push({ bucket: BUCKET, caminho: c, content_type: data.type || "application/octet-stream", bytes: buf.length, sha256: sha256(buf), base64: buf.toString("base64") });
    }
  } catch (e) {
    erros.push((e as Error).message);
  }

  const agendadas = (dados.edicoes ?? []).filter((e) => e.agendamento_estado && e.agendamento_estado !== "nenhum")
    .map((e) => ({ id: e.id, numero: e.numero, agendamento_estado: e.agendamento_estado, agendado_para: e.agendado_para }));

  const hashGlobal = sha256(
    tabelasManifest.map((t) => `${t.nome}:${t.sha256}`).join("\n") + "\n" +
    ficheiros.map((f) => `${f.bucket}/${f.caminho}:${f.sha256}`).join("\n"),
  );

  const manifest = {
    versao: VERSAO_PACOTE,
    origem: { sistema: "Digital Sprint — Editor de Newsletter", projeto: "23514b53-4ffd-429e-81c5-46fedf7b5a3e" },
    gerado_em: new Date().toISOString(),
    gerado_por: quem,
    completo: erros.length === 0,
    erros,
    tabelas: tabelasManifest,
    ficheiros: ficheiros.map(({ base64: _b, ...f }) => f),
    exclusoes,
    agendamentos: {
      instrucao: "Importar como dados apenas. No destino, colocar agendamento_estado='nenhum' (ou suspenso) antes de activar qualquer tarefa de envio, para evitar envios duplicados.",
      edicoes_com_agendamento: agendadas,
    },
    instrucoes_importacao: [
      "Importar pela ordem de 'tabelas.ordem', preservando ids.",
      "Desligar triggers de updated_at durante a importação para manter datas.",
      "noticias.repeticao_de: importar a null e actualizar numa segunda passagem.",
      "perfis.id: criar o utilizador no destino com o mesmo id ou remapear.",
      "Reescrever URLs de ficheiros (revista_edicao.cronica_imagem_recorte_url) para o novo armazenamento.",
      "egoi_campanhas.estado='enviada' significa pedido aceite pela E-goi, não entrega confirmada.",
    ],
    verificacao: {
      algoritmo: "sha256",
      tabela: "sha256(JSON.stringify(dados[tabela])) com as linhas tal como estão no pacote",
      ficheiro: "sha256 dos bytes descodificados de base64",
      global: "sha256 de linhas 'tabela:hash' (ordem do manifest), '\\n', depois linhas 'bucket/caminho:hash', unidas por '\\n'",
      sha256_global: hashGlobal,
    },
  };

  return { manifest, dados, ficheiros };
}
