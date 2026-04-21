

## Plano — #2 Pré-validação Inteligente em Tempo Real

Sistema de validação preventiva que detecta e mostra problemas **antes** do utilizador clicar em "Publicar", consolidando regras dispersas (formato, mídia, aspect ratio, GBP, IG 24h) num painel único com feedback acionável.

---

### Arquitectura

```text
┌────────────────────────────────────────────────────────────┐
│  ManualCreate.tsx  (cliente do hook, não muda lógica)      │
└──────────────────┬─────────────────────────────────────────┘
                   │ useSmartValidation({ formats, caption,  │
                   │   media, scheduledDate, ... })          │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  src/hooks/useSmartValidation.ts  (orquestrador)           │
│   - debounce 300ms                                          │
│   - cancela tarefas obsoletas                               │
│   - cache por hash (formato+caption+files)                  │
│   - corre 7 validadores em paralelo                         │
└──────────────────┬─────────────────────────────────────────┘
                   │ ValidationIssue[]                       │
                   ▼
┌────────────────────────────────────────────────────────────┐
│  src/components/manual-post/ValidationSidebar.tsx          │
│  Desktop: sticky no preview │ Mobile: bottom sheet         │
└────────────────────────────────────────────────────────────┘
```

---

### 1. Modelo único de problema — `src/lib/validation/types.ts`

```ts
type Severity = 'error' | 'warning' | 'info';
type Category = 'format' | 'media' | 'caption' | 'platform' | 'schedule' | 'duplicate';

interface ValidationIssue {
  id: string;                    // estável p/ key e dismiss
  severity: Severity;
  category: Category;
  platform?: SocialNetwork;      // chip a cor da rede
  title: string;                 // ≤60 chars
  description: string;           // detalhe accionável
  affectedItems?: number[];      // índices de mídia
  autoFixable?: boolean;         // mostra botão "Corrigir"
  fixLabel?: string;             // ex: "Auto-ajustar 4:5"
  fixAction?: () => Promise<void> | void;
  docsLink?: string;             // âncora p/ regras
}
```

`error` bloqueia publicação · `warning` permite publicar com aviso · `info` é preventivo (ex: "Conteúdo similar nas últimas 24h").

---

### 2. Validadores — `src/lib/validation/validators/`

Sete módulos puros, cada um recebe contexto e devolve `ValidationIssue[]`:

| Ficheiro | Verifica | Severidade |
|---|---|---|
| `formatValidator.ts` | wrap de `validateAllFormats` (count mínimo/máximo, requisitos) | error |
| `captionValidator.ts` | comprimento por rede, hashtags >30, links em IG | error/warn |
| `mediaAspectValidator.ts` | usa `validateMediaBatch` + `analyzeFilesForInstagram` | warning + autoFix |
| `mediaResolutionValidator.ts` | <80% da resolução mínima por formato | warning |
| `videoDurationValidator.ts` | duração por plataforma (`MAX_VIDEO_DURATION`) | error |
| `gbpValidator.ts` | NOVO — caption ≥30 chars + alerta vertical 9:16 quando `googlebusiness_post` selecionado | error/warn |
| `duplicateValidator.ts` | NOVO — query a `publication_attempts` últimas 24h por `(platform, caption[0..100])`; quando match → info "ZWSP retry automático" | info |

Os 5 primeiros já existem dispersos pelo código — apenas se reembrulham para devolver `ValidationIssue` uniforme. O `gbpValidator` cobre o gap identificado nas Auditorias 3 e 5. O `duplicateValidator` substitui o aviso bloqueante actual em `usePublishWithProgress.ts:507` por um sinal informativo no painel (alinhado com a decisão da Auditoria 4).

---

### 3. Hook orquestrador — `src/hooks/useSmartValidation.ts`

```ts
useSmartValidation({
  selectedFormats, caption, mediaFiles, hashtags,
  scheduledDate, scheduleAsap,
  user, // p/ duplicateValidator query
  enabled: currentStep >= 2,
})
→ {
  issues: ValidationIssue[],
  errorCount, warningCount, infoCount,
  canPublish: boolean,                // !issues.some(i => i.severity==='error')
  isValidating: boolean,
  byPlatform: Record<SocialNetwork, ValidationIssue[]>,
  fix: (id: string) => Promise<void>,
  dismiss: (id: string) => void,      // para info dismissable
}
```

Características:
- **Debounce 300ms** sobre mudanças de `caption`/`mediaFiles`; reagir imediato a `selectedFormats`.
- **Cache LRU** por hash `JSON.stringify({formats, captionLen, fileNames+sizes})` → evita reanalisar mídia pesada.
- **AbortController** para cancelar varreduras em voo quando inputs mudam.
- **Lazy DB query** para o `duplicateValidator`: só corre quando caption ≥30 chars e formats selecionados (evita spam à BD enquanto se digita).

---

### 4. UI — `src/components/manual-post/ValidationSidebar.tsx`

**Header colapsável:**
```
┌────────────────────────────────────────┐
│ 🛡️ Pronto a publicar  · 0 erros · 1 ⚠ │
│                                  ▼     │
└────────────────────────────────────────┘
```

Quando `errorCount > 0`: barra fica vermelha *"Corrige 2 problemas para publicar"*.

**Lista de issues** agrupada por categoria, cada cartão:
- chip da rede (`PlatformIcon` colorido)
- título + descrição
- se `affectedItems`: thumbnails pequenos das mídias afectadas
- se `autoFixable`: botão `[ Corrigir agora ]` que invoca `fix(id)`
- info issues têm `[ Dispensar ]`

**Posicionamento:**
- **Desktop (lg+)**: substitui o atual bloco "Validation - Only show when triggered" (linha 2371) e fica sticky junto ao Card de preview, sempre visível.
- **Mobile**: bottom sheet activado por badge contadora no `MediaWarning` (linha 2563-2569) — abre com tap.

**Estado vazio positivo**: quando `issues.length===0` mostra `✅ Tudo verificado · IG · LinkedIn` (cinco segundos depois colapsa).

---

### 5. Auto-Fixes (acções concretas)

| Issue | Fix | Implementação |
|---|---|---|
| Imagens fora 4:5–1.91:1 (IG) | Auto-resize com margens | reusar `resizeFilesForInstagram` de `instagramResize.ts` |
| Vídeo > duração max | Trim sugerido (link p/ ferramenta externa) | só info, sem fix automático |
| Caption excede limite | "Cortar para N caracteres" | `setCaption(caption.slice(0, max))` |
| Hashtags >30 IG | "Manter primeiras 30" | filtra array |
| GBP caption <30 chars | (sem fix) — info pede edição manual | foca textarea |

Após `fix()`, o hook re-valida automaticamente (cache invalidado).

---

### 6. Integração em `ManualCreate.tsx`

Mudanças mínimas (não há refactor da página):
1. Adicionar `import { useSmartValidation }` e `import { ValidationSidebar }`.
2. Substituir `validations`/`validationSummary` actuais (linhas 539–544) por `const validation = useSmartValidation({...})`.
3. Substituir bloco `{showValidation && validationErrors.length > 0 && ...}` (linhas 2372-2381) por `<ValidationSidebar validation={validation} />`.
4. Botão Publicar passa a usar `disabled={... || !validation.canPublish}` em vez do gating actual via `validateBeforePublish`.
5. Manter `<AspectRatioWarning>` existente como fallback durante 1 release (deprecação suave) — depois remover.

---

### 7. Remoção do bloqueio em `usePublishWithProgress.ts`

A pré-verificação 24h actual (linha 507, info bloqueante) torna-se redundante. Substitui-se por: hook não bloqueia mais e o `duplicateValidator` mostra info no painel. Backend continua a fazer ZWSP retry como hoje.

---

### Ficheiros novos
- `src/lib/validation/types.ts`
- `src/lib/validation/validators/formatValidator.ts`
- `src/lib/validation/validators/captionValidator.ts`
- `src/lib/validation/validators/mediaAspectValidator.ts`
- `src/lib/validation/validators/mediaResolutionValidator.ts`
- `src/lib/validation/validators/videoDurationValidator.ts`
- `src/lib/validation/validators/gbpValidator.ts`
- `src/lib/validation/validators/duplicateValidator.ts`
- `src/lib/validation/runValidators.ts` (orquestração paralela + cache)
- `src/hooks/useSmartValidation.ts`
- `src/components/manual-post/ValidationSidebar.tsx`
- `src/components/manual-post/ValidationIssueCard.tsx`

### Ficheiros a editar
- `src/pages/ManualCreate.tsx` (5 pontos isolados, ~30 linhas)
- `src/hooks/usePublishWithProgress.ts` (remover bloqueio 24h, ~10 linhas)

### Ficheiros mantidos como estão
- `formatValidation.ts`, `mediaValidation.ts`, `publishingValidation.ts`, `instagramResize.ts` — apenas consumidos pelos validadores novos.
- Backend `publish-to-getlate/index.ts` — sem mudanças (a defensiva ZWSP+GBP já cobre).

---

### Resultado esperado

Métricas mensuráveis (após 7 dias):
- **0** falhas GBP por caption <30 chars (hoje: 2 em 7 dias)
- **−80%** falhas IG 409 detectadas no front (passa a info, backend continua a salvar)
- **<300ms** latência percebida do painel (debounce + cache)
- Utilizador deixa de descobrir erros após clicar Publicar — todos visíveis no momento da edição.

### Checkpoint de aceitação
☐ Selecionar `googlebusiness_post` com caption "Olá" → painel mostra erro "Caption GBP precisa ≥30 chars" e botão Publicar fica desactivado  
☐ Carregar imagem 16:9 num carrossel IG → painel mostra warning + botão "Auto-ajustar 4:5" funciona  
☐ Caption = última publicada nas 24h → aparece info "Retry automático com carácter invisível" mas Publicar continua activo  
☐ Estado limpo mostra "✅ Tudo verificado" e colapsa após 5s  
☐ Mobile: badge no rodapé abre bottom sheet com lista completa

