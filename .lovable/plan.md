# Auditoria e plano refinado

## Estado encontrado

### Prompt 1 — Assistente desde o upload

Implementado parcialmente e com boa base:

- Existe `AiUploadAssistantCard` em `/manual-create`.
- O cartão aparece depois de upload de vídeo em contextos compatíveis.
- A IA transcreve e gera campos editoriais.
- O fluxo consome 2 créditos na transcrição + 3 créditos na geração = 5 créditos.
- `raw_transcription` e `ai_metadata` são guardados em rascunhos e posts.
- A recuperação de rascunhos carrega `raw_transcription` e `ai_metadata`.
- Existem indicadores “Gerado por IA” em legenda, alt text e primeiro comentário.

Lacunas/refinamentos necessários:

- O assistente ainda não aplica as hashtags sugeridas na legenda; apenas as guarda em `ai_metadata.upload_assistant.suggestions`.
- O prompt pede `hashtags_suggested`, mas o tipo `EditorialAssistantResult` ainda espera também `hashtags.reach/niche/brand`; isto pode gerar inconsistências.
- O estado `aiGeneratedEdited` só existe no estado local. Ao recarregar a página, os indicadores podem voltar a aparecer porque o estado de edição não é persistido.
- O autosave local tem `loadSavedData`, mas `/manual-create` não parece restaurar automaticamente esse autosave ao abrir a página; a recuperação forte está sobretudo em rascunhos explícitos/base de dados.
- A transcrição é guardada, mas o estado “a meio do processo” ainda não é totalmente retomável se o recarregamento acontecer entre transcrição e geração.
- O upload temporário para transcrição usa o bucket `pdfs`; funciona, mas é semanticamente fraco para vídeo e deve ser encapsulado/clarificado para evitar confusão futura.

### Prompt 2 — Caixa de hashtags inteligente

Ainda não está implementado de ponta a ponta:

- Existe um componente `HashtagSuggestions`, mas não está ligado a nenhuma página.
- O componente atual ainda fala em “volume alto/médio” e `good/saturated`, o que contraria a regra “sem métricas inventadas”.
- Existem sugestões antigas hardcoded em `CaptionEditor` e `HashtagManager`, com termos pt-BR como “planejamento”.
- `/ai-settings` ainda não tem gestão de hashtags de marca.
- `user_brand_hashtags` existe no schema, mas não está a ser usado no frontend atual.
- `hashtag_metadata` existe, mas ainda não há fluxo de cache de 7 dias para metadados internos.
- `ai-core` só suporta ações genéricas; não há ação dedicada para hashtags editoriais.

## Princípio refinado para Prompt 2

Implementar uma caixa de hashtags editorial, sem providers pagos e sem métricas de mercado.

A IA pode classificar por intenção editorial:

- Alcance: hashtags mais amplas e compreensíveis.
- Nicho: hashtags mais específicas ao tema/transcrição.
- Marca: hashtags fixas/preferidas do utilizador.

A IA não deve atribuir scores, volume, popularidade, saturação, tendência ou desempenho.

Indicadores visuais:

- Neutro: hashtag editorialmente válida, sem score.
- Vermelho: hashtag banida, arriscada, spammy ou excesso de limite da rede.
- Sem verde/amarelo por “saúde” quando não há dados verificados.

## Plano de implementação

### 1. Fechar lacunas do Prompt 1

1. Normalizar o resultado do assistente de upload:
   - aceitar `hashtags_suggested` como formato principal;
   - não depender de `hashtags.reach/niche/brand` quando o prompt não garante esses grupos;
   - guardar um objeto consistente em `ai_metadata`.

2. Aplicar hashtags sugeridas de forma segura:
   - quando a IA gera hashtags, acrescentar à legenda apenas se ainda não existirem;
   - limitar por rede ativa quando aplicável;
   - manter o utilizador livre para remover/editar.

3. Persistir estado editorial gerado/editado:
   - guardar em `ai_metadata.generated_fields` ou estrutura equivalente:
     - `caption.generated_at`, `caption.edited`;
     - `first_comment.generated_at`, `first_comment.edited`;
     - `alt_text.generated_at`, `alt_text.edited`;
     - `hashtags.generated_at`, `hashtags.edited`.
   - restaurar estes estados ao carregar rascunhos.

4. Melhorar retoma a meio do processo:
   - se já existir `raw_transcription` e `upload_assistant.status = transcribed`, mostrar opção “Continuar a preparar campos” sem cobrar novamente a transcrição;
   - manter o custo total do fluxo completo em 5 créditos apenas quando executa transcrição + geração;
   - se só faltar geração, cobrar apenas 3 créditos.

### 2. Criar modelo editorial de hashtags

1. Atualizar tipos em `aiEditorial.ts`:
   - substituir `HashtagStatus = good | saturated | risk` por estados seguros, por exemplo:
     - `none`, `risk`, `banned`, `over_limit`;
   - remover `volumeEstimate` como dado exibível salvo se vier de fonte verificada;
   - adicionar campos editoriais: `reason`, `riskReason`, `source = ai_editorial | brand | internal_safety`.

2. Criar lista local de segurança:
   - ficheiro com hashtags banidas/spam/arriscadas comuns;
   - normalização robusta: minúsculas, sem acentos problemáticos quando necessário, sempre com `#` no UI;
   - sem scraping e sem APIs pagas.

3. Usar `hashtag_metadata` apenas como cache interno:
   - guardar classificação editorial e data de verificação;
   - validade de 7 dias;
   - não guardar “volume” inventado;
   - `source` deve indicar `ai_editorial` ou `internal_safety`.

### 3. Backend/IA para hashtags

1. Estender `ai-core` com ação dedicada, por exemplo `hashtag_generation`:
   - input: legenda, transcrição opcional, redes selecionadas, hashtags de marca, idioma `pt-PT`;
   - output JSON estruturado com grupos `reach`, `niche`, `brand`;
   - custo: 1 crédito por regeneração.

2. Prompt da IA:
   - português de Portugal;
   - nunca inventar métricas;
   - classificar por relevância editorial;
   - devolver razões curtas;
   - evitar hashtags genéricas em excesso;
   - respeitar hashtags de marca do utilizador.

3. Cache:
   - antes de chamar IA, consultar metadados internos recentes para hashtags já vistas;
   - depois da resposta, atualizar `hashtag_metadata` com metadados internos e `last_verified`.

### 4. UI da caixa de hashtags inteligente em `/manual-create`

1. Criar/substituir componente `HashtagSuggestionsBox`:
   - compacto e mobile-first;
   - três grupos: Alcance, Nicho, Marca;
   - chips selecionáveis;
   - botão “Adicionar à legenda”;
   - botão “Regenerar” com badge “1 crédito”.

2. Integração com `NetworkCaptionEditor`/`Step3CaptionCard`:
   - mostrar por baixo do editor de legenda;
   - ao clicar numa hashtag, inserir/remover da legenda ativa;
   - em legendas separadas, aplicar à rede ativa;
   - em legenda unificada, aplicar à legenda principal.

3. Limites por rede:
   - Instagram: máximo 30;
   - TikTok/LinkedIn: recomendado/máximo operacional 5;
   - X: 2;
   - Facebook: 3;
   - excesso marcado a vermelho, sem bloquear imediatamente.

4. Transparência no UI:
   - texto curto: “Sugestões editoriais da IA. Não incluem volume nem desempenho de mercado.”
   - remover qualquer copy como “volume alto”, “saturada”, “boa performance” ou “score”.

### 5. Gestão de hashtags de marca em `/ai-settings`

1. Adicionar secção “Hashtags de marca”:
   - até 5 hashtags;
   - adicionar/remover;
   - normalização automática com `#`;
   - mensagens pt-PT.

2. Persistência:
   - usar `user_brand_hashtags` como fonte principal, se disponível;
   - manter compatibilidade com `ai_preferences.brand_hashtags` apenas se necessário para não quebrar fluxos existentes.

3. Integração:
   - carregar hashtags de marca no assistente de upload e na caixa de hashtags;
   - permitir que o grupo “Marca” respeite a preferência do utilizador.

### 6. Remover/neutralizar sugestões antigas

1. Substituir sugestões hardcoded antigas:
   - `CaptionEditor` e `HashtagManager` não devem continuar a recomendar hashtags por mapa estático;
   - remover termos pt-BR como “planejamento”.

2. Garantir que o fluxo antigo de Review não perde funcionalidade:
   - se ainda precisar de sugestões, usar o novo componente ou deixar apenas gestão manual.

## Ficheiros prováveis a alterar

- `src/types/aiEditorial.ts`
- `src/services/ai/aiService.ts`
- `supabase/functions/ai-core/index.ts`
- `src/pages/ManualCreate.tsx`
- `src/components/manual-post/steps/Step3CaptionCard.tsx`
- `src/components/manual-post/NetworkCaptionEditor.tsx`
- `src/components/manual-post/ai/HashtagSuggestions.tsx` ou novo `HashtagSuggestionsBox.tsx`
- `src/pages/AISettings.tsx`
- `src/hooks/ai/useAiPreferences.ts` ou novo hook dedicado a hashtags de marca
- `src/components/CaptionEditor.tsx`
- `src/components/HashtagManager.tsx`

Não alterar ficheiros bloqueados:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- chaves de projeto em `supabase/config.toml`

## Critérios de aceitação refinados

☐ Prompt 1 mantém fluxo completo com custo máximo de 5 créditos.
☐ Se a página recarregar depois da transcrição, permite continuar sem cobrar nova transcrição.
☐ Transcrição fica disponível para fases seguintes via `raw_transcription` e `ai_metadata`.
☐ Indicadores “Gerado por IA” desaparecem depois de edição e são restaurados corretamente em rascunhos.
☐ Hashtags sugeridas pela IA podem ser aplicadas/removidas da legenda.
☐ Caixa mostra Alcance, Nicho e Marca sem scores inventados.
☐ Sem cores de “saúde” quando não há fonte verificável.
☐ Vermelho só aparece para risco, banida/spam ou excesso de limite.
☐ Regenerar hashtags consome 1 crédito.
☐ Hashtags de marca são geridas em `/ai-settings`, máximo 5.
☐ Cache interna de 7 dias usa `hashtag_metadata` sem métricas de mercado inventadas.
☐ Interface e mensagens em pt-PT, sem pt-BR.
☐ Sem integração RiteTag, Display Purposes, scraping ou qualquer provider pago.