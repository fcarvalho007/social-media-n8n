import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        report: ''
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MODO 1: Chamada genérica com prompt (ProfileReportGenerator)
    if (body.prompt) {
      console.log('Generic prompt mode - generating report with GPT-5');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            { 
              role: 'system', 
              content: 'Actua como consultor sénior de estratégia digital e marketing em redes sociais. Responde sempre em Português de Portugal (PT-PT), com tom profissional e objectivo. Formata o output em Markdown bem estruturado.' 
            },
            { role: 'user', content: body.prompt }
          ],
          max_completion_tokens: 6000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        return new Response(JSON.stringify({ 
          error: 'OpenAI API error: ' + errorText,
          report: ''
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const aiResponse = await response.json();
      const report = aiResponse.choices[0]?.message?.content || '';
      
      console.log('Generated generic report length:', report.length);

      return new Response(JSON.stringify({ 
        report,
        generatedAt: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MODO 2: Chamada tradicional com competitorData (CompetitorReportGenerator)
    const { 
      competitorUsername, 
      myAccountUsername, 
      competitorData, 
      myAccountData,
      allPosts,
      objective
    } = body;

    // Map objective to Portuguese
    const objectiveMap: Record<string, string> = {
      'leads': 'mais leads/consultoria',
      'courses': 'vender cursos',
      'authority': 'crescer autoridade',
      'reach': 'aumentar alcance'
    };
    const objectiveText = objectiveMap[objective] || 'crescer autoridade';

    const systemPrompt = `PAPEL
Agir como Analista de Concorrência (Instagram) + Designer de Relatórios (UX/UI). O objectivo é transformar dados de posts do Instagram num relatório comparativo, claro e accionável, com boa hierarquia visual e leitura rápida.

ENTRADA
1) Conta de referência (para comparação directa): @${myAccountUsername}
2) Objectivo principal para 90 dias: ${objectiveText}
3) Mercado/idioma-alvo do conteúdo: PT-PT

REGRAS CRÍTICAS (NÃO NEGOCIÁVEIS)
- Não inventar dados. Se não existir follower count no dataset, NÃO calcular engagement rate por seguidores.
- Sempre que houver inferências (ex.: "porque este post funcionou"), marcar como "Hipótese" e justificar com sinais do dataset (formato, duração, hashtags, comprimento da legenda, comentários, etc.).
- Trabalhar apenas com posts no período: desde 2025-01-01 até à data mais recente no ficheiro.
- Linguagem: Português de Portugal, tom formal e objectivo.
- Output deve ser "relatório bem desenhado": títulos curtos, bullets, tabelas comparativas, destaques, e um sumário executivo que se lê em 60 segundos.
- NÃO uses emojis no relatório.

SELECÇÃO DAS CONTAS
1) Garantir que a conta de referência (@${myAccountUsername}) está incluída.
2) Incluir a conta do concorrente (@${competitorUsername}).
3) Se houver mais contas nos dados, incluir as mais relevantes (até 6 total).

NORMALIZAÇÃO / DERIVAÇÕES
- Mapear tipo de conteúdo:
  - Video => "Vídeo/Reel"
  - Sidecar => "Carrossel"
  - Image => "Imagem"
- Criar métricas por post:
  - engagement_total = likesCount + commentsCount
  - comments_ratio = commentsCount / max(likesCount,1)

ANÁLISES OBRIGATÓRIAS (POR CONTA)
A) Resumo Quantitativo
- Total de posts no período
- Posts por semana (média) e tendência mensal
- Mix de formatos (% vídeo, % carrossel, % imagem)
- Medianas: likes, comentários, engagement_total
- Top 3 posts por engagement_total: data, tipo, métricas, url, excerto curto da legenda (máx 140 chars)

B) Padrões de Publicação (cadência)
- Melhor dia da semana e melhor janela horária
- Maior intervalo sem publicar

C) Estratégia de Conteúdo (qualitativa, baseada em dados)
- Identificar 4–6 "pilares de conteúdo" por conta
- Dar nome aos pilares e descrever em 1 linha
- Estimar o peso de cada pilar (% aproximado)

D) Hashtags
- Top 15 hashtags mais usadas (por conta)
- Hashtags comuns a todas as contas
- Hashtags distintivas
- Recomendar 2–3 "clusters de hashtags" por objectivo

COMPARAÇÃO OBRIGATÓRIA (COM @${myAccountUsername})
- Criar uma tabela comparativa com:
  - posts/semana, %vídeo, %carrossel, mediana engagement_total, mediana comentários
- Identificar:
  - 3 vantagens competitivas da conta de referência (com evidência)
  - 3 gaps claros face ao concorrente (com evidência)
  - 3 apostas de formato/tema que parecem "subexploradas"

OPORTUNIDADES IDENTIFICADAS (ACÇÃO)
Entregar recomendações que uma pessoa consegue executar:
1) 10 "Quick Wins" (impacto alto, esforço baixo):
   - O que fazer
   - Porquê (evidência do dataset)
   - Como medir (métrica simples)
2) 5 "Experiências" (testes A/B ou pilotos de 2 semanas):
   - Hipótese, execução, sucesso (critério), risco e mitigação
3) 1 Plano de 30 dias (semana 1–4):
   - Cadência sugerida (posts/semana)
   - Mix de formatos
   - Temas/pilares por semana
   - 3 templates de CTA (comentário, guardar, DM) em PT-PT

FORMATO DO OUTPUT (UX/UI) — OBRIGATÓRIO
Gerar um relatório final com excelente legibilidade, seguindo esta ordem e títulos EXACTOS:

## Resumo Executivo
- 5–8 bullets máximos, com números
- "O que está a funcionar no nicho" + "O que a conta de referência deve fazer a seguir"

## Comparação com @${myAccountUsername}
- Tabela comparativa
- 3 vantagens + 3 gaps + 3 apostas recomendadas

## Padrões de Publicação
- Insights sobre cadência, dia/hora, consistência
- Mini-quadro por conta

## Estratégia de Conteúdo
- Pilares por conta + peso aproximado
- Padrões de copy/CTA

## Hashtags Mais Utilizadas
- Top hashtags por conta (tabelas compactas)
- Hashtags comuns vs distintivas
- Recomendações de clusters

## Oportunidades Identificadas
- 10 quick wins
- 5 experiências
- Plano 30 dias

## Apêndice
- Lista dos top posts por conta (até 10), com URL e métricas

ESTILO VISUAL
- Frases curtas.
- Evitar parágrafos longos (máx 3 linhas).
- Usar separadores, bullets e tabelas.
- Destacar números e conclusões com **negrito**.
- Se houver limitações do dataset, colocar uma nota curta no fim do "Resumo Executivo".`;

    // Build user prompt with data
    const userPrompt = `Gera um relatório de análise competitiva completo para:

CONCORRENTE: @${competitorUsername}
- Posts analisados: ${competitorData?.postCount || 0}
- Total de likes: ${competitorData?.totalLikes?.toLocaleString() || 0}
- Total de comentários: ${competitorData?.totalComments?.toLocaleString() || 0}
- Média de likes por post: ${competitorData?.avgLikes?.toLocaleString() || 0}
- Média de comentários por post: ${competitorData?.avgComments?.toLocaleString() || 0}
- Engagement médio: ${competitorData?.avgEngagement?.toLocaleString() || 0}
- Tipos de conteúdo: ${JSON.stringify(competitorData?.contentTypes || {})}
- Top hashtags: ${JSON.stringify(competitorData?.topHashtags || [])}
- Período dos dados: ${competitorData?.period || 'não especificado'}

A MINHA CONTA: @${myAccountUsername}
- Posts analisados: ${myAccountData?.postCount || 0}
- Total de likes: ${myAccountData?.totalLikes?.toLocaleString() || 0}
- Total de comentários: ${myAccountData?.totalComments?.toLocaleString() || 0}
- Média de likes por post: ${myAccountData?.avgLikes?.toLocaleString() || 0}
- Média de comentários por post: ${myAccountData?.avgComments?.toLocaleString() || 0}
- Engagement médio: ${myAccountData?.avgEngagement?.toLocaleString() || 0}
- Tipos de conteúdo: ${JSON.stringify(myAccountData?.contentTypes || {})}
- Top hashtags: ${JSON.stringify(myAccountData?.topHashtags || [])}

${allPosts ? `DADOS DETALHADOS DOS POSTS (últimos 50 por conta):
${JSON.stringify(allPosts.slice(0, 100), null, 2)}` : ''}

Gera o relatório completo em Markdown seguindo EXACTAMENTE a estrutura definida, comparando objectivamente as duas contas e identificando oportunidades de melhoria para @${myAccountUsername}.`;

    console.log('Generating comprehensive competitor report for:', competitorUsername, 'vs', myAccountUsername);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API error',
        report: ''
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const report = aiResponse.choices[0]?.message?.content || '';
    
    console.log('Generated report length:', report.length);

    return new Response(JSON.stringify({ 
      report,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-competitor-report function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      report: ''
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
