
## Plano: Redesign Mobile de `/manual-create`

### Problemas Identificados

Após análise detalhada do código, identifiquei as seguintes áreas com problemas de responsividade mobile:

| Área | Problema | Impacto |
|------|----------|---------|
| **Container principal** | Padding `px-4` excessivo em ecrãs pequenos | Reduz espaço útil |
| **Grid de mídia** | `grid-cols-2` fixo pode ser apertado em ecrãs < 375px | Cards ficam muito pequenos |
| **Barra de ação media** | Texto "Adicionar mais" não escala bem | Overflow visual |
| **Cards de upload** | Padding inconsistente entre estados | Layout irregular |
| **Caption toolbar** | Botões `h-11` ocupam demasiado espaço vertical | Scroll excessivo |
| **Date shortcuts** | `grid-cols-4` fica apertado em mobile | Botões pequenos demais |
| **Bottom bar** | Altura fixa não considera diferentes tamanhos de notch | Corte em alguns dispositivos |

---

### Correção 1: Container Principal Responsivo

**Ficheiro: `src/pages/ManualCreate.tsx`**

Ajustar padding do container para ser mais agressivo em mobile:

```tsx
// Linha 1575
<div className="max-w-7xl mx-auto space-y-2 sm:space-y-4 px-2 xs:px-3 sm:px-6 lg:px-0 bg-gradient-to-br from-background to-background-secondary overflow-hidden">
```

Também ajustar o grid principal (linha 1699):
```tsx
<div className="grid lg:grid-cols-2 gap-2 lg:gap-8 pb-32 lg:pb-0 px-0 sm:px-0 overflow-hidden">
```

---

### Correção 2: Media Grid Adaptativo

**Ficheiro: `src/pages/ManualCreate.tsx`**

Alterar a grid de mídia para usar 2 colunas apenas acima de 375px:

```tsx
// Linha 1879
<div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 gap-1.5 xs:gap-2 sm:gap-3">
```

Também reduzir tamanho mínimo do botão de adicionar:
```tsx
// Linha 1904-1909
<Label 
  className={cn(
    "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all press-effect",
    "border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10",
    "min-h-[80px] xs:min-h-[100px]"
  )}
>
```

---

### Correção 3: Barra de Ação de Mídia Compacta

**Ficheiro: `src/pages/ManualCreate.tsx`**

Tornar a barra de ação mais compacta em mobile:

```tsx
// Linhas 1805-1854
<div className={cn(
  "flex items-center justify-between p-2 xs:p-2.5 sm:p-3 rounded-lg border",
  mediaPreviewUrls.length >= mediaRequirements.maxMedia 
    ? "bg-amber-500/10 border-amber-500/30" 
    : "bg-muted/50 border-border"
)}>
  <div className="flex items-center gap-1.5 xs:gap-2">
    <span className={cn(
      "text-xs sm:text-sm font-medium",
      mediaPreviewUrls.length >= mediaRequirements.maxMedia && "text-amber-700 dark:text-amber-300"
    )}>
      {mediaPreviewUrls.length}/{mediaRequirements.maxMedia}
    </span>
    {/* Badge só visível em sm+ */}
    {mediaPreviewUrls.length < mediaRequirements.maxMedia && (
      <Badge variant="secondary" className="text-[10px] hidden xs:inline-flex">
        +{mediaRequirements.maxMedia - mediaPreviewUrls.length}
      </Badge>
    )}
  </div>
  
  {mediaPreviewUrls.length < mediaRequirements.maxMedia && (
    <Label htmlFor="media-upload-header" className="cursor-pointer">
      <Button variant="secondary" size="sm" asChild className="gap-1 h-8 xs:h-9 px-2 xs:px-3">
        <span>
          <Plus className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
          <span className="text-xs">Mais</span>
        </span>
      </Button>
    </Label>
  )}
</div>
```

---

### Correção 4: Caption Toolbar Otimizada

**Ficheiro: `src/components/manual-post/NetworkCaptionEditor.tsx`**

Reduzir altura dos botões em mobile mantendo área de toque:

```tsx
// Linha 119
<div className="flex items-center gap-1 border rounded-lg xs:rounded-xl p-1 xs:p-1.5 sm:p-2 bg-muted/30 overflow-x-auto scrollbar-hide">
  <Popover>
    <PopoverTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9 xs:h-10 xs:w-10 sm:h-8 sm:w-8 flex-shrink-0"
      >
        <Smile className="h-4 w-4 xs:h-5 xs:w-5 sm:h-4 sm:w-4" />
      </Button>
    </PopoverTrigger>
    ...
  </Popover>

  {onOpenSavedCaptions && (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 xs:h-10 sm:h-8 gap-1 px-2 xs:px-3 flex-shrink-0"
    >
      <Bookmark className="h-4 w-4" />
      <span className="hidden xs:inline text-xs">Guardadas</span>
    </Button>
  )}
  
  {onOpenAIDialog && (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 xs:h-10 sm:h-8 gap-1 px-2 xs:px-3 flex-shrink-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10"
    >
      <Sparkles className="h-4 w-4 text-purple-500" />
      <span className="text-xs">IA</span>
    </Button>
  )}
</div>
```

---

### Correção 5: Date Shortcuts Grid Responsivo

**Ficheiro: `src/pages/ManualCreate.tsx`**

Alterar grid de atalhos de data para 2 colunas em mobile pequeno:

```tsx
// Linha 2089
<div className="grid grid-cols-2 xs:grid-cols-4 gap-1.5">
  <Button 
    type="button"
    variant="outline" 
    size="sm"
    className="text-[10px] xs:text-xs h-8"
  >
    Hoje
  </Button>
  <Button 
    type="button"
    variant="outline" 
    size="sm"
    className="text-[10px] xs:text-xs h-8"
  >
    Amanhã
  </Button>
  <Button 
    type="button"
    variant="outline" 
    size="sm"
    className="text-[10px] xs:text-xs h-8"
  >
    Terça
  </Button>
  <Button 
    type="button"
    variant="outline" 
    size="sm"
    className="text-[10px] xs:text-xs h-8"
  >
    Quinta
  </Button>
</div>
```

---

### Correção 6: Toggle Publicar/Agendar Compacto

**Ficheiro: `src/pages/ManualCreate.tsx`**

Tornar o toggle mais compacto em mobile:

```tsx
// Linhas 2040-2067
<div className="flex rounded-full bg-muted p-0.5 xs:p-1 gap-0.5 xs:gap-1">
  <button
    type="button"
    onClick={() => setScheduleAsap(true)}
    className={cn(
      "flex-1 py-2 xs:py-2.5 px-2 xs:px-4 rounded-full text-xs xs:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1 xs:gap-2",
      scheduleAsap 
        ? "bg-background shadow-sm text-foreground" 
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    <Rocket className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
    <span className="hidden xs:inline">Publicar agora</span>
    <span className="xs:hidden">Agora</span>
  </button>
  <button
    type="button"
    onClick={() => setScheduleAsap(false)}
    className={cn(
      "flex-1 py-2 xs:py-2.5 px-2 xs:px-4 rounded-full text-xs xs:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1 xs:gap-2",
      !scheduleAsap 
        ? "bg-background shadow-sm text-foreground" 
        : "text-muted-foreground hover:text-foreground"
    )}
  >
    <CalendarIcon className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
    Agendar
  </button>
</div>
```

---

### Correção 7: Bottom Bar Segura

**Ficheiro: `src/pages/ManualCreate.tsx`**

Melhorar a barra fixa inferior para diferentes dispositivos:

```tsx
// Linhas 2442-2527
<div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)] lg:hidden z-50">
  {/* Mini progress indicator - mais compacto */}
  <div className="flex justify-center py-1 xs:py-1.5 border-b border-border/50">
    <div className="flex items-center gap-1 xs:gap-1.5">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={cn(
            "h-1 xs:h-1.5 rounded-full transition-all duration-200",
            step <= currentStep ? "w-5 xs:w-6 bg-primary" : "w-1 xs:w-1.5 bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  </div>
  
  {/* Action buttons - com safe area */}
  <div className="p-2 xs:p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] xs:pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-1.5 xs:gap-2">
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-10 w-10 xs:h-12 xs:w-12 flex-shrink-0"
    >
      <Save className="h-4 w-4 xs:h-5 xs:w-5" />
    </Button>
    
    <Button
      type="button"
      className="flex-1 h-10 xs:h-12 font-semibold text-white press-effect"
    >
      {publishing ? (
        <Loader2 className="h-4 w-4 xs:h-5 xs:w-5 animate-spin" />
      ) : !scheduleAsap && scheduledDate ? (
        <>
          <CalendarIcon className="h-4 w-4 xs:h-5 xs:w-5 mr-1.5 xs:mr-2" />
          <span className="text-sm xs:text-base">Agendar</span>
        </>
      ) : (
        <>
          <Rocket className="h-4 w-4 xs:h-5 xs:w-5 mr-1.5 xs:mr-2" />
          <span className="text-sm xs:text-base">Publicar</span>
        </>
      )}
    </Button>
    
    <Button 
      type="button"
      variant="outline" 
      size="icon" 
      className="h-10 w-10 xs:h-12 xs:w-12 flex-shrink-0"
    >
      <Eye className="h-4 w-4 xs:h-5 xs:w-5" />
    </Button>
  </div>
</div>
```

---

### Correção 8: Card Headers Compactos

**Ficheiro: `src/pages/ManualCreate.tsx`**

Uniformizar headers de cards em mobile:

```tsx
// Exemplo linha 1732-1745
<CardHeader className="pb-1 xs:pb-2 sm:pb-3 px-2 xs:px-3 sm:px-6 pt-2 xs:pt-3 sm:pt-6">
  <div className="flex items-center justify-between">
    <CardTitle className="text-sm xs:text-base sm:text-lg flex items-center gap-1 xs:gap-1.5 sm:gap-2">
      <CloudUpload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
      <span>Média</span>
    </CardTitle>
    <AutoSaveIndicator ... />
  </div>
</CardHeader>
```

---

### Correção 9: Separate Captions Toggle Compacto

**Ficheiro: `src/components/manual-post/NetworkCaptionEditor.tsx`**

Tornar o toggle de legendas separadas mais compacto:

```tsx
// Linhas 97-116
{showToggle && (
  <div className="flex items-center justify-between p-2.5 xs:p-3 sm:p-4 rounded-lg xs:rounded-xl bg-muted/50 border min-h-[44px] xs:min-h-[48px] sm:min-h-[52px]">
    <div className="flex items-center gap-2 xs:gap-3">
      {useSeparateCaptions ? (
        <Split className="h-4 w-4 xs:h-5 xs:w-5 text-primary" />
      ) : (
        <Merge className="h-4 w-4 xs:h-5 xs:w-5 text-muted-foreground" />
      )}
      <Label className="text-xs xs:text-sm font-medium cursor-pointer leading-tight">
        {useSeparateCaptions ? 'Separadas' : 'Unificada'}
      </Label>
    </div>
    <Switch ... />
  </div>
)}
```

---

### Correção 10: Time Presets Scroll Horizontal

**Ficheiro: `src/pages/ManualCreate.tsx`**

Converter time presets para scroll horizontal em mobile:

```tsx
// Linhas 2210-2224
<div className="overflow-x-auto scrollbar-hide pb-1">
  <div className="flex gap-1 xs:gap-1.5 w-max xs:w-auto xs:flex-wrap mt-2">
    {['09:00', '12:00', '15:00', '18:00', '21:00'].map((preset) => (
      <Badge 
        key={preset}
        variant="outline" 
        className={cn(
          "cursor-pointer hover:bg-primary/10 transition-colors text-[10px] xs:text-xs py-0.5 xs:py-1 px-1.5 xs:px-2 flex-shrink-0",
          time === preset && "bg-primary/10 border-primary/50"
        )}
        onClick={() => setTime(preset)}
      >
        {preset}
      </Badge>
    ))}
  </div>
</div>
```

---

### Resumo de Ficheiros a Alterar

| Ficheiro | Alterações |
|----------|------------|
| `src/pages/ManualCreate.tsx` | Container, grid de mídia, barra de ação, date shortcuts, toggle, bottom bar, headers |
| `src/components/manual-post/NetworkCaptionEditor.tsx` | Toolbar, toggle separadas, tabs |

---

### Resultado Esperado

- **Ecrãs < 375px (iPhone SE):** Layout compacto sem overflow, botões acessíveis
- **Ecrãs 375-640px:** Layout equilibrado com elementos adequadamente espaçados
- **Ecrãs > 640px:** Layout desktop mantido

A experiência mobile será mais fluida, com elementos adequadamente dimensionados para toque e sem necessidade de scroll horizontal acidental.
