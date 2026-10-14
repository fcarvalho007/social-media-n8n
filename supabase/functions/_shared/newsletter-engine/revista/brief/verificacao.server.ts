// Verificação factual do Brief. Server-only.
//
// Passagem separada da escrita: quem escreveu não se verifica a si próprio.
// Compara o texto redigido com os factos estruturados e o material da fonte.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

import { chamarIaBrief } from "./adaptador-ia.server.ts";
import type { EstadoAfirmacao, FactoBrief, ItemVerificado, VerificacaoFactual } from "./tipos.ts";

const ESTADOS: EstadoAfirmacao[] = [
  "suportado",
  "parcialmente_suportado",
  "nao_suportado",
  "impossivel_verificar",
];

const SISTEMA = `És um verificador editorial independente. NÃO escreves nem melhoras textos: só confirmas se cada afirmação do texto recebido é sustentada pelos factos e pelo material da fonte.

Devolve APENAS JSON válido:
{"itens":[{"afirmacao":"","estado":"","nota":""}]}

- estado: suportado, parcialmente_suportado, nao_suportado ou impossivel_verificar.
- Verifica com especial atenção números, percentagens, nomes, datas, afirmações absolutas ("o primeiro", "todos"), relações de causa e efeito, disponibilidade geográfica e comparações.
- nota: pt-PT, uma frase, só quando o estado não for "suportado".
- Nada de opinião sobre a qualidade do texto.`;

export interface ResultadoVerificacao extends VerificacaoFactual {
  motivo?: string;
}

function agregar(itens: ItemVerificado[]): { estado: EstadoAfirmacao; bloqueia: boolean } {
  if (itens.length === 0) return { estado: "impossivel_verificar", bloqueia: false };
  if (itens.some((i) => i.estado === "nao_suportado")) return { estado: "nao_suportado", bloqueia: true };
  if (itens.some((i) => i.estado === "parcialmente_suportado")) {
    return { estado: "parcialmente_suportado", bloqueia: false };
  }
  if (itens.every((i) => i.estado === "impossivel_verificar")) {
    return { estado: "impossivel_verificar", bloqueia: false };
  }
  return { estado: "suportado", bloqueia: false };
}

export async function verificarFactualidade(args: {
  sb: SupabaseClient;
  briefId?: string | null;
  texto: string;
  factos: FactoBrief[];
  corpo?: string;
}): Promise<ResultadoVerificacao> {
  if (!args.texto.trim()) {
    return { estado: "impossivel_verificar", itens: [], bloqueia: false, motivo: "Sem texto a verificar." };
  }

  const factos = args.factos
    .map((f) => `- ${f.afirmacao}${f.valor ? ` (${f.valor})` : ""} | evidência: ${f.evidencia}`)
    .join("\n");

  const r = await chamarIaBrief<{ itens?: unknown }>({
    papel: "verificacao",
    operacao: "verificacao_factual",
    briefId: args.briefId,
    sb: args.sb,
    system: SISTEMA,
    user: [
      `Texto a verificar:\n${args.texto}`,
      factos ? `Factos disponíveis:\n${factos}` : "Factos disponíveis: (nenhum)",
      args.corpo ? `Material da fonte:\n${args.corpo.slice(0, 7000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  const brutos = Array.isArray(r.dados?.itens) ? (r.dados.itens as Record<string, unknown>[]) : [];
  const itens: ItemVerificado[] = brutos
    .map((i) => {
      const estado = String(i.estado ?? "").trim() as EstadoAfirmacao;
      return {
        afirmacao: String(i.afirmacao ?? "").trim(),
        estado: ESTADOS.includes(estado) ? estado : "impossivel_verificar",
        nota: String(i.nota ?? "").trim() || undefined,
      };
    })
    .filter((i) => i.afirmacao);

  return { ...agregar(itens), itens };
}
