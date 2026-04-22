

## Refactor de `ManualCreate.tsx` — abordagem por fases seguras

**Estado actual:** 2801 linhas · 63 hooks · ~30 funções · ~1100 linhas de JSX num só ficheiro. Difícil de manter e arriscado de tocar.

**Objetivo:** Reduzir a ~600-700 linhas (apenas orquestração + composição de slices), sem mudar nenhum comportamento visível.

**Princípio:** Cada fase é independente, compila por si, e pode ser parada/aprovada antes da seguinte. Sem big-bang.

---

### Fase 1 — Extrair lógica pura (sem JSX) para hooks dedicados

Mover *state + handlers relacionados* para 4 custom hooks. O componente passa a chamar `const { ... } = useX()`.

| Novo hook | O que move | Ganho de linhas |
|---|---|---|
| `src/hooks/manual-create/useMediaManager.ts` | `mediaFiles`, `mediaPreviewUrls`, `mediaSources`, `mediaAspectRatios`, `removeMedia`, `moveMedia`, `handleDragStart/End/Cancel`, sensors DnD, cleanup de URLs | ~150 |
| `src/hooks/manual-create/useMediaUpload.ts` | `handleMediaUpload` (linha 738-953, **216 linhas**), validações de imagem/vídeo, oversized detection, `pendingVideoFiles`, `videoValidationIssues` | ~250 |
| `src/hooks/manual-create/useDraftRecovery.ts` | `loadPostForRecovery` (~175 linhas), `fetchImageAsFile`, `isRecovering`, `recoveredPostId`, `currentDraftId`, `handleLoadDraft`, `handleSaveDraft` | ~330 |
| `src/hooks/manual-create/useStepper.ts` | `currentStep`, `visitedSteps`, `goToStep`, `nextStep`, `previousStep`, `canAdvanceToStep2/3`, `showStep2/3` | ~50 |

**Resultado da Fase 1:** ficheiro desce de 2801 → ~2020 linhas. Zero mudanças visuais.

---

### Fase 2 — Extrair compressão e publicação para hooks

| Novo hook | O que move |
|---|---|
| `src/hooks/manual-create/useImageCompression.ts` | `compressionModalOpen`, `oversizedImages`, `isCompressing`, `compressionProgress`, `compressionStep`, `compressionResults`, `pendingCompressedFiles`, `handleConfirmCompression`, `handleCancelCompression`, `handleConfirmAndPublish` |
| `src/hooks/manual-create/usePublishOrchestrator.ts` | `handlePublishNow`, `handleSubmitForApproval`, `handlePublishWithValidation`, `handleSubmitWithValidation`, `handleCancelPublishing`, `duplicateWarning`, `pendingPublishParams`, `isCancellingPublish` |

**Resultado da Fase 2:** ficheiro desce para ~1500 linhas.

---

### Fase 3 — Decompor JSX em componentes por step

A árvore tem 4 zonas claras (já visíveis no JSX entre linhas 1710-2801):

```text
src/components/manual-create/
├── ManualCreateHeader.tsx          // Header + Recovery banner (linhas 1712-1820)
├── steps/
│   ├── Step1FormatSelection.tsx    // NetworkFormatSelector wrapper + helpers
│   ├── Step2MediaSection.tsx       // MediaUploadSection + GridSplitter + grid de média (~600 linhas)
│   ├── Step3CaptionSection.tsx     // Caption editor + emoji + AI + saved captions
│   └── Step4SchedulePublish.tsx    // Date/time picker + preview tabs + botões publicar
├── PreviewPanel.tsx                // renderPreview() + Tabs por rede + mobile drawer
└── ManualCreateModals.tsx          // DraftsDialog + SavedCaptionsDialog + AICaptionDialog
                                    // + DuplicateWarningDialog + CompressionModal + VideoValidationModal
                                    // + PublishProgressModal + PublishingOverlay
```

Cada componente recebe props tipadas. Sem lógica de negócio — apenas apresentação + callbacks.

**Resultado da Fase 3:** `ManualCreate.tsx` fica ~600-700 linhas de orquestração:
```tsx
export default function ManualCreate() {
  const media = useMediaManager();
  const upload = useMediaUpload(media);
  const recovery = useDraftRecovery(...);
  const stepper = useStepper(...);
  const compression = useImageCompression(...);
  const publish = usePublishOrchestrator(...);
  // ...
  return (
    <div>
      <ManualCreateHeader {...} />
      <Step1FormatSelection {...} />
      {stepper.showStep2 && <Step2MediaSection {...} />}
      {stepper.showStep3 && <Step3CaptionSection {...} />}
      <Step4SchedulePublish {...} />
      <PreviewPanel {...} />
      <ManualCreateModals {...} />
    </div>
  );
}
```

---

### Fase 4 — Mover utils e cleanup final

- Mover `extractVideoFrame` (linhas 75-203) para `src/lib/canvas/videoFrameExtraction.ts`
- Remover imports não usados após decomposição
- Adicionar JSDoc nos novos hooks/componentes
- Verificar `npx tsc --noEmit` e console em runtime
- Atualizar memória `mem://design/space-optimization-priority` com nota da nova arquitetura

---

### Ordem de execução proposta

Fazer **Fase 1 inteira agora** (4 hooks puros, baixo risco — apenas mover state isolado). Apresentar resultado, deixar testar a app. Só depois avançar para Fase 2, depois Fase 3, depois Fase 4 — cada uma como prompt separado para evitar regressões em cascata.

### Garantias de segurança

- **Zero alterações de comportamento** — refactor mecânico, não funcional
- Nenhum dos ficheiros tocados está em `LOCKED_FILES.md` (não existe nesta app)
- Após cada fase: `npx tsc --noEmit -p tsconfig.app.json` deve passar limpo (ignorando warnings pré-existentes em `CarouselPreview.tsx`)
- Cada hook/componente novo é importado de um path único — fácil de reverter um por um

### Ficheiros tocados na Fase 1

| Ficheiro | Tipo |
|---|---|
| `src/hooks/manual-create/useMediaManager.ts` | **Novo** |
| `src/hooks/manual-create/useMediaUpload.ts` | **Novo** |
| `src/hooks/manual-create/useDraftRecovery.ts` | **Novo** |
| `src/hooks/manual-create/useStepper.ts` | **Novo** |
| `src/pages/ManualCreate.tsx` | Reduzir de 2801 → ~2020 linhas (apenas substituir blocos por chamadas aos hooks) |

### Resultado esperado da Fase 1

| Métrica | Antes | Depois (Fase 1) | Final (Fase 4) |
|---|---|---|---|
| Linhas em `ManualCreate.tsx` | 2801 | ~2020 | ~600-700 |
| `useState` no componente | 36 | ~10 | ~5 |
| Funções inline | 30 | ~10 | ~5 |
| Ficheiros por responsabilidade | 1 | 5 | 13 |

### Checkpoint Fase 1
☐ 4 novos hooks criados em `src/hooks/manual-create/`  
☐ `ManualCreate.tsx` compila com `npx tsc --noEmit` sem erros novos  
☐ Upload de imagem com 5MB ainda dispara modal de compressão  
☐ Recuperação via `?recover=<id>` ainda carrega o post  
☐ Drag-and-drop de media items continua a funcionar  
☐ Stepper avança normalmente entre os 4 passos  
☐ Auto-save continua a marcar `lastSaved` quando se altera a caption

