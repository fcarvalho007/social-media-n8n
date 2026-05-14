# Correções: agendamento e rácio Instagram

## Diagnóstico

### a) "Data/hora no passado" às 21:00 de hoje
O estado `scheduledDate` em `ManualCreate.tsx` guarda apenas a **data** (com a hora em que o objeto `Date` foi criado, ex.: 19:26 ao clicar em "Hoje"). A **hora escolhida** vive num estado separado `time` (`'21:00'`).

O `useSmartValidation` recebe só `scheduledDate` — nunca a `time`. O `scheduleValidator` faz:
```
ctx.scheduledDate.getTime() < Date.now()
```
Como `scheduledDate` ficou com a hora 19:26 e agora são 19:27, é considerado passado mesmo com 21:00 escolhido no time picker.

A combinação correta só acontece tarde demais, dentro do `usePublishOrchestrator` (`buildScheduledDateTime`), depois de o utilizador já estar bloqueado pelo botão.

Como o JS `Date` já corre na timezone local do browser (Lisboa para o utilizador), não é preciso conversões extra — basta combinar `date + time` antes de validar.

### b) Instagram aceita 3:4
Hoje a app força [4:5 … 1.91:1] (`0.8 … 1.91`). O utilizador confirma que a Getlate API + Instagram aceitam também 3:4 (`0.75`), que é um rácio comum em retrato. Vamos relaxar o limite mínimo para `0.75` mantendo o limite máximo (1.91:1) e o ideal (4:5/1:1) para os avisos suaves.

## Alterações

### 1. `src/pages/ManualCreate.tsx`
- Adicionar `useMemo` que combina `scheduledDate + time` num único `Date` (`effectiveScheduledDate`).
  - Se `scheduledDate` for `undefined` → `null`.
  - Caso contrário, clonar e aplicar `setHours(hh, mm, 0, 0)`.
- Passar `effectiveScheduledDate` ao `useSmartValidation` em vez de `scheduledDate ?? null`.
- Incluir `time` nas dependências relevantes do `useMemo`.

### 2. `src/lib/canvas/instagramResize.ts`
- `INSTAGRAM_MIN_RATIO = 0.75` (3:4) em vez de `0.8`.
- Manter `INSTAGRAM_MAX_RATIO = 1.91`.
- Ajustar comentários de cabeçalho.

### 3. `src/lib/validation/validators/mediaAspectValidator.ts`
- Atualizar limites usados na deteção (3:4 a 1.91:1) e o copy do issue para:
  > "O Instagram aceita rácios entre 3:4 e 1.91:1. Posso adicionar margens automáticas (letterbox/pillarbox) sem cortar conteúdo."
- Manter o auto-fix existente (resize com letterbox).

### 4. `src/lib/mediaValidation.ts`
- Adicionar `'3:4'` à lista `IDEAL_RATIOS.instagram_carousel` e `instagram_image` (continua a sugerir 1:1/4:5 como ideal mas não acusa 3:4 como erro duro).
- Em `detectAspectRatio`, reconhecer `0.75 → '3:4'`.

### 5. `src/lib/validation/validators/scheduleValidator.ts`
- Sem mudança lógica, mas reforçar a mensagem de erro "Data/hora no passado" para incluir a hora composta visível ao utilizador (opcional, baixa prioridade).

### 6. Memória
- Atualizar `mem://features/instagram-media-optimization` para refletir 3:4 como aceitável (era "0.8:1–1.91:1").
- Atualizar `mem://integrations/getlate-platform-limits-authoritative` (Instagram aspect range 0.75–1.91).

## Validação

- ☐ Vitest: `bunx vitest run` (esperar 37/37, sem regressão).
- ☐ Smoke manual no preview:
  - Selecionar "Hoje" + 21:00 → smart validation deve passar.
  - Selecionar "Hoje" + hora já passada → continua a bloquear.
  - Imagem 3:4 (1080×1440) no Instagram → sem aviso de "fora do rácio".
  - Imagem 2:3 (0.66) → continua a oferecer auto-fix.

## Fora de âmbito
- Não alterar lógica de publicação/Edge functions.
- Não mexer noutras plataformas (LinkedIn/Facebook).
- Sem mudanças visuais no DateTimePicker.
