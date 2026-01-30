

## Plano: Corrigir Grelha Desktop + Diagnóstico do Erro de Rascunho

### Problema 1: Grelha de Imagens Desformatada em Desktop

**Causa Identificada:**
A linha 1878 do `ManualCreate.tsx` foi alterada para `grid-cols-2` fixo durante as otimizações mobile de ontem, sem preservar o comportamento responsivo para desktop:

```tsx
// Atual (PROBLEMA)
<div className="grid grid-cols-2 gap-1 xs:gap-1.5 sm:gap-3">

// Deveria ser (com colunas responsivas)
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 xs:gap-1.5 sm:gap-3">
```

**Ficheiro:** `src/pages/ManualCreate.tsx` (linha 1878)

---

### Problema 2: Erro "Verifique a sua ligação" ao Guardar Rascunho

**Diagnóstico:**
O erro genérico na linha 1073 indica um erro de catch-all:
```tsx
toast.error('Erro ao guardar rascunho. Verifique a sua ligação.');
```

**Possíveis causas:**
1. **Timeout de upload** - Imagens muito grandes ou ligação lenta
2. **Erro de storage** - Bucket cheio ou permissões
3. **JWT expirado** - Token de sessão não renovado
4. **Erro de rede transiente** - Desconexão momentânea

**Solução proposta:**
Adicionar logging mais detalhado e melhorar a mensagem de erro para identificar a causa real:

**Ficheiro:** `src/pages/ManualCreate.tsx` (linhas 1065-1074)

---

### Alterações a Implementar

#### Alteração 1: Corrigir Grelha de Imagens para Desktop

```tsx
// Linha 1878
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 xs:gap-1.5 sm:gap-3">
```

#### Alteração 2: Melhorar Tratamento de Erros no Rascunho

```tsx
// Linha 1065-1078
} catch (error: any) {
  console.error('[handleSaveDraft] Error details:', {
    message: error?.message,
    code: error?.code,
    statusCode: error?.statusCode,
    details: error?.details,
    hint: error?.hint,
    name: error?.name,
  });
  
  if (error?.message?.includes('uuid')) {
    toast.error('Erro interno. O rascunho será guardado como novo.');
    setCurrentDraftId(null);
  } else if (error?.message?.includes('JWT') || error?.message?.includes('session') || error?.code === 'PGRST301') {
    toast.error('Sessão expirada. Por favor, faça login novamente.');
  } else if (error?.message?.includes('storage') || error?.message?.includes('bucket') || error?.statusCode === 413) {
    toast.error('Erro no upload. Verifique o tamanho dos ficheiros (máx 50MB).');
  } else if (error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT') {
    toast.error('Ligação lenta. Tente novamente com ficheiros mais pequenos.');
  } else if (error?.statusCode === 403) {
    toast.error('Sem permissão para guardar. Contacte o suporte.');
  } else {
    toast.error(`Erro ao guardar: ${error?.message || 'Verifique a sua ligação.'}`);
  }
}
```

---

### Ficheiros a Alterar

| Ficheiro | Linhas | Alteração |
|----------|--------|-----------|
| `src/pages/ManualCreate.tsx` | 1878 | Adicionar `sm:grid-cols-3 lg:grid-cols-4` |
| `src/pages/ManualCreate.tsx` | 1065-1078 | Expandir tratamento de erros com mensagens específicas |

---

### Resultado Esperado

**Desktop (1280px+):**
```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ 1   │ │ 2   │ │ 3   │ │ 4   │  ← 4 colunas
└─────┘ └─────┘ └─────┘ └─────┘
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ 5   │ │ 6   │ │ 7   │ │ 8   │
└─────┘ └─────┘ └─────┘ └─────┘
```

**Tablet (640px-1023px):**
```
┌───────┐ ┌───────┐ ┌───────┐
│ 1     │ │ 2     │ │ 3     │  ← 3 colunas
└───────┘ └───────┘ └───────┘
```

**Mobile (<640px):**
```
┌────────────┐ ┌────────────┐
│ 1          │ │ 2          │  ← 2 colunas
└────────────┘ └────────────┘
```

**Erro de Rascunho:**
- Mensagens de erro mais descritivas para ajudar a diagnosticar a causa real
- Logs detalhados na consola para debugging

