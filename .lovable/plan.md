## Plano de revisão e refinamento — `/create`

Após rever o trabalho recente na secção `/create`, há correções importantes ainda por fechar para garantir que as legendas separadas, validação, pré-visualização e rascunhos ficam coerentes.

### 1. Corrigir validação duplicada de legendas

- Remover do `formatValidator` a validação antiga de tamanho da legenda que ainda usa sempre a legenda global.
- Deixar o limite por rede exclusivamente no `captionValidator`, que já sabe distinguir legenda global vs legenda específica por rede.
- Resultado esperado: se a legenda global tiver 500 caracteres, mas a legenda TikTok separada estiver válida, o TikTok deixa de ser bloqueado por um erro falso vindo da legenda global.

### 2. Corrigir pré-visualização por rede

- Atualizar o `previewRenderer` para receber `networkCaptions` e `useSeparateCaptions`.
- Em modo “Separadas”, cada preview deve mostrar a legenda da respetiva rede:
  - Instagram mostra `networkCaptions.instagram`.
  - Facebook mostra `networkCaptions.facebook`.
  - YouTube mostra `networkCaptions.youtube`.
  - LinkedIn mostra `networkCaptions.linkedin`.
  - TikTok mostra `networkCaptions.tiktok`.
- Em modo “Unificada”, continua a usar a legenda global.

### 3. Corrigir limite visual do TikTok

- Substituir o valor hardcoded `2200` no `TikTokPreview` pelo limite real em `NETWORK_CONSTRAINTS.tiktok.max_caption_length`.
- O contador do preview passa a mostrar `x/300`, em conformidade com o fluxo de publicação.

### 4. Preservar melhor o estado de legendas separadas

- Ajustar a inicialização das legendas separadas para usar fallback por rede de forma não destrutiva.
- Garantir que alternar de “Separadas” para “Unificada” não limpa `networkCaptions`.
- Garantir que voltar a “Separadas” recupera as versões já editadas por rede, em vez de sobrescrever tudo com a legenda global.

### 5. Incluir legendas separadas no autosave local

- Expandir o `useAutoSave` para guardar também:
  - `networkCaptions`
  - `useSeparateCaptions`
- Isto evita perda de trabalho quando há recuperação local de conteúdo em progresso.

### 6. Limpar código morto e imports obsoletos em `ManualCreate.tsx`

- Remover imports e estado que ficaram sem utilização depois das extrações recentes, incluindo validações legadas e handler antigo de emoji.
- Reduzir ruído técnico e evitar warnings/erros de TypeScript por código morto.

### 7. Melhorar coerência ao guardar/submeter

- Rever `saveDraft`, `submitForApproval` e `publishNow` para garantir que:
  - a legenda principal guardada é previsível;
  - `network_captions` continua a ser enviado quando aplicável;
  - a publicação final continua a cortar apenas no envio para a rede com limite, especialmente TikTok.

### 8. Testes e verificação

- Atualizar testes existentes de `NetworkCaptionEditor` e `captionValidator`.
- Adicionar cobertura para:
  - erro falso do `formatValidator` removido;
  - preview a usar legenda por rede;
  - TikTok preview com limite de 300;
  - alternância Unificada/Separadas sem perda das edições por rede.
- Executar `npx tsc --noEmit` e Vitest.

## Ficheiros previstos

- `src/pages/ManualCreate.tsx`
- `src/lib/validation/validators/formatValidator.ts`
- `src/lib/manual-create/previewRenderer.tsx`
- `src/components/manual-post/TikTokPreview.tsx`
- `src/hooks/useAutoSave.ts`
- `src/components/manual-post/NetworkCaptionEditor.test.tsx`
- `src/lib/validation/validators/captionValidator.test.ts`
- Possíveis testes novos junto dos módulos alterados

## Critérios de aceitação

☐ Alternar para “Separadas” mantém a legenda completa em todas as redes  
☐ Editar TikTok não altera Instagram/Facebook/YouTube/LinkedIn  
☐ Voltar a “Unificada” e regressar a “Separadas” não apaga edições por rede  
☐ TikTok acusa excesso acima de 300 caracteres, mas não corta durante a edição  
☐ O corte automático atua só na legenda da rede em causa  
☐ O preview mostra a legenda correta de cada rede em modo “Separadas”  
☐ O contador do TikTok preview mostra limite 300  
☐ A validação não duplica erros de tamanho da legenda  
☐ Rascunhos/autosave preservam legendas separadas quando aplicável  
☐ `npx tsc --noEmit` sem erros  
☐ Testes Vitest verdes