# Correção de 4 bugs em /manual-create

## Diagnóstico (com causa raiz confirmada)

### a) Sistema salta para o Passo 3 com 1 só foto num carrossel

**Causa raiz:** Em `src/types/social.ts`, `instagram_carousel` (e `linkedin_document`) declaram `minMedia: 1`. A função `getMediaRequirements()` propaga esse valor para `mediaRequirements.minMedia`, e em `ManualCreate.tsx:526`:

```ts
const showStep3 = mediaFiles.length >= (mediaRequirements.minMedia || 1);
```

Resultado: ao adicionar **1** foto, `showStep3` fica `true`, o `useEffect` de auto-advance (linha 637) dispara `transitionTo('caption')` e o foco salta. Para um carrossel isto é semanticamente errado — um carrossel exige ≥2 ficheiros.

### b) Preview pisca e não permite navegar entre slides

**Causa raiz:** Em `InstagramCarouselPreview.tsx:29`, `items` é construído **inline em cada render**:

```ts
const items: MediaItem[] = mediaItems || (mediaUrls?.map(url => ({ url, isVideo: false })) || []);
```

O `useEffect` da linha 69-76 depende de `items.length`, mas re-cria `loadingStates = { 0: true, 1: true, ... }` em **qualquer** mudança de prop do pai (caption, scheduled date, etc.). Cada reset força a `<Skeleton>` a sobrepor a imagem → flicker contínuo. Os botões de navegação ficam "comidos" pelo skeleton sobreposto.

### c) Carrossel tem demasiado espaço em branco

O `DeviceFrame type="phone"` constrange o preview a uma largura de telemóvel mesmo numa coluna de ~480px. O preview do carrossel mantém-se pequeno enquanto a coluna da direita (~30% de 1462px ≈ 440px) tem white-space vertical à volta.

### d) Pré-visualização não desliza com o scroll

**Causa raiz:** `PreviewPanel.tsx:258`:

```tsx
<div className="hidden overflow-auto lg:sticky lg:top-24 lg:block lg:h-[calc(...)]">
```

O `overflow-auto` no **mesmo elemento** que tem `sticky` cria um *scroll container* próprio. O sticky deixa de funcionar relativo à página — fica preso dentro deste container que tem altura igual à do viewport, dando a sensação de estar fixo mas sem acompanhar o scroll do formulário à esquerda.

---

## Plano de correção

### 1. `src/lib/formatValidation.ts` — novo helper `requiresMultipleMedia`

Adicionar helper que devolve o mínimo **efectivo** para o fluxo de UX:

```ts
const MULTI_MEDIA_FORMATS = new Set<PostFormat>([
  'instagram_carousel',
  'linkedin_document',
  'facebook_carousel',
]);

export function getEffectiveMinMedia(formats: PostFormat[]): number {
  const base = getMediaRequirements(formats).minMedia || 1;
  const needsMulti = formats.some((f) => MULTI_MEDIA_FORMATS.has(f));
  return needsMulti ? Math.max(base, 2) : base;
}
```

### 2. `src/pages/ManualCreate.tsx` — usar o mínimo efectivo

- Substituir `mediaRequirements.minMedia || 1` pelas referências ao novo helper nos 3 sítios:
  - `_minMediaForStepper` (l. 256-259)
  - `showStep3` (l. 526)
  - `minMediaRequired` (l. 535)
  - `visitedSteps` (l. 1399)

### 3. `src/components/manual-post/steps/Step2MediaCard.tsx` — microcopy "X / Y carregados"

Adicionar abaixo do título quando `minMediaRequired > 1`:
> *"Carrossel exige no mínimo 2 ficheiros — {n}/{min} carregados."*

Visualmente discreto (`text-xs text-muted-foreground`), com cor `text-warning` se `n < min`.

### 4. `src/components/manual-post/InstagramCarouselPreview.tsx` — fixar flicker

Substituir a construção inline de `items` por `useMemo` baseado num **fingerprint estável** das URLs:

```ts
const itemsFingerprint = useMemo(
  () => (mediaItems ?? mediaUrls?.map(u => ({ url: u, isVideo: false })) ?? [])
    .map(i => `${i.url}|${i.isVideo}`).join(','),
  [mediaItems, mediaUrls]
);
const items = useMemo<MediaItem[]>(
  () => mediaItems ?? mediaUrls?.map(u => ({ url: u, isVideo: false })) ?? [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [itemsFingerprint]
);
```

E mudar a dependência do useEffect que reseta `loadingStates`:
```ts
useEffect(() => {
  // ...
}, [itemsFingerprint]); // só corre quando o conjunto real muda
```

Isto garante que adicionar uma foto nova **só** reseta o loading da nova posição (na verdade reseta todas mas apenas quando o conjunto muda) — e edits de caption deixam de disparar o efeito.

### 5. `src/components/manual-post/steps/PreviewPanel.tsx` — corrigir sticky

Separar o **wrapper sticky** do **scroll interno**:

```tsx
<aside className="hidden lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-8rem-var(--sticky-bar-height,0px))]">
  <Card className="card-secondary flex h-full flex-col ...">
    <CardHeader ... />
    <CardContent className="flex-1 overflow-auto p-5 pt-0">{body}</CardContent>
    <StickyMetadataBar />
  </Card>
</aside>
```

Removo o `overflow-auto` do wrapper externo. O scroll do conteúdo passa a viver **dentro** do `<CardContent>` (já tem `overflow-auto`), e o wrapper fica livre para fazer `position: sticky` real.

Adicionalmente: aumentar a largura mínima útil do preview ajustando o `DeviceFrame` para usar `max-w-full` em vez de constranger ao tamanho de telemóvel quando a coluna lateral tem espaço (≥420px). Isto resolve o (c) sem partir mobile.

### 6. `src/components/manual-post/DeviceFrame.tsx` — escalar com a coluna

Verificar e, se necessário, permitir que o `DeviceFrame type="phone"` use 100% da largura da coluna (até ~420px) em vez de um valor fixo pequeno. Manter aspect-ratio e contornos de telemóvel.

---

## Validação

- `npx tsc --noEmit` verde.
- `vitest` verde (37 testes existentes + acrescentar teste para `getEffectiveMinMedia`).
- Manualmente em 1462×905:
  1. Selecionar **Carrossel** → Secção 2 fica `active`. Adicionar 1 foto → fica em `inactive→active` com microcopy "1/2 carregados". Adicionar 2ª → transição para Caption.
  2. Adicionar 3 fotos → preview navega entre slides com setas (sem flicker entre cliques).
  3. Coluna direita acompanha scroll suavemente até parar a 96px do topo, sem cortes.
  4. Carrossel ocupa praticamente toda a coluna direita.
- Confirmar que mobile (<1024px) continua a usar Drawer.

## Entregáveis

- 5 ficheiros editados + 1 novo helper.
- Relatório curto no chat com before/after de cada bug e o porquê da causa raiz.
