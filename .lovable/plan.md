

## Plano: Redesign Profundo do Layout Mobile (360×640) - `/manual-create`

### Diagnóstico Confirmado

O problema é **conteúdo cortado à direita** - o layout excede a largura do ecrã de 360px mas não permite scroll horizontal. Após análise exaustiva do código, identifiquei as causas raiz:

---

### Causas Principais

| Componente | Problema | Ficheiro |
|------------|----------|----------|
| **SidebarInset** | Não aplica margem correta quando sidebar fecha | `sidebar.tsx` |
| **MainLayout padding** | `p-2` base = 8px×2 = 16px reduz espaço útil para 344px | `MainLayout.tsx` |
| **Cards com border** | Border de 2px adiciona largura não contabilizada | `ManualCreate.tsx` |
| **Platform Chips flex** | Container flex sem `max-w-full` pode exceder bounds | `PlatformChip.tsx` |
| **QuickPresets cards** | `w-[100px]` fixo × 4 cards = 400px+ em linha | `QuickPresets.tsx` |
| **FormatsPanel grid** | `grid-cols-2` com gap pode exceder quando cards têm padding | `FormatsPanel.tsx` |
| **Bottom bar** | Padding acumulado pode empurrar botões para fora | `ManualCreate.tsx` |
| **MediaUploadSection** | Cards com `p-4` e borders adicionam largura | `MediaUploadSection.tsx` |

---

### Solução: Estratégia "Box-Sizing Agressivo"

A solução envolve 3 pilares:

1. **Contenção absoluta** - Forçar `max-w-full` e `overflow-hidden` em todos os containers
2. **Padding zero nas bordas** - Remover padding do container principal em mobile
3. **Larguras percentuais** - Substituir valores fixos (px) por percentuais ou `calc()`

---

### Alteração 1: Container Principal Sem Padding

**Ficheiro: `src/pages/ManualCreate.tsx` (linha 1575)**

```tsx
// ANTES
<div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 px-1 xs:px-2 sm:px-6 lg:px-0 ...">

// DEPOIS
<div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 px-0 sm:px-6 lg:px-0 overflow-hidden w-full max-w-full">
```

**Motivo:** `px-1` em 360px ainda consome 8px. Remover completamente.

---

### Alteração 2: MainLayout Padding Zero em Mobile

**Ficheiro: `src/components/MainLayout.tsx` (linha 13)**

```tsx
// ANTES
<main className="flex-1 p-2 xs:p-3 sm:p-4 md:p-6 overflow-x-hidden">

// DEPOIS
<main className="flex-1 p-0 xs:p-1 sm:p-4 md:p-6 overflow-x-hidden">
```

**Motivo:** Cada pixel de padding conta em 360px.

---

### Alteração 3: Cards Internos com Box-Sizing Correto

**Ficheiro: `src/pages/ManualCreate.tsx`**

Todos os `<Card>` precisam de `w-full max-w-full overflow-hidden`:

```tsx
// Linha 1730 - Media Card
<Card className="border-0 sm:border shadow-none sm:shadow-sm w-full max-w-full overflow-hidden">

// Linha 2020 - Scheduling Card  
<Card className="border-0 sm:border shadow-none sm:shadow-sm w-full max-w-full overflow-hidden">
```

---

### Alteração 4: NetworkFormatSelector com Contenção

**Ficheiro: `src/components/manual-post/NetworkFormatSelector.tsx` (linha 74)**

```tsx
// ANTES
<Card className="overflow-hidden border-0 sm:border shadow-none sm:shadow-sm w-full max-w-full">

// DEPOIS
<Card className="overflow-hidden border-0 sm:border shadow-none sm:shadow-sm w-full max-w-[calc(100vw-8px)] sm:max-w-full box-border">
```

---

### Alteração 5: QuickPresets com Scroll Mais Agressivo

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**

Linha 91:
```tsx
// ANTES
<div className="quick-presets mb-2 sm:mb-5 overflow-hidden max-w-full">

// DEPOIS  
<div className="quick-presets mb-2 sm:mb-5 overflow-hidden w-full max-w-[calc(100vw-8px)] sm:max-w-full">
```

Linha 115 - Cards mais compactos:
```tsx
// ANTES
"text-left w-[100px] xs:w-[120px] flex-shrink-0 sm:w-auto sm:min-w-[180px] sm:flex-shrink",

// DEPOIS
"text-left w-[88px] xs:w-[100px] flex-shrink-0 sm:w-auto sm:min-w-[180px] sm:flex-shrink",
```

---

### Alteração 6: Platform Chips Mais Compactos

**Ficheiro: `src/components/manual-post/PlatformChip.tsx`**

Linha 23-25:
```tsx
// ANTES
"w-[52px] xs:w-[60px] sm:w-auto sm:min-w-[110px]",
"px-1 py-1 xs:px-1.5 xs:py-1.5 sm:px-3 sm:py-2",
"min-h-[48px] xs:min-h-[52px] sm:min-h-[44px]",

// DEPOIS
"w-[48px] xs:w-[56px] sm:w-auto sm:min-w-[110px]",
"px-0.5 py-1 xs:px-1 xs:py-1.5 sm:px-3 sm:py-2",
"min-h-[44px] xs:min-h-[48px] sm:min-h-[44px]",
```

---

### Alteração 7: FormatsPanel Grid Sem Overflow

**Ficheiro: `src/components/manual-post/FormatsPanel.tsx`**

Linha 26:
```tsx
// ANTES
<div className="formats-panel mt-2.5 sm:mt-4 p-2.5 sm:p-5 rounded-lg sm:rounded-2xl border overflow-hidden animate-slide-down"

// DEPOIS
<div className="formats-panel mt-2.5 sm:mt-4 p-1.5 xs:p-2 sm:p-5 rounded-lg sm:rounded-2xl border overflow-hidden animate-slide-down w-full max-w-full box-border"
```

Linha 64-68 - Grid com gap menor:
```tsx
// ANTES
<div className="grid grid-cols-2 sm:grid-cols-none gap-1.5 sm:gap-3"

// DEPOIS
<div className="grid grid-cols-2 sm:grid-cols-none gap-1 xs:gap-1.5 sm:gap-3"
```

---

### Alteração 8: MediaUploadSection Compacta

**Ficheiro: `src/components/media/MediaUploadSection.tsx`**

Linha 100, 169, 243 - Reduzir padding:
```tsx
// ANTES - Cards expandíveis
"w-full p-4 sm:p-5 flex items-start gap-3 sm:gap-4 text-left",

// DEPOIS
"w-full p-3 xs:p-4 sm:p-5 flex items-start gap-2 xs:gap-3 sm:gap-4 text-left",
```

Linha 271 - Drop zone menor:
```tsx
// ANTES
<div className="mt-4 p-6 sm:p-8 rounded-lg border-2 border-dashed text-center transition-all"

// DEPOIS
<div className="mt-3 p-4 xs:p-6 sm:p-8 rounded-lg border-2 border-dashed text-center transition-all"
```

---

### Alteração 9: Bottom Bar Contida

**Ficheiro: `src/pages/ManualCreate.tsx` (linha 2446-2530)**

```tsx
// ANTES
<div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)] lg:hidden z-50">

// DEPOIS
<div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)] lg:hidden z-50 w-screen max-w-screen overflow-hidden">
```

Linha 2479 - Padding mais agressivo:
```tsx
// ANTES
<div className="p-1.5 xs:p-2 sm:p-3 pb-[calc(0.375rem+env(safe-area-inset-bottom))] xs:pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex gap-1 xs:gap-1.5 sm:gap-2">

// DEPOIS
<div className="p-1 xs:p-1.5 sm:p-3 pb-[calc(0.25rem+env(safe-area-inset-bottom))] xs:pb-[calc(0.375rem+env(safe-area-inset-bottom))] flex gap-1 xs:gap-1.5 sm:gap-2 w-full max-w-full">
```

---

### Alteração 10: CSS Global Mais Restritivo

**Ficheiro: `src/index.css`**

Adicionar regras mais agressivas:

```css
/* Linha 953-965 - Substituir regras existentes */
@media (max-width: 400px) {
  html, body {
    overflow-x: hidden !important;
    max-width: 100vw !important;
    width: 100vw !important;
  }
  
  /* Force all cards to respect viewport */
  .quick-presets,
  .platform-chips,
  .selected-formats,
  .formats-panel,
  [data-radix-popper-content-wrapper] {
    max-width: calc(100vw - 4px) !important;
    box-sizing: border-box !important;
  }
  
  /* Cards cannot exceed viewport */
  .border, [class*="border-"] {
    box-sizing: border-box;
  }
}

/* Force box-sizing globally */
*, *::before, *::after {
  box-sizing: border-box;
}
```

---

### Alteração 11: DashboardHeader Compacto

**Ficheiro: `src/components/DashboardHeader.tsx`**

Linha 87:
```tsx
// ANTES
<div className="flex h-16 items-center justify-between px-3 sm:px-4 md:px-6 gap-2 sm:gap-3">

// DEPOIS
<div className="flex h-14 xs:h-16 items-center justify-between px-2 xs:px-3 sm:px-4 md:px-6 gap-1 xs:gap-2 sm:gap-3 w-full max-w-full">
```

Linha 128 - Botões mais compactos:
```tsx
// ANTES
<div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">

// DEPOIS
<div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2.5 flex-shrink-0">
```

---

### Alteração 12: SelectedFormatsTags Contida

**Ficheiro: `src/components/manual-post/SelectedFormatsTags.tsx`**

Linha 26:
```tsx
// ANTES
<div className="selected-formats pt-2.5 sm:pt-4 border-t border-border mt-2.5 sm:mt-4">

// DEPOIS
<div className="selected-formats pt-2 sm:pt-4 border-t border-border mt-2 sm:mt-4 w-full max-w-full overflow-hidden">
```

Linha 31:
```tsx
// ANTES
<div className="flex gap-1 sm:gap-2 overflow-x-auto pb-0.5 sm:flex-wrap scrollbar-hide">

// DEPOIS
<div className="flex gap-0.5 xs:gap-1 sm:gap-2 overflow-x-auto pb-0.5 sm:flex-wrap scrollbar-hide max-w-[calc(100vw-80px)]">
```

---

### Resumo de Ficheiros

| Ficheiro | Alterações |
|----------|------------|
| `MainLayout.tsx` | Padding zero em mobile |
| `ManualCreate.tsx` | Container, cards, bottom bar |
| `NetworkFormatSelector.tsx` | Max-width com calc() |
| `QuickPresets.tsx` | Cards mais pequenos, max-width |
| `PlatformChip.tsx` | Larguras reduzidas |
| `FormatsPanel.tsx` | Padding e gap menores |
| `MediaUploadSection.tsx` | Padding compacto |
| `DashboardHeader.tsx` | Altura e gaps reduzidos |
| `SelectedFormatsTags.tsx` | Max-width com calc() |
| `index.css` | Regras globais mais agressivas |

---

### Resultado Esperado

```text
┌──────────────────────────────────────┐
│  360px viewport                      │
│  ┌────────────────────────────────┐  │
│  │ Header (px-2, h-14)           │  │
│  ├────────────────────────────────┤  │
│  │ Content (px-0)                │  │
│  │ ┌──────────────────────────┐  │  │
│  │ │ Card (w-full, p-2)       │  │  │
│  │ │ ┌──┐ ┌──┐ ┌──┐ ┌──┐ → →  │  │  │
│  │ │ │IG│ │LI│ │YT│ │FB│ scroll│  │  │
│  │ │ └──┘ └──┘ └──┘ └──┘      │  │  │
│  │ └──────────────────────────┘  │  │
│  │ ┌──────────────────────────┐  │  │
│  │ │ Media (p-2)              │  │  │
│  │ └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Bottom Bar (p-1, gap-1)       │  │
│  │ [💾] [   Publicar    ] [👁]   │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

Todos os elementos ficam contidos dentro dos 360px sem corte à direita.
