## Problema

O utilizador tentou publicar um vídeo de 40s e o sistema bloqueou com "Vídeo excede 15s para Stories" (Instagram) e "Vídeo excede 20s para Stories" (Facebook). Estes limites estão **desatualizados**: desde a unificação Stories/Reels (Meta, 2023+), tanto Instagram Stories como Facebook Stories aceitam **até 60 segundos** por segmento de vídeo. Acima disso são partidos automaticamente em segmentos pelo próprio Meta — não devem ser rejeitados pelo nosso lado.

Adicionalmente, há outras regras a confirmar/corrigir:

| Formato | Atual | Correto (2026) |
|---|---|---|
| Instagram Stories | 15s ❌ | **60s** |
| Facebook Stories | 20s ❌ | **60s** |
| Instagram Reel | 90s | 90s ✅ |
| Facebook Reel | 90s | 90s ✅ |
| YouTube Shorts | 60s | 60s ✅ (mantém — embora YT aceite 180s, a categoria "Shorts" estrita continua 60s) |
| TikTok | 180s (`mediaValidation`) vs 600s (`social.ts`) ❌ inconsistente | **600s** (10 min, suportado oficialmente) |
| LinkedIn vídeo | 600s | 600s ✅ |
| Google Business | 30s | 30s ✅ |

Existe ainda **inconsistência entre duas fontes de verdade**: `src/lib/mediaValidation.ts` (`MAX_VIDEO_DURATION`) e `src/types/social.ts` (`maxDuration` por formato). O TikTok tem 180s num e 600s no outro. É preciso alinhar.

## Correções

### 1. `src/lib/mediaValidation.ts` — atualizar `MAX_VIDEO_DURATION`
- `instagram_stories`: 15 → **60**
- `instagram_story_link`: 15 → **60**
- `facebook_stories`: 20 → **60**
- `tiktok_video`: 180 → **600** (alinhar com `social.ts`)

### 2. `src/types/social.ts` — adicionar `maxDuration` em falta
Os formatos Stories não têm `maxDuration` definido (cai para o validador via `MAX_VIDEO_DURATION`). Para coerência, adicionar:
- `instagram_stories.maxDuration = 60`
- `instagram_story_link.maxDuration = 60`
- `facebook_stories.maxDuration = 60`

### 3. `src/components/manual-post/SectionHelp.tsx`
- Atualizar texto: `"Imagem ou vídeo, 9:16, máx. 15 segundos"` → `"Imagem ou vídeo, 9:16, máx. 60 segundos"` (Instagram Stories).
- Verificar e atualizar equivalente do Facebook Stories se existir.

### 4. Mensagem de erro mais útil
Em `src/lib/validation/validators/videoDurationValidator.ts`, a mensagem atual é "Aparas o vídeo num editor externo antes de publicar." Acrescentar nota informativa para Stories: "O Meta divide automaticamente vídeos longos em segmentos de 60s — encurta para ≤60s para publicar como segmento único." (apenas para `*_stories`).

### 5. Validação
- `tsc` + `vitest` (37 testes existentes)
- Verificar que os testes em `src/lib/validation/validators/formatValidator.test.ts` continuam a passar (ou ajustar se hard-codarem 15/20s).
- Confirmar com `rg "15.*segundos|20.*segundos"` que não restam strings antigas.

## Ficheiros a editar

- `src/lib/mediaValidation.ts` (limites)
- `src/types/social.ts` (maxDuration por formato)
- `src/components/manual-post/SectionHelp.tsx` (texto de ajuda)
- `src/lib/validation/validators/videoDurationValidator.ts` (mensagem informativa para Stories)

## Resultado esperado

Vídeo de 40s passa a ser aceite em Instagram Stories e Facebook Stories sem aviso de erro. Vídeos >60s continuam bloqueados com mensagem clara que explica o porquê e sugere encurtar.