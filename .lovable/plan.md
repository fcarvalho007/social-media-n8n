## Auditoria contra a documentação oficial Getlate (Zernio)

Cruzei `socialNetworks.ts` (NETWORK_CONSTRAINTS), `social.ts` (formatos) e `mediaValidation.ts` (MAX_VIDEO_DURATION) com a Quick Reference de cada plataforma. Lista de **discrepâncias confirmadas**:

### 🔴 Erros (bloqueiam ou desinformam)

| # | Plataforma | Campo | Atual | Oficial Getlate | Impacto |
|---|---|---|---|---|---|
| 1 | **Instagram** | `max_video_duration` (genérico) | **60s** | depende: Reel 90s, Story 60s, Feed 60min | Bloqueia Reels >60s erradamente |
| 2 | **Instagram Reels** | `maxDuration` | 90s | **90s** ✅ (Mosseri 2025: 3min) | Manter 90s (Getlate ainda 90s) |
| 3 | **Facebook** | `max_video_duration` (genérico) | 240min ✅ | 240min feed / 120s stories | Falta diferenciar Stories |
| 4 | **Facebook Stories** | `maxDuration` (após última correção) | 60s ❌ | **120s** | Bloqueia vídeos legítimos 60-120s |
| 5 | **Facebook Stories** (formato) | aceita vídeo | sim | sim — mas duração é 120s, não 60s | Corrigir para 120s |
| 6 | **YouTube** | `max_video_duration` | 60s ❌ | **15min (não verif.) / 12h (verif.)** | Bloqueia vídeos longos legítimos |
| 7 | **YouTube** | `max_images` | 0 | 0 ✅ + `supports_video: true` mas thumbnail 2MB | OK, mas thumbnail não está modelado |
| 8 | **TikTok** | `min_video_duration` | (ausente) | **3s mínimo** | Não validamos, falha silenciosa na API |
| 9 | **TikTok** | `max_images` | 35 ✅ | 35 ✅ | OK |
| 10 | **TikTok** | character limit vídeo vs foto | 300 | 2.200 (vídeo) / 4.000 (foto) | Demasiado restritivo |
| 11 | **LinkedIn** | `max_images` | 20 ✅ | 20 ✅ | OK |
| 12 | **LinkedIn** | `max_video_duration` | 600s ✅ | 10min pessoal / 30min página | OK para pessoal, falta page |
| 13 | **Google Business** | `supports_video` | true ❌ | **false** (não suporta vídeo) | A nossa UI permite vídeo erradamente |
| 14 | **Google Business** | `max_image_size` | (ausente) | **5MB** | Não validado |
| 15 | **Google Business** | `min_image_dimensions` | (ausente) | **400×300** | Não validado |
| 16 | **X/Twitter** | `max_caption_length` | 280 ✅ | 280 (free) / 25.000 (Premium) | OK |
| 17 | **Instagram** | `max_image_size` | (ausente) | 8MB (Getlate auto-comprime) | Não validado, mas inofensivo |
| 18 | **Facebook** | `max_image_size` | (ausente) | **4MB** (rejeita >4MB na prática) | Não validado |

### 🟡 Inconsistências internas

- **`MAX_VIDEO_DURATION` vs `social.ts`** — duas fontes de verdade. Decisão: **`social.ts` é a verdade autoritativa por formato**; `MAX_VIDEO_DURATION` deve ser derivado/sincronizado, ou eliminado e ler sempre via `getFormatConfig().maxDuration`.
- **Aspect ratios** Google Business (`'1:1', '4:3', '16:9'`) — Getlate aceita "any standard image". Manter mas reduzir tolerância de validação.

### ✅ Já corretos

- IG carousel max 10 (com aviso para 11-50) ✅
- IG caption 2200 ✅
- LinkedIn caption 3000 ✅
- LinkedIn document 300 páginas / 100MB ✅
- TikTok video 600s (10min) ✅ após última correção
- IG Stories 60s ✅ após última correção
- Facebook caption 63.206 ✅

---

## Correções a aplicar

### 1. `src/lib/socialNetworks.ts` — `NETWORK_CONSTRAINTS`

```ts
instagram: {
  max_caption_length: 2200,
  max_first_comment_length: 2200,
  max_images: 10,
  min_images: 1,
  max_video_duration: 3600,        // 60min feed (Reel/Story validados por formato)
  max_image_size_mb: 8,            // NOVO
  supported_aspect_ratios: ['1:1', '4:5', '9:16', '16:9'],
  // ... resto igual
},
facebook: {
  max_caption_length: 63206,
  max_images: 10,
  min_images: 1,
  max_video_duration: 14400,       // 240min feed
  max_image_size_mb: 4,            // NOVO — Getlate avisa que FB rejeita >4MB
  // ...
},
youtube: {
  max_caption_length: 5000,
  max_title_length: 100,           // NOVO
  max_images: 0,
  min_images: 0,
  max_video_duration: 900,         // 15min (não verificado, conservador)
  max_video_duration_verified: 43200, // 12h
  max_thumbnail_size_mb: 2,        // NOVO
  // ...
},
tiktok: {
  max_caption_length_video: 2200,  // NOVO (renomear/duplicar)
  max_caption_length: 4000,        // foto carousel (limite superior)
  min_video_duration: 3,           // NOVO
  max_video_duration: 600,
  max_image_size_mb: 20,
  // ...
},
googlebusiness: {
  max_caption_length: 1500,
  max_images: 1,
  min_images: 0,
  supports_video: false,           // 🔴 CORREÇÃO crítica
  max_video_duration: undefined,
  max_image_size_mb: 5,            // NOVO
  min_image_dimensions: { width: 400, height: 300 }, // NOVO
  // ...
},
linkedin: {
  // ...
  max_video_duration: 600,         // pessoal (default conservador)
  max_video_duration_company: 1800, // NOVO (30min página)
}
```

### 2. `src/types/social.ts` — `NETWORK_POST_FORMATS`

- `facebook_stories.maxDuration`: **60 → 120** (correção do erro introduzido na última iteração)
- `facebook_stories.description`: "Imagem ou vídeo até 60s" → "Imagem ou vídeo até 2 min"
- `googlebusiness_post`: remover `maxDuration: 30` ou marcar como apenas-imagem; atualizar descrição: "Imagem (até 5MB) e/ou texto até 1.500 chars" — **vídeo não suportado pela API**
- `instagram_stories.description`: "Imagem ou vídeo até 60s" ✅ manter
- `youtube_video`: adicionar `maxDuration: 900` (15min default; aviso quando >15min sobre verificação de canal)

### 3. `src/lib/mediaValidation.ts` — `MAX_VIDEO_DURATION`

Sincronizar:
```ts
export const MAX_VIDEO_DURATION: Record<string, number> = {
  instagram_reel: 90,
  instagram_stories: 60,
  instagram_story_link: 60,
  instagram_image: 60,         // feed video até 60s prático
  youtube_shorts: 60,
  youtube_video: 900,          // 15min unverified default
  tiktok_video: 600,
  facebook_stories: 120,       // 🔴 era 60
  facebook_reel: 90,
  facebook_image: 14400,       // feed
  linkedin_post: 600,
};
```

### 4. Validação Google Business — bloquear vídeo

Em `src/lib/validation/validators/formatValidator.ts` (e/ou `gbpValidator.ts`):
- Se `googlebusiness_post` selecionado e `mediaFiles` contém `video/*` → **erro**: "Google Business Profile não suporta vídeo. Remove o vídeo ou desmarca o Google."

### 5. Validação imagens — tamanho por plataforma

Adicionar validador `mediaSizeValidator.ts` (ou estender `mediaResolutionValidator`):
- Facebook: imagem >4MB → **warning** "Facebook pode rejeitar imagens >4MB. Recomendado comprimir."
- Google Business: imagem >5MB → **erro**
- Google Business: dimensões <400×300 → **erro**

### 6. Validação TikTok — duração mínima

Em `videoDurationValidator.ts`, adicionar verificação de **mínimo**:
- TikTok: vídeo <3s → erro "TikTok requer vídeos de pelo menos 3 segundos"

### 7. UI / SectionHelp

`src/components/manual-post/SectionHelp.tsx`:
- `facebook_stories`: "Imagem ou vídeo vertical, 9:16, máx. 2 minutos"
- `youtube_video`: "Vídeo horizontal, 16:9. Canais não-verificados: máx. 15 min"
- Adicionar tooltip `googlebusiness_post`: "Apenas imagem (máx. 5MB, mín. 400×300px). Vídeo não suportado."

### 8. Testes

- Atualizar `formatValidator.test.ts` se assumir 60s para FB Stories.
- Adicionar caso: vídeo no Google Business deve falhar.
- Adicionar caso: TikTok 2s deve falhar com erro de duração mínima.

---

## Ficheiros a editar

1. `src/lib/socialNetworks.ts` — NETWORK_CONSTRAINTS (limites + novos campos)
2. `src/types/social.ts` — `facebook_stories.maxDuration`, `googlebusiness_post` description, `youtube_video.maxDuration`
3. `src/lib/mediaValidation.ts` — `MAX_VIDEO_DURATION` sincronizado
4. `src/lib/validation/validators/videoDurationValidator.ts` — duração mínima TikTok
5. `src/lib/validation/validators/formatValidator.ts` ou `gbpValidator.ts` — bloquear vídeo no Google Business
6. `src/lib/validation/validators/mediaResolutionValidator.ts` — tamanho de imagem FB/GBP, dimensões mín GBP
7. `src/components/manual-post/SectionHelp.tsx` — tooltips atualizados
8. `src/types/social.ts` (interface `NetworkConstraints`) — adicionar campos opcionais novos (`max_image_size_mb`, `min_image_dimensions`, `min_video_duration`, `max_title_length`, `max_thumbnail_size_mb`, `max_video_duration_company`, `max_video_duration_verified`, `max_caption_length_video`)

## Resultado esperado

- ✅ Vídeo de 40s passa em IG Stories e FB Stories.
- ✅ Vídeo de 90s passa em FB Stories (era erradamente bloqueado a 60s).
- ✅ Vídeo no Google Business é bloqueado **antes** de tentar publicar (poupa tempo + idempotency).
- ✅ Vídeo TikTok <3s avisa antes da API rejeitar.
- ✅ Imagem FB >4MB avisa proativamente.
- ✅ YouTube vídeo longo já não é falsamente bloqueado a 60s.
- ✅ Fonte de verdade única para durações: `social.ts` por formato + `mediaValidation` derivado.

## Não-objetivos

- Não vamos modelar threads do Twitter/X (não é usado no produto).
- Não vamos diferenciar LinkedIn pessoal vs empresa em runtime (mantemos default conservador 10min).
- Não modelar Premium do X (assumimos plano free 280 chars).