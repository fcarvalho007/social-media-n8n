## Refinamentos pendentes — auditoria pós-correções

Após a primeira ronda de alinhamento com a Getlate API, ainda restam **5 inconsistências de UI/preview** e **2 melhorias de robustez**.

### 🔴 Bugs de UI (mostram informação desatualizada/inválida)

**1. `GoogleBusinessPreview.tsx` ainda renderiza vídeo**
- Linhas 16-20: detecta vídeo e mostra `<video>` no preview com badge "0:30" hardcoded.
- A API GBP **não suporta vídeo** (já bloqueamos no validador).
- **Correção:** se `isVideo`, mostrar fallback "Vídeo não suportado pelo Google Business — só imagem é publicada" em vez de renderizar vídeo. Remover badge "0:30" e o caso `'Vídeo'` no badge linha 86.

**2. `GoogleBusinessPreview.tsx` truncação inconsistente**
- Linha 99-102: trunca caption a `300` caracteres com "ver mais".
- O Google Business mostra ≈100-125 chars antes do "more". Mas mais grave: a UI diz `maxChars = 1500` e depois trunca a 300 visualmente — confunde o utilizador.
- **Correção:** alinhar truncação a 250 chars (visual real do GBP) ou simplesmente mostrar tudo até 1500 sem truncação artificial.

**3. `FormatIllustration.tsx` linha 240 — YouTube Shorts mostra badge "≤60s"**
- ✅ Continua correto (Shorts limit é 60s). Sem alteração.

**4. `FormatCard.tsx` linha 20 — badge `≤Xs` só aparece se `maxDuration <= 60`**
- Como Reels (90s), TikTok (600s), YouTube Long (900s), FB Stories (120s) têm `maxDuration > 60`, **nenhuma badge é mostrada** para esses formatos.
- **Correção:** mostrar badge sempre que houver `maxDuration`, formatando `≤Xs` para <60, `≤Xm` para >=60. Ex: `≤90s`, `≤2m` (FB Stories), `≤10m` (TikTok), `≤15m` (YT Vídeo).

### 🟡 Inconsistências internas (não bloqueiam mas confundem)

**5. `formatValidation.ts` linha 70 — não considera `max_caption_length_video`**
- Para TikTok com formato vídeo, usa `constraints.max_caption_length` (2200) que já está correto. Mas se algum dia adicionarmos formato `tiktok_photo`, o limite mudaria para 4000 e isto teria de derivar via `max_caption_length_video` vs `max_caption_length`.
- **Correção mínima:** acrescentar comentário documentando que `tiktok.max_caption_length` representa o caminho de vídeo (default), e que photo carousel iria precisar de override por formato. **Sem mudança de código** (não há `tiktok_photo` ainda).

**6. `formatValidation.ts` — combinação de `maxDuration` com `Math.min` pode dar resultado errado**
- Linha 64-66: faz `Math.min` entre `maxDuration` quando múltiplos formatos selecionados.
- Cenário: utilizador seleciona IG Reel (90s) + TikTok Vídeo (600s) → resultado é 90s ✅ (correto, é o mais restritivo).
- Mas com IG Stories (60s) + IG Reel (90s) → 60s ✅ correto.
- ✅ **Está correto, sem alteração.**

### 🟢 Melhorias de robustez

**7. `FormatCard.tsx` — falta badge "Sem vídeo" para Google Business**
- Para deixar evidente ao utilizador que GBP não aceita vídeo antes de tentar.
- **Correção:** se `format === 'googlebusiness_post'`, adicionar badge `"Apenas imagem"`.

**8. Memória stale — `mem://integrations/google-business-profile-v2`**
- Diz: *"Supports text + optional image or **max 30s video**"* — agora **falso**.
- **Correção:** atualizar para refletir que vídeo já não é suportado.

---

## Ficheiros a editar

1. **`src/components/manual-post/GoogleBusinessPreview.tsx`**
   - Remover render de `<video>` e badge "0:30" / "Vídeo".
   - Substituir por estado vazio com mensagem informativa quando o ficheiro for vídeo.
   - Trocar truncação `slice(0, 300)` por `slice(0, 250)` (mais realista).

2. **`src/components/manual-post/FormatCard.tsx`**
   - Linha 20: substituir `if (format.maxDuration && format.maxDuration <= 60)` por lógica que formata para minutos quando >60s.
   - Acrescentar badge "Apenas imagem" para `googlebusiness_post`.

3. **`src/lib/formatValidation.ts`**
   - Adicionar comentário no linha 70 a documentar a estratégia para futuro `tiktok_photo`.

4. **`mem://integrations/google-business-profile-v2`**
   - Atualizar para "Supports text + image only (5MB, min 400×300). Video NOT supported."

## Não-objetivos

- Não refazer ilustrações estáticas (`FormatIllustration.tsx`) — visual continua válido para todos.
- Não alterar `TikTokPreview.tsx` — já lê dinamicamente `NETWORK_CONSTRAINTS.tiktok.max_caption_length` (2200, correto).
- Não introduzir formato `tiktok_photo` (fora do scope atual).