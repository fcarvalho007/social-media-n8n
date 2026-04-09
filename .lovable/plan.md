

## Diagnóstico: Erro falso no Instagram

### O que aconteceu

O Instagram **foi publicado com sucesso** (o post `a19866a5` tem `status: published`, `external_post_ids: {getlate: 69d79906...}`, e `published_at: 12:22:06`). Mas o frontend mostrou "Erro inesperado / Interno" porque:

1. A chamada `supabase.functions.invoke('publish-to-getlate')` devolveu um erro ao frontend (timeout ou erro transiente)
2. O edge function continuou a executar em background e acabou por publicar com sucesso
3. O edge function atualizou o post na BD como "published", mas o frontend já tinha mostrado o erro ao utilizador
4. **Não existe verificação pós-publicação**: o frontend confia cegamente na resposta HTTP e nunca re-verifica a BD

### Bug adicional: `post_id` nulo

Todos os `publication_attempts` recentes têm `post_id: nil`, o que significa que o edge function não está a receber o `post_id` correctamente, impedindo a ligação entre tentativas e posts.

### Plano de correcção

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `src/hooks/usePublishWithProgress.ts` | **Verificação pós-publicação**: Após o loop de publicação (linha ~820), se houver plataformas com status "error", re-consultar a BD (`posts` e `publication_attempts`) para verificar se o post foi realmente publicado. Se a BD diz "published" mas o frontend diz "error", corrigir o resultado para "success". |
| 2 | `src/hooks/usePublishWithProgress.ts` | **Delay antes da verificação**: Aguardar 5-10 segundos antes da re-verificação para dar tempo ao edge function de completar a atualização na BD. |
| 3 | `src/hooks/usePublishWithProgress.ts` | **Garantir post_id passado ao edge function**: Verificar que `createdPostId` não é nulo quando se chama `publish-to-getlate`. Adicionar log de diagnóstico. |
| 4 | `supabase/functions/publish-to-getlate/index.ts` | **Garantir post_id nos attempts**: O edge function já passa `post_id: post_id || null` nos attempts, mas o valor chega null. Adicionar logging adicional para diagnosticar porque `post_id` é null na request body. |

### Detalhe técnico

**Verificação pós-publicação** (ficheiro 1): Após a linha ~820, antes de calcular `finalResults`:

```
// Se há plataformas com erro, verificar na BD se realmente falharam
if (createdPostId && failedFormats.length > 0) {
  await new Promise(resolve => setTimeout(resolve, 8000)); // Aguardar edge function
  const { data: dbPost } = await supabase.from('posts')
    .select('status, external_post_ids, published_at')
    .eq('id', createdPostId).single();
  
  if (dbPost?.status === 'published' || dbPost?.external_post_ids) {
    // Corrigir resultados: a BD confirma sucesso
    for (const [format, result] of platformResults) {
      if (result.status === 'error') {
        const network = FORMAT_TO_NETWORK[format];
        if (dbPost.external_post_ids?.[network]) {
          platformResults.set(format, { ...result, status: 'success', postUrl: dbPost.external_post_ids[network] });
          updatePlatformStatus(format, 'success', undefined, dbPost.external_post_ids[network]);
        }
      }
    }
  }
}
```

Isto garante que o utilizador vê o resultado real, mesmo que a chamada HTTP tenha falhado transitoriamente.

