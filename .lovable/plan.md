## Diagnóstico — o que ficou por fazer

O trabalho anterior deixou a base montada, mas não deixou a funcionalidade pronta para uso em rascunhos reais.

### Já feito

- Esquema de dados criado para IA editorial:
  - `posts.raw_transcription`
  - `posts.ai_metadata`
  - `posts_drafts.raw_transcription`
  - `posts_drafts.ai_metadata`
  - `ai_preferences`, `ai_credit_usage`, `hashtag_intelligence`, `post_performance`, `account_insights`
- Componentes visuais criados:
  - `AiUploadAssistantCard`
  - `CaptionToneToolbar`
  - `HashtagSuggestions`
  - `AltTextPanel`
  - `VideoAiTools`
  - `EditorialInsightBanner`
- Tipos e hook de preferências de IA criados.
- Buckets/funções existem como pastas, mas as três funções principais ainda estão vazias.

### Ainda por fazer

1. As funções backend `ai-editorial-assistant`, `ai-caption-tools` e `ai-generate-alt-text` existem como diretórios vazios, sem `index.ts`.
2. Os componentes de IA ainda não estão ligados ao fluxo `/manual-create`.
3. O estado de `/manual-create` ainda não guarda nem transporta:
   - transcrição;
   - metadados de IA;
   - alt text gerado;
   - primeiro comentário gerado.
4. `useAutoSave`, `useDraftRecovery` e `usePublishOrchestrator` ainda não persistem totalmente os novos campos de IA.
5. A UI de legenda ainda usa apenas `NetworkCaptionEditor`, sem barra de reescrita por tom nem hashtags inteligentes.
6. O cartão “Queres que a IA prepare tudo por ti?” ainda não aparece depois de upload de vídeo elegível.
7. A segurança reportada pelo linter continua pendente:
   - 6 policies com `true` em operações de escrita/atualização;
   - 4 buckets públicos com listagem ampla;
   - 1 aviso de extensão no schema público.

---

## Proposta de execução agora

Como pediste “avaliar o que ficou por fazer e executar”, a próxima execução deve fechar primeiro a Fase 1 funcional, sem misturar a correção de segurança em produção sem aprovação explícita.

### Fase a executar: Fase 1 — Assistente desde o upload

#### 1. Backend funcional

Criar `supabase/functions/ai-editorial-assistant/index.ts` para:

- validar sessão do utilizador no backend;
- aceitar um ficheiro de vídeo ou URL de média já carregada;
- transcrever o áudio com Whisper usando o segredo existente `OPENAI_API_KEY`;
- gerar estrutura editorial com IA:
  - título do rascunho;
  - legenda base;
  - legendas por rede;
  - hashtags por grupo;
  - primeiro comentário;
  - alt text;
  - frases citáveis;
  - transcrição bruta;
- devolver erros claros em pt-PT;
- não expor prompts nem chaves no frontend.

#### 2. Integração no `/manual-create`

Adicionar estado em `ManualCreate.tsx` para:

- `rawTranscription`;
- `aiMetadata`;
- loading/erro do assistente;
- estado de dispensa do card.

Detetar vídeo elegível:

- exatamente 1 ficheiro;
- `type` começa por `video/`;
- rácio vertical preferencialmente `9:16` ou formato de vídeo selecionado;
- excluir imagens, PDFs e carrosséis múltiplos.

#### 3. UI do assistente

Ligar `AiUploadAssistantCard` no fluxo, imediatamente antes da secção “Legenda”, quando elegível.

Ações:

- “Já tenho a legenda”: esconde o card.
- “Transcrever com IA”: chama a função backend, mostra loading e preenche:
  - legenda principal;
  - legendas por rede, se houver redes selecionadas;
  - primeiro comentário em `networkOptions`, quando aplicável;
  - `rawTranscription`;
  - `aiMetadata`.

#### 4. Persistência em rascunhos e publicações

Atualizar:

- `useAutoSave` para incluir `rawTranscription` e `aiMetadata`;
- `useDraftRecovery` para recuperar esses campos de rascunhos e posts;
- `usePublishOrchestrator` para guardar em `posts_drafts` e `posts`.

Sem editar ficheiros gerados automaticamente (`src/integrations/supabase/client.ts`, `types.ts`, `.env`).

#### 5. Teste isolado da Fase 1

Depois da implementação:

- testar upload de vídeo vertical válido;
- confirmar que o card só aparece nesse caso;
- confirmar preenchimento da legenda, variantes por rede, hashtags e primeiro comentário;
- guardar rascunho;
- carregar rascunho e confirmar persistência da transcrição/metadados;
- confirmar que falha da IA não apaga conteúdo existente.

---

## O que não vou executar nesta passagem

Não vou corrigir ainda as RLS policies nem buckets públicos sem aprovação explícita, porque tinhas pedido anteriormente diagnóstico e aprovação antes de alterar políticas em produção.

Também não vou avançar já para:

- Fase 3.2 — reescrita por tom;
- Fase 3.4 — alt text automático;
- Fase 2 — hashtags inteligentes;
- Fase 3.3 — primeiro comentário com IA;
- Fase 3.1 — SRT/capítulos;
- Fase 4 — aprendizagem contínua.

Essas fases ficam depois da Fase 1 estar funcional e testada em rascunho real.

---

## Riscos/decisões a ter em conta

- A transcrição de vídeo no browser para backend pode ser pesada. Se o ficheiro for grande, pode ser necessário usar URL já carregada em storage em vez de enviar o ficheiro diretamente para a função.
- Os buckets estão atualmente públicos; a Fase 1 pode usar o comportamento existente, mas isto deve ser revisto na correção de segurança seguinte.
- A geração de hashtags será inicialmente editorial/contextual, sem scores de saturação inventados. Scores reais só entram na Fase 2 com `hashtag_intelligence` verificada.

---

## Checkpoint

☐ Diagnóstico do estado atual concluído  
☐ Confirmado que as funções backend de IA estão vazias  
☐ Confirmado que os componentes de IA existem mas não estão ligados ao fluxo  
☐ Plano propõe executar apenas a Fase 1 funcional  
☐ Correções de segurança ficam bloqueadas até aprovação específica  
☐ A aguardar aprovação para implementar