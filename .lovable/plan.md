

## Plano: Correção de Layout Mobile (360x640px) - `/manual-create`

### Diagnóstico

Após análise detalhada do código, identifiquei as seguintes causas de overflow horizontal em ecrãs de 360px:

| Área | Problema | Ficheiro | Linha |
|------|----------|----------|-------|
| **Tailwind xs breakpoint** | Definido a 375px, não cobre 360px | `tailwind.config.ts` | 108 |
| **MainLayout padding** | `p-3` base adiciona 24px (12px×2) | `MainLayout.tsx` | 13 |
| **ManualCreate container** | `px-2` ainda adiciona 16px ao espaço | `ManualCreate.tsx` | 1575 |
| **Platform Chips** | `w-[64px]` fixo não escala | `PlatformChip.tsx` | 23 |
| **Quick Presets cards** | `w-[120px]` mínimo pode causar corte | `QuickPresets.tsx` | 115 |
| **FormatsPanel** | Margem negativa `-0.5rem` em mobile | `index.css` | 947-948 |
| **Media grid** | `grid-cols-2` com `gap-1.5` sem contenção | `ManualCreate.tsx` | 1878 |
| **Bottom bar** | Padding acumulado de múltiplos elementos | `ManualCreate.tsx` | 2478 |

---

### Alteração 1: Adicionar breakpoint menor (320px)

**Ficheiro: `tailwind.config.ts`**

Adicionar breakpoint `2xs` para ecrãs de 320px e ajustar `xs` para 360px:

```typescript
screens: {
  '2xs': '320px',
  xs: '360px',  // Ajustado de 375px para 360px
},
```

---

### Alteração 2: Reduzir padding do MainLayout

**Ficheiro: `src/components/MainLayout.tsx`**

Reduzir padding base para `p-2` e escalar progressivamente:

```tsx
<main className="flex-1 p-2 xs:p-3 sm:p-4 md:p-6 overflow-x-hidden">
```

---

### Alteração 3: Ajustar container principal

**Ficheiro: `src/pages/ManualCreate.tsx`**

Eliminar padding horizontal em ecrãs muito pequenos:

```tsx
// Linha 1575
<div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 px-1 xs:px-2 sm:px-6 lg:px-0 bg-gradient-to-br from-background to-background-secondary overflow-hidden">
```

---

### Alteração 4: Platform Chips responsivos

**Ficheiro: `src/components/manual-post/PlatformChip.tsx`**

Reduzir largura fixa para ecrãs pequenos:

```tsx
// Linha 23-24
"w-[56px] xs:w-[64px] sm:w-auto sm:min-w-[110px]",
"px-1 py-1.5 xs:px-1.5 sm:px-3 sm:py-2",
"min-h-[52px] xs:min-h-[56px] sm:min-h-[44px]",
```

---

### Alteração 5: Quick Presets mais compactos

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**

Reduzir largura mínima dos cards de preset:

```tsx
// Linha 115
"text-left w-[100px] xs:w-[120px] flex-shrink-0 sm:w-auto sm:min-w-[180px] sm:flex-shrink",
```

---

### Alteração 6: FormatsPanel sem margem negativa

**Ficheiro: `src/index.css`**

Remover margem negativa que causa overflow:

```css
/* Linhas 946-951 */
@media (max-width: 640px) {
  .formats-panel {
    margin-left: 0;
    margin-right: 0;
    border-radius: 0.75rem;
  }
}
```

---

### Alteração 7: Media grid com gap menor

**Ficheiro: `src/pages/ManualCreate.tsx`**

Reduzir gap em ecrãs muito pequenos:

```tsx
// Linha 1878
<div className="grid grid-cols-2 gap-1 xs:gap-1.5 sm:gap-3">
```

---

### Alteração 8: Bottom bar mais compacta

**Ficheiro: `src/pages/ManualCreate.tsx`**

Reduzir padding da barra inferior:

```tsx
// Linha 2478
<div className="p-1.5 xs:p-2 sm:p-3 pb-[calc(0.375rem+env(safe-area-inset-bottom))] xs:pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex gap-1 xs:gap-1.5 sm:gap-2">
```

Reduzir tamanho dos botões:

