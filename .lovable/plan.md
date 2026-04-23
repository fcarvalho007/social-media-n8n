

## Fase 2 do refactor de `ManualCreate.tsx`

**Estado actual:** 1994 linhas. Fase 1 completa + 6 hooks já extraídos (incluindo `useImageCompression`).

**Objectivo:** Extrair os 3 fluxos de publicação coesos (`saveDraft`, `submitForApproval`, `publishNow`) para um hook orquestrador. Liberta o componente para focar-se em UI.

### Diagnóstico — handlers a extrair

| Handler | Linhas | Responsabilidade |
|---|---|---|
| `handleSaveDraft` | 363-518 (~155) | Upload média + insert/update `posts_drafts` + registo `media_library` + tratamento de 6 tipos de erro |
| `handleSubmitForApproval` | 549-723 (~175) | Upload + invocar edge `submit-to-n8n` + insert `posts` (`waiting_for_approval`) + registo `media_library` + redirect calendário |
| `handlePublishNow` | 725-779 (~55) | Pré-check oversized → `executePublish` + handle duplicados + refresh quota |
| Wrappers `*WithValidation` | 344-360 (~17) | Gating de smart-validation |

**Total:** ~400 linhas → `ManualCreate.tsx` desce para **~1600 linhas**.

### Plano

**Criar `src/hooks/manual-create/usePublishOrchestrator.ts`** com:

```text
Inputs (estado lido por chamada):
  selectedFormats, selectedNetworks, caption, networkCaptions,
  useSeparateCaptions, mediaFiles, scheduledDate, time, scheduleAsap,
  recoveredPostId, currentDraftId

Dependências (hooks):
  smartValidation, compression, executePublish, refreshQuota

Setters (reset pós-sucesso):
  setCurrentDraftId, setCaption, setMediaFiles, setMediaPreviewUrls,
  setScheduledDate, setTime, setScheduleAsap

Callbacks UI:
  setValidationSheetOpen, onDuplicateDetected, onNavigateAfterSubmit

Estado exposto:
  saving, submitting, uploadProgress

Acções:
  saveDraft(), publishNow(files?), submitForApproval(),
  publishWithValidation(), submitWithValidation()
```

**Não migrado (closures muito locais):** `handleConfirmAndPublish` (chama `setMediaFiles` + `publishNow`), `handleCancelPublishing`, `handleCreateNew`, `handleViewCalendar`.

### Estratégia de migração

1. Criar `usePublishOrchestrator.ts` com lógica **transladada literalmente** (sem refactor de comportamento)
2. Em `ManualCreate.tsx`: remover `useState` de `saving`/`submitting`/`uploadProgress`, substituir os 5 handlers por delegações
3. Validar TS + ESLint + build

### Resultado esperado

| Métrica | Hoje | Depois |
|---|---|---|
| `ManualCreate.tsx` | 1994 | **~1600** (-400) |
| Hooks `manual-create/` | 6 | **7** |
| Handlers publicação inline | 5 | **0** |
| Erros TS / ESLint | 0 / 0 | **0 / 0** |

### Ficheiros tocados

| Ficheiro | Tipo |
|---|---|
| `src/hooks/manual-create/usePublishOrchestrator.ts` | **novo** (~430 linhas) |
| `src/pages/ManualCreate.tsx` | edit (-~400 linhas) |

### Risco

**Baixo-médio.** Maior hook até agora, mas lógica idêntica à actual. Mitigação: criar hook num único `code--write` antes de tocar no componente.

### Checkpoint

☐ `usePublishOrchestrator.ts` criado com 5 acções  
☐ `saving`, `submitting`, `uploadProgress` removidos de `ManualCreate.tsx`  
☐ 5 handlers substituídos por delegações  
☐ `npx tsc --noEmit` sem erros  
☐ `npx eslint src/pages/ManualCreate.tsx` sem novos erros  
☐ `bun run build:dev` passa  
☐ "Guardar rascunho" persiste em `posts_drafts`  
☐ "Submeter para aprovação" invoca `submit-to-n8n` e redirige  
☐ "Publicar agora" dispara modal de progresso + detecção de duplicados  
☐ Modal de compressão Instagram >4MB ainda intercepta

### Fora desta fase

- **Fase 3:** decompor JSX em `Step1Format`/`Step2Media`/`Step3Caption`/`Step4Schedule` (~700 linhas)
- **Fase 4:** limpeza final, meta ≤ 700 linhas

