Plano de correção para `/manual-create`

Diagnóstico confirmado em preview 1462x905:

- Depois de selecionar “Carrossel”, a secção Média chega a ficar `active`, mas logo a seguir `activeSection` passa para `schedule` sem existir média carregada.
- A causa provável está no auto-avanço 4 → 5: `hasOptionsConfigured` trata valores default como configuração real (`instagram.formatVariant = 'feed'`, `youtube.visibility = 'public'`, etc.). Como `showStep3` depende de média, as secções 3/4/5 ficam escondidas, mas a secção ativa passa para Agendamento. Resultado visual: Média volta a `inactive`/colapsada e o fluxo “salta”.
- A pré-visualização está dentro da coluna esquerda por estrutura JSX: o `PreviewPanel` foi renderizado antes de fechar a div da coluna do formulário. Por isso aparece empilhado por baixo em vez de ocupar a coluna direita sticky.

## Alterações propostas

### 1. Corrigir progressive disclosure: Média não pode ser saltada

Em `src/pages/ManualCreate.tsx`:

- Alterar a transição automática 4 → 5 para só poder disparar quando a secção 4 estiver realmente disponível:
  - exigir `showStep3 === true`;
  - exigir `hasAnyCaption === true` ou `activeSection === 'network-options'` conforme a regra final do fluxo;
  - nunca permitir `schedule` antes de haver pelo menos `minMediaRequired` ficheiros carregados.
- Corrigir `hasOptionsConfigured` para contar apenas opções editadas pelo utilizador, não defaults técnicos:
  - contar `firstComment` com texto;
  - contar `collaborators`, `mentions`, `photoTags`, `tags` com itens;
  - contar `storyLinkUrl`, `storyLinkStickerText`, `storyLinkOverlayText`, `youtube.title`, `googlebusiness.ctaUrl` com texto;
  - contar booleans apenas quando forem ativações reais de feature, como `ctaEnabled === true` ou `disableLinkPreview === true`;
  - não contar `formatVariant: 'feed'`, `visibility: 'public'`, `categoryId: '22'`, `ctaType: 'learn_more'`.
- Manter `mediaState` com prioridade ao foco, mas garantir que nenhuma transição posterior rouba o foco antes da média existir.
- Remover o `console.debug` temporário depois de validar a correção.

### 2. Restaurar layout desktop com preview sempre visível à direita

Em `src/pages/ManualCreate.tsx`:

- Corrigir a hierarquia JSX para que `PreviewPanel` seja sibling da coluna esquerda, não filho dela.

Estrutura pretendida:

```text
manual-create-grid
  left column: NetworkFormatSelector + Step2MediaCard + Caption/Options/Schedule
  right column: PreviewPanel desktop sticky
```

Em `src/index.css` e/ou classes Tailwind existentes:

- Mudar o breakpoint da grelha de desktop para `xl` (>=1280px), não `lg`, para cumprir a regra:
  - <1280px: single column + preview via FAB/Drawer;
  - >=1280px: duas colunas + preview sticky.
- Usar proporção aproximada 60/40 ou 65/35:
  - esquerda: `minmax(0, 1.55fr)` ou equivalente;
  - direita: `minmax(360px, 0.95fr)`.
- Manter `overflow-visible` nos ancestrais do sticky.

Em `src/components/manual-post/steps/PreviewPanel.tsx`:

- Alterar visibilidade desktop de `lg:*` para `xl:*`.
- Manter `position: sticky`, com `top` alinhado ao header (`top-24` ou equivalente existente) e `h-[calc(100vh-8rem)]`.

### 3. Ajustar largura desktop sem desperdiçar espaço

Em `ManualCreate.tsx`:

- Manter container máximo em torno de `max-w-[1600px]`.
- Preservar padding responsivo atual.
- Remover/ajustar o limite `2xl:max-w-3xl` se estiver a estreitar demasiado a coluna esquerda dentro da grelha. Em vez disso, limitar apenas blocos de texto internos quando necessário, não a coluna inteira.

### 4. Validar e entregar evidência

Após implementação em build mode:

- Correr `npx tsc --noEmit`.
- Correr testes Vitest existentes.
- Testar em preview:
  - 375px: mobile preservado, preview por FAB/Drawer;
  - 768px: single column, preview por Drawer;
  - 1280px: preview aparece na coluna direita sticky;
  - 1462px: selecionar Carrossel mantém Média ativa/expandida e preview à direita;
  - 1900px: container limitado, sem espaço branco excessivo.
- Cenário crítico:
  - abrir `/manual-create` vazio;
  - clicar “Carrossel”;
  - confirmar Secção 1 `complete`;
  - confirmar Secção 2 `active`/expandida sem média carregada;
  - confirmar que não salta para Legenda/Opções/Agendamento;
  - confirmar scroll suave para Média;
  - confirmar preview visível à direita no desktop.

## Ficheiros previstos

- `src/pages/ManualCreate.tsx`
- `src/index.css`
- `src/components/manual-post/steps/PreviewPanel.tsx`

Não vou alterar `SectionCard`, `useGuidedFlow`, validação, publicação, nem adicionar dependências.

Checklist de aprovação:

☐ Corrigir transição indevida para `schedule` antes de haver média.
☐ Corrigir `hasOptionsConfigured` para ignorar defaults técnicos.
☐ Corrigir hierarquia JSX para PreviewPanel ficar na coluna direita.
☐ Ajustar breakpoint desktop para `xl`/1280px.
☐ Validar 375, 768, 1280, 1462 e 1900px.
☐ Remover logs temporários após validação.
☐ Executar tsc + vitest.