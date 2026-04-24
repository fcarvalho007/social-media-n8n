# Plano — Prompt 1: Assistente desde o upload

## Estado atual confirmado

- Já existe infraestrutura do Prompt 0: `aiService`, custos em `AI_CREDIT_COSTS`, `useAICredits`, preferências de IA, `AIGeneratedField` e função backend `ai-core`.
- Já existe um card inicial `AiUploadAssistantCard`, mas ainda está numa versão simples: não valida créditos/duração/preferências, chama uma função antiga (`ai-editorial-assistant`) e faz transcrição+geração num único passo.
- `/manual-create` já guarda `rawTranscription` e `aiMetadata` no autosave/rascunho, o que permite retomar parte do estado.
- Existe `AltTextPanel`, mas ainda não está integrado no bloco de média.
- `src/integrations/supabase/types.ts` está em `LOCKED_FILES.md`; não será editado manualmente.

## Implementação proposta

### 1. Modelo de estado do assistente

Criar/normalizar estado específico no `/manual-create` para o fluxo:

- `idle`: card visível e pronto a iniciar.
- `dismissed`: utilizador escolheu “Já tenho a legenda”.
- `transcribing`: passo 1 de 2.
- `generating`: passo 2 de 2.
- `done`: campos preenchidos.
- `error`: falha com retry.
- `blocked`: vídeo fora dos critérios ou créditos insuficientes.

Persistir o estado mínimo em `aiMetadata`/autosave para permitir retoma após reload:

- transcrição já concluída;
- fase em curso ou último passo concluído;
- sugestões geradas;
- card fechado para o rascunho atual.

### 2. Deteção de contexto após upload

Substituir a lógica atual de `showAiUploadAssistant` por uma validação completa:

- apenas 1 ficheiro;
- `video/mp4`, `video/quicktime` ou `video/webm`;
- duração entre 5 e 600 segundos, usando a leitura de metadata do vídeo;
- não carrossel/documento;
- créditos disponíveis >= `AI_CREDIT_COSTS.full_assistant_flow`;
- preferências de IA permitem o fluxo.

Nota sobre preferências: a tabela atual não tem um campo explícito “permitir assistente desde upload”. Para não criar schema desnecessário nesta fase, vou interpretar a preferência existente `insights_enabled` como permissão geral para sugestões/assistência de IA. Se no futuro quiseres granularidade, adicionamos um toggle próprio.

### 3. Novo `<AIAssistantCard />`

Substituir/refatorar `AiUploadAssistantCard` para o comportamento pedido, mantendo copy em pt-PT:

- Estado inicial com custo e créditos restantes:
  - “Custa 5 créditos. Tens X restantes.”
  - botões “Já tenho a legenda” e “Transcrever”.
- Estados loading com barra/progresso textual:
  - “A ouvir o vídeo…”
  - “Passo 1 de 2: transcrever áudio”
  - “Passo 2 de 2: a preparar os campos”
- Estados de erro:
  - vídeo demasiado longo;
  - áudio impercetível;
  - créditos insuficientes;
  - falha de API com retry até 2 tentativas.
- Estado final:
  - “Pronto! Campos preenchidos.”
  - botões “Ver transcrição” e “Fechar”.

Adicionar modal de transcrição com texto completo e botão “Copiar”.

### 4. Chamada IA em dois passos através de `aiService`

Remover do fluxo novo a chamada direta à função antiga `ai-editorial-assistant`.

Fluxo:

1. `aiService.transcribeMedia(videoUrl)`
   - usar o URL disponível no preview/upload;
   - guardar em `rawTranscription`;
   - se resultado vazio ou < 20 caracteres, mostrar erro de áudio impercetível.

2. `aiService.generateText(...)`
   - `systemPrompt` no formato do prompt;
   - `prompt` com transcrição, nome do utilizador, marca e hashtags de marca;
   - `responseFormat: 'json'`;
   - `model: 'smart'`;
   - `feature: 'upload_assistant'`.

Atenção: a infraestrutura atual cobra transcrição e geração separadamente. O custo esperado do fluxo é 5 créditos; vou ajustar `aiService`/`ai-core` para suportar um custo fixo por feature `full_assistant_flow`, evitando cobrar mais do que 5 no total.

### 5. Preenchimento dos campos

Com o JSON recebido:

- preencher legenda base com `base_caption`;
- preencher variantes por rede apenas se o toggle de legendas separadas estiver ativo;
- guardar hashtags sugeridas em cache/metadata para a Fase 2, sem as inserir na legenda;
- preencher primeiro comentário em Instagram/Facebook/LinkedIn quando aplicável;
- guardar `alt_text` e mostrar no bloco de média através do painel de alt text;
- guardar `key_quotes` em `ai_generated_fields`/`aiMetadata` para uso futuro;
- guardar `draft_title` em metadata como título interno, sem alterar visualmente o fluxo se não existir campo visível próprio no ecrã.

### 6. Indicadores “gerado por IA”

Integrar `AIGeneratedField` nos campos preenchidos pelo assistente:

- legenda base;
- variantes por rede, quando estiverem visíveis;
- primeiro comentário;
- alt text.

O indicador desaparece quando o utilizador edita manualmente o campo. Para isso, será guardado um timestamp/campo gerado e um estado local de edição por campo.

### 7. Retoma após reload

Aproveitar `useAutoSave`, `rawTranscription` e `aiMetadata` para retomar:

- se já existe transcrição mas faltam campos, retoma no passo 2;
- se já existem campos gerados, mostra estado final ou mantém campos preenchidos;
- se o utilizador fechou o card neste rascunho, não volta a aparecer até mudar o ficheiro.

### 8. Backend e créditos

Atualizar a função `ai-core` para permitir cobrança coordenada do fluxo completo:

- aceitar metadados/feature para `full_assistant_flow`;
- garantir que o fluxo consome exatamente 5 créditos;
- registar `ai_usage_log` com `feature = upload_assistant`;
- manter mensagens de erro em pt-PT e sem expor detalhes técnicos.

Se a solução mais segura exigir uma ação composta no backend, criarei/ajustarei uma função específica para o fluxo completo, mantendo o cliente a chamar apenas o serviço centralizado.

## Ficheiros previstos

- `src/pages/ManualCreate.tsx`
- `src/components/manual-post/ai/AiUploadAssistantCard.tsx` ou novo `AIAssistantCard.tsx`
- `src/components/manual-post/steps/Step3CaptionCard.tsx`
- `src/components/manual-post/steps/NetworkOptionsCard.tsx`
- `src/components/manual-post/steps/Step2MediaCard.tsx` ou integração do `AltTextPanel`
- `src/services/ai/aiService.ts`
- `src/types/aiEditorial.ts`
- `src/hooks/useAutoSave.ts`
- `src/hooks/manual-create/useDraftRecovery.ts`
- `supabase/functions/ai-core/index.ts`

Não editarei:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- chaves de projeto em `supabase/config.toml`

## Testes/checkpoint

☐ Upload de imagem não mostra o card.
☐ Upload de carrossel não mostra o card.
☐ Upload de vídeo curto mostra o card.
☐ Vídeo fora de 5–600s bloqueia o assistente com mensagem útil.
☐ Fluxo completo consome exatamente 5 créditos.
☐ Transcrição fica guardada e visível no modal.
☐ Campos gerados aparecem preenchidos e editáveis.
☐ Indicador “gerado por IA” desaparece após edição manual.
☐ Reload a meio do fluxo retoma do último passo possível.
☐ Build/typecheck sem erros.