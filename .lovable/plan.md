## Plano — Fundações partilhadas para o módulo de IA

Vou implementar isto como infraestrutura transversal, sem adicionar funcionalidades visíveis das Fases 1–4 e sem alterar visualmente o fluxo `/manual-create`.

### Ajustes necessários face ao estado atual

Há alguns pontos do prompt que entram em conflito com o projeto atual ou com regras de segurança:

1. **Tabelas já existentes**
   - Já existem `ai_preferences`, `ai_credit_usage`, `account_insights`, `hashtag_intelligence`, `posts.raw_transcription` e `posts.ai_metadata`.
   - Em vez de duplicar tabelas, vou migrar/estender o que já existe para chegar ao modelo pretendido.

2. **Referências diretas a `auth.users`**
   - Não vou criar foreign keys para `auth.users`. O projeto já segue o padrão seguro de guardar `user_id uuid` e proteger com RLS.
   - Isto evita acoplamento indevido a tabelas geridas pela autenticação.

3. **Fornecedor de IA**
   - O projeto já usa Lovable AI para geração de texto e visão, e OpenAI apenas para transcrição Whisper.
   - `OPENAI_API_KEY` já existe. `ANTHROPIC_API_KEY` não está configurada.
   - Para não bloquear a infraestrutura, vou implementar uma camada de provider extensível, mas usar por defeito:
     - transcrição: OpenAI Whisper;
     - texto/visão: Lovable AI, que já está configurado e não requer nova chave.
   - Deixo os nomes `provider`, `model` e `model: 'fast' | 'smart'` prontos para suportar OpenAI/Anthropic depois, se for necessário.

4. **Storybook**
   - O projeto não tem Storybook configurado e não vou adicionar dependências novas sem aprovação explícita.
   - Em alternativa, criarei uma página interna de demo para os padrões de UI de IA.

---

## 1. Base de dados e créditos

### 1.1 Criar/normalizar créditos por utilizador

Criar tabela `user_ai_credits` com RLS:

- `user_id uuid primary key`
- `credits_remaining integer not null default 0`
- `credits_monthly_allowance integer not null default 0`
- `last_reset_at timestamptz`
- `plan_tier text not null default 'free'`
- `updated_at timestamptz default now()`

Políticas:

- utilizador autenticado pode ver os próprios créditos;
- escrita/alteração apenas por funções backend com permissões internas.

Adicionar função segura para consumir créditos de forma atómica:

- valida saldo;
- desconta antes da chamada de IA;
- devolve erro claro quando o saldo é insuficiente;
- evita race conditions em chamadas simultâneas.

### 1.2 Criar/normalizar logs de IA

O projeto já tem `ai_credit_usage`. Vou criar a tabela pedida `ai_usage_log` como log principal, em vez de reaproveitar uma tabela com semântica incompleta.

Campos:

- `id`
- `user_id`
- `action_type`
- `feature`
- `credits_consumed`
- `tokens_used`
- `provider`
- `model`
- `success`
- `error_message`
- `metadata jsonb`
- `created_at`

RLS:

- utilizador pode consultar apenas os próprios logs;
- escrita apenas por backend.

### 1.3 Tabelas partilhadas entre fases

Aplicar migrações idempotentes:

- `posts.ai_generated_fields jsonb default '{}'`
- `posts.ai_features_extracted jsonb default '{}'`
- `posts.performance_classification text`
- `posts.engagement_rate numeric`
- `posts.metrics_captured_at timestamptz`

`raw_transcription` já existe, por isso não será recriada.

Atualizar `account_insights` existente com os campos em falta:

- `delta_percentage numeric`
- `dismissed_count integer default 0`
- `dismissed_until timestamptz`
- `never_show boolean default false`

Criar `user_brand_hashtags` com RLS por utilizador.

Criar `hashtag_metadata` como cache partilhada. Como já existe `hashtag_intelligence`, vou manter ambas apenas se fizer sentido funcionalmente:

- `hashtag_metadata`: cache genérica e simples para Fase 2;
- `hashtag_intelligence`: fonte já existente com metadados mais ricos.

### 1.4 Utilizador de teste com 100 créditos

Depois da migração, criar um registo inicial de 100 créditos para o utilizador de teste/contas existentes permitidas, sem alterar regras de autenticação.

---

## 2. Serviço centralizado de IA

Criar `src/services/ai/aiService.ts` como API única do frontend.

Funções expostas:

```ts
transcribeMedia(fileUrl: string, options?: { language?: string }): Promise<string>

generateText(params: {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  responseFormat?: 'text' | 'json'
  model?: 'fast' | 'smart'
  feature?: string
}): Promise<string | unknown>

analyzeImage(imageUrl: string, prompt: string): Promise<string>
```

Importante: o frontend não chamará fornecedores externos diretamente. O serviço chamará uma função backend central, por exemplo `ai-core`, através do cliente já existente.

No backend (`supabase/functions/ai-core/index.ts`):

- validar autenticação;
- validar input;
- calcular custo em créditos;
- descontar créditos antes da chamada;
- executar chamada com timeout de 60s;
- retry com backoff exponencial até 3 tentativas;
- registar `ai_usage_log` em sucesso e falha;
- devolver mensagens de erro seguras em PT-PT.

