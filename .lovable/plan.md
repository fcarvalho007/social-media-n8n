

## Protecção Robusta Contra Publicações Duplicadas

### Problema

O sistema já tem protecção contra cliques duplos simultâneos (lock via `useRef` + idempotency keys com TTL de 5 minutos), mas **não impede** que o utilizador publique o mesmo conteúdo novamente minutos depois. Cada clique em "Publicar" cria um novo `post_id` e envia tudo outra vez, resultando em publicações duplicadas em todas as redes.

### Solução: 3 camadas de protecção

| # | Camada | Ficheiro | O que faz |
|---|--------|----------|-----------|
| 1 | **Verificação pré-publicação** | `src/hooks/usePublishWithProgress.ts` | Antes de criar o post, consultar a BD: `SELECT id, created_at, selected_networks FROM posts WHERE user_id = ? AND caption = ? AND status IN ('published', 'publishing') AND created_at > now() - interval '30 minutes'`. Se encontrar, mostrar diálogo de confirmação. |
| 2 | **Diálogo de confirmação** | `src/components/publishing/DuplicateWarningDialog.tsx` (novo) | Modal claro: "Este conteúdo foi publicado há X minutos nas redes Y. Deseja publicar novamente?" com botões "Cancelar" e "Publicar mesmo assim". |
| 3 | **Marcador visual no histórico** | `src/pages/PublicationHistory.tsx` | Badge "Possível duplicado" em posts com a mesma caption publicados num intervalo de 30 minutos. |

### Detalhe técnico

**Camada 1 — Query de detecção** (no início de `publish()`):
```typescript
const { data: recentDuplicates } = await supabase
  .from('posts')
  .select('id, created_at, selected_networks, status')
  .eq('user_id', user.id)
  .eq('caption', caption)
  .in('status', ['published', 'publishing'])
  .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
  .limit(1);

if (recentDuplicates?.length > 0) {
  // Retornar info do duplicado para o componente mostrar o diálogo
  return { duplicate: recentDuplicates[0] };
}
```

**Camada 2 — Diálogo** (componente simples com AlertDialog):
- Mostra há quanto tempo foi publicado
- Mostra em que redes
- Botão "Publicar mesmo assim" que chama `publish()` com flag `skipDuplicateCheck: true`

**Camada 3 — Badge no histórico**:
- Ao agrupar posts, verificar se há outro post com a mesma `caption` num intervalo de 30 min
- Mostrar badge amarelo "Possível duplicado" nesses cards

### Resultado

- Clicar "Publicar" com conteúdo recente → aviso claro antes de duplicar
- Histórico identifica visualmente publicações repetidas
- O utilizador mantém controlo total (pode forçar a republicação se quiser)

