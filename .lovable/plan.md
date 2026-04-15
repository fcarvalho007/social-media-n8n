

## Correcção da Grelha de Conteúdos do Calendário

### Problema

A grelha lateral "Grid de Conteúdos" mostra "Erro ao carregar" na maioria dos thumbnails porque:

1. **URLs expiradas**: `template_a_images` contém URLs do Supabase Storage que são eliminadas após 7 dias (política de retenção). Posts mais antigos ficam sem imagem.
2. **Fontes alternativas não consultadas**: A query não busca `media_items` nem `cover_image_url` — campos que podem conter URLs alternativas (ex: URLs externas do Getlate ou covers).
3. **Fallback visual pobre**: Quando a imagem falha, o fallback "Erro ao carregar" ocupa o mesmo espaço visual sem informação útil.

### Plano (1 ficheiro: `src/pages/Calendar.tsx`)

**1. Expandir a query para buscar mais campos de imagem**
- Adicionar `media_items, cover_image_url, media_urls_backup` ao `select` das 2 queries de posts
- Adicionar estes campos à interface `ScheduledPost`

**2. Criar lógica de thumbnail com fallback em cascata**
- Função `getPostThumbnail(resource)` que tenta:
  1. `cover_image_url` (se existir — é a miniatura designada)
  2. `template_a_images[0]` (fonte principal actual)
  3. `media_items[0].url` ou `media_items[0]` (campo alternativo com URLs potencialmente diferentes)
  4. `media_urls_backup[0]` (backup final)
  5. `null` (sem imagem — mostrar placeholder limpo)

**3. Melhorar o fallback visual**
- Substituir "Erro ao carregar" por um placeholder mais limpo: ícone + tema/título do post em texto pequeno
- Usar as iniciais do título como avatar quando não há imagem
- Manter o gradiente de fundo mas sem mensagem de erro negativa

**4. Aplicar a mesma lógica nos 3 locais que mostram thumbnails**
- Grelha lateral (linha ~1372)
- Células do calendário (linha ~912)
- Diálogo de detalhes (linha ~1624)

### Resultado
- Posts recentes (< 7 dias) mostram thumbnails correctamente
- Posts antigos mostram placeholder visual limpo com título em vez de erro
- Todas as fontes de URLs são tentadas antes de desistir

