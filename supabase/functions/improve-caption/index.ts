import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FRAMEWORKS = {
  hook: {
    name: 'HOOK → PROVA → BENEFÍCIO → AÇÃO',
    description: 'Framework orientada para captar atenção rapidamente, validar autoridade, explicar o ganho e conduzir a uma ação concreta.',
    instructions: `Reescreve a legenda seguindo esta estrutura:
1. HOOK (1ª linha): Promessa clara, insight forte ou dor real que capte atenção imediatamente
2. PROVA: Dado, resultado, caso real ou credencial que sustente a mensagem
3. BENEFÍCIO: Explicar de forma simples o que a pessoa ganha com isto
4. AÇÃO: Convite à interação - guardar, comentar, clicar

Objetivo: maximizar retenção e gerar conversão (engajamento, leads ou vendas).
Hashtags sugeridas: #marketingdigital #estrategiadigital #socialmedia #instagramtips`,
  },
  dor: {
    name: 'DOR → SOLUÇÃO → EVIDÊNCIA → MICRO-APRENDIZADO → CTA',
    description: 'Ideal para reels educativos, carrosséis e conteúdos de autoridade.',
    instructions: `Reescreve a legenda seguindo esta estrutura:
1. DOR: Reconhecer a frustração ou dificuldade do público
2. SOLUÇÃO: Apresentar a abordagem ou método principal
3. EVIDÊNCIA: Dados, exemplos visuais, comparações ou métricas
4. MICRO-APRENDIZADO: 1 insight aplicável em menos de 20 segundos
5. CTA: Opção simples e direta (guardar, explorar mais, comentar)

Objetivo: ensinar algo útil enquanto constrói confiança.
Hashtags sugeridas: #conteudoeducativo #growthmarketing #brandingpessoal #seomarketing`,
  },
  ideia: {
    name: 'IDEIA CENTRAL → LISTA CURTA → VALIDAÇÃO → CONVITE',
    description: 'Framework minimalista para conteúdos rápidos, checklist e tendências.',
    instructions: `Reescreve a legenda seguindo esta estrutura:
1. IDEIA CENTRAL: 1 frase com a mensagem-chave
2. LISTA CURTA: Bullet points simples, claros e úteis (3 a 5 itens)
3. VALIDAÇÃO: Reforço breve - "funciona porque…", "testado em…"
4. CONVITE: Pedir opinião, abrir debate ou sugerir guardar o conteúdo

Objetivo: transmitir valor em menos tempo e aumentar comentários.
Hashtags sugeridas: #socialmedia #criacaodeconteudo #dicasinstagram #marketingestrategico`,
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caption, framework } = await req.json();

    if (!caption || !framework) {
      return new Response(
        JSON.stringify({ error: 'Caption e framework são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selectedFramework = FRAMEWORKS[framework as keyof typeof FRAMEWORKS];
    if (!selectedFramework) {
      return new Response(
        JSON.stringify({ error: 'Framework inválido. Use: hook, dor, ou ideia' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Serviço de IA não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `És um copywriter especialista em redes sociais, especialmente Instagram e LinkedIn. 
O teu trabalho é melhorar legendas usando frameworks de copywriting modernos.

Framework atual: ${selectedFramework.name}
${selectedFramework.description}

${selectedFramework.instructions}

REGRAS IMPORTANTES:
- Mantém o tom e a mensagem principal do texto original
- Usa linguagem natural e envolvente em português de Portugal
- Inclui emojis de forma estratégica (não exagerar)
- O texto final deve ter no máximo 2200 caracteres
- Adiciona 3-5 hashtags relevantes no final
- Não uses linguagem demasiado comercial ou artificial

Responde APENAS com a legenda melhorada, sem explicações adicionais.`;

    console.log(`[improve-caption] Using framework: ${framework}`);
    console.log(`[improve-caption] Original caption length: ${caption.length}`);
    console.log(`[improve-caption] Using OpenAI GPT-5-mini`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        max_completion_tokens: 2000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Melhora esta legenda:\n\n${caption}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de pedidos excedido. Tente novamente em breve.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Chave API inválida. Contacte o administrador.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Contacte o administrador.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const improvedCaption = data.choices?.[0]?.message?.content || '';

    console.log(`[improve-caption] Improved caption length: ${improvedCaption.length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        improvedCaption,
        framework: selectedFramework.name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in improve-caption:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
