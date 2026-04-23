

## Correção — Thumbnails de Vídeo no Modal de Publicação

### Problema

No `PublishProgressModal`, secção "Download do Conteúdo" / grelha de Ficheiros (linhas 683-751 de `src/components/publishing/PublishProgressModal.tsx`):

1. **Vídeos não geram thumbnail** — apenas mostram um ícone genérico `<Video />` num fundo cinzento, perdendo a identificação visual de cada clip (no screenshot vê-se 2 placeholders cinza entre 8 ficheiros).
2. **Bug secundário em imagens**: `URL.createObjectURL()` é chamado dentro do `.map()` (executa em cada render) e revogado no `onLoad`, o que pode partir o `<img>` em re-renders (ex.: quando `progress` ou `currentMessage` mudam durante a publicação).

### Solução

**1. Pré-computar previews uma vez por ficheiro** com `useEffect` + `useState`:
- Para imagens: criar `URL.createObjectURL(file)` e revogar no cleanup do efeito (não no `onLoad`).
- Para vídeos: usar `extractVideoFrameUrl(file)` (já existe em `src/lib/media/videoFrameExtractor.ts`) para extrair o frame ~0.5s, e revogar o blob URL resultante no cleanup.
- Guardar resultado em `previews: { url: string | null; isVideo: boolean }[]` (índice = índice do ficheiro).

**2. Estado de loading por thumbnail**:
- Enquanto a extração não termina (vídeos demoram ~100-300ms), mostrar um skeleton com `<Loader2 className="animate-spin" />` em vez do ícone estático.
- Se a extração falhar (vídeo corrompido / codec não-suportado), fallback para o ícone `<Video />` actual.

**3. UI dos vídeos com thumbnail**:
- Quando `previews[idx].url` existir, renderizar `<img src={url} className="object-cover" />` igual às imagens.
- Manter o badge `<Video />` no canto inferior direito para distinguir de imagens fixas.
- Adicionar um pequeno ícone de play (▶) sobreposto no centro com fundo semitransparente para reforçar que é vídeo.

### Detalhes técnicos

Ficheiro único alterado: `src/components/publishing/PublishProgressModal.tsx`

```tsx
// novo: extractVideoFrameUrl + useEffect
const [previews, setPreviews] = useState<({ url: string; isVideo: boolean } | null)[]>([]);

useEffect(() => {
  let cancelled = false;
  const created: string[] = [];
  
  (async () => {
    const next = await Promise.all(
      mediaFiles.map(async (file) => {
        const isVideo = file.type.startsWith('video/');
        try {
          const url = isVideo
            ? await extractVideoFrameUrl(file)
            : URL.createObjectURL(file);
          created.push(url);
          return { url, isVideo };
        } catch {
          return null; // fallback para ícone
        }
      })
    );
    if (!cancelled) setPreviews(next);
  })();
  
  return () => {
    cancelled = true;
    created.forEach(URL.revokeObjectURL);
  };
}, [mediaFiles]);
```

No `.map()` da grelha (linha 689), substituir o ramo `isVideo` por:
- Se `previews[idx]?.url` existe → `<img src={previews[idx].url} />` + badge `<Video />` + ícone play central.
- Se `previews[idx]` é `null` (falha) → ícone `<Video />` actual.
- Se `previews[idx]` é `undefined` (ainda a carregar) → `<Loader2 className="animate-spin" />`.

Para imagens, usar igualmente `previews[idx].url` (deixa de criar+revogar no render).

Manter intacto:
- Toda a lógica de `downloadSingleFile` no click.
- Indicador `+N` na 9ª célula quando há mais de 9 ficheiros.
- Markup do modal restante.

### Checkpoint

☐ Vídeos mostram primeiro frame (~0.5s) como thumbnail no modal de publicação concluída
☐ Estado de loading visível durante extração (~100-300ms por vídeo)
☐ Fallback para ícone `<Video />` se extração falhar
☐ Badge `<Video />` mantido no canto para distinguir tipo
☐ Imagens já não fazem revoke no `onLoad` (sem flicker em re-renders)
☐ Object URLs revogados correctamente no cleanup do efeito (sem memory leak)
☐ Click na thumbnail continua a fazer download do ficheiro original
☐ `npx tsc --noEmit` 0 erros
☐ Testes Vitest 14/14 verdes

### Fora do escopo

- Cache de frames entre publicações (extracção é rápida e única por sessão)
- Player de vídeo embebido no modal
- Aplicar o mesmo padrão a outros modais (`PublishCompletedModal`, `FinalReviewModal`) — prompt dedicado se necessário