```tsx
// Botões
className="h-9 w-9 xs:h-10 xs:w-10 sm:h-12 sm:w-12 flex-shrink-0"

// Botão principal
className="flex-1 h-9 xs:h-10 sm:h-12 font-semibold text-white press-effect text-xs xs:text-sm"
```

---

### Alteração 9: Card headers mais compactos

**Ficheiro: `src/pages/ManualCreate.tsx`**

Reduzir padding dos headers de cards:

```tsx
// Linha 1732
<CardHeader className="pb-1 sm:pb-3 px-1.5 xs:px-2 sm:px-6 pt-1.5 xs:pt-2 sm:pt-6">
```

---

### Alteração 10: Scheduling card responsivo

**Ficheiro: `src/pages/ManualCreate.tsx`**

Ajustar o toggle e atalhos de data:

```tsx
// Linha 2039 - Toggle pill
<div className="flex rounded-full bg-muted p-0.5 gap-0.5">
  <button className="flex-1 py-1.5 xs:py-2 px-1.5 xs:px-2 sm:px-4 rounded-full text-[10px] xs:text-xs sm:text-sm ...">

// Linha 2089 - Date shortcuts
<div className="grid grid-cols-2 gap-1 xs:gap-1.5">
  <Button className="text-[9px] xs:text-[10px] sm:text-xs h-7 xs:h-8">
```

---

### Alteração 11: Timezone indicator compacto

**Ficheiro: `src/pages/ManualCreate.tsx`**

Simplificar em mobile:

```tsx
// Linha 2079
<div className="flex items-center justify-center gap-1 xs:gap-2 text-[9px] xs:text-xs text-muted-foreground bg-muted/40 px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg flex-wrap">
  <Globe className="h-3 w-3" />
  <span className="hidden xs:inline">Fuso: </span>
  <strong className="text-foreground">Lisboa</strong>
  <span className="text-muted-foreground/60">•</span>
  <span>{format(new Date(), 'HH:mm', { locale: pt })}</span>
</div>
```

---

### Alteração 12: Stepper progress mais compacto

**Ficheiro: `src/components/manual-post/StepProgress.tsx`**

Reduzir tamanho dos círculos:

```tsx
// Linha 51
"w-5 h-5 xs:w-6 xs:h-6 sm:w-7 sm:h-7 rounded-full ..."

// Linha 40
"gap-0.5 xs:gap-1 sm:gap-1.5 px-1 py-0.5 xs:px-1.5 xs:py-1 sm:px-2 sm:py-1.5 ..."
```

---

### Alteração 13: Global overflow prevention

**Ficheiro: `src/index.css`**

Adicionar regras globais para prevenir overflow:

```css
/* Após linha 50 - Global mobile overflow prevention */
@media (max-width: 400px) {
  html, body {
    overflow-x: hidden;
    max-width: 100vw;
  }
  
  .quick-presets,
  .platform-chips,
  .selected-formats {
    max-width: calc(100vw - 1rem);
  }
}
```

---

### Resumo de Ficheiros a Alterar

| Ficheiro | Alterações |
|----------|------------|
| `tailwind.config.ts` | Adicionar breakpoint `2xs: 320px`, ajustar `xs: 360px` |
| `MainLayout.tsx` | Reduzir padding base, adicionar `overflow-x-hidden` |
| `ManualCreate.tsx` | Container, media grid, bottom bar, card headers, scheduling |
| `PlatformChip.tsx` | Larguras responsivas para 360px |
| `QuickPresets.tsx` | Cards mais compactos |
| `StepProgress.tsx` | Círculos e gaps menores |
| `index.css` | Remover margem negativa, adicionar regras globais |

---

### Resultado Esperado

| Viewport | Estado Atual | Após Correção |
|----------|--------------|---------------|
| 320×568 (iPhone SE 1st) | Overflow horizontal | Layout contido, scroll vertical apenas |
| 360×640 (Android padrão) | Overflow horizontal | Layout responsivo, sem cortes |
| 375×667 (iPhone 8) | Borderline | Layout otimizado |
| 390×844 (iPhone 14) | OK | Mantido |

A experiência em ecrãs de 360px será equivalente à experiência em ecrãs maiores, com todos os elementos visíveis e acessíveis sem scroll horizontal.

