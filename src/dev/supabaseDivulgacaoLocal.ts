// Isolated offline transport for the actual editor. No Cloud client, AI or publication calls.
import { supabase as bloqueado } from "./supabaseLocal";
import { fonteDivulgacao as fonte } from "./divulgacaoFixture";
import { carrosselDivulgacao, prepararDivulgacaoBase } from "../../supabase/functions/_shared/conteudos/divulgacao";
import type { ConteudoCompleto, DivulgacaoEdicao, StoryEdicao, Carrossel } from "@/services/conteudos";
const chave = "hub:demo-local:divulgacao319";
function inicial(): ConteudoCompleto {
  return { conteudo: { id: fonte.edicaoId, edicao_id: fonte.edicaoId, fonte, fonte_aceite_em: null,
    carrossel: carrosselDivulgacao(fonte), versao: 1, social_draft_id: null, actualizado_em: new Date().toISOString(),
    divulgacao: prepararDivulgacaoBase(fonte, null), divulgacao_versao: 1 }, versoes: [{ versao: 1, origem: "edicao", criado_em: new Date().toISOString() }], job: null };
}
let dados = inicial();
try { const v = localStorage.getItem(chave); if (v) dados = JSON.parse(v); } catch { /* demo starts fresh */ }
export const supabase = { ...bloqueado, functions: { invoke: async (_fn: string, { body: b }: { body: { acao: string; versao?: number; story?: StoryEdicao; estado?: "rascunho" | "revisto"; carrossel?: Carrossel } }) => {
  if (b.acao === "obter") return { data: structuredClone(dados), error: null };
  if (b.acao === "guardar_divulgacao") {
    if (b.versao !== dados.conteudo.divulgacao_versao) return { data: null, error: { message: "Conflito de versão local." } };
    dados.conteudo.divulgacao = { ...dados.conteudo.divulgacao!, story: b.story!, estado: b.estado! };
    dados.conteudo.divulgacao_versao!++;
    localStorage.setItem(chave, JSON.stringify(dados));
    return { data: { divulgacao: dados.conteudo.divulgacao as DivulgacaoEdicao, divulgacao_versao: dados.conteudo.divulgacao_versao }, error: null };
  }
  if (b.acao === "guardar") {
    if (b.versao !== dados.conteudo.versao) return { data: null, error: { message: "Conflito de versão local." } };
    dados.conteudo.carrossel = b.carrossel!; dados.conteudo.versao++;
    localStorage.setItem(chave, JSON.stringify(dados));
    return { data: { versao: dados.conteudo.versao, actualizado_em: new Date().toISOString() }, error: null };
  }
  return { data: null, error: { message: "Demonstração local: Cloud, IA e publicação estão desligados." } };
} } };
