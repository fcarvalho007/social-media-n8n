## Plano — Prompt 1: fundações visuais de `/manual-create`

Vou tratar este prompt como uma correção de base: apesar de fases posteriores já terem sido feitas, os entregáveis do Prompt 1 não estão todos presentes. O objetivo é repor as fundações sem redesenhar componentes internos nem alterar lógica.

### 1. Confirmar ficheiros protegidos
- Respeitar `LOCKED_FILES.md`.
- Não tocar em ficheiros auto-gerados (`src/integrations/supabase/*`, `.env`, `supabase/config.toml`).
- Esta fase não requer backend nem alterações de dados.

### 2. Atualizar tokens em `tailwind.config.ts`
- Adicionar tokens semânticos para:
  - `manualLayout`: larguras mínimas da pré-visualização e gaps por breakpoint.
  - `manualSpacing`: `card`, `cardInner`, `fieldGroup`, `labelField`.
  - `manualTypography`: tamanhos/line-heights para secções, descrições, labels, hints e microcopy.
  - `manualMotion`: durações de cor e expansão.
- Não introduzir dependências novas.
- Manter compatibilidade com classes Tailwind existentes.

### 3. Criar utilitários globais de design
Em `src/index.css`, dentro de `@layer components`/`@layer utilities`, criar:
- `.card-primary`: fundo `card`, borda `border-border`, `shadow-sm`, padding base coerente.
- `.card-secondary`: fundo `muted/30`, borda ténue ou transparente, visual adequado a preview/informação.
- `.card-accent`: borda colorida subtil e gradient radial leve para IA/insights/alertas.
- Utilitários opcionais de suporte para `/manual-create`:
  - `.manual-create-grid`
  - `.manual-section-title`
  - `.manual-section-description`
  - `.manual-field-label`
  - `.manual-microcopy`

### 4. Aplicar apenas o layout principal em `/manual-create`
- Ajustar apenas o contentor principal da página em `src/pages/ManualCreate.tsx`.
- Desktop `≥1280px`: `minmax(0, 2fr) minmax(360px, 1fr)` com gap `32px`.
- Tablet `768–1279px`: proporção `3/5 + 2/5` com gap `24px`, mantendo a preview acessível sem estreitar demasiado.
- Mobile `<768px`: coluna única, mantendo o drawer inferior já existente para a pré-visualização.
- Corrigir o valor atual de preview mínima (`280px`) para respeitar o requisito (`360px`) no desktop.

### 5. Aplicar hierarquia de card sem redesenhar interiores
- Marcar a pré-visualização desktop como `card-secondary`.
- Garantir que os cards principais existentes continuam visualmente estáveis.
- Não mexer no conteúdo interno da pré-visualização, upload, seletor de redes, legendas ou validações.

### 6. Documentar o sistema
Criar `DESIGN_SYSTEM.md` na raiz com:
- Grid e breakpoints de `/manual-create`.
- Spacing oficial.
- Hierarquia tipográfica.
- Níveis de card.
- Estados interativos.
- Regras de iconografia.
- Motion e `prefers-reduced-motion`.
- Checklist para prompts seguintes.

### 7. Validação final
- Executar build/lint disponível para confirmar que não há quebra de TypeScript/CSS.
- Fazer uma revisão visual lógica dos pontos críticos:
  - desktop largo,
  - tablet,
  - mobile com drawer,
  - dark mode sem contraste quebrado.

## Fora de âmbito nesta fase
- Não redesenhar a pré-visualização internamente.
- Não alterar componentes do formulário.
- Não alterar lógica de negócio, validações, IA, publicação ou autosave.
- Não adicionar funcionalidades novas.

## Checklist de saída
- [ ] Grid principal de `/manual-create` reposto para 2/3 + 1/3 no desktop.
- [ ] Tablet com proporção 3/5 + 2/5.
- [ ] Mobile preservado em coluna única com drawer inferior.
- [ ] Tokens de spacing, tipografia, cor e motion adicionados ao Tailwind.
- [ ] `.card-primary`, `.card-secondary`, `.card-accent` criadas.
- [ ] Pré-visualização desktop marcada como card secundário.
- [ ] `DESIGN_SYSTEM.md` criado na raiz.
- [ ] Build validado sem erros.