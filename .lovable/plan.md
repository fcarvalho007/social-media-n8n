
## Plano de Correção - Layout Mobile `/manual-create` (v3)

### Problemas Identificados na Imagem

Analisando a screenshot, identifico os seguintes problemas:

1. **Preset Cards muito grandes**: Os cards "Carrossel" e "Vídeo 9:16" estão a mostrar descrições completas ("Instagram Carros...", "Reels + Shorts +...") quando deviam mostrar apenas o nome curto
2. **Platform Chips em grid 2x2**: Os chips Insta, LinkedIn, YouTube, TikTok estão em layout de grid em vez de scroll horizontal - ocupam demasiado espaço vertical
3. **CSS conflitante**: A regra `.platform-chip { min-width: 120px; }` (linha 837) está a sobrepor as classes Tailwind `w-[72px]`
4. **Divider cortado**: "OU SELECIONA MANUA..." está truncado porque o texto tem `whitespace-nowrap` mas o container não tem espaço

---

### Correção 1: Remover min-width do CSS

**Ficheiro: `src/index.css`** (linha 837)

O CSS global tem `min-width: 120px` que conflita com o Tailwind. Precisa ser removido:

```css
/* ANTES */
.platform-chip {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  min-width: 120px; /* <- PROBLEMA */
}

/* DEPOIS */
.platform-chip {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  /* min-width removido - controlado por Tailwind */
}
```

---

### Correção 2: Preset Cards Mais Compactos

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**

Reduzir o tamanho dos cards em mobile - esconder descrição completamente:

```tsx
// Linha 115 - Largura mais pequena
"text-left w-[120px] flex-shrink-0 sm:w-auto sm:min-w-[180px]"

// Linha 145 - Esconder descrição em mobile (remover hidden xs:block, colocar apenas sm:block)
<span className="text-[9px] sm:text-[11px] text-muted-foreground leading-tight truncate hidden sm:block">
  {preset.description}
</span>
```

---

### Correção 3: Platform Chips Menores e em Scroll

**Ficheiro: `src/components/manual-post/PlatformChip.tsx`**

Reduzir para chips ainda mais compactos (64px):

```tsx
// Linha 23 - Largura reduzida
"w-[64px] sm:w-auto sm:min-w-[110px]"

// Linha 25 - Altura reduzida
"min-h-[56px] sm:min-h-[44px]"

// Linhas 53-56 - Ícone mais pequeno em mobile
<div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md flex items-center justify-center">
  <PlatformIcon platform={platform} className="w-3 h-3 sm:w-4 sm:h-4" colored />
</div>
```

---

### Correção 4: Divider Responsivo

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**

Permitir que o texto do divider faça wrap se necessário:

```tsx
// Linha 166 - Remover whitespace-nowrap
<div className="presets-divider mt-2 sm:mt-4">
  <span className="text-[10px] sm:text-xs text-center">ou seleciona manualmente</span>
</div>
```

---

### Correção 5: Remover Espaçamento Extra do CSS

**Ficheiro: `src/index.css`** (linhas 469-484)

Remover padding extra que está a ser aplicado:

```css
/* ANTES */
@media (max-width: 640px) {
  .platform-chips {
    padding-left: 0.25rem;
    padding-right: 0.25rem;
  }
  
  .quick-presets {
    padding-left: 0.25rem;
    padding-right: 0.25rem;
  }
}

/* DEPOIS - Remover estas regras duplicadas */
```

---

### Resumo das Alterações

| Ficheiro | Linha | Alteração |
|----------|-------|-----------|
| `src/index.css` | 837 | Remover `min-width: 120px` de `.platform-chip` |
| `src/index.css` | 469-484 | Remover padding duplicado mobile |
| `QuickPresets.tsx` | 115 | Largura `w-[120px]` (era 130px) |
| `QuickPresets.tsx` | 145 | Descrição apenas `sm:block` (esconder em mobile) |
| `QuickPresets.tsx` | 166 | Remover `whitespace-nowrap` do divider |
| `PlatformChip.tsx` | 23 | Largura `w-[64px]` (era 72px) |
| `PlatformChip.tsx` | 25 | Altura `min-h-[56px]` para acomodar layout vertical |
| `PlatformChip.tsx` | 53-59 | Ícone `w-5 h-5` (era w-6 h-6) |

---

### Layout Visual Esperado

```text
┌────────────────────────────────┐
│ Selecione onde publicar        │
├────────────────────────────────┤
│ ✨ Seleção rápida:             │
│ ┌──────┐ ┌──────┐ ┌──────┐ →  │
│ │ 🎠   │ │ 📱   │ │ 📝   │    │
│ │Carros│ │Vídeo │ │Post  │    │
│ └──────┘ └──────┘ └──────┘    │
│                                │
│ ─── ou seleciona manualmente ──│
│                                │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ → │
│ │ IG │ │ LI │ │ YT │ │ TT │   │
│ └────┘ └────┘ └────┘ └────┘   │
│                                │
│ Selecionados: Nenhum formato   │
└────────────────────────────────┘
```

- Preset cards: 120px x compactos (apenas emoji + nome curto)
- Platform chips: 64px x 56px (layout vertical, scroll horizontal)
- Divider: texto centralizado sem truncagem
