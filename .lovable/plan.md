

## Auditoria do Refactor de `ManualCreate.tsx`

### Estado actual mensurável

| Métrica | Original | Após Fase 1 | Após Fase 2 | Após Fase 3 (parcial) | Meta final |
|---|---|---|---|---|---|
| `ManualCreate.tsx` | ~2801 linhas | ~1994 | ~1633 | **1289** | ~700 |
| Hooks extraídos | 0 | 6 | 7 | 7 | 7 |
| Componentes em `steps/` | 0 | 0 | 0 | **3 / 5** | 5 |
| `npx tsc --noEmit` | — | ✅ | ✅ | **✅ 0 erros** | ✅ |
| `bun run build:dev` | — | ✅ | ✅ | **✅ 20.3s** | ✅ |
| ESLint nos novos ficheiros | — | — | — | **✅ 0 erros** | ✅ |

### Fase 1 — Extracção de hooks · ✅ COMPLETA

7 hooks bem isolados em `src/hooks/manual-create/`:
- `mediaAspectDetection.ts` (75) — detecção de aspect ratio
- `useStepper.ts` (69) — wizard 1→2→3
- `useMediaManager.ts` (129) — DnD reorder + remoção
- `useImageCompression.ts` (204) — modal Instagram >4MB
- `useMediaUpload.ts` (308) — upload + validação vídeo
- `useDraftRecovery.ts` (339) — recuperação via `?recover=`
- Total: **1124 linhas** organizadas e testáveis isoladamente

### Fase 2 — Orquestrador de publicação · ✅ COMPLETA

- `usePublishOrchestrator.ts` (520 linhas) — encapsula `saveDraft`, `submitForApproval` e `publishNow` com detecção de duplicados, modal de progresso e reset de quota
- Integração limpa em `ManualCreate.tsx` via `handleSaveDraft`/`handleSubmitWithValidation`/`handlePublishWithValidation`

### Fase 3 — Decomposição de JSX · 🟡 PARCIAL (3 de 5)

**Concluído:**
- ✅ `Step3CaptionCard.tsx` (85) — integrado em `ManualCreate.tsx:953`
- ✅ `Step3ScheduleCard.tsx` (291) — integrado em `ManualCreate.tsx:979`
- ✅ `PublishActionsCard.tsx` (179) — integrado em `ManualCreate.tsx:990`

**Por extrair (~500 linhas ainda inline):**
- ☐ `Step2MediaCard.tsx` — ~245 linhas (`ManualCreate.tsx:701-946`) — upload + DnD do carrossel + GridSplitter
- ☐ `PreviewPanel.tsx` — ~250 linhas (`ManualCreate.tsx:1010-1062` + drawer mobile 1154-1203) — Tabs com 9 previews

### Pendências detectadas

1. **3 erros ESLint pré-existentes em `useDraftRecovery.ts`** (linhas 112, 116, 241): `Unexpected any`. Vêm da Fase 1, não foram introduzidos agora. Devem ser tipados com `Json[]` ou interfaces concretas.

2. **Duplicação de `renderPreview()` no JSX inline** — chamado 3 vezes (linhas 1024, 1049, 1171, 1196). Quando extrairmos o `PreviewPanel`, esta lógica fica num único sítio.

3. **Imports órfãos potenciais** — `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`, `Drawer*`, `Smartphone`, vários ícones de redes sociais e os 9 imports de `*Preview` ainda estão em `ManualCreate.tsx` mas só servem o painel de preview. Migram com a Fase 3 final.

4. **Bundle continua monolítico** (`index-*.js: 4.18 MB`) — não é objectivo desta fase, mas o aviso aparece no build. Candidato natural a `React.lazy` em prompt futuro.

### Veredicto

| Fase | Estado | Qualidade |
|---|---|---|
| Fase 1 | ✅ Completa | Boa, com 3 `any` por limpar |
| Fase 2 | ✅ Completa | Boa, sem dívidas técnicas |
| Fase 3 | 🟡 60% | Os 3 componentes extraídos estão limpos, tipados, sem regressões; faltam 2 |

### Próxima acção proposta

Concluir a Fase 3 extraindo os 2 componentes restantes num único loop:

1. **`Step2MediaCard.tsx`** — recebe `mediaPreviewUrls`, `mediaFiles`, `mediaSources`, `mediaAspectRatios`, `mediaRequirements`, `selectedFormats`, callbacks (`setMediaFiles`, `setMediaPreviewUrls`, `setMediaSources`, `removeMedia`, `moveMedia`, `handleMediaUpload`, `getAcceptTypes`), estado DnD (`sensors`, `activeId`, handlers) e `lastSaved`/`isAutoSaving`/`hasUnsavedChanges`. Substitui `ManualCreate.tsx:701-946`.

2. **`PreviewPanel.tsx`** — recebe `selectedFormats`, `activePreviewTab`, `setActivePreviewTab`, `scheduledDate`, `scheduleAsap`, `time`, e a função `renderPreview(format)`. Suporta as 2 vistas (sidebar desktop + drawer mobile) via prop `variant: 'desktop' | 'mobile'`. Substitui `ManualCreate.tsx:1010-1062` e `1154-1203`. Move ~12 imports de previews para fora do ficheiro principal.

**Resultado esperado:** `ManualCreate.tsx` desce para **~750 linhas** (-540), 5/5 componentes da Fase 3 prontos, abrindo caminho para a Fase 4 (limpeza final + meta ≤700).

### Bónus opcional (não bloqueante)

Eliminar os 3 `any` em `useDraftRecovery.ts` substituindo por:
```ts
import type { Json } from '@/integrations/supabase/types';
const mediaItems = (post.media_items as Array<{ url: string; type?: string }>) || [];
```

### Checkpoint da próxima acção

☐ `Step2MediaCard.tsx` criado em `src/components/manual-post/steps/`  
☐ `PreviewPanel.tsx` criado em `src/components/manual-post/steps/`  
☐ `ManualCreate.tsx` ≤ 800 linhas  
☐ `npx tsc --noEmit` 0 erros  
☐ `bun run build:dev` passa  
☐ Comportamento idêntico em desktop e mobile (375px)  
☐ DnD do carrossel, upload, GridSplitter, navegação entre steps continuam  
☐ Preview lateral desktop + drawer mobile renderizam todas as 9 redes  
☐ (Opcional) 0 erros ESLint em `useDraftRecovery.ts`

