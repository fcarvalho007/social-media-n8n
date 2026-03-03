

## Plano: LinkedIn no Preset 9:16 + Validação de Vídeo Multi-Plataforma

### Pedido 1: Incluir LinkedIn no preset "Vídeo Vertical 9:16"

O preset "Vídeo 9:16" actualmente inclui: `instagram_reel`, `facebook_reel`, `youtube_shorts`, `tiktok_video`.

O LinkedIn suporta vídeos verticais através do formato `linkedin_post`. Vou adicionar `linkedin_post` a este preset.

**Ficheiro: `src/components/manual-post/QuickPresets.tsx`**
- Adicionar `'linkedin_post'` ao array `formats` do preset `video-vertical`
- Actualizar `description` para `'Reels + Shorts + TikTok + LinkedIn'`

---

### Pedido 2: Validação de Vídeo Multi-Plataforma

**Problema actual**: A validação de vídeo (linhas 773-830 de ManualCreate.tsx) só verifica regras do Instagram. Não verifica regras do YouTube (Shorts ≤ 60s, Feed sem limite), TikTok (≤ 180s), Facebook, LinkedIn, etc. Resultado: um vídeo de 45s 9:16 pode ser publicado como `youtube_video` (feed) quando devia ser `youtube_shorts`.

**Solução**: Expandir a validação para todas as plataformas seleccionadas, usando as regras já definidas em `src/lib/mediaValidation.ts` (`MAX_VIDEO_DURATION`, `FORMAT_ASPECT_RATIOS`).

#### Alteração 1: Expandir validação de vídeo no upload

**Ficheiro: `src/pages/ManualCreate.tsx`** (linhas 773-830)

Substituir a validação actual (só Instagram) por uma validação que percorre **todos os formatos seleccionados**:

```tsx
if (videoFiles.length > 0 && selectedFormats.length > 0) {
  const issues: VideoValidationIssue[] = [];
  
  for (const videoFile of videoFiles) {
    try {
      const videoInfo = await getVideoDimensions(videoFile);
      const videoRatio = videoInfo.width / videoInfo.height;
      const isVertical = videoRatio < 0.8; // 9:16 style
      const isHorizontal = videoRatio > 1.2; // 16:9 style
      
      for (const format of selectedFormats) {
        const formatConfig = FORMAT_ASPECT_RATIOS[format]; // from mediaValidation
        const maxDuration = MAX_VIDEO_DURATION[format];
        
        // Duration check
        if (maxDuration && videoInfo.duration > maxDuration) {
          issues.push({
            fileName: videoFile.name,
            issue: `Duração ${Math.round(videoInfo.duration)}s excede ${maxDuration}s para ${getFormatLabel(format)}`,
            suggestion: `Reduza para ≤ ${maxDuration}s ou remova ${getFormatLabel(format)}`,
            type: 'duration',
            severity: maxDuration <= 60 ? 'error' : 'warning',
          });
        }
        
        // Aspect ratio mismatch (e.g., vertical video → youtube_video feed)
        if (format === 'youtube_video' && isVertical) {
          issues.push({
            fileName: videoFile.name,
            issue: `Vídeo vertical (${videoInfo.width}x${videoInfo.height}) não é adequado para YouTube Feed`,
            suggestion: 'Use YouTube Shorts para vídeos verticais 9:16',
            type: 'aspectRatio',
            severity: 'error',
          });
        }
        if (format === 'youtube_shorts' && isHorizontal) {
          issues.push({
            fileName: videoFile.name,
            issue: `Vídeo horizontal não é adequado para Shorts`,
            suggestion: 'Use YouTube Vídeo para vídeos 16:9',
            type: 'aspectRatio',
            severity: 'error',
          });
        }
        
        // Resolution check
        const minRes = MIN_RESOLUTIONS[format];
        if (minRes && (videoInfo.width < minRes.width * 0.7 || videoInfo.height < minRes.height * 0.7)) {
          issues.push({
            fileName: videoFile.name,
            issue: `Resolução ${videoInfo.width}x${videoInfo.height} baixa para ${getFormatLabel(format)}`,
            suggestion: `Recomendado: ${minRes.width}x${minRes.height}px`,
            type: 'resolution',
            severity: 'warning',
          });
        }
      }
    } catch (err) {
      console.warn('Could not validate video:', videoFile.name, err);
    }
  }
  
  if (issues.length > 0) {
    setPendingVideoFiles(newFiles);
    setVideoValidationIssues(issues);
    setVideoValidationModalOpen(true);
    return;
  }
}
```

#### Alteração 2: Exportar constantes de `mediaValidation.ts`

As constantes `FORMAT_ASPECT_RATIOS`, `MAX_VIDEO_DURATION`, e `MIN_RESOLUTIONS` precisam ser exportadas (actualmente são `const` privadas).

**Ficheiro: `src/lib/mediaValidation.ts`**
- Alterar `const FORMAT_ASPECT_RATIOS` → `export const FORMAT_ASPECT_RATIOS`
- Alterar `const MAX_VIDEO_DURATION` → `export const MAX_VIDEO_DURATION`
- Alterar `const MIN_RESOLUTIONS` → `export const MIN_RESOLUTIONS`

#### Alteração 3: Helper para label do formato

**Ficheiro: `src/pages/ManualCreate.tsx`**

Adicionar helper usando `getFormatConfig` já existente:

```tsx
const getFormatLabel = (format: PostFormat): string => {
  return getFormatConfig(format)?.label || format;
};
```

#### Alteração 4: Corrigir build error do Swiper

**Ficheiro: `src/components/CarouselPreview.tsx`**

Adicionar `// @ts-ignore` antes de cada import de CSS do Swiper (linhas 50-53) para resolver os erros de tipo.

---

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/manual-post/QuickPresets.tsx` | Adicionar `linkedin_post` ao preset "Vídeo 9:16" |
| `src/lib/mediaValidation.ts` | Exportar constantes |
| `src/pages/ManualCreate.tsx` | Expandir validação de vídeo para todas as plataformas |
| `src/components/CarouselPreview.tsx` | Corrigir build error do Swiper CSS |

