

## Correcção: Thumbnails de Vídeo no Calendário e Grid de Conteúdos

### Causa raiz

`getPostThumbnail` **ignora propositadamente** URLs de vídeo (`.mp4`, `.mov`, etc.) e retorna `null` para posts que só contêm vídeos. O resultado: esses posts mostram um ícone genérico em vez de um thumbnail visual.

A solução aplicada na MediaLibrary (`<video preload="metadata">`) não foi replicada no Calendar.

### Plano (1 ficheiro: `src/pages/Calendar.tsx`)

**1. Adicionar helper `getFirstVideoUrl`**

Junto aos helpers existentes (~linha 88), criar função que retorna o primeiro URL de vídeo de um post:
```typescript
const getFirstVideoUrl = (resource: ScheduledPost): string | null => {
  const sources = [
    ...(resource.template_a_images || []),
    ...(Array.isArray(resource.media_items) ? resource.media_items : []),
    ...(Array.isArray(resource.media_urls_backup) ? resource.media_urls_backup : []),
  ];
  for (const item of sources) {
    const url = typeof item === 'string' ? item : (item?.url || item?.file_url || null);
    if (url && isVideoUrl(url)) return url;
  }
  return null;
};
```

**2. CustomEvent (células do calendário) — linha ~1007**

Quando `thumbnailUrl` é `null` mas `hasVideoContent` é true, em vez do ícone estático, renderizar:
```jsx
<video src={videoUrl} preload="metadata" muted playsInline
  className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg" />
```
Com overlay de ícone `Video` semi-transparente e fallback `onError` para o ícone actual.

**3. Grid lateral (Posts Feed) — linha ~1471**

Mesma lógica: quando `thumbnailUrl` é `null` e o post tem vídeo, usar `<video preload="metadata">` com o primeiro URL de vídeo em vez do placeholder cinzento com ícone.

**4. Diálogo de detalhes — verificar consistência**

O diálogo já foi corrigido anteriormente, mas confirmar que também usa `<video>` para preview quando só há vídeos.

### Resultado
- Posts com imagem → thumbnail de imagem (sem alteração)
- Posts com vídeo → primeiro frame do vídeo como thumbnail visual
- Posts mistos → primeira imagem (sem alteração, já funciona)
- Ícone de `Video` como overlay em todos os thumbnails de vídeo

