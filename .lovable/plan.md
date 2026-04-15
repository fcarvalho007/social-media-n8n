

## Refinamentos à Protecção Contra Duplicados

### Problemas identificados

1. **Diálogo demasiado genérico** — Não mostra ícones das redes, nem quantas vezes foi publicado. A mensagem é text-only sem hierarquia visual.

2. **Caption vazia passa o check** — Se a caption for vazia (`""`), a query `.eq('caption', '')` vai encontrar todos os posts sem legenda, gerando falsos positivos.

3. **Badge "Possível duplicado" sem contexto** — O badge no histórico não indica quantas vezes nem quando foi o original.

4. **Duplicate check O(n²)** — O loop duplo no histórico é ineficiente para muitos posts (embora aceitável para volumes normais).

5. **Diálogo não mostra o status do post anterior** — Se o anterior falhou, o aviso deveria ser diferente (não é realmente um duplicado).

### Plano de refinamento

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `src/hooks/usePublishWithProgress.ts` | **Ignorar captions vazias**: Adicionar `if (!caption?.trim()) skip duplicate check` — não faz sentido comparar legendas vazias. |
| 2 | `src/components/publishing/DuplicateWarningDialog.tsx` | **UI melhorada**: Adicionar ícones das redes sociais (usando NETWORK_INFO), mostrar a caption truncada do post anterior, separar visualmente a informação em blocos com fundo colorido (amber-50), e melhorar o copy dos botões ("Não publicar" em vez de "Cancelar"). |
| 3 | `src/components/publishing/DuplicateWarningDialog.tsx` | **Diferenciar status**: Se o post anterior tem status "publishing" (ainda em curso), mostrar mensagem diferente: "Este conteúdo está a ser publicado neste momento". Se for "published", manter a mensagem actual. |
| 4 | `src/pages/PublicationHistory.tsx` | **Badge com tooltip**: Adicionar tooltip ao badge "Possível duplicado" que mostra "Mesma legenda publicada X vezes num intervalo de 30 minutos". |
| 5 | `src/pages/PublicationHistory.tsx` | **Optimizar detecção**: Usar um Map agrupado por caption para detecção O(n log n) em vez de O(n²), e ignorar captions vazias. |

### Detalhe — Diálogo melhorado (ponto 2)

```
┌─────────────────────────────────────────┐
│  ⚠️  Conteúdo possivelmente duplicado   │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ 📋 "A legenda do post trunca..."   ││
│  │ 🕐 Publicado há 12 minutos         ││
│  │ 📱 Instagram, Facebook, YouTube    ││
│  └─────────────────────────────────────┘│
│                                         │
│  Publicar novamente irá criar uma       │
│  publicação duplicada.                  │
│                                         │
│  [Não publicar]  [Publicar mesmo assim] │
└─────────────────────────────────────────┘
```

### Detalhe — Caption vazia (ponto 1)

```typescript
// Antes da query de duplicados
if (!caption?.trim()) {
  // Não verificar duplicados para captions vazias
}
```

### Detalhe — Map para detecção no histórico (ponto 5)

```typescript
const captionGroups = new Map<string, number[]>();
items.forEach((item, idx) => {
  if (!item.caption?.trim()) return;
  const key = item.caption;
  if (!captionGroups.has(key)) captionGroups.set(key, []);
  captionGroups.get(key)!.push(idx);
});

captionGroups.forEach((indices) => {
  if (indices.length < 2) return;
  // Check time proximity within group only
  for (let i = 0; i < indices.length; i++) {
    for (let j = i + 1; j < indices.length; j++) {
      const diff = Math.abs(/*...*/);
      if (diff <= THIRTY_MIN) {
        items[indices[i]].isDuplicate = true;
        items[indices[j]].isDuplicate = true;
      }
    }
  }
});
```

Mudanças cirúrgicas em 2 ficheiros, focadas em clareza visual e precisão da detecção.

