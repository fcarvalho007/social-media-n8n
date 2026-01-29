

## Plano: Layout Mobile 360px - Abordagem Radical

### Problema Raiz Identificado

Após análise visual no viewport de 360px, os problemas persistem porque:

1. **Elementos com largura fixa** continuam a ocupar mais espaço que o disponível
2. **Falta de contenção absoluta** - os elementos não estão a respeitar o viewport
3. **Estrutura de layout inadequada** - usar rows/colunas fixas não funciona bem em 360px

---

### Estratégia: "Mobile-First Stacking"

Em vez de tentar encaixar múltiplos elementos lado a lado em 360px (impossível sem cortes), vou:

1. **Empilhar verticalmente** os elementos que não cabem horizontalmente
2. **Usar scroll horizontal controlado** para listas de opções
3. **Aplicar contenção agressiva** em todos os níveis
4. **Aumentar legibilidade** dos botões

---

### Alteração 1: CSS Global com Contenção Absoluta

**Ficheiro: `src/index.css`**

Substituir regras existentes por contenção mais agressiva:

```css
/* Global containment for 360px screens */
@media (max-width: 400px) {
  html, body {
    overflow-x: hidden !important;
    max-width: 100vw !important;
    width: 100vw !important;
  }
  
  /* Force ALL elements to respect viewport */
  * {
    max-width: 100vw !important;
  }
  
  /* Cards cannot exceed viewport - with important */
  .quick-presets,
  .platform-chips,
  .selected-formats,
  .formats-panel,
  [class*="Card"] {
    max-width: calc(100vw - 8px) !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }
  
  /* Override any fixed widths on mobile */
  [class*="w-["] {
    max-width: 100% !important;
  }
}

/* Specific fix for SidebarInset content */
[data-sidebar="inset"] {
  max-width: 100vw;
  overflow-x: hidden;
}
```

---

### Alteração 2: SidebarInset com Contenção

**Ficheiro: `src/components/ui/sidebar.tsx`**

A `SidebarInset` precisa de max-width absoluto:

```tsx
// Linha 277
className={cn(
  "relative flex min-h-svh flex-1 flex-col bg-background max-w-[100vw] overflow-x-hidden",
  "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
  className,
)}
```

---

### Alteração 3: Quick Presets em Grid Vertical (mobile)

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**

Em mobile, usar **grid 2x2** em vez de scroll horizontal:

```tsx
// Linha 99 - Substituir flex por grid
<div className="grid grid-cols-2 gap-1.5 sm:flex sm:gap-2 sm:overflow-x-auto sm:flex-wrap">
```

Ajustar cards para preencher cada célula:

```tsx
// Linha 115
"text-left w-full sm:w-auto sm:min-w-[180px] sm:flex-shrink",
```

---

### Alteração 4: Platform Chips em Grid 3x2 (mobile)

**Ficheiro: `src/components/manual-post/NetworkFormatSelector.tsx`**

```tsx
// Linha 112 - Substituir flex por grid em mobile
<div className="grid grid-cols-3 gap-1.5 xs:gap-2 sm:flex sm:gap-2 sm:flex-wrap">
```

E remover scroll horizontal que causa problemas:

```tsx
// Remover "overflow-x-auto" e "scrollbar-hide" do container
```

---

### Alteração 5: Platform Chips com Tamanho Automático

**Ficheiro: `src/components/manual-post/PlatformChip.tsx`**

Remover largura fixa em mobile - usar auto:

```tsx
// Linha 22-25
"w-auto min-w-0 sm:w-auto sm:min-w-[110px]",
"px-2 py-2 sm:px-3 sm:py-2",
"min-h-[52px] sm:min-h-[44px]",
```

Aumentar texto para legibilidade:

```tsx
// Linha 63-64
"font-medium text-[11px] sm:text-xs text-foreground leading-tight text-center"
```

---

### Alteração 6: Selected Formats em Grid

**Ficheiro: `src/components/manual-post/SelectedFormatsTags.tsx`**

```tsx
// Linha 31 - Usar grid wrap em vez de flex scroll
<div className="grid grid-cols-2 xs:flex gap-1 xs:gap-1.5 sm:gap-2 xs:flex-wrap">
```

---

### Alteração 7: Bottom Bar Legível

**Ficheiro: `src/pages/ManualCreate.tsx`**

