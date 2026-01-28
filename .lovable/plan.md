
## Plano de Correção - Layout Mobile `/manual-create`

### Problemas Identificados na Imagem

1. **Preset cards (Carrossel, Vídeo 9:16)**: Excedem a largura do ecrã porque têm `min-width: 160px` + `min-w-[120px]` conflitantes
2. **Platform chips (Insta, TikTok)**: Grid 2 colunas + `min-width: 100px` causa overflow horizontal
3. **Texto "OU SELEC..."**: Divider cortado porque o container pai está em overflow
4. **Conflito de margens**: CSS usa `margin: -1rem` para edge-to-edge mas conflita com o layout do Card

---

### Correção 1: Presets com Scroll Horizontal Correto

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**

O container precisa de `overflow-hidden` no pai e `overflow-x-auto` no scroll container, com larguras adequadas:

```tsx
// Linha 98 - Container relativo
<div className="relative -mx-3 sm:mx-0">
  <div className="flex gap-2 overflow-x-auto px-3 pb-2 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide snap-x snap-mandatory">
    {FORMAT_PRESETS.map(preset => (
      <button
        key={preset.id}
        className={cn(
          "preset-card snap-start",
          "relative flex items-center gap-2 px-2.5 py-2",
          "bg-card border-2 rounded-lg",
          "cursor-pointer transition-all",
          "text-left w-[140px] flex-shrink-0 sm:w-auto sm:min-w-[180px] sm:flex-shrink",
          // ...resto das classes
        )}
      >
        {/* Emoji mais pequeno em mobile */}
        <span className="text-base sm:text-xl">{preset.emoji}</span>
        
        {/* Texto apenas nome curto em mobile */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-medium text-[11px] sm:text-[13px] truncate">
            {preset.shortName}
          </span>
        </div>
      </button>
    ))}
  </div>
  
  {/* Indicador de scroll apenas quando necessário */}
  <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
</div>
```

---

### Correção 2: Platform Chips em Grid Responsivo

**Ficheiro: `src/components/manual-post/NetworkFormatSelector.tsx`**

Mudar de grid para scroll horizontal em mobile para evitar overflow:

```tsx
// Linha 107-121 - Platform Chips
<div 
  className="platform-chips -mx-3 sm:mx-0"
  role="tablist"
>
  <div className="flex gap-2 overflow-x-auto px-3 pb-2 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
    {enabledNetworks.map((network) => (
      <PlatformChip
        key={network}
        platform={network}
        selectedCount={getSelectedCount(network)}
        isExpanded={expandedPlatform === network}
        onClick={() => toggleExpand(network)}
      />
    ))}
  </div>
</div>
```

---

### Correção 3: Platform Chip Mais Compacto

**Ficheiro: `src/components/manual-post/PlatformChip.tsx`**

Largura fixa em mobile para caber correctamente:

```tsx
<button
  type="button"
  onClick={onClick}
  className={cn(
    "platform-chip group",
    "flex items-center gap-1.5 px-2.5 py-2",
    "w-[80px] sm:w-auto sm:min-w-[110px]", // Largura fixa mobile
    "min-h-[40px] sm:min-h-[44px]",
    "rounded-lg border-2 bg-card flex-shrink-0",
    "transition-all duration-200",
    isExpanded && "platform-chip-expanded",
    selectedCount > 0 && "platform-chip-selected"
  )}
>
  {/* Conteúdo vertical em mobile */}
  <div className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 w-full">
    <PlatformIcon platform={platform} className="w-4 h-4" colored />
    <span className="text-[10px] sm:text-xs font-medium truncate">
      {config.shortName || config.name.slice(0, 4)}
    </span>
  </div>
  
  {/* Badge */}
  {selectedCount > 0 && (
    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[8px] rounded-full flex items-center justify-center">
      {selectedCount}
    </span>
  )}
</button>
```

---

### Correção 4: CSS - Remover Conflitos de Margens

**Ficheiro: `src/index.css`**

Simplificar os estilos mobile para evitar conflitos:

```css
/* Mobile Responsive - SIMPLIFICADO */
@media (max-width: 640px) {
  /* Presets scroll horizontal */
  .quick-presets {
    margin-left: 0;
    margin-right: 0;
  }
  
  .preset-card {
    flex-shrink: 0;
    min-width: unset; /* Remover min-width conflitante */
    width: 130px; /* Largura fixa */
  }

  /* Platform chips scroll horizontal */
  .platform-chips {
    margin-left: 0;
    margin-right: 0;
  }
  
  .platform-chip {
    flex-shrink: 0;
    min-width: unset; /* Remover min-width conflitante */
    width: 75px; /* Largura fixa compacta */
  }
}
```

---

### Correção 5: Divider "ou seleciona manualmente"

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**

Garantir que o divider não é cortado:

```tsx
// Linha 166-168
<div className="presets-divider mt-2 sm:mt-4 px-3 sm:px-0">
  <span className="text-[10px] sm:text-xs whitespace-nowrap">ou seleciona manualmente</span>
</div>
```

---

### Correção 6: Container Principal com overflow-hidden

**Ficheiro: `src/components/manual-post/NetworkFormatSelector.tsx`**

Garantir que o Card não permite overflow:

```tsx
<Card className="overflow-hidden border-0 sm:border shadow-none sm:shadow-sm">
  <CardContent className="space-y-2 px-3 sm:px-6 pb-4 sm:pb-6 overflow-hidden">
    {/* Conteúdo */}
  </CardContent>
</Card>
```

---

### Resumo das Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `QuickPresets.tsx` | Container com `-mx-3`, cards com `w-[140px]`, scroll horizontal |
| `NetworkFormatSelector.tsx` | Chips em scroll horizontal com `-mx-3`, container `overflow-hidden` |
| `PlatformChip.tsx` | Largura fixa `w-[80px]`, layout vertical compacto |
| `index.css` | Remover `min-width` conflitantes, usar larguras fixas |

---

### Resultado Visual Esperado

```text
┌─────────────────────────────────┐
│ Selecione onde publicar         │
├─────────────────────────────────┤
│ ✨ Seleção rápida:              │
│ ┌────────┐ ┌────────┐ ┌────    │
│ │🎠      │ │📱      │ │...→    │ ← scroll horizontal
│ │Carross.│ │Vídeo   │ │        │
│ └────────┘ └────────┘ └────    │
│                                 │
│ ────── ou seleciona ──────     │
│                                 │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│ │ IG │ │ LI │ │ FB │ │ TT │ → │ ← scroll horizontal
│ └────┘ └────┘ └────┘ └────┘   │
│                                 │
│ Selecionados: Nenhum formato   │
└─────────────────────────────────┘
```

Ambas as secções terão scroll horizontal suave em mobile, sem exceder a largura do ecrã.
