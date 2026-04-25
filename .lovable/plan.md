# Refinamentos /manual-create — Polish final

## R1 — Eliminar warning "ResizeObserver loop limit exceeded"
- Localizar `ResizeObserver` em `src/pages/ManualCreate.tsx` (mede altura da action bar fixa para expor `--manual-action-bar-height`).
- Envolver o callback em `requestAnimationFrame` para diferir a actualização do CSS variable até ao próximo frame.
- Eliminar o warning recorrente em consola sem mudar comportamento.

## R2 — Restaurar legibilidade em viewports >1536px
- Em `src/pages/ManualCreate.tsx`, **não** restringir a coluna esquerda inteira (manter `min-w-0` para o grid funcionar correctamente).
- Aplicar `max-w-3xl mx-auto` apenas aos sub-blocos textuais densos:
  - Wrapper do `Step3CaptionCard`.
  - Wrapper do `Step3ScheduleCard`.
- Mantém uso eficiente do espaço sem prejudicar leitura de legendas longas em ecrãs ultra-wide.

## R3 — Altura do PreviewPanel respeita action bar fixa
- Em `src/components/manual-post/steps/PreviewPanel.tsx`, substituir:
  ```
  lg:h-[calc(100vh-8rem)]
  ```
  Por:
  ```
  lg:h-[calc(100vh-8rem-var(--manual-action-bar-height,0px))]
  ```
- Garantir que o rodapé do preview nunca fica tapado pela barra de acções fixa.

## R4 — Simplificar StickyMetadataBar
- Manter a barra mas reduzir conteúdo a duas peças apenas:
  - Contador de caracteres com cor `over/near limit` (único sítio onde aparece em desktop).
  - Contador de hashtags.
- Remover o schedule label e o file count (já visíveis no formulário Step3 e na lista de média).
- Justificação: evita duplicação visual e foca a barra no que é crítico para validação rápida (limite por rede).

## R5 — Limpar tautologia em PreviewPanel.tsx
- Linha ~80 actualmente:
  ```ts
  const activeFormat = (variant === 'mobile' ? activePreviewTab || selectedFormats[0] : activePreviewTab || selectedFormats[0]) as PostFormat | undefined;
  ```
- Substituir por:
  ```ts
  const activeFormat = (activePreviewTab || selectedFormats[0]) as PostFormat | undefined;
  ```

## R6 — Remover `activate('media')` redundante em ManualCreate.tsx
- Localizar chamada manual a `activate('media')` no handler de selecção de formatos.
- Confirmar que `useGuidedFlow` já dispara essa transição via `transitionTo('media')`.
- Remover linha duplicada para evitar dupla activação (potencial fonte de race conditions).

## Validação
- `npx tsc --noEmit` sem erros.
- `vitest run` 37/37 verdes.
- Smoke mental:
  - **1462px**: sticky preview à direita, sem warning de ResizeObserver na consola.
  - **1900px**: sub-blocos textuais limitados a `max-w-3xl`, restante coluna usa o espaço.
  - **StickyMetadataBar**: mostra apenas `1234/2200` + `5 #`.
  - **Selecção de formato**: `activeSection` muda uma só vez para `'media'`.

## Não alterar
- Lógica de validação, publicação, `useGuidedFlow`, `SectionCard`, ou estrutura JSX do grid.
- Comportamento mobile (Drawer/FAB).