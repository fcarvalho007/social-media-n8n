

## Diagnóstico: Porque o erro falso persiste

### Problema raiz confirmado

A publicação do Instagram (`a19866a5`) foi bem-sucedida no Getlate, mas o dashboard mostrou erro por **3 razões independentes**:

1. **Getlate devolveu mensagem de retry como erro**: A API respondeu com `"Publishing encountered temporary errors. The post will be retried automatically."` — o edge function interpretou isto como falha, mas o Getlate processou internamente e publicou ~3 minutos depois.

2. **Verificação pós-publicação com delay insuficiente**: O delay de 8 segundos é curto demais. O Getlate levou ~4 minutos a publicar realmente (12:18 → 12:22). Quando o frontend verificou a BD aos ~8s, o post ainda estava em `publishing`.

3. **`post_id` sempre NULL nos attempts**: Todos os `publication_attempts` têm `post_id: NULL`, apesar do código passar `createdPostId`. Isto impede a verificação via attempts e quebra a rastreabilidade.

### Plano de correção (3 ficheiros)

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `supabase/functions/publish-to-getlate/index.ts` | **Tratar "retry automático" como sucesso parcial**: Quando a resposta do Getlate contém "will be retried" ou "temporary errors", NÃO tratar como falha. Devolver `{ success: true, pending: true }` ao frontend. O post foi aceite pelo Getlate e será publicado. |
| 2 | `src/hooks/usePublishWithProgress.ts` | **Polling progressivo em vez de delay fixo**: Substituir o `setTimeout(8000)` por um loop de polling que verifica a BD a cada 5s durante até 90s. Parar assim que `status === 'published'` ou `external_post_ids` não estiver vazio. Mostrar estado "A verificar publicação..." durante o polling. |
| 3 | `src/hooks/usePublishWithProgress.ts` | **Tratar `pending: true` do edge function**: Quando o edge function devolve `pending: true`, mostrar status "Em processamento" (amarelo) em vez de "Erro" (vermelho). Informar o utilizador que o Getlate está a processar. |

### Detalhe técnico

**1. Edge function — mensagens de retry**

No `publishToGetlate`, quando a resposta contém "will be retried" ou "temporary errors" com status 200, tratar como aceite:
```
if (responseText.includes('will be retried') || responseText.includes('temporary errors')) {
  return { success: true, data, pending: true };
}
```

No handler principal, quando `result.pending === true`, registar attempt como `pending` (não `failed`) e devolver resposta com `pending: true` ao frontend.

**2. Frontend — polling progressivo**

Substituir o bloco de verificação (linhas 829-873) por:
```
const MAX_VERIFY_TIME = 90_000; // 90 seconds
const POLL_INTERVAL = 5_000;    // 5 seconds
const verifyStart = Date.now();

while (Date.now() - verifyStart < MAX_VERIFY_TIME) {
  const { data: dbPost } = await supabase.from('posts')
    .select('status, external_post_ids')
    .eq('id', createdPostId).single();
  
  if (dbPost?.status === 'published' || hasExternalIds(dbPost)) {
    // Corrigir resultados para success
    break;
  }
  
  updatePhase2('publishing', 95, 
    `A verificar publicação... (${Math.round((Date.now() - verifyStart) / 1000)}s)`);
  await new Promise(r => setTimeout(r, POLL_INTERVAL));
}
```

Isto cobre o cenário de 4 minutos de processamento do Getlate.

**3. Fix `post_id` NULL**

O `post_id` é passado correctamente no body (`post_id: createdPostId`), e o edge function lê-o (`body.post_id`). O deploy anterior pode não ter propagado. Re-deploy do edge function para garantir. Adicionar log mais explícito: `console.log('BODY RECEIVED:', JSON.stringify(body))` para confirmar no próximo publish.

