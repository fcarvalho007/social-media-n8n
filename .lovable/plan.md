## Avaliação do estado atual

A Fase 1 está parcialmente funcional: o cartão `AiUploadAssistantCard` já aparece em `/manual-create`, chama `ai-editorial-assistant`, aplica legenda, variantes por rede, hashtags simples no fim da legenda, primeiro comentário, `raw_transcription` e `ai_metadata`.

Ainda não marcaria a fase como fechada porque existem lacunas de produto, robustez e consistência com a especificação original.

## O que está bem encaminhado

- Cartão IA criado e integrado antes da secção “Legenda”.
- Ação “Já tenho a legenda” esconde o cartão.
- Ação “Transcrever com IA” chama uma função backend.
- Resultado da IA preenche:
  - legenda principal;
  - legendas por rede;
  - primeiro comentário;
  - transcrição bruta;
  - metadados IA.
- `useAutoSave`, `useDraftRecovery`, `usePublishOrchestrator` e `usePublishWithProgress` já transportam os campos principais de IA.
- `ai-caption-tools` e `ai-generate-alt-text` continuam vazias, portanto as fases seguintes ainda não estão implementadas.

## Refinamentos prioritários antes de avançar

### 1. Estabilizar a Fase 1 — Assistente desde o upload

Implementar uma mini-fase de fecho com estes ajustes:

- Reset automático do estado IA quando o utilizador remove ou troca o ficheiro de vídeo:
  - limpar `rawTranscription`;
  - limpar `aiMetadata`;
  - voltar a permitir mostrar o cartão IA para o novo vídeo.
- Melhorar o tratamento de erros do cartão:
  - mostrar a mensagem específica devolvida pela função, em vez de sempre “A IA está indisponível”.
  - diferenciar limite de IA, créditos insuficientes, vídeo grande e sessão expirada.
- Evitar duplicação de hashtags:
  - se a legenda devolvida pela IA já trouxer hashtags, não duplicar as mesmas no fim.
  - normalizar hashtags com `#` e sem espaços inválidos.
- Guardar o `alt_text` gerado dentro de `aiMetadata`, mas não fingir que já está aplicado a média enquanto não houver UI própria para alt text.
- Atualizar `.lovable/plan.md`, que está desatualizado: ainda diz que `ai-editorial-assistant` está vazia, mas já existe e funciona.

### 2. Corrigir inconsistências técnicas no backend IA

Na função `ai-editorial-assistant`:

- Validar melhor o corpo do pedido:
  - `fileBase64` obrigatório;
  - `mimeType` só vídeo/áudio;
  - `networks` com lista controlada;
  - limite claro de tamanho.
- Melhorar CORS para incluir headers usados pelo cliente moderno.
- Manter prompts e chaves apenas no backend.
- Não mexer nos ficheiros bloqueados:
  - `src/integrations/supabase/client.ts`;
  - `src/integrations/supabase/types.ts`;
  - `.env`;
  - chaves de projeto em `supabase/config.toml`.

### 3. Preparar a próxima fase sem a misturar já

Depois da estabilização, a próxima fase mais útil é **Fase 3.2 — Reescrita por tom**, porque já existe o componente `CaptionToneToolbar`, mas ainda não está ligado.

Nessa fase seguinte, implementar:

- `supabase/functions/ai-caption-tools/index.ts`.
- Ações:
  - “Mais direto”;
  - “Mais emocional”;
  - “Mais técnico”;
  - “Mais curto”;
  - “Mais longo”;
  - “Tom LinkedIn”;
  - “Tom Instagram”.
- Integração no editor de legenda:
  - funciona em legenda unificada;
  - funciona na rede ativa quando “Legendas separadas” está ligado;
  - inclui estado de loading por ação;
  - inclui “Desfazer”.
- Substituir gradualmente o fluxo antigo `AICaptionDialog`/`improve-caption`, que ainda usa uma função separada e menos alinhada com a nova arquitetura.

## O que não recomendo fazer já

- Não avançar para hashtags inteligentes antes de fechar a Fase 1. O componente `HashtagSuggestions` existe, mas os dados reais de performance/volume ainda precisam de regras claras para não inventar scores.
- Não avançar para alt text automático completo antes de decidir como guardar `alt_texts` por item de média.
- Não corrigir RLS policies e buckets públicos nesta mesma passagem, porque isso é uma intervenção de segurança em produção e já tinha ficado condicionado a aprovação específica.

## Plano de execução recomendado agora

### Passo 1 — Fecho da Fase 1

- Corrigir reset do cartão IA quando a média muda.
- Melhorar mensagens de erro no frontend.
- Normalizar hashtags e evitar duplicados.
- Atualizar documentação de estado em `.lovable/plan.md`.
- Fazer build para validar TypeScript.

### Passo 2 — Só depois, avançar para Fase 3.2

- Criar a função `ai-caption-tools`.
- Ligar `CaptionToneToolbar` ao `NetworkCaptionEditor`.
- Implementar reescrita por tom com undo.
- Fazer build e teste manual do fluxo unificado/separado.

## Checkpoint

☐ Fase 1 revista e parcialmente validada  
☐ Identificados refinamentos em reset, erros e hashtags  
☐ Confirmado que `ai-caption-tools` e `ai-generate-alt-text` ainda estão vazias  
☐ Próxima execução recomendada: estabilizar Fase 1 antes de nova funcionalidade  
☐ Correções de segurança continuam fora desta passagem até aprovação explícita