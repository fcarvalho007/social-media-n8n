

## Plano — Fechar Fase 1 do refactor de `ManualCreate.tsx`

**Estado:** ficheiro com ~70 erros TS porque os 5 hooks novos foram importados mas a fiação no JSX/handlers ficou a meio. Há duplicações (`removeMedia`, `handleLoadDraft`) e referências a identificadores que já saíram do componente (`currentStep`, `setUploadProgress`, `isUploading`, etc.).

**Objetivo:** fechar a Fase 1 — `ManualCreate.tsx` compila limpo, mesmo comportamento, ~2020 linhas (era 2801), 5 hooks ativos.

---

### Diagnóstico dos erros

| Categoria | Nº erros | Causa |
|---|---|---|
| `Cannot redeclare 'removeMedia'` | 2 | Definido localmente E em `useMediaManager` |
| `Cannot redeclare 'handleLoadDraft'` | 2 | Definido localmente E em `useDraftRecovery` |
| `Cannot find 'currentStep'/'visitedSteps'/'setCurrentStep'/'setVisitedSteps'` | ~20 | Migrou para `useStepper` mas JSX ainda usa nomes nus |
| `Cannot find 'setUploadProgress'/'isUploading'/'uploadProgress'` | ~20 | Migrou para `useMediaUpload` mas handlers ainda usam nomes nus |
| `Cannot find 'setPendingVideoFiles'/'setVideoValidationModalOpen'/'pendingVideoFiles'/'setVideoValidationIssues'` | ~6 | Idem |
| `Cannot find 'setRecoveredPostId'` | 1 | Migrou para `useDraftRecovery` |
| `Cannot find 'stepperRef'` | 2 | Identificador inexistente — substituir por ref local ou remover |

---

### Ações

**1. Remover blocos duplicados em `ManualCreate.tsx`**

- Linha 185: apagar `const removeMedia = ...` local (já vem de `media.removeMedia`)
- Linha 234: apagar `const handleLoadDraft = useCallback(...)` local (já vem de `recovery.handleLoadDraft`)
- Linha 669: apagar segunda definição de `removeMedia`
- Linha 910: apagar segunda definição de `handleLoadDraft`

**2. Expor hooks no scope do componente com destruturação completa**

Logo após `const stepper = useStepper(...)` e companhia, adicionar aliases destruturados para que o JSX existente continue a funcionar com **mudança mínima**:

```tsx
const stepper = useStepper({ canAdvanceToStep2, canAdvanceToStep3 });
const { currentStep, visitedSteps, setCurrentStep, setVisitedSteps, goToStep, nextStep, previousStep } = stepper;

const upload = useMediaUpload({ ...media, selectedFormat, profileId });
const {
  isUploading, uploadProgress, setUploadProgress, setIsUploading,
  pendingVideoFiles, setPendingVideoFiles,
  videoValidationIssues, setVideoValidationIssues,
  videoValidationModalOpen, setVideoValidationModalOpen,
} = upload;

const recovery = useDraftRecovery({ ... });
const { recoveredPostId, setRecoveredPostId, isRecovering, currentDraftId } = recovery;
```

Isto resolve ~50 erros sem tocar no JSX.

**3. Limpar referências fantasma**

- `stepperRef` (linhas 249-250): inexistente — remover ou substituir por `useRef(null)` local
- Verificar se existe alguma referência a `setMediaSources`/`setMediaPreviewUrls` que já não está exposta — usar via `media.X`

**4. Validar comportamento**

- `npx tsc --noEmit -p tsconfig.app.json` deve ficar com **apenas os 4 erros pré-existentes em `CarouselPreview.tsx`** (`@ts-expect-error` não usados — ignorar)
- Smoke test mental dos 7 checkpoints da Fase 1:
  - Upload imagem 5MB → modal compressão
  - `?recover=<id>` → carrega post
  - Drag-and-drop → reordena
  - Stepper avança 1→2→3
  - Auto-save marca `lastSaved`
  - Video upload → validação aparece
  - Recovery banner aparece quando `recoveredPostId` existe

---

### Ficheiros tocados

| Ficheiro | Tipo de mudança |
|---|---|
| `src/pages/ManualCreate.tsx` | Apagar 4 blocos duplicados + adicionar 3 destruturações de hooks + remover `stepperRef` fantasma |

Nenhum hook novo tocado — apenas finalizar a fiação no consumidor.

### Resultado esperado

| Métrica | Antes (broken) | Depois |
|---|---|---|
| Erros TS em `ManualCreate.tsx` | ~70 | **0** |
| Linhas em `ManualCreate.tsx` | 2516 | ~2480 (remoção de duplicados) |
| Build (`bun build:dev`) | ❌ falha | ✅ passa |
| Comportamento runtime | quebrado | idêntico ao pré-refactor |

### Checkpoint Fase 1 (após este fix)

☐ `npx tsc --noEmit` sem erros novos em `ManualCreate.tsx`  
☐ Build passa (`bun build:dev`)  
☐ App carrega `/manual-create` sem console errors  
☐ 5 hooks (`useMediaManager`, `useMediaUpload`, `useDraftRecovery`, `useStepper`, `mediaAspectDetection`) integrados e funcionais  
☐ Próximo prompt pode avançar para **Fase 2** (extrair `useImageCompression` + `usePublishOrchestrator`)

