

## Refinamentos Identificados

Após revisão completa do código implementado, identifiquei **3 problemas** que precisam de correcção:

### 1. LinkedIn sem limite de duração de vídeo em `MAX_VIDEO_DURATION`

O `linkedin_post` foi adicionado ao preset 9:16 mas **não tem entrada** em `MAX_VIDEO_DURATION`. O LinkedIn permite vídeos de até **10 minutos (600s)**. Sem esta entrada, vídeos longos para LinkedIn não serão validados.

**Ficheiro:** `src/lib/mediaValidation.ts`
- Adicionar `linkedin_post: 600` ao `MAX_VIDEO_DURATION`

### 2. Validação de aspect ratio incompleta para Reels/TikTok/LinkedIn vertical

A validação actual só verifica `youtube_video` (vertical → erro) e `youtube_shorts` (horizontal → erro). Falta validação para:
- `instagram_reel` + vídeo horizontal → deveria avisar
- `tiktok_video` + vídeo horizontal → deveria avisar
- `facebook_reel` + vídeo horizontal → deveria avisar

**Ficheiro:** `src/pages/ManualCreate.tsx` (linhas 804-822)
- Adicionar checks para formatos verticais (`instagram_reel`, `tiktok_video`, `facebook_reel`) que recebem vídeo horizontal — severity `warning` com sugestão de usar formato adequado

### 3. Texto do `VideoValidationModal` só menciona Instagram

A nota informativa no modal (linha 129-132 de `VideoValidationModal.tsx`) diz: *"O Instagram pode demorar até 5 minutos a processar vídeos em carrosseis."* — agora que a validação é multi-plataforma, este texto deve ser genérico.

**Ficheiro:** `src/components/publishing/VideoValidationModal.tsx`
- Alterar texto para: *"Algumas plataformas podem demorar a processar vídeos. Se o upload falhar, verifique os requisitos e tente novamente."*

---

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/mediaValidation.ts` | Adicionar `linkedin_post: 600` ao `MAX_VIDEO_DURATION` |
| `src/pages/ManualCreate.tsx` | Adicionar validação de aspect ratio para reels/tiktok/facebook horizontais |
| `src/components/publishing/VideoValidationModal.tsx` | Generalizar texto informativo |

