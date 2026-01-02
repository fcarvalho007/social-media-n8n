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
    const { componentType, myAccount, data } = await req.json();

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        insights: []
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build context-specific prompt based on component type
    let contextPrompt = '';
    
    switch (componentType) {
      case 'ranking':
        contextPrompt = `Dados de ranking de contas Instagram:
- Conta principal: @${myAccount}
- Contas analisadas: ${JSON.stringify(data.accounts?.map((a: any) => ({
  username: a.username,
  avgEngagement: a.avgEngagement,
  postCount: a.postCount,
  avgLikes: a.avgLikes
})) || [])}

Gera 2 insights práticos e accionáveis sobre o posicionamento da conta @${myAccount} face aos concorrentes.`;
        break;
        
      case 'content_type':
        contextPrompt = `Dados de estratégia de conteúdo Instagram:
- Conta principal: @${myAccount}
- Distribuição por conta: ${JSON.stringify(data.breakdowns || [])}

Gera 2 insights sobre a estratégia de conteúdo (imagens, vídeos, carrosséis) e oportunidades para @${myAccount}.`;
        break;
        
      case 'timeline':
        contextPrompt = `Dados de evolução temporal de engagement:
- Conta principal: @${myAccount}
- Período: ${data.period || 'últimos meses'}
- Tendências observadas: ${JSON.stringify(data.trends || [])}

Gera 2 insights sobre tendências de crescimento e padrões sazonais para @${myAccount}.`;
        break;
        
      case 'hashtags':
        contextPrompt = `Dados de hashtags mais usadas:
- Conta principal: @${myAccount}
- Top hashtags: ${JSON.stringify(data.topHashtags || [])}

Gera 2 insights sobre estratégia de hashtags e recomendações para @${myAccount}.`;
        break;
        
      case 'posting_frequency':
        contextPrompt = `Dados de frequência de publicação:
- Conta principal: @${myAccount}
- Distribuição por dia: ${JSON.stringify(data.dayDistribution || [])}

Gera 2 insights sobre os melhores dias para publicar para @${myAccount}.`;
        break;
        
      default:
        contextPrompt = `Dados de analytics Instagram para @${myAccount}: ${JSON.stringify(data)}

Gera 2 insights relevantes e accionáveis.`;
    }

    const systemPrompt = `És um especialista em marketing digital e analytics de Instagram, a dar feedback a um gestor de redes sociais em Portugal.

REGRAS IMPORTANTES:
- Responde SEMPRE em Português de Portugal (pt-PT)
- Usa "você" ou forma impessoal, nunca "tu"
- Sê conciso e prático (máximo 50 palavras por insight)
- Foca em acções concretas que podem ser implementadas
- Usa números e percentagens quando disponíveis
- NÃO uses emojis
- Formata como JSON array de strings

Exemplo de resposta:
["A sua conta tem 25% mais engagement que a média dos concorrentes, mantendo consistência no formato carrossel.", "Considere aumentar a frequência de vídeos para 30% do conteúdo, alinhando com a tendência dos líderes de mercado."]`;

    console.log('Generating insights for component:', componentType);

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
          { role: 'user', content: contextPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API error',
        insights: []
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0]?.message?.content || '[]';
    
    // Parse the JSON array from the response
    let insights: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON array found, split by newlines and clean up
        insights = content.split('\n')
          .filter((line: string) => line.trim().length > 10)
          .slice(0, 2);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      insights = [content.slice(0, 200)];
    }

    console.log('Generated insights:', insights);

    return new Response(JSON.stringify({ 
      insights: insights.slice(0, 2),
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-analytics-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      insights: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});