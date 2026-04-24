## Plano — Correção ao Prompt 3: reescrita por tom em `/manual-create`

### Objetivo
Ajustar a UX do card “Legenda” para separar claramente dois usos de IA:

- Modal “Gerar Legenda com IA”: continua como ferramenta de geração estruturada.
- Nova barra rápida de tons: ajustes rápidos sobre legenda já existente.
- Remover a secção redundante “Tom da reescrita” no fim do card.

### Alterações propostas

1. **Manter o modal existente**
   - Não alterar o conteúdo nem o fluxo do modal `Gerar Legenda com IA`.
   - Apenas adaptar a função de aplicação da legenda para integrar o histórico de undo e o toast correto.
   - Toast ao aplicar sugestão do modal: `Legenda gerada com IA.`

2. **Criar/ajustar a barra rápida de tons**
   - Usar o componente existente `CaptionToneToolbar` como base, reposicionando-o para ficar dentro do editor, imediatamente acima da textarea.
   - A barra só aparece quando a legenda ativa tem mais de 20 caracteres.
   - Botões finais:
     - `Curto`
     - `Longo`
     - `Direto`
     - `Emocional`
     - `Técnico`
     - `LinkedIn`
     - `Instagram`
   - Usar ícones `lucide-react`, não emojis, para cumprir o design system.
   - Cada clique continua a consumir 1 crédito.

3. **Remover a reescrita redundante no fim do card**
   - Remover `CaptionRewritePanel` do topo/fim do conteúdo do card “Legenda”.
   - Remover props antigas sem uso em `Step3CaptionCard`: `rewriteTone`, `onRewriteToneChange`, `rewriteLoading`, se deixarem de ser necessárias.
   - Manter apenas o controlo de reverter quando existir histórico.

4. **Respeitar legenda unificada vs separada por rede**
   - A barra rápida vai atuar sobre a legenda ativa:
     - modo unificado: `caption`.
     - modo separado: legenda da tab/rede ativa.
   - A integração vai continuar a usar `captionEditorRef.current?.getActiveNetwork()` para decidir a rede ativa.

5. **Unificar histórico de undo**
   - Antes de qualquer escrita feita por IA, guardar o estado anterior na stack `rewriteHistory`, com máximo de 5 estados.
   - Isto aplica-se a:
     - aplicação de sugestão vinda do modal.
     - clique na barra rápida de tons.
   - O botão “Reverter última reescrita” e `Ctrl+Z` revertem a última alteração feita por IA.
   - Ajustar `Ctrl+Z` para funcionar mesmo com foco na textarea, evitando conflito apenas quando o browser já tiver undo nativo disponível se necessário.

6. **Logging de uso de IA**
   - Barra rápida: alterar `feature` enviada para o backend para `caption_rewrite_tone`.
   - Modal: manter o fluxo atual do modal, mas garantir que o uso fica identificado como `caption_generation` se o fluxo passar por chamada de IA própria deste modal.
   - Confirmar que o registo continua a passar pelo backend de IA já existente, que escreve em `ai_usage_log`.

7. **Toasts e microcopy**
   - Barra rápida: `Legenda ajustada. Ctrl+Z para reverter.`
   - Modal: `Legenda gerada com IA.`
   - Botão de undo visível apenas após uma alteração por IA, com label: `Reverter última reescrita`.

8. **Documentação**
   - Atualizar `DESIGN_SYSTEM.md` para declarar a hierarquia final do card “Legenda”:
     - toolbar existente.
     - barra rápida condicional.
     - textarea.
     - contadores.
     - undo condicional.
   - Declarar `CaptionToneToolbar` como componente pronto para reuso no contexto de reescrita rápida.

### Ficheiros previstos

- `src/components/manual-post/NetworkCaptionEditor.tsx`
- `src/components/manual-post/ai/CaptionToneToolbar.tsx`
- `src/components/manual-post/steps/Step3CaptionCard.tsx`
- `src/components/manual-post/steps/ManualCreateModals.tsx`
- `src/components/manual-post/AICaptionDialog.tsx` apenas se for necessário expor callback sem alterar o modal visual
- `src/pages/ManualCreate.tsx`
- `src/types/aiEditorial.ts` se for necessário normalizar tipos de origem/feature
- `DESIGN_SYSTEM.md`

### Validação

- Confirmar que o modal abre pelo botão “IA” e mantém o fluxo visual atual.
- Confirmar que a barra rápida não aparece com texto até 20 caracteres.
- Confirmar que a barra aparece acima da textarea com texto superior a 20 caracteres.
- Confirmar que cada tom substitui a legenda ativa correta.
- Confirmar que `Ctrl+Z` e o botão “Reverter última reescrita” revertem alterações vindas do modal e da barra.
- Executar build/typecheck disponível.

### Checklist

- [ ] Modal “Gerar Legenda com IA” mantido sem redesenho.
- [ ] Barra rápida de tons implementada acima da textarea.
- [ ] Barra condicional para texto com mais de 20 caracteres.
- [ ] Secção antiga “Tom da reescrita” removida.
- [ ] Undo unificado para modal e barra.
- [ ] Toasts diferenciados implementados.
- [ ] `ai_usage_log` distinguido por feature: `caption_generation` e `caption_rewrite_tone`.
- [ ] `DESIGN_SYSTEM.md` atualizado.