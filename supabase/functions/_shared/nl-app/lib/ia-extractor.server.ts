// Extractor factual de notícias via DeepSeek. Server-only.
// Usado pelo cron RSS (`src/routes/api/public/hooks/curadoria-rss.ts`)
// e pelo hook de emails (`src/routes/api/public/hooks/email-newsletter.ts`).
//
// A lógica de limpeza WhatsApp / dedup por URL normalizado / limite de blocos
// vive apenas na Edge Function `supabase/functions/processar-noticias/index.ts`
// — não a dupliques aqui.

export { mapCategoria } from "../edge-shared/ia-limpeza.ts";
import { ajustarDescricao } from "./ajustar-descricao.ts";
import { chamarDeepSeek, parseJsonTolerante, MODELO_DEEPSEEK_PADRAO, type DeepSeekUsage } from "./deepseek.server.ts";

const PROMPT_SISTEMA = `És um extrator factual. Trabalha exclusivamente com o conteúdo recebido; não inventes nem pesquises. Devolve APENAS JSON válido com: categoria, titulo, descricao, fonte, url.

Idioma de saída sempre pt-PT (português europeu), independentemente da língua do texto de origem — se vier em inglês, espanhol ou outra, traduz e reinterpreta.

- categoria: uma de INTELIGÊNCIA ARTIFICIAL, GOOGLE, YOUTUBE & VÍDEO, META, LINKEDIN, TIKTOK, X, MEDIA & NEGÓCIOS ONLINE. Heurística: IA/LLMs/OpenAI/Anthropic/Gemini-modelo/tech geral→INTELIGÊNCIA ARTIFICIAL; Google/Search/Chrome/Android/Pixel→GOOGLE; YouTube/Shorts→YOUTUBE & VÍDEO; Facebook/Instagram/WhatsApp/Threads/Meta→META; LinkedIn→LINKEDIN; TikTok→TIKTOK; X/Twitter→X; creators/jornalismo/media/criadores/negócios digitais→MEDIA & NEGÓCIOS ONLINE.

- titulo: pt-PT, sem qualquer emoji, símbolo ou pontuação decorativa no início. Sentence case: só a 1.ª letra maiúscula, salvo nomes próprios (marcas, pessoas, produtos). Nunca CAIXA ALTA. Máx. ~120 caracteres, sem quebras de linha.

- descricao: pt-PT, entre 130 e 180 caracteres (uma ou duas frases COMPLETAS). Objectiva e factual, sem emojis, sem "...". Nunca deixes a frase manca. REGRA DURA: a descrição NUNCA pode ser o título por outras palavras. Tem de acrescentar informação que o título não dá — um número, uma data ou prazo, quem é afectado, uma condição, uma limitação ou a consequência prática. Não reaproveites a estrutura nem as palavras fortes do título. Quando vier «Corpo do artigo», tira daí o detalhe mais concreto.

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

export type ChamadaIA = {
  resultado: IaResultado | null;
  modelo: string;
  usage: DeepSeekUsage;
};

/** Instrução de correcção quando a descrição saiu parecida com o título. */
export const PROMPT_REESCRITA_DESCRICAO = `És editor da newsletter Digital Sprint, em português de Portugal.

Recebes o título de uma notícia, uma descrição que ficou demasiado parecida com esse título e (quando existe) o corpo do artigo.

Reescreve APENAS a descrição:
- 18 a 30 palavras, uma ou duas frases completas, factual e objectiva.
- Tem de acrescentar o que o título não diz: número, data ou prazo, quem é afectado, condição, limitação ou consequência prática.
- Não repitas a estrutura nem as palavras fortes do título.
- Nunca inventes dados que não estejam no material recebido.
- Sem emojis, sem reticências, sem prefixos ("Descrição:", "Resumo:").

Devolve APENAS JSON válido: {"descricao": "..."}`;

export async function chamarIaExtrator(
  bloco: string,
  urlManual: string | undefined,
  corpoArtigo?: string,
): Promise<ChamadaIA> {
  const partes = [`Bloco:\n${bloco}`];
  if (urlManual) partes.push(`url_manual: ${urlManual}`);
  if (corpoArtigo && corpoArtigo.trim()) {
    partes.push(`Corpo do artigo (material factual; usa-o para a descrição):\n${corpoArtigo.trim()}`);
  }

  const r = await chamarDeepSeek(PROMPT_SISTEMA, partes.join("\n\n"), {
    modelo: MODELO_DEEPSEEK_PADRAO,
    responseJson: true,
  });

  const resultado = parseJsonTolerante<IaResultado>(r.conteudo);
  if (resultado && typeof resultado.descricao === "string") {
    resultado.descricao = ajustarDescricao(resultado.descricao);
  }
  return { resultado, modelo: r.modelo, usage: r.usage };
}

export type ChamadaDescricao = {
  descricao: string;
  modelo: string;
  usage: DeepSeekUsage;
};

/** Segunda passagem: pede uma descrição que complemente o título. */
export async function reescreverDescricao(args: {
  titulo: string;
  descricao: string;
  corpoArtigo?: string;
}): Promise<ChamadaDescricao> {
  const partes = [`Título: ${args.titulo}`, `Descrição actual (repete o título): ${args.descricao}`];
  if (args.corpoArtigo && args.corpoArtigo.trim()) {
    partes.push(`Corpo do artigo:\n${args.corpoArtigo.trim()}`);
  }

  const r = await chamarDeepSeek(PROMPT_REESCRITA_DESCRICAO, partes.join("\n\n"), {
    modelo: MODELO_DEEPSEEK_PADRAO,
    responseJson: true,
  });

  const parsed = parseJsonTolerante<{ descricao?: unknown }>(r.conteudo);
  const bruto = typeof parsed?.descricao === "string" ? parsed.descricao : "";
  return { descricao: ajustarDescricao(bruto), modelo: r.modelo, usage: r.usage };
}
