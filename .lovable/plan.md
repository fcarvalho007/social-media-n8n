
## Plano de Correção - Layout Mobile (v4)

### Problemas Identificados

Com base na tua resposta, o problema é **overflow horizontal** que acontece:
1. **No topo (filtros)** - nas páginas `/manual-create`, `/pending`
2. **Dentro de modais** - especialmente no modal "Criar Projeto"

---

### Análise Técnica

Após revisar o código, identifico as seguintes causas:

#### `/manual-create` - QuickPresets e PlatformChips
- **O container `-mx-3` expande para fora** mas o `parent` não tem `overflow-hidden`
- Quando o utilizador faz scroll horizontal, o conteúdo "sai" do ecrã visualmente

#### `/pending` - Filtros de Tipo e Status
- Os botões de filtro usam `flex gap-2` com `overflow-x-auto` mas falta `overflow-hidden` no container pai
- Alguns botões têm `px-6` que podem ser demasiado largos

#### `/projects` - Modal de Criação
- O modal `CreateProjectModal` usa `grid grid-cols-2` para cor/ícone
- Os grids de seleção (cores e ícones) não têm `flex-wrap` adequado
- O formulário inteiro não está a escalar bem para ecrãs pequenos

---

### Correção 1: Container Principal com overflow-hidden

**Ficheiros afetados:**
- `src/pages/ManualCreate.tsx`
- `src/pages/Pending.tsx`

Adicionar `overflow-hidden` ao container principal da página para impedir que elementos filhos "saiam" do viewport:

```tsx
// ManualCreate.tsx - Container principal
<div className="max-w-7xl mx-auto space-y-2 px-3 sm:px-6 lg:px-0 overflow-hidden">

// Pending.tsx - Container de filtros (linha 295)
<div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border-2 border-border shadow-lg w-full overflow-hidden">
```

---

### Correção 2: QuickPresets - Scroll correcto

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**

Garantir que o container pai tem `overflow-hidden`:

```tsx
// Linha 91 - Container principal
<div className="quick-presets mb-2 sm:mb-5 overflow-hidden max-w-full">

// Linha 98 - Remover -mx-3 que causa overflow
<div className="relative overflow-hidden">
  <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible scrollbar-hide snap-x snap-mandatory">
    {/* Cards com padding interno para evitar corte */}
    {FORMAT_PRESETS.map(preset => (
      <button className="... ml-0.5 first:ml-0 ...">
        ...
      </button>
    ))}
  </div>
</div>
```

---

### Correção 3: NetworkFormatSelector - Container seguro

**Ficheiro: `src/components/manual-post/NetworkFormatSelector.tsx`**

```tsx
// Linha 74 - Card com overflow protegido
<Card className="overflow-hidden border-0 sm:border shadow-none sm:shadow-sm w-full">

// Linha 90 - CardContent com protecção
<CardContent className="space-y-3 px-3 sm:px-6 pb-4 sm:pb-6 overflow-hidden">

// Linha 107-123 - Platform chips sem -mx-3
<div 
  className="platform-chips overflow-hidden"
  role="tablist"
>
  <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible scrollbar-hide">
    {enabledNetworks.map((network) => (
      <PlatformChip ... />
    ))}
  </div>
</div>
```

---

### Correção 4: Pending.tsx - Filtros em scroll seguro

**Ficheiro: `src/pages/Pending.tsx`**

```tsx
// Linhas 301-321 - Content Type Filter
<div className="mb-3 sm:mb-5 overflow-hidden">
  <h3 className="...">Filtrar por Tipo</h3>
  <div className="overflow-hidden">
    <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
      <div className="flex gap-1.5 sm:gap-2">
        {contentTypes.map((type) => (
          <Button
            key={type.id}
            className={cn(
              'h-10 min-h-[44px] px-3 sm:px-5 ...', // Reduzir padding
              '...'
            )}
          >
            ...
          </Button>
        ))}
      </div>
    </div>
  </div>
</div>

// Linhas 330-359 - Status Tabs
<div className="overflow-hidden">
  <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
    <div className="flex gap-1.5 sm:gap-2">
      {Object.entries(statusConfig).map(([key, config]) => (
        <Button
          key={key}
          className={cn(
            'h-10 min-h-[44px] px-2.5 sm:px-4 ...', // Reduzir padding em mobile
            '...'
          )}
        >
          <config.icon className="mr-1 h-4 w-4" />
          <span className="hidden xs:inline">{config.label}</span>
          <span className="xs:hidden">{config.label.slice(0, 4)}</span>
          ...
        </Button>
      ))}
    </div>
  </div>
</div>
```

---

### Correção 5: CreateProjectModal - Layout responsivo

**Ficheiro: `src/components/projects/CreateProjectModal.tsx`**

```tsx
// Linha 144 - Modal mais estreito em mobile
<DialogContent className="max-w-2xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto ...">

// Linha 176-213 - Cor e Ícone em coluna única no mobile
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <Label>Cor</Label>
    <div className="flex gap-2 flex-wrap mt-2">
      {PROJECT_COLORS.map((color) => (
        <button
          key={color}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full ..."
          ...
        />
      ))}
    </div>
  </div>

  <div>
    <Label>Ícone</Label>
    <div className="flex gap-1.5 sm:gap-2 flex-wrap mt-2 max-h-24 overflow-y-auto">
      {PROJECT_ICONS.map((icon) => (
        <button
          className="text-xl sm:text-2xl p-1.5 sm:p-2 ..."
          ...
        >
          {icon}
        </button>
      ))}
    </div>
  </div>
</div>

// Linha 232-251 - Datas em coluna única no mobile
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <Label htmlFor="start_date">Data de Início</Label>
    <Input type="date" className="w-full" ... />
  </div>
  <div>
    <Label htmlFor="due_date">Data de Entrega</Label>
    <Input type="date" className="w-full" ... />
  </div>
</div>
```

---

### Correção 6: CSS - Remover estilos conflitantes

**Ficheiro: `src/index.css`**

Garantir que não há estilos globais a forçar larguras mínimas:

```css
/* Linha ~740-760 - Quick Presets */
.quick-presets {
  margin-bottom: 20px;
  max-width: 100%;
  overflow: hidden;
}

/* Linha ~820 - Platform chips */
.platform-chip {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  /* Sem min-width - controlado por Tailwind */
}

/* Mobile scroll containers */
@media (max-width: 640px) {
  .quick-presets,
  .platform-chips {
    max-width: 100%;
  }
}
```

---

### Resumo das Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `ManualCreate.tsx` | Adicionar `overflow-hidden` ao container principal |
| `QuickPresets.tsx` | Remover `-mx-3`, usar container com `overflow-hidden` |
| `NetworkFormatSelector.tsx` | Remover `-mx-3`, proteger com `overflow-hidden` |
| `Pending.tsx` | Reduzir padding dos botões, adicionar `overflow-hidden` aos containers de scroll |
| `CreateProjectModal.tsx` | Grids responsivos `grid-cols-1 sm:grid-cols-2`, modal mais estreito |
| `index.css` | Garantir `max-width: 100%` e remover `min-width` conflitantes |

---

### Resultado Esperado

**Páginas `/pending` e `/manual-create`:**
- Filtros fazem scroll horizontal suave sem "sair" do ecrã
- Nenhum overflow horizontal visível
- Botões mais compactos em mobile mas ainda tocáveis (44px min)

**Modal "Criar Projeto":**
- Formulário em layout de coluna única no mobile
- Todos os elementos visíveis sem overflow
- Scroll vertical suave quando necessário

