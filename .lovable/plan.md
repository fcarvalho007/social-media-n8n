

## Diagnóstico — o que ficou por fazer

### Item #1 — Refactor `ManualCreate.tsx` 🟢 Fase 1 COMPLETA

| Métrica | Antes | Hoje |
|---|---|---|
| Linhas | 2801 | **2174** |
| Hooks extraídos | 0 | 5 (`useMediaManager`, `useMediaUpload`, `useDraftRecovery`, `useStepper`, `mediaAspectDetection`) |
| Erros TS | ~70 | **0 novos** |
| Build | ❌ | ✅ |

**Por fazer:** Fases 2, 3 e 4 (extrair `useImageCompression` + `usePublishOrchestrator`, decompor JSX em componentes por step, mover `extractVideoFrame`). Objetivo final ≤ 700 linhas.

### Item #2 — Mensagens de erro claras para leigos 🟢 IMPLEMENTAÇÃO PRINCIPAL COMPLETA

Tudo o que estava no plano aprovado (Eixos 1-4) foi entregue: `ErrorExplanationCard` criado, 14 templates humanizados em `publishingErrors.ts`, integrado em `Recovery.tsx`, `FailedPublications.tsx`, `PublishProgressModal.tsx` e `usePublishWithProgress.ts`.

**Os "6 refinamentos opcionais" da mensagem anterior referiam-se ao sistema de smart-validation (não aos erros).** Desses 6, já foram aplicados M1-M3 (scheduleValidator, LinkedIn caption, gating unificado + remoção de `showValidation`). Restam 3 cosméticos + lacunas reais que detectei agora no código de erros:

---

## Plano — Refinamentos pendentes (2 frentes)

### Frente A — Fechar refinamentos do smart-validation (3 itens, baixo risco)

| # | Refinamento | Ficheiro | Esforço |
|---|---|---|---|
| **A1** | Criar `accountValidator` que verifica se há perfis seleccionados por rede (substitui linhas 395-441 de `getValidationErrors()` em `ManualCreate.tsx`). Quando ativo, painel mostra erro "Sem conta seleccionada para Instagram" com botão "Selecionar conta" | `src/lib/validation/validators/accountValidator.ts` (novo) + `runValidators.ts` | 1 hora |
| **A2** | Após A1, remover `getValidationErrors()`, `validationErrors`, `hasErrors` de `ManualCreate.tsx` (linhas 395-465, 657, 837). Painel passa a ser fonte única absoluta | `src/pages/ManualCreate.tsx` | 30 min |
| **A3** | Telemetria leve: log em `console.debug` quando issue é auto-corrigida vs ignorada (preparação para analytics futuro) | `useSmartValidation.ts` | 15 min |

### Frente B — Refinamentos do sistema de erros humanizados (3 itens detectados na auditoria)

Verificando o código de `ErrorExplanationCard.tsx` e `publishingErrors.ts`, há 3 melhorias úteis que ficaram fora do plano original:

| # | Refinamento | Ficheiro | Esforço |
|---|---|---|---|
| **B1** | **CTA "Reconectar conta" abre rota interna**, não link externo do Getlate. Hoje `ErrorExplanationCard:238` faz `window.open('https://getlate.dev/accounts')`. Substituir por navegação interna para `/quota-settings` (onde estão as contas) | `ErrorExplanationCard.tsx` + adicionar callback `onOpenAccountSettings` ligado em `Recovery.tsx` e `FailedPublications.tsx` com `useNavigate` | 30 min |
| **B2** | **`PublishProgressModal` ainda só usa variant compact** — quando há 1 plataforma falhada, oferecer botão "Ver detalhes" que expande para variant full (mais útil que mostrar só o título) | `PublishProgressModal.tsx` | 45 min |
| **B3** | **Falta o template `LINKEDIN_DOCUMENT_ERROR`** em `publishingErrors.ts` (PDFs LinkedIn falham com mensagens específicas: "page count exceeded", "PDF generation failed") que hoje caem em `unknown`. Adicionar template + classificação | `publishingErrors.ts` (`ERROR_MESSAGES` + `classifyError`) | 30 min |

---

### Ficheiros tocados

| Ficheiro | Tipo |
|---|---|
| `src/lib/validation/validators/accountValidator.ts` | novo |
| `src/lib/validation/runValidators.ts` | edit (registar accountValidator) |
| `src/pages/ManualCreate.tsx` | edit (remover gating legado, ~70 linhas a menos) |
| `src/hooks/useSmartValidation.ts` | edit (telemetria debug) |
| `src/components/publishing/ErrorExplanationCard.tsx` | edit (CTA reconectar interna) |
| `src/pages/Recovery.tsx` | edit (passar `onOpenAccountSettings`) |
| `src/pages/FailedPublications.tsx` | edit (idem) |
| `src/components/publishing/PublishProgressModal.tsx` | edit (toggle compact↔full) |
| `src/lib/publishingErrors.ts` | edit (template LinkedIn Document + classify) |

### Resultado esperado

| Métrica | Hoje | Depois |
|---|---|---|
| Validadores no painel | 8 | **9** (com `accountValidator`) |
| Linhas em `ManualCreate.tsx` | 2174 | **~2100** (remover gating legado) |
| Templates de erro classificados | 14 | **15** (LinkedIn Document) |
| CTAs do card de erro | Externo (getlate.dev) | **Interno** (rota da app) |

### Checkpoint

☐ `accountValidator` regista issues por rede sem perfil seleccionado  
☐ `ManualCreate.tsx` deixa de ter `getValidationErrors`, `hasErrors`, `validationErrors`  
☐ Botão "Reconectar conta" navega internamente para `/quota-settings`  
☐ `PublishProgressModal` permite expandir erro para variant full  
☐ Erro de PDF LinkedIn (`linkedin_document`) já não aparece como "Algo correu mal mas não conseguimos identificar"  
☐ Build (`npx tsc --noEmit`) sem erros novos  
☐ Toasts duplicados (legacy + smart-validation) eliminados

### Fora deste plano (pedir explicitamente para avançar)

- **Fases 2, 3, 4 do refactor** de `ManualCreate.tsx` (~1500 linhas a redistribuir) — são tarefas grandes que merecem prompt dedicado, uma fase por vez

