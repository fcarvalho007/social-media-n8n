# Design System — /manual-create

Este documento define as fundações visuais da página `/manual-create`. Os prompts seguintes devem reutilizar estes tokens e utilitários antes de criar estilos novos.

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
- Pré-visualização colapsável em drawer inferior.
- A barra fixa inferior continua responsável pelas ações principais.

Classe oficial: `.manual-create-grid`.

## Espaçamento

- Entre cards principais: `24px` (`space-y-6`, `manual-card`).
- Padding interno de cards: `20px` (`p-5`, `manual-card-inner`).
- Entre grupos de campos: `16px` (`manual-field-group`).
- Entre label e campo: `8px` (`manual-label-field`).

## Tipografia

- Título de secção: `18px`, peso `600`, line-height `1.3` (`manual-section-title`).
- Subtítulo/descrição: `14px`, peso `400`, `text-muted-foreground` (`manual-section-description`).
- Label de campo: `13px`, peso `500` (`manual-field-label`).
- Placeholder/hint: `13px`, peso `400`, `text-muted-foreground`.
- Contadores e micro-labels: `12px`, peso `400` (`manual-microcopy`).
- Nenhum texto de interface em `/manual-create` deve ficar abaixo de `12px`.
- Títulos de secção não devem ultrapassar `20px`.

## Cards

### `.card-primary`

Uso: áreas onde o utilizador trabalha ativamente, como seleção de redes, média, legendas e agendamento.

- Fundo: `bg-card`.
- Borda: `border-border`.
- Sombra: `shadow-sm`.
- Padding: `p-5`.

### `.card-secondary`

Uso: informação, pré-visualização e blocos de suporte.

- Fundo: `bg-muted/30`.
- Borda: `border-border/40`.
- Sombra: sem sombra forte.

### `.card-accent`

Uso: IA, insights e alertas editoriais.

- Borda: `border-primary/20`.
- Fundo: `bg-card` com gradient radial muito leve.
- Deve ser usado com moderação para não competir com ações principais.

## Estados interativos

- Hover em card clicável: `bg-accent/40`.
- Transição de cor: `150ms ease`.
- Focus visível: ring `2px`, cor `primary`, offset `2px`.
- Disabled: `opacity-50`, `cursor-not-allowed`.
- Loading: preferir skeleton com `animate-pulse`; não substituir conteúdo por spinner quando o layout pode manter estrutura.

## Iconografia

- Biblioteca oficial: `lucide-react`.
- Labels/contexto pequeno: `16px`.
- Botões: `20px`.
- Headers de card: `24px`.
- Stroke width: `1.5` sempre que o componente permitir configuração explícita.

## Movimento

- Expansão/colapso: `200ms ease-out` (`manual-expand`).
- Cor/hover/focus: `150ms ease` (`manual-color`).
- Elementos de UI não devem usar animações acima de `300ms`.
- Respeitar `prefers-reduced-motion` em animações novas.

## Checklist para prompts seguintes

- [ ] Reutilizar `.manual-create-grid` no contentor principal.
- [ ] Usar `.card-primary`, `.card-secondary` ou `.card-accent` antes de criar variantes novas.
- [ ] Manter espaçamento `p-5`, `space-y-6`, `gap-4` e `gap-2` conforme o nível.
- [ ] Confirmar que nenhuma microcopy fica abaixo de `12px`.
- [ ] Confirmar contraste em light e dark mode.
- [ ] Não introduzir cores diretas; usar tokens semânticos.