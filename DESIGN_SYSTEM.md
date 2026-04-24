# Design System — /manual-create

Este documento define as regras visuais atuais da página `/manual-create`, consolidando os Prompts 1, 2 e 3.

## Layout

### Desktop — 1280px ou mais

- Grid principal: `minmax(0, 2fr) minmax(360px, 1fr)`.
- Proporção visual: 66% conteúdo / 34% pré-visualização.
- Gap: `32px` (`manual-gap-desktop`).
- A pré-visualização nunca deve ficar abaixo de `360px`.

### Tablet — 768px a 1279px

- Grid principal: `minmax(0, 3fr) minmax(320px, 2fr)`.
- Proporção visual: 3/5 conteúdo / 2/5 pré-visualização.
- Gap: `24px` (`manual-gap-tablet`).

### Mobile — abaixo de 768px

- Coluna única.
- Stepper sticky no topo com 44px, fundo `background/85`, blur e barra de progresso de 2px.
- Pré-visualização fora do fluxo vertical: FAB dedicado + drawer inferior com estados `peek` e `expanded`.
- Barra fixa inferior mantém navegação, ação principal adaptativa e menu overflow.
- Conteúdo deve reservar espaço inferior suficiente para não ficar tapado pela barra sticky.

Classe oficial: `.manual-create-grid`.

## Espaçamento

- Entre cards principais: `24px` (`space-y-6`).
- Padding interno de cards: `20px` (`manual-card-content`, `p-5`).
- Entre grupos de campos: `16px` (`manual-group-stack`).
- Entre label e campo: `8px` (`manual-field-stack`).
- Separadores internos: `border-border/40` quando a divisão é estrutural e não primária.

## Tipografia

- Título de secção: `18px`, peso `600`, line-height `1.3` (`manual-section-title`).
- Subtítulo/descrição: `14px`, peso `400`, line-height `1.5` (`manual-section-description`).
- Label de campo: `13px`, peso `500`, line-height `1.35` (`manual-field-label`).
- Placeholder/hint: `13px`, peso `400`, line-height `1.4`.
- Contadores e microcopy: `12px`, peso `400` (`manual-microcopy`).
- Nenhum texto de interface em `/manual-create` deve ficar abaixo de `12px`.
- Letter-spacing deve ser neutro; só títulos grandes fora deste fluxo podem usar ajuste negativo.

## Raios

- Cards de `/manual-create`: `8px` (`rounded-lg` local nos utilitários manuais).
- Inputs/selects/textareas: `6px` (`manual-input-radius`).
- Chips/badges compactos: `4px` (`manual-chip`).
- O raio global da aplicação não deve ser alterado para resolver detalhes desta página.

## Cards

### `.card-primary`

Uso: áreas onde a pessoa trabalha ativamente, como seleção de redes, média, legendas, opções por rede e agendamento.

- Fundo: `bg-card`.
- Borda: `border-border`.
- Sombra: `shadow-sm`.
- Padding: `p-5` quando usado diretamente; em componentes shadcn, usar `manual-card-shell` + `manual-card-content`.

### `.card-secondary`

Uso: informação, pré-visualização e blocos de suporte.

- Fundo: `bg-muted/30`.
- Borda: `border-border/40`.
- Sombra subtil permitida em mockups/painéis de pré-visualização.

### `.card-accent`

Uso: IA, insights e alertas editoriais.

- Borda: `border-primary/20`.
- Fundo: `bg-card` com gradient radial muito leve.
- Deve ser usado com moderação para não competir com ações primárias.

### `.manual-card-shell`

Uso: wrapper shadcn para cards principais do fluxo.

- Aplica overflow seguro, raio 8px, borda, fundo e sombra.
- Deve ser acompanhado de `.manual-card-content` em `CardHeader`/`CardContent`.

## Estados interativos

- Hover em card clicável: mudança subtil de `bg-muted`/`bg-accent`, sem cor de marca decorativa.
- Transição de cor: `150ms ease` (`duration-manual-color`).
- Expansão/colapso: `200ms ease-out` (`duration-manual-expand`).
- Focus visível: ring `2px`, cor `primary`, offset `2px`.
- Mobile: controlos críticos usam alvo mínimo `44×44px` via `.manual-touch-target`.
- Inputs/textareas em mobile usam `.manual-scroll-anchor` para manter o campo visível com teclado aberto.
- Disabled: `opacity-50`, `cursor-not-allowed`.
- Loading:
  - Upload usa progress bar.
  - Botões assíncronos usam spinner interno quando a estrutura do botão se mantém.
  - Áreas maiores devem preferir skeleton/progress a spinner isolado.

