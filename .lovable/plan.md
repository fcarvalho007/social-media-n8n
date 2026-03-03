

## Plano: Corrigir Legendas Separadas — Persistência e Truncamento

### Problemas Identificados

**Problema 1 — Truncamento destrutivo no modo unificado**: Quando o utilizador escreve uma legenda de 630 caracteres com TikTok seleccionado, a textarea unificada (linha 241-244 de `NetworkCaptionEditor.tsx`) aplica `Math.min(...)` de todos os limites → **TikTok tem 300** → o texto é cortado para 300 caracteres silenciosamente. Isto destrói o conteúdo para todas as outras redes.

**Problema 2 — Inicialização incompleta ao activar "Separadas"**: A condição `Object.keys(networkCaptions).length === 0` (ManualCreate.tsx, linha 2092) falha se o utilizador já togglou antes — redes novas adicionadas depois ficam sem legenda inicializada.

**Problema 3 — Legenda da rede não persiste ao trocar de tab**: O `TabsContent` do Radix desmonta o conteúdo inactivo por defeito. Quando o utilizador troca de aba, o textarea anterior é destruído. Ao voltar, o valor é re-lido de `networkCaptions[network]` (que está correcto se o state não se perder). O problema real é que o auto-resize não se re-aplica ao voltar.

---

### Alterações

#### 1. Remover truncamento na textarea unificada

**Ficheiro: `src/components/manual-post/NetworkCaptionEditor.tsx`** (linhas 240-244)

Não truncar o texto pelo limite mínimo. Em vez disso, permitir que o utilizador escreva livremente — os badges já mostram quais redes estão acima do limite. Cada rede receberá truncamento individual apenas no momento de publicar.

```tsx
// ANTES:
const maxLen = selectedNetworks.length > 0 
  ? Math.min(...selectedNetworks.map(n => getMaxLength(n)))
  : 2200;
onCaptionChange(e.target.value.slice(0, maxLen));

// DEPOIS:
onCaptionChange(e.target.value);
```

#### 2. Corrigir inicialização ao activar "Separadas"

**Ficheiro: `src/pages/ManualCreate.tsx`** (linhas 2090-2098)

Sempre inicializar todas as redes seleccionadas, mesmo que `networkCaptions` já tenha algumas chaves:

```tsx
if (value) {
  const initial: Record<string, string> = {};
  selectedNetworks.forEach(network => {
    initial[network] = networkCaptions[network] || caption;
  });
  setNetworkCaptions(initial);
}
```

#### 3. Forçar persistência dos tabs com `forceMount`

**Ficheiro: `src/components/manual-post/NetworkCaptionEditor.tsx`** (linha 216)

Adicionar `forceMount` ao `TabsContent` para manter todos os textareas montados (apenas ocultos). Isto evita perda de estado/cursor e melhora a experiência:

```tsx
<TabsContent key={network} value={network} className="mt-3" forceMount
  style={{ display: activeNetwork === network ? 'block' : 'none' }}
>
```

#### 4. Truncar por rede apenas no momento de publicar

**Ficheiro: `src/hooks/usePublishWithProgress.ts`** (linha 639)

Adicionar truncamento seguro ao enviar a caption para a API:

```tsx
const maxLen = NETWORK_CONSTRAINTS[network]?.max_caption_length || 2200;
const networkCaption = (params.networkCaptions?.[network] || caption).slice(0, maxLen);
```

---

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/manual-post/NetworkCaptionEditor.tsx` | Remover truncamento unificado; adicionar `forceMount` aos tabs |
| `src/pages/ManualCreate.tsx` | Corrigir inicialização de networkCaptions |
| `src/hooks/usePublishWithProgress.ts` | Truncar caption por rede no momento de publicar |