Aumentar tamanho dos botões e texto:

```tsx
// Linha 2479 - Container
<div className="p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex gap-2 w-full">

// Linha 2486 - Save button
className="h-11 w-11 flex-shrink-0"

// Linha 2497 - Main button  
className="flex-1 h-11 font-semibold text-white text-sm"

// Linha 2524 - Preview button
className="h-11 w-11 flex-shrink-0"
```

---

### Alteração 8: Scheduling Toggle Mais Legível

**Ficheiro: `src/pages/ManualCreate.tsx`**

```tsx
// Linha 2039-2067 - Toggle com texto maior
<div className="flex rounded-full bg-muted p-1 gap-1">
  <button
    className="flex-1 py-2.5 px-3 rounded-full text-xs font-medium ..."
  >
    <Rocket className="h-4 w-4" />
    <span>Agora</span>
  </button>
  <button
    className="flex-1 py-2.5 px-3 rounded-full text-xs font-medium ..."
  >
    <CalendarIcon className="h-4 w-4" />
    <span>Agendar</span>
  </button>
</div>
```

---

### Alteração 9: Date Shortcuts Empilhados

**Ficheiro: `src/pages/ManualCreate.tsx`**

```tsx
// Linha 2090 - Grid 2x2 com botões maiores
<div className="grid grid-cols-2 gap-2">
  <Button 
    variant="outline" 
    size="sm"
    className="text-xs h-9"
  >
    Hoje
  </Button>
  // ... outros botões
</div>
```

---

### Alteração 10: Header Compacto mas Legível

**Ficheiro: `src/components/DashboardHeader.tsx`**

```tsx
// Linha 87 - Reduzir itens da direita
<div className="flex h-12 items-center justify-between px-2 gap-1 w-full max-w-[100vw] overflow-hidden">

// Linha 128 - Esconder QuotaBadge em mobile se necessário
<div className="hidden xs:block">
  <QuotaBadge />
</div>
```

---

### Alteração 11: Container Principal Sem Margens

**Ficheiro: `src/pages/ManualCreate.tsx`**

```tsx
// Linha 1575
<div className="w-full max-w-full overflow-hidden space-y-2 sm:space-y-4 sm:px-6 lg:px-0">
```

---

### Resumo Visual

**Antes (360px):**
```
┌─────────────────────────────────────────┐
│ [≡] Painel... [🔍][🔔][5][⚙]  │ ← Excede
├─────────────────────────────────────────┤
│ [Carrossel][Video][Post][Stories] →  │ ← Scroll
│ [IG][LI][YT][TT][FB][GB] →           │ ← Pequeno
└─────────────────────────────────────────┘
```

**Depois (360px):**
```
┌────────────────────────────────────┐
│ [≡] Criar    [🔍][🔔][⚙]          │ ← Contido
├────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐         │
│ │Carrossel │ │Video 9:16│         │ ← Grid 2x2
│ └──────────┘ └──────────┘         │
│ ┌──────────┐ ┌──────────┐         │
│ │ Post     │ │ Stories  │         │
│ └──────────┘ └──────────┘         │
├────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐              │
│ │ IG │ │ LI │ │ YT │              │ ← Grid 3x2
│ └────┘ └────┘ └────┘              │
│ ┌────┐ ┌────┐ ┌────┐              │
│ │ TT │ │ FB │ │ GB │              │
│ └────┘ └────┘ └────┘              │
├────────────────────────────────────┤
│ [💾][    Publicar    ][👁]        │ ← Legível
└────────────────────────────────────┘
```

---

### Ficheiros a Alterar

| Ficheiro | Alterações |
|----------|------------|
| `src/index.css` | CSS global com contenção absoluta |
| `src/components/ui/sidebar.tsx` | SidebarInset max-width |
| `src/components/manual-post/QuickPresets.tsx` | Grid 2x2 em mobile |
| `src/components/manual-post/NetworkFormatSelector.tsx` | Grid 3x2 para chips |
| `src/components/manual-post/PlatformChip.tsx` | Largura auto, texto maior |
| `src/components/manual-post/SelectedFormatsTags.tsx` | Grid wrap |
| `src/components/DashboardHeader.tsx` | Reduzir elementos |
| `src/pages/ManualCreate.tsx` | Bottom bar, scheduling, container |

