

## Avaliação e Refinamentos

### Estado actual — o que está bem
- ✅ `isVideoUrl`, `firstImageFromArray`, `getPostThumbnail` e `hasVideoContent` estão correctos no Calendar
- ✅ Diálogo de detalhes unifica fontes de média e filtra vídeos
- ✅ Delete handler gere `posts_drafts` para rascunhos
- ✅ MediaLibrary usa `<video preload="metadata">` para thumbnails de vídeo
- ✅ Banner de retenção de 7 dias presente na MediaLibrary

### Problemas identificados e refinamentos

| # | Problema | Local |
|---|----------|-------|
| 1 | **Banner de retenção sem tempo restante por ficheiro** — O banner é genérico. Cada item deveria mostrar "Expira em X dias" baseado no `created_at` + 7 dias | MediaLibrary grid |
| 2 | **Calendar: `currentImageIndex` não é resetado** quando se muda de post no diálogo — se o post A tem 5 imagens e o utilizador está no slide 4, ao abrir o post B (com 1 imagem) o `safeIndex` corrige mas a UX é confusa | Calendar dialog |
| 3 | **Calendar: thumbnails de 80×80px na vista normal são excessivamente grandes** para células do calendário — cortam o conteúdo em monitores menores | Calendar CustomEvent |
| 4 | **MediaLibrary: erro silencioso nos vídeos** — quando `<video>` falha a carregar (URL expirada/7 dias), esconde-se mas o overlay de ícone fica sobre fundo vazio sem explicação | MediaLibrary grid |
| 5 | **MediaLibrary: diálogo de detalhes não mostra dias restantes** — não indica quando o ficheiro será eliminado | MediaLibrary details |
| 6 | **Calendar: drag-and-drop de rascunhos falha** — `handleEventDrop` usa `posts`/`stories` mas não `posts_drafts`, arrastando um rascunho causa erro silencioso | Calendar DnD |

### Plano de correcção (2 ficheiros)

**`src/pages/MediaLibrary.tsx`**

1. **Badge de expiração na grid**: Calcular `daysRemaining = 7 - diffInDays(now, created_at)`. Mostrar badge no canto inferior esquerdo:
   - ≤ 2 dias: badge vermelho "Expira em X d"
   - 3-4 dias: badge âmbar "X d restantes"
   - 5+: sem badge (suficientemente recente)

2. **Fallback visual quando vídeo falha**: Quando `<video>` dispara `onError`, mostrar placeholder com ícone de `Video` + texto "Ficheiro expirado" em vez de ficar vazio com overlay

3. **Diálogo de detalhes — data de expiração**: Adicionar linha após a data de criação: `Clock` + "Expira em dd MMM yyyy" (created_at + 7 dias)

**`src/pages/Calendar.tsx`**

4. **Reset do `currentImageIndex`**: Adicionar `useEffect` que reset para 0 quando `selectedEvent` muda

5. **Drag-and-drop de rascunhos**: Em `handleEventDrop`, verificar se o evento é draft (`event.resource.status === 'draft'`) e usar tabela `posts_drafts` com campo `updated_at` em vez de `scheduled_date`

6. **Thumbnails mais compactos**: Reduzir de `w-20 h-20 sm:w-24 sm:h-24` para `w-14 h-14 sm:w-16 sm:h-16` no `CustomEvent` da vista normal para evitar corte em monitores menores

### Resultado
- Utilizador vê claramente quando cada ficheiro expira
- Vídeos expirados mostram estado visual adequado em vez de vazio
- Navegação entre posts no diálogo é consistente
- Arrastar rascunhos funciona correctamente
- Células do calendário mais compactas e legíveis

