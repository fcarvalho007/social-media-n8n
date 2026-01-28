
## Plano de Melhorias Mobile - `/manual-create`

---

### Análise Actual

A página já tem uma base mobile-first sólida, mas existem várias oportunidades de melhoria identificadas:

1. **Barra inferior fixa**: Funcional mas pode ser melhorada com feedback visual e estado mais claro
2. **Navegação entre steps**: Os botões são pequenos e pouco visíveis em mobile
3. **Grid de média**: Os cards são demasiado altos, ocupando muito espaço vertical
4. **Preview mobile**: Actualmente oculto - não existe forma de pré-visualizar no mobile
5. **Toolbar da legenda**: Botões pequenos para touch
6. **Espaçamento geral**: Pode ser optimizado para menos scroll

---

### Melhoria 1: Barra Inferior Fixa Redesenhada

**Ficheiro: `src/pages/ManualCreate.tsx`** (linhas 2430-2493)

Redesenhar a barra inferior com:
- Indicador de progresso visual (3 dots ou mini-stepper)
- Contexto do agendamento (se agendado, mostrar resumo)
- Botão principal dinâmico (cor e texto conforme estado)
- Animação de feedback ao clicar

```tsx
// Mobile Bottom Bar - Enhanced
<div className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-md border-t shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.15)] lg:hidden z-50">
  {/* Mini progress indicator */}
  <div className="flex justify-center py-1.5 border-b border-border/50">
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={cn(
            "h-1.5 rounded-full transition-all",
            step <= currentStep ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
          )}
        />
      ))}
    </div>
  </div>
  
  {/* Scheduled preview - if date selected */}
  {!scheduleAsap && scheduledDate && (
    <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 text-center text-xs text-blue-700 dark:text-blue-300">
      <CalendarIcon className="h-3 w-3 inline mr-1" />
      Agendado: {format(scheduledDate, "d MMM", { locale: pt })} às {time}
    </div>
  )}
  
  {/* Action buttons */}
  <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-2">
    <Button variant="outline" size="icon" onClick={handleSaveDraft} className="h-12 w-12">
      <Save className="h-5 w-5" />
    </Button>
    
    <Button 
      onClick={handlePublishWithValidation}
      disabled={publishing || selectedFormats.length === 0}
      className={cn(
        "flex-1 h-12 font-semibold text-white",
        !scheduleAsap && scheduledDate
          ? "bg-gradient-to-r from-blue-600 to-blue-500"
          : "bg-gradient-to-r from-green-600 to-green-500"
      )}
    >
      {publishing ? <Loader2 className="animate-spin" /> : (
        <>
          {!scheduleAsap && scheduledDate ? (
            <>
              <CalendarIcon className="h-5 w-5 mr-2" />
              Agendar
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5 mr-2" />
              Publicar
            </>
          )}
        </>
      )}
    </Button>
    
    {/* Preview toggle for mobile */}
    <Button 
      variant="outline" 
      size="icon" 
      onClick={() => setMobilePreviewOpen(true)}
      className="h-12 w-12"
    >
      <Eye className="h-5 w-5" />
    </Button>
  </div>
</div>
```

---

### Melhoria 2: Preview Mobile em Sheet/Drawer

**Ficheiro: `src/pages/ManualCreate.tsx`**

Adicionar um Drawer que permite pré-visualizar a publicação em mobile:

```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';

// Adicionar após os dialogs existentes (linha ~2515)
<Drawer open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
  <DrawerContent className="max-h-[85vh]">
    <DrawerHeader className="border-b">
      <DrawerTitle>Pré-visualização</DrawerTitle>
    </DrawerHeader>
    <div className="p-4 overflow-y-auto">
      {selectedFormats.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Selecione um formato para ver a pré-visualização
        </div>
      ) : selectedFormats.length === 1 ? (
        renderPreview(selectedFormats[0])
      ) : (
        <Tabs value={activePreviewTab} onValueChange={setActivePreviewTab}>
          <TabsList className="w-full mb-4">
            {selectedFormats.map(format => {
              const network = getNetworkFromFormat(format);
              const Icon = getNetworkIcon(network);
              return (
                <TabsTrigger key={format} value={format} className="flex-1">
                  <Icon className="h-4 w-4" />
                </TabsTrigger>
              );
            })}
          </TabsList>
          {selectedFormats.map(format => (
            <TabsContent key={format} value={format}>
              {renderPreview(format)}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  </DrawerContent>
</Drawer>
```