## Empty states

- Estados vazios devem ter ícone grande entre `48px` e `64px`, `text-muted-foreground` com opacidade baixa e copy curta.
- Copy aprovada para pré-visualização sem seleção: “Seleciona uma rede para ver a pré-visualização.”
- O vazio nunca deve deixar cards sem altura ou desalinhados.

## Iconografia

- Biblioteca oficial: `lucide-react`.
- Imports devem ser nomeados; não usar `import * as`.
- Labels/contexto pequeno: `16px`.
- Botões: `20px`.
- Headers de card: `20–24px`.
- Stroke width: `1.5` sempre que o componente permitir configuração explícita.
- Cores oficiais de redes sociais só são permitidas nos ícones/logótipos das próprias redes.

## Movimento

- `.manual-enter`: fade + slide de `8px`, `200ms ease-out`.
- Usar em secções que aparecem progressivamente, como “Opções por rede” e grupos dinâmicos.
- Respeitar `prefers-reduced-motion`.
- Elementos de UI não devem usar animações acima de `300ms`.

## Componentes prontos para reuso

- `NetworkFormatSelector`: seleção compacta de rede/formato com empty state e focus consistente.
- `PreviewPanel`: painel lateral e drawer mobile com tabs compactas, metadata e empty state ilustrado.
- `Step2MediaCard`: upload, ferramentas de vídeo e grelha de média com contadores alinhados.
- `MobileStickyActionBar`: barra mobile com ação primária adaptativa, botão anterior e menu overflow.
- `Step3CaptionCard`: wrapper de legenda com toolbar, barra rápida de tons, editor unificado/diferenciado e undo de IA.
- `CaptionToneToolbar`: barra compacta de reescrita rápida por tom; só aparece acima da textarea quando a legenda ativa tem mais de 20 caracteres.
- `Step3ScheduleCard`: agendamento com toggle, atalhos e preview agendado.
- `NetworkOptionsCard`: opções avançadas por rede com acordeões, feedback visual e campos padronizados.
- `PublishActionsCard`: ações finais com validação, loading e hierarquia primária/secundária.
- `HashtagSuggestions`: grupos de hashtags com chips acessíveis e estados de risco.

## Hierarquia do card “Legenda”

- Cabeçalho com contador global e nota de obrigatoriedade para LinkedIn.
- Banner editorial opcional.
- Toggle “Unificada/Separadas” quando há duas ou mais redes.
- Toolbar principal: emojis, legendas guardadas e botão `IA` que abre o modal “Gerar Legenda com IA”.
- Barra rápida de tons imediatamente acima da textarea, apenas com texto superior a 20 caracteres.
- Textarea da legenda ativa e contadores por rede.
- Botão `Reverter última reescrita` apenas após alteração feita por IA; também deve funcionar com `Ctrl+Z`.

## Dívida técnica declarada para fase futura

- `NetworkOptionsCard` ainda concentra muitos renders inline; deve ser dividido por rede noutra fase.
- `PlatformChip`, `CollapsedFormatsSummary` e componentes legados do seletor ainda têm estilos inline para cor oficial de plataforma; manter apenas enquanto forem necessários para marca da rede.
- O bundle principal continua grande por dependências existentes; isto não foi alterado por ser fora do âmbito visual.
- Alguns componentes fora de `/manual-create` ainda usam cores diretas históricas e não foram normalizados neste prompt.

## Checklist para prompts seguintes

- [ ] Reutilizar `.manual-create-grid` no contentor principal.
- [ ] Usar `.manual-card-shell`, `.manual-card-content`, `.card-primary`, `.card-secondary` ou `.card-accent` antes de criar variantes novas.
- [ ] Manter espaçamento `space-y-6`, `manual-group-stack` e `manual-field-stack` conforme o nível.
- [ ] Confirmar que nenhuma microcopy fica abaixo de `12px`.
- [ ] Confirmar contraste em light e dark mode.
- [ ] Não introduzir cores diretas; usar tokens semânticos.
- [ ] Garantir focus visível em todos os controlos navegáveis por teclado.
- [ ] Validar mobile a partir de 375px sem scroll horizontal.