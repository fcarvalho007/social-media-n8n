

## Auditoria pós-Fase 3 — o que falta e o que vale melhorar

### Estado actual

| Métrica | Valor | Avaliação |
|---|---|---|
| `ManualCreate.tsx` | **995 linhas** | Bom (era 2801). Meta optimista era 700, mas 995 já é navegável |
| Hooks em `manual-create/` | 7 ficheiros, 1644 linhas | Bem isolados |
| Componentes em `steps/` | 5 ficheiros, 1080 linhas | Bem isolados |
| `tsc --noEmit` | 0 erros | ✅ |
| `bun run build:dev` | ✅ 33s | ✅ |
| ESLint nos novos ficheiros | 0 erros | ✅ |
| ESLint legado (`useDraftRecovery`) | **3 erros `any`** | 🟡 Pré-existente |

### Material por concluir

#### 🟡 P1 — Limpezas rápidas (15 min, baixo risco)

1. **3 erros ESLint em `useDraftRecovery.ts`** (linhas 112, 116, 241): `Unexpected any`. Substituir por interface `MediaItem { url: string; type?: string }` ou `Json` do Supabase.

2. **Imports duplicados de `date-fns`**: 3 linhas separadas (`addDays/nextDay`, `format`, `pt`) que cabem em 2.

#### 🟡 P2 — Fase 4 do refactor (1h, baixo risco)

3. **Mobile Sticky Bottom Bar inline** (`ManualCreate.tsx:797-884`, ~88 linhas) — barra fixa de acção mobile com botões Publicar/Rascunho/Pré-visualizar. **Extracção sugerida:** `MobileStickyActionBar.tsx`.

4. **Bloco de modais inline** (`ManualCreate.tsx:913-985`, ~73 linhas) — agrupa 6 modais (`DraftsDialog`, `SavedCaptionsDialog`, `AICaptionDialog`, `ImageCompressionConfirmModal`, `VideoValidationModal`, `PublishProgressModal`, `DuplicateWarningDialog`). **Extracção sugerida:** `ManualCreateModals.tsx` que recebe todo o estado relevante via props.

5. **Helpers `renderPreview` (60 linhas) e `getNetworkIcon` (10 linhas)** ainda vivem em `ManualCreate.tsx:461-533`. **Extracção sugerida:** `lib/manual-create/previewRenderer.ts` ou prop dedicada.

**Resultado esperado se P1+P2 forem feitos:** `ManualCreate.tsx` desce para **~720 linhas**, cumprindo a meta original.

#### 🟢 P3 — Melhorias de qualidade (não bloqueantes)

6. **Bundle monolítico de 4.18 MB** (`index-*.js`) — o build avisa em todos os builds. `ManualCreate` carrega 9 componentes de preview imediatamente. Ganho real: lazy-loading dos previews via `React.lazy` + `Suspense` partiria ~200-400 KB do bundle inicial. Prompt próprio.

7. **`PublishProgressModal.tsx` com 869 linhas** — fora do scope deste refactor mas é o próximo monstro óbvio. Candidato a Fase 5 dedicada.

8. **`useDraftRecovery.ts` com 339 linhas** — o maior dos hooks; faz fetch de imagens, parsing de drafts e restore de estado. Poderia partir-se em `useFetchDraftMedia` + `useApplyDraft`.

### O que NÃO precisa de melhoria

- Os 3 componentes da fase anterior (`Step3Caption`, `Step3Schedule`, `PublishActions`) e os 2 novos (`Step2Media`, `PreviewPanel`) — todos ≤400 linhas, props tipadas, sem efeitos colaterais
- `usePublishOrchestrator.ts` — encapsula bem os 3 fluxos, sem dívidas técnicas detectáveis
- A divisão `hooks/manual-create/` vs `components/manual-post/steps/` — separação saudável

### Recomendação

| Prioridade | Acção | Esforço | Valor |
|---|---|---|---|
| **Faz já** | P1: corrigir 3 `any` + dedup imports | 15 min | Limpa ESLint a zero |
| **Faz a seguir** | P2: Fase 4 (sticky bar + modais + helpers) | 1h | Cumpre meta ≤700, fecha o ciclo do refactor |
| **Adia** | P3: lazy-loading, refactor PublishProgressModal, partir useDraftRecovery | 2-4h cada | Bónus, requer prompts próprios |

### Próxima acção proposta

Combinar **P1 + P2 num único loop** ("Fase 4 final"):

- Tipar os 3 `any` em `useDraftRecovery.ts` 
- Consolidar imports `date-fns` em `ManualCreate.tsx`
- Criar `src/components/manual-post/steps/MobileStickyActionBar.tsx` (~90 linhas)
- Criar `src/components/manual-post/steps/ManualCreateModals.tsx` (~80 linhas)
- Mover `renderPreview` + `getNetworkIcon` para `src/lib/manual-create/previewRenderer.tsx`
- Validar `tsc` + `eslint` + `build:dev` a zero

### Checkpoint
☐ 0 erros ESLint em `src/hooks/manual-create/` e `src/pages/ManualCreate.tsx`  
☐ `ManualCreate.tsx` ≤ 750 linhas  
☐ 2 novos componentes em `steps/` + 1 helper em `lib/manual-create/`  
☐ `tsc --noEmit` 0 erros  
☐ `bun run build:dev` passa  
☐ Mobile bottom bar continua funcional em 375px  
☐ Todos os modais (drafts, IA, compressão, vídeo, progresso, duplicado) abrem normalmente

### Fora do escopo desta acção (prompts dedicados)
- Lazy-loading dos 9 previews (Fase performance)
- Refactor de `PublishProgressModal.tsx` (869 linhas)
- Quebra de `useDraftRecovery.ts` em sub-hooks