---

### Melhoria 3: Navegação Entre Steps Melhorada

**Ficheiro: `src/pages/ManualCreate.tsx`** (várias linhas)

Redesenhar os botões de navegação para serem mais visíveis e touch-friendly:

```tsx
// Substituir os botões "Anterior"/"Seguinte" por versão mobile-friendly
<div className="flex justify-between mt-4 pt-3 border-t gap-2">
  <Button 
    variant="outline" 
    size="default"
    onClick={previousStep}
    className="flex-1 h-11 sm:h-9 sm:flex-none"
  >
    <ChevronLeft className="h-4 w-4 mr-1" />
    <span className="sm:inline">Anterior</span>
  </Button>
  
  {canProceed && (
    <Button 
      variant="default"
      size="default" 
      onClick={nextStep}
      className="flex-1 h-11 sm:h-9 sm:flex-none"
    >
      <span className="sm:inline">Seguinte</span>
      <ChevronRight className="h-4 w-4 ml-1" />
    </Button>
  )}
</div>
```

---

### Melhoria 4: Cards de Média Mais Compactos

**Ficheiro: `src/components/manual-post/EnhancedSortableMediaItem.tsx`**

Optimizar o componente para ser mais compacto em mobile:

```tsx
// Linhas 89-109 - Top bar mais compacto
<div className="flex items-center justify-between px-2 py-1 sm:py-1.5 bg-muted/50 border-b border-border/50">
  <div className="flex items-center gap-1.5 sm:gap-2">
    <div
      {...attributes}
      {...listeners}
      className={cn(
        "p-1 rounded cursor-grab touch-none select-none",
        "hover:bg-background/80 active:cursor-grabbing"
      )}
    >
      <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
    </div>
    <span className="text-[10px] sm:text-xs font-medium text-foreground">
      {index + 1}/{total}
    </span>
  </div>

  {/* Badges only on sm+ */}
  <div className="hidden sm:flex items-center gap-1">
    {/* ... badges ... */}
  </div>

  <Button
    variant="ghost"
    size="icon"
    className="h-6 w-6 sm:h-6 sm:w-6 bg-red-500/15 text-red-500"
    onClick={onRemove}
  >
    <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
  </Button>
</div>

// Linhas 236-276 - Bottom bar mais compacto em mobile
<div className="flex items-center justify-center gap-0.5 sm:gap-1 px-2 py-1 sm:py-1.5 bg-muted/30 border-t border-border/50">
  <Button
    variant="ghost"
    size="sm"
    className={cn("h-6 sm:h-7 w-8 sm:w-auto px-0 sm:px-2")}
    onClick={(e) => { e.stopPropagation(); if (canMoveUp) onMoveUp(); }}
    disabled={!canMoveUp || disabled}
  >
    <ChevronUp className="h-4 w-4" />
  </Button>
  
  <Button
    variant="ghost"
    size="sm"
    className={cn("h-6 sm:h-7 w-8 sm:w-auto px-0 sm:px-2")}
    onClick={(e) => { e.stopPropagation(); if (canMoveDown) onMoveDown(); }}
    disabled={!canMoveDown || disabled}
  >
    <ChevronDown className="h-4 w-4" />
  </Button>
</div>
```

---

### Melhoria 5: Toolbar da Legenda Touch-Friendly

**Ficheiro: `src/components/manual-post/NetworkCaptionEditor.tsx`** (linhas 118-168)

Aumentar os alvos de toque e melhorar o layout:

```tsx
{/* Toolbar - Touch optimized */}
<div className="flex items-center gap-1 sm:gap-1.5 border rounded-xl p-1.5 sm:p-2 bg-muted/30 overflow-x-auto scrollbar-hide">
  <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
    <PopoverTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon"
        className="h-11 w-11 sm:h-8 sm:w-8 flex-shrink-0" 
        disabled={disabled}
      >
        <Smile className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0 border-0" align="start" side="top">
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        width={300}
        height={350}
        searchPlaceholder="Pesquisar..."
        previewConfig={{ showPreview: false }}
      />
    </PopoverContent>
  </Popover>

  <Separator orientation="vertical" className="h-6 mx-0.5 sm:mx-1" />

  {onOpenSavedCaptions && (
    <Button
      variant="ghost"
      size="sm"
      className="h-11 sm:h-8 gap-1.5 px-3 flex-shrink-0"
      onClick={onOpenSavedCaptions}
      disabled={disabled}
    >
      <Bookmark className="h-5 w-5 sm:h-4 sm:w-4" />
      <span className="hidden xs:inline text-xs">Guardadas</span>
    </Button>
  )}

  {onOpenAIDialog && (
    <Button
      variant="ghost"
      size="sm"
      className="h-11 sm:h-8 gap-1.5 px-3 flex-shrink-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10"
      onClick={onOpenAIDialog}
      disabled={disabled}
    >
      <Sparkles className="h-5 w-5 sm:h-4 sm:w-4 text-purple-500" />
      <span className="text-xs font-medium">IA</span>
    </Button>
  )}
</div>
```

