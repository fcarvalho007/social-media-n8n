

## Auditoria dos Últimos Desenvolvimentos

### Estado actual — tudo implementado correctamente

| # | Refinamento | Estado | Verificação |
|---|-------------|--------|-------------|
| 1 | Badge de expiração na grid MediaLibrary | ✅ OK | `getDaysRemaining` + badges vermelho/âmbar nas linhas 809-829 |
| 2 | Fallback visual vídeo expirado | ⚠️ Bug CSS | `data-expired-fallback` usa `flex-col` sem `flex` — funciona quando JS muda `display` para `flex`, mas a classe `flex-col` sozinha não garante layout correcto em todos os browsers |
| 3 | Data expiração no diálogo detalhes | ✅ OK | Linhas 988-997, mostra data e dias restantes |
| 4 | Reset `currentImageIndex` no Calendar | ✅ OK | `useEffect` na linha 318-320 |
| 5 | Drag-and-drop de rascunhos | ✅ OK | `handleEventDrop` verifica `isDraft` e usa `posts_drafts` (linhas 737-748) |
| 6 | Thumbnails compactos no Calendar | ✅ OK | `w-14 h-14 sm:w-16 sm:h-16` (linha 991) |

### Helpers e cascata de média
- ✅ `isVideoUrl`, `firstImageFromArray`, `getPostThumbnail`, `hasVideoContent` estão correctos
- ✅ Diálogo de detalhes do Calendar unifica 3 fontes (`template_a_images`, `media_urls_backup`, `media_items`) com deduplicação
- ✅ Grid lateral e CustomEvent usam `getPostThumbnail` consistentemente
- ✅ `cover_image_url` é queried e usado como prioridade 1 no thumbnail

### Problema menor encontrado

**MediaLibrary linha 779**: O `div[data-expired-fallback]` usa `className="... flex-col items-center justify-center ..."` mas falta a classe `flex`. Quando o JavaScript altera `style.display = 'flex'`, o inline style força o display flex, mas sem a classe `flex` no Tailwind os utilitários `flex-col` e `items-center` podem não ser aplicados consistentemente.

**Correcção**: Mudar de `flex-col` para `hidden flex-col` e no `onError` usar `classList.remove('hidden')` + `classList.add('flex')` em vez de manipular `style.display`. OU simplesmente adicionar a classe base correcta.

### Plano (1 ficheiro, 1 alteração mínima)

**`src/pages/MediaLibrary.tsx` — linha 779**

Corrigir a classe CSS do fallback de expiração:
```
// DE:
<div data-expired-fallback className="absolute inset-0 flex-col items-center justify-center bg-muted" style={{ display: 'none' }}>

// PARA:
<div data-expired-fallback className="absolute inset-0 flex flex-col items-center justify-center bg-muted hidden">
```

E no `onError` (linha 775):
```
// DE:
if (expired) expired.style.display = 'flex';

// PARA:
if (expired) expired.classList.remove('hidden');
```

Isto é a única correcção necessária — tudo o resto está sólido e funcional.

