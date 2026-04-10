

## Refinamento do Histórico de Publicações — Centro de Comando de Logs

### Problemas identificados

1. **Attempts sem contexto**: Quando um post tem `publication_attempts`, o post é excluído (`seenPostIds`). Os attempts aparecem sem legenda, tema, imagem ou hashtags — dados que só existem no post. O utilizador vê entradas sem contexto.

2. **Dados duplicados**: Um post publicado no Instagram e LinkedIn gera 2 attempts + o post original. Se o post não é filtrado (ex: sem attempts), aparece 3 vezes.

3. **Falta de visão consolidada**: Cada attempt é uma linha separada. Para um carrossel Instagram + LinkedIn, o utilizador vê 2 linhas sem perceber que são do mesmo post.

4. **Sem indicador de hora**: Os items mostram "há X tempo" na descrição mas não a hora exacta no card (só ao expandir).

5. **ScrollArea altura fixa**: `h-[calc(100vh-500px)]` pode resultar em área muito pequena em ecrãs menores.

### Plano de implementação

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `src/pages/PublicationHistory.tsx` | **Enriquecer attempts com dados do post**: Ao combinar dados, fazer lookup do post correspondente para cada attempt (via `post_id`). Adicionar caption, tema, image_url, media_urls, hashtags e origin_mode ao item do attempt. |
| 2 | `src/pages/PublicationHistory.tsx` | **Agrupar por post_id**: Em vez de listar cada attempt separadamente, agrupar attempts do mesmo post numa única entrada. Mostrar um card por post com badges por plataforma (Instagram ✓, LinkedIn ✗). Expandir para ver detalhes de cada plataforma. |
| 3 | `src/pages/PublicationHistory.tsx` | **Mostrar hora no card**: Adicionar a hora (HH:mm) directamente na descrição do card, sem precisar expandir. |
| 4 | `src/pages/PublicationHistory.tsx` | **Melhorar empty state**: Mostrar sugestão de acção ("Criar nova publicação") no empty state. |
| 5 | `src/pages/PublicationHistory.tsx` | **Fix ScrollArea**: Usar `min-h-[300px]` em vez de cálculo fixo. |
| 6 | `src/pages/PublicationHistory.tsx` | **Stats precisas**: Recalcular stats baseadas em posts únicos (não em attempts individuais) para evitar inflação de números. |

### Detalhe técnico

**Enriquecimento de attempts (ponto 1 e 2)**:
```typescript
// Criar mapa de posts por id
const postsMap = new Map(posts?.map(p => [p.id, p]) || []);

// Agrupar attempts por post_id
const attemptsByPost = new Map<string, PublicationAttempt[]>();
for (const attempt of attempts || []) {
  const key = attempt.post_id || attempt.id;
  if (!attemptsByPost.has(key)) attemptsByPost.set(key, []);
  attemptsByPost.get(key)!.push(attempt);
}

// Para cada grupo, criar um item consolidado
for (const [postId, postAttempts] of attemptsByPost) {
  const post = postsMap.get(postId);
  const hasSuccess = postAttempts.some(a => a.status === 'success');
  const hasFailed = postAttempts.some(a => a.status === 'failed');
  
  items.push({
    // ... dados do post (caption, tema, image_url)
    platforms: postAttempts.map(a => ({
      platform: a.platform,
      format: a.format,
      status: a.status,
      error: a.error_message,
    })),
    overallStatus: hasSuccess && hasFailed ? 'partial' : hasSuccess ? 'published' : 'failed',
  });
}
```

**Card consolidado com badges de plataforma**:
Em vez de um card por plataforma, um card por post com:
- Linha de badges: `[Instagram ✓] [LinkedIn ✗]`
- Ao expandir: detalhes de cada plataforma separados

**Hora visível (ponto 3)**:
```typescript
<CardDescription>
  {format(new Date(item.timestamp), "HH:mm", { locale: pt })} · {item.tema || item.caption?.substring(0, 50)}
</CardDescription>
```

### Resultado esperado

O Histórico torna-se um centro de comando onde cada publicação (post) é uma entrada única que mostra:
- Thumbnail + plataformas + estado geral + hora
- Ao expandir: detalhes por plataforma, erros específicos, acções