As funções antigas de IA (`ai-caption-rewriter`, `ai-editorial-assistant`) não serão removidas neste prompt, para evitar regressões. A integração delas no serviço centralizado pode ser feita numa fase seguinte, controlada.

---

## 3. Custos de créditos

Criar `src/config/aiCreditCosts.ts`:

```ts
export const AI_CREDIT_COSTS = {
  transcription_per_minute: 1,
  text_generation_fast: 1,
  text_generation_smart: 3,
  vision_analysis: 2,
  full_assistant_flow: 5,
} as const
```

Criar tipos auxiliares para evitar strings soltas de `action_type`, `feature`, `provider` e `model`.

---

## 4. Tratamento de erros e logs

Criar `src/lib/errorHandler.ts` com `handleAIError` para uso no frontend:

- mapear erros técnicos para mensagens amigáveis;
- não expor detalhes internos;
- uniformizar toasts e mensagens visíveis.

Mensagens:

- rate limit: “A IA está ocupada. Tenta novamente em alguns segundos.”
- créditos insuficientes: “Não tens créditos suficientes. Vê planos.”
- timeout: “A IA demorou demasiado. Tenta novamente.”
- genérico: “A IA está temporariamente indisponível.”

No backend, o log real fica em `ai_usage_log` com `success=false` e `error_message` técnico reduzido.

---

## 5. Componentes UI reutilizáveis

Criar componentes em `src/components/ai/`:

### `AICreditsBadge`

- mostra créditos restantes;
- barra de progresso mensal;
- tooltip com plano, limite mensal e último reset;
- estado de alerta abaixo de 20%;
- link para upgrade/configuração quando aplicável.

Será adicionado ao topo da aplicação de forma compacta, junto ao badge de quota, sem alterar páginas de criação.

### `AIActionButton`

- botão padrão para ações de IA;
- mostra custo em créditos;
- desativa se não houver saldo;
- loading state;
- toast de erro padronizado.

### `AIGeneratedField`

- wrapper visual para campos gerados por IA;
- indicador subtil quando veio da IA;
- tooltip “Gerado por IA a [data]”;
- botão “Regenerar” opcional;
- remove o indicador quando o utilizador edita.

### `InsightBanner`

- banner discreto para insights futuros;
- ações: aceitar, dispensar, nunca mostrar;
- sem ligar ainda a uma feature da Fase 4.

---

## 6. Página interna de demo

Criar página interna, por exemplo `/ai-demo`, protegida por autenticação, para validar os padrões de UI sem mexer no `/manual-create`.

A página terá:

- `AICreditsBadge`;
- exemplos de `AIActionButton`;
- exemplo de `AIGeneratedField`;
- exemplo de `InsightBanner`;
- uma chamada de teste simples ao `generateText` para confirmar logs e consumo de créditos.

Se preferires que esta página não fique no menu, ficará apenas acessível por URL direta.

---

## 7. Preferências de IA

O projeto já tem `ai_preferences`. Vou estendê-la em vez de criar `user_preferences` duplicada, porque ela já representa preferências de IA por utilizador.

Adicionar campos:

- `preferred_model text default 'fast'`
- `auto_alt_text boolean default false`
- `auto_first_comment boolean default false`

A página de preferências de IA ficará em `/ai-settings` ou integrada nas definições existentes, com:

- Idioma das gerações: PT-PT, EN, ES, FR;
- Tom por defeito: Neutro, Direto, Emocional, Técnico, Humor;
- Modelo preferido: Rápido / Melhor qualidade;
- Ativar banners de insights;
- Gerar alt text automaticamente;
- Gerar primeiro comentário automaticamente.

Também atualizarei `useAiPreferences` e os tipos em `src/types/aiEditorial.ts`.

---

## 8. Validação

No fim da implementação:

- correr build TypeScript;
- testar chamada de exemplo do `aiService.generateText` pela demo interna;
- confirmar criação de registo em `ai_usage_log`;
- confirmar desconto em `user_ai_credits`;
- confirmar erro amigável quando os créditos forem insuficientes;
- confirmar que `/manual-create` não recebeu alterações visuais deste prompt.

---

## Fora de âmbito neste prompt

- Não implementar Fase 1, 2, 3 ou 4.
- Não refatorar agora todas as funções de IA existentes para o novo `ai-core`, salvo ligação mínima de teste.
- Não adicionar Storybook.
- Não pedir nem configurar `ANTHROPIC_API_KEY` agora.
- Não alterar ficheiros bloqueados como `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts` ou `.env`.

---

## Checkpoint

☐ Confirmar que posso avançar com a infraestrutura usando `ai_preferences` existente em vez de criar `user_preferences` duplicada.  
☐ Confirmar que aceitas usar Lovable AI para texto/visão e OpenAI Whisper para transcrição nesta fase.  
☐ Confirmar que a demo interna pode ficar numa rota protegida, sem aparecer no menu principal.  
☐ Após aprovação, implemento as migrações, backend, serviço frontend, componentes, preferências e validação.