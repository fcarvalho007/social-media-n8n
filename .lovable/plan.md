

## Correcção: Diálogo de Detalhes do Calendário

### Problema confirmado

O post "Neste primeiro episódio de 'O Que Ninguém Vê'" tem **apenas ficheiros `.mp4`** em `template_a_images` e `media_urls_backup` — zero imagens. O diálogo de detalhes deveria mostrar "Conteúdo de vídeo" com ícone, mas mostra "Imagem não disponível" porque:

1. **O diálogo só consulta `template_a_images`** — ignora `media_urls_backup`, `cover_image_url` e `media_items`
2. **A detecção de vídeo pode não estar activa** — se o build anterior não foi aplicado, o `isVideoUrl` não existe ainda
3. **Falta uma imagem principal no topo do diálogo** — o `getPostThumbnail` (cascata) não é usado no diálogo

### Plano (1 ficheiro: `src/pages/Calendar.tsx`)

**1. Unificar fontes de média no diálogo**

O bloco de imagem/carrossel no diálogo (linhas 1678-1803) deve reunir todas as URLs de todas as fontes antes de filtrar vídeos:

```
allMedia = [
  ...template_a_images,
  ...media_urls_backup,  ← NOVO
  ...media_items          ← NOVO
]
```

Isto garante que se `template_a_images` só tem vídeos mas `media_urls_backup` tem imagens `.png`, essas imagens aparecem.

**2. Garantir que `isVideoUrl` e `hasVideoContent` estão presentes**

Confirmar que as funções helper estão no ficheiro. Se o build anterior falhou, reintroduzi-las.

**3. Mostrar placeholder de vídeo correcto**

Quando todas as URLs são vídeo, o diálogo deve mostrar:
- Ícone `Video` grande
- Texto "Conteúdo de vídeo"
- Não "Imagem não disponível"

**4. Adicionar imagem principal via `getPostThumbnail`**

Antes do carrossel, mostrar a imagem principal usando `getPostThumbnail(selectedEvent.resource)`. Se retorna `null` e o post tem vídeos, mostrar o placeholder de vídeo. Isto dá um fallback visual imediato mesmo quando o carrossel não encontra imagens.

### Resultado
- Posts com vídeo → ícone "Conteúdo de vídeo" (não "Imagem não disponível")
- Posts mistos → primeira imagem de qualquer fonte como thumbnail
- Consistência entre grid lateral e diálogo de detalhes

