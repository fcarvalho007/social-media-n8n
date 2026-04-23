

## Diagnóstico — refinamentos e melhorias úteis

Auditoria do estado actual revela três frentes com retorno claro: **qualidade de código** (TS/lint), **continuação do refactor** e **DX/observabilidade**. Nada disto é urgente — tudo é incremental e seguro.

### Estado actual

| Métrica | Valor |
|---|---|
| `ManualCreate.tsx` | 2114 linhas, 37 hooks, 76 imports |
| Erros TS | 0 |
| Erros ESLint | **5 `no-explicit-any` + 1 warning de deps** |
| Hooks já extraídos | 5 |
| Componentes em `publishing/` | 869 linhas no `PublishProgressModal` (gigante isolado) |

---

### Frente A — Qualidade de código (rápido, alto ROI) · ~1h

| # | Refinamento | Ficheiro | Esforço |
|---|---|---|---|
| **A1** | Eliminar 5 `any` em `ManualCreate.tsx` (linhas 211, 475, 537, 705, 1340) — substituir por tipos reais (`MediaFile`, `PostFormat`, `unknown` + narrowing) | `src/pages/ManualCreate.tsx` | 30 min |
| **A2** | Corrigir warning de deps em `useMemo` (linha 380, falta `activePreviewTab`) — avaliar se é dep esquecida ou se deve ser `useCallback` | `src/pages/ManualCreate.tsx` | 10 min |
| **A3** | Extrair `extractVideoFrame()` (linhas 80-138, ~60 linhas) para `src/lib/media/videoFrameExtractor.ts` — já é função pura, partilhável | novo `src/lib/media/videoFrameExtractor.ts` + edit `ManualCreate.tsx` | 20 min |

**Ganho:** lint limpo, tipos seguros, -60 linhas em `ManualCreate.tsx` (→ 2054).

### Frente B — Fase 2 do refactor (isolada e segura) · ~2h

Extracção do bloco de **compressão de imagens** que está claramente coeso (linhas 774-940) e independente.

| # | Refinamento | Ficheiro | Esforço |
|---|---|---|---|
| **B1** | Criar `useImageCompression()` — encapsula `oversizedImages`, `compressionStep`, `compressionProgress`, `compressionResults`, `pendingCompressedFiles`, `isCompressing` + `handleConfirmCompression`, `handleConfirmAndPublish`, `handleCancelCompression` | novo `src/hooks/manual-create/useImageCompression.ts` | 1h |
| **B2** | `ManualCreate.tsx` passa a consumir `const compression = useImageCompression({ mediaFiles, setMediaFiles, onPublish: handlePublishNow })` — remove ~110 linhas | edit `ManualCreate.tsx` | 30 min |
| **B3** | Atualizar `ImageCompressionConfirmModal` para receber props já agregados do hook (sem mudanças visuais) | edit `ImageCompressionConfirmModal.tsx` | 30 min |

**Ganho:** -110 linhas em `ManualCreate.tsx` (→ ~1944), lógica de compressão reutilizável (útil futuramente em `Recovery.tsx` quando republicar falhas).

**Não incluído nesta fase:** `usePublishOrchestrator` — depende de muito mais estado e merece prompt dedicado depois.

### Frente C — Observabilidade & DX (opcional) · ~45min

| # | Refinamento | Ficheiro | Esforço |
|---|---|---|---|
| **C1** | Adicionar `console.debug` agrupado (`console.group('[ManualCreate]')`) nos pontos críticos: início de publicação, compressão activada, recuperação de rascunho, mudança de step. Já temos `console.debug` no `useSmartValidation` — uniformizar prefixos `[manual-create:*]` | `ManualCreate.tsx`, hooks de `manual-create/` | 30 min |
| **C2** | Criar `LOCKED_FILES.md` na raiz (regra workspace) listando: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/config.toml` (project-level) | novo `LOCKED_FILES.md` | 15 min |

**Ganho:** debugging mais rápido em produção, conformidade com regra do workspace.

---

### Resultado esperado

| Métrica | Hoje | Depois (A+B+C) |
|---|---|---|
| `ManualCreate.tsx` | 2114 linhas | **~1944 linhas** |
| Erros ESLint | 6 | **0** |
| Hooks `manual-create/` | 5 | **6** (`useImageCompression`) |
| Utilitários partilhados | 0 vídeo helpers | **+1** (`videoFrameExtractor`) |
| `LOCKED_FILES.md` | ausente | **presente** |

### Ficheiros tocados

| Ficheiro | Tipo |
|---|---|
| `src/lib/media/videoFrameExtractor.ts` | novo |
| `src/hooks/manual-create/useImageCompression.ts` | novo |
| `LOCKED_FILES.md` | novo |
| `src/pages/ManualCreate.tsx` | edit (tipos, deps, remover compression + extractVideoFrame) |
| `src/components/publishing/ImageCompressionConfirmModal.tsx` | edit (props agregados) |

### Checkpoint

☐ `npx eslint src/pages/ManualCreate.tsx` → 0 errors  
☐ `npx tsc --noEmit` sem erros novos  
☐ Upload de imagem 5MB para Instagram ainda dispara modal de compressão  
☐ Publicação com PDF LinkedIn ainda funciona  
☐ `extractVideoFrame` continua a gerar thumbnails de vídeo no carrossel  
☐ `LOCKED_FILES.md` documenta os 4 ficheiros auto-geridos  
☐ Build (`bun run build:dev`) passa

### Recomendação de execução

- **Frente A primeiro** (1h, isolada, ganho imediato em qualidade)
- **Frente B depois** (2h, é a Fase 2 natural do refactor)
- **Frente C como bónus** (45min, baixo risco)

Pode aprovar tudo de uma vez ou apenas a frente que prefere começar.

### Fora deste plano

- **Fase 3** (decompor JSX em `Step1Format`, `Step2Media`, `Step3Caption`, `Step4Schedule` — ~700 linhas)
- **Fase 4** (`usePublishOrchestrator` — depende de muito estado)
- Refactor do `PublishProgressModal.tsx` (869 linhas — merece prompt próprio)