---

### Melhoria 6: Step Progress Mais Compacto

**Ficheiro: `src/components/manual-post/StepProgress.tsx`**

Redesenhar para ocupar menos espaço vertical em mobile:

```tsx
// Layout horizontal compacto em mobile
<div className="w-full py-1 sm:py-2">
  <div className="flex items-center justify-between px-2 sm:justify-center sm:gap-2">
    {steps.map((step, index) => {
      const isCompleted = visitedSteps.includes(step.id) && step.id < currentStep;
      const isCurrent = step.id === currentStep;
      
      return (
        <button
          key={step.id}
          onClick={() => canClick && onStepClick(step.id)}
          disabled={!canClick}
          className={cn(
            "flex items-center gap-1 px-2 py-1 sm:px-2 sm:py-1.5 rounded-full transition-all",
            isCurrent && "bg-primary/10"
          )}
        >
          <div
            className={cn(
              "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all",
              isCompleted && "bg-emerald-500 text-white",
              isCurrent && "bg-primary text-primary-foreground",
              !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
            )}
          >
            {isCompleted ? <Check className="h-3 w-3" /> : <step.icon className="h-3 w-3" />}
          </div>
          
          {/* Label inline em mobile - apenas para step actual */}
          <span className={cn(
            "text-xs font-medium transition-all",
            isCurrent ? "inline" : "hidden sm:inline",
            isCurrent && "text-primary"
          )}>
            {step.label}
          </span>
        </button>
      );
    })}
  </div>
</div>
```

---

### Melhoria 7: Espaçamento e Padding Optimizados

**Ficheiro: `src/pages/ManualCreate.tsx`**

Ajustar classes de espaçamento para mobile:

```tsx
// Linha 1563 - Container principal
<div className="max-w-7xl mx-auto space-y-2 px-3 sm:px-6 lg:px-0">

// Linha 1687 - Grid principal
<div className="grid lg:grid-cols-2 gap-2 lg:gap-8 pb-36 lg:pb-0">

// Linha 1689 - Form column
<div className="space-y-2 sm:space-y-3 lg:space-y-6">
```

---

### Melhoria 8: Animação de Feedback na Publicação

**Ficheiro: `src/index.css`**

Adicionar feedback visual ao publicar:

```css
/* Mobile publish feedback */
@keyframes publish-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.98); }
}

.publish-button-loading {
  animation: publish-pulse 1s ease-in-out infinite;
}

/* Haptic feedback simulation */
.press-effect:active {
  transform: scale(0.97);
  transition: transform 0.1s ease;
}
```

---

### Resumo das Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/ManualCreate.tsx` | Barra inferior redesenhada; Preview Drawer; Navegação melhorada; Padding optimizado |
| `src/components/manual-post/StepProgress.tsx` | Layout mais compacto para mobile |
| `src/components/manual-post/EnhancedSortableMediaItem.tsx` | Cards de média mais compactos |
| `src/components/manual-post/NetworkCaptionEditor.tsx` | Toolbar touch-friendly |
| `src/index.css` | Animações de feedback |

---

### Resultado Esperado

1. **Barra inferior**: Mais informativa com indicador de progresso e estado do agendamento
2. **Preview**: Acessível via botão na barra inferior que abre um Drawer
3. **Navegação**: Botões maiores e mais visíveis entre steps
4. **Media grid**: Cards mais compactos para mostrar mais conteúdo
5. **Toolbar**: Botões de 44px para alvos de toque optimizados
6. **Espaçamento**: Menos scroll necessário com padding reduzido
7. **Feedback**: Animações visuais ao interagir

