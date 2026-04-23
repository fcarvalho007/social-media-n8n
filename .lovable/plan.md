

## Polimento final — fechar a meta de 700 linhas

### Estado actual

| Métrica | Valor |
|---|---|
| `ManualCreate.tsx` | 808 linhas |
| Meta original | 700 linhas |
| Gap | -108 linhas |

### Plano (3 extracções pequenas + cleanup)

**1. `RecoveryBanner.tsx`** (~85 linhas extraídas)  
Engloba o spinner "A recuperar conteúdo..." e o cartão azul de "Conteúdo Recuperado" com o grid de thumbnails e botão "Limpar". Recebe estado de recuperação e setters via props. Substitui `ManualCreate.tsx:471-549`.

**2. `QuotaWarningBanner.tsx`** (~16 linhas extraídas)  
Banner amarelo de quota IG/LI ≥80%. Substitui `ManualCreate.tsx:551-566`.

**3. Header inline mantém-se**  
12 linhas. Não vale a pena extrair — já é trivial.

### Resultado esperado

- `ManualCreate.tsx`: **808 → ~705 linhas** (-103, dentro da meta de 700 ±5)
- 2 novos componentes em `src/components/manual-post/steps/` (~95 + ~50 = 145 linhas com tipos)
- 0 alterações comportamentais
- Imports limpos: `RefreshCw`, `X`, `AlertTriangle` saem do `ManualCreate.tsx`

### Validação

- `npx tsc --noEmit` → 0 erros
- ESLint → 0 erros
- `bun run build:dev` → passa
- Comportamento idêntico em desktop e mobile (375px)
- Banner de recuperação funciona com `?recover=<id>`
- Banner de quota aparece quando IG/LI ≥80%

### Checkpoint

☐ `RecoveryBanner.tsx` criado e integrado  
☐ `QuotaWarningBanner.tsx` criado e integrado  
☐ `ManualCreate.tsx` ≤ 710 linhas  
☐ `tsc --noEmit` 0 erros  
☐ `eslint` 0 erros no scope refactor  
☐ `bun run build:dev` passa  
☐ Imports `RefreshCw`, `X`, `AlertTriangle`, `Card`, `CardContent` removidos de `ManualCreate.tsx` (migram com os componentes)

### Fora do escopo (prompts dedicados)

- Lazy-loading dos 9 previews (Fase 5 performance, ~300KB de bundle)
- Refactor de `PublishProgressModal.tsx` (869 linhas)
- Quebra de `useDraftRecovery.ts` em sub-hooks

