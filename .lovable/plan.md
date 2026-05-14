## Contexto

A validação atual de aspect ratio para Instagram só distingue dois casos: `instagram_story_link` (9:16 estrito) e "resto" (intervalo 0.75–1.91). Falham casos importantes confirmados pela Graph API e Getlate:

- **Instagram Reels** e **Stories** exigem 9:16 estrito (1080×1920). Hoje, se o utilizador escolher Reel e enviar uma imagem 1:1, **nenhum aviso aparece** e o auto-resize aplicaria 0.75 (errado para Reel).
- **YouTube Shorts** e **TikTok video** exigem 9:16; **YouTube long-form** prefere 16:9. Sem aviso na UI hoje (só `formatValidation` valida count/duration).
- **LinkedIn** aceita 9:16 para vídeo vertical (ver memória `linkedin-vertical-video-integration`), mas `socialNetworks.ts` lista apenas `['1:1','16:9','4:5']`.
- **`MIN_RESOLUTIONS.linkedin_post = 1200×627`** (rácio ~1.91:1) impõe resolução mínima incompatível com 1:1 e 4:5 — deve ser quadrado mínimo 1080×1080.
- **Instagram Reel sem `MIN_VIDEO_DURATION`**: API rejeita <3s, mas só TikTok tem mínimo configurado.

## Refinamentos (sem inventar dados — todos confirmados nas memórias `getlate-platform-limits-authoritative`, `instagram-media-optimization`, `linkedin-vertical-video-integration` e docs oficiais Meta/Google)

### 1. `src/lib/validation/validators/mediaAspectValidator.ts`
Tornar o validador format-aware:
- Se `instagram_reel` ou `instagram_stories` selecionado → reaproveitar a lógica do bloco `storyLinkSelected` (warning fora de 9:16, sem auto-fix porque o letterbox 9:16 estraga Reels — recomendar reupload).
- Caso `instagram_image` / `instagram_carousel` → manter o bloco atual (0.75–1.91 com auto-fix pillarbox/letterbox).
- Os blocos são mutuamente exclusivos; o existing `storyLinkSelected` fica como subcaso.

### 2. `src/lib/canvas/instagramResize.ts`
Adicionar `processMediaForInstagram` opcionalmente parametrizável por formato — quando `targetFormat === 'instagram_reel' | 'instagram_stories'`, **não chamar resize automático** (return original + flag). Isto previne pillarbox 0.75 numa imagem destinada a Reel.

### 3. `src/lib/socialNetworks.ts`
- `instagram.supported_aspect_ratios`: adicionar `'3:4'` → `['1:1', '4:5', '3:4', '9:16', '16:9']`.
- `linkedin.supported_aspect_ratios`: adicionar `'9:16'` → `['1:1', '16:9', '4:5', '9:16']`.
- `linkedin.min_video_duration: 3` (Getlate rejeita <3s tal como TikTok).

### 4. `src/lib/mediaValidation.ts`
- `MIN_RESOLUTIONS.linkedin_post`: `1200×627` → `1080×1080` (compatível com 1:1, 4:5, 16:9 e 1.91:1).
- `MIN_VIDEO_DURATION.instagram_reel = 3`, `linkedin_post = 3`, `facebook_reel = 3` (todos via Getlate).
- `FORMAT_ASPECT_RATIOS.linkedin_post`: adicionar `'9:16'` para suportar vídeo vertical.

### 5. `src/components/publishing/AspectRatioWarning.tsx`
Atualizar copy: "Instagram aceita rácios entre **3:4 e 1.91:1**" (já corrigido em parte; confirmar consistência). Esconder o badge se o único formato IG selecionado for Reel/Stories (nesses casos o warning vem do validador novo).

### 6. Memórias
Atualizar `mem://integrations/getlate-platform-limits-authoritative` com:
- LinkedIn aspect ratios incluem 9:16 (vídeo).
- min_video_duration aplicável: TikTok, IG Reel, FB Reel, LinkedIn = 3s.

## Validação (antes de fechar)

1. `bunx vitest run` — confirmar 37/37 passa (nenhum teste assume `1200×627` para LinkedIn — verificar `mediaResolutionValidator.test` se existir).
2. Smoke manual no preview:
   - Selecionar Reel + carregar imagem 1:1 → deve aparecer warning "Reel fora do rácio 9:16".
   - Selecionar Carrossel + imagem 3:4 → **sem** warning (passa nos limites IG).
   - Selecionar LinkedIn + vídeo 9:16 → sem erro de aspect ratio.

## Não-objetivos

- Não alterar a UI do GridSplitter, AI generator, ou QuickCrop (já corretos em 3:4).
- Não tocar em `src/lib/formatValidation.ts` (caption/count) nem em edge functions.
- Não reformular a estrutura de `mediaAspectValidator` para outras redes além de Instagram nesta iteração — fica como follow-up se quiseres avisos format-aware para TikTok/YouTube/Facebook/LinkedIn.

## Pergunta de scope

Queres incluir **avisos de aspect ratio para TikTok / YouTube Shorts / Facebook Reel** (todos 9:16 estrito) nesta iteração, ou ficamos só com o Instagram nesta passagem?
