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
    const { competitorUsername, myAccountUsername, competitorData, myAccountData } = await req.json();

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

    const systemPrompt = `És um analista de marketing digital especializado em Instagram, a preparar um relatório competitivo profissional para um cliente em Portugal.

REGRAS:
- Escreve SEMPRE em Português de Portugal (pt-PT)
- Usa formato Markdown estruturado
- Sê objectivo e baseado em dados
- Inclui números específicos e percentagens
- Fornece recomendações accionáveis
- NÃO uses emojis no texto (apenas nos títulos se necessário)
- Mantém um tom profissional mas acessível

ESTRUTURA DO RELATÓRIO:
# Análise de @[username]

## Resumo Executivo
[3-4 bullet points com métricas principais]

## Estratégia de Conteúdo
[Análise da distribuição de formatos e padrões]

## Padrões de Publicação
[Frequência, dias mais activos, horários]

## Hashtags Mais Utilizadas
[Top 5-10 hashtags com contexto]

## Comparação com @[minha_conta]
[Pontos fortes e fracos relativos]

## Oportunidades Identificadas
[3-5 acções concretas recomendadas]

## Conclusão
[Síntese em 2-3 frases]`;

    const userPrompt = `Gera um relatório de análise competitiva para:

CONCORRENTE: @${competitorUsername}
- Posts analisados: ${competitorData.postCount || 0}
- Total de likes: ${competitorData.totalLikes?.toLocaleString() || 0}
- Total de comentários: ${competitorData.totalComments?.toLocaleString() || 0}
- Média de likes por post: ${competitorData.avgLikes?.toLocaleString() || 0}
- Média de comentários por post: ${competitorData.avgComments?.toLocaleString() || 0}
- Engagement médio: ${competitorData.avgEngagement?.toLocaleString() || 0}
- Tipos de conteúdo: ${JSON.stringify(competitorData.contentTypes || {})}
- Top hashtags: ${JSON.stringify(competitorData.topHashtags || [])}
- Período dos dados: ${competitorData.period || 'não especificado'}

A MINHA CONTA: @${myAccountUsername}
- Posts analisados: ${myAccountData.postCount || 0}
- Total de likes: ${myAccountData.totalLikes?.toLocaleString() || 0}
- Total de comentários: ${myAccountData.totalComments?.toLocaleString() || 0}
- Média de likes por post: ${myAccountData.avgLikes?.toLocaleString() || 0}
- Média de comentários por post: ${myAccountData.avgComments?.toLocaleString() || 0}
- Engagement médio: ${myAccountData.avgEngagement?.toLocaleString() || 0}
- Tipos de conteúdo: ${JSON.stringify(myAccountData.contentTypes || {})}

Gera o relatório completo em Markdown, comparando objectivamente as duas contas e identificando oportunidades de melhoria para @${myAccountUsername}.`;

    console.log('Generating competitor report for:', competitorUsername);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
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