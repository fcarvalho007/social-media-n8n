

## Auditoria: Chamadas Duplicadas à API Getlate

### Evidência na base de dados

O post `06757d6e` (10 de Abril) tem **2 tentativas por plataforma** — 8 registos para 4 redes:

| Plataforma | Intervalo entre duplicados |
|---|---|
| facebook_reel | 2min 18s |
| youtube_shorts | 4s |
| tiktok_video | 31s |
| instagram_reel | 55s |

Posts posteriores (12-14 Abril) estão limpos — 1 tentativa por plataforma. Portanto o problema ocorreu pelo menos uma vez.

### Causas identificadas (3 problemas)

**1. Idempotência "tarde demais" no edge function**
A chave de idempotência só é guardada na BD **DEPOIS** de o Getlate responder (linha 786). Se duas chamadas chegarem quase simultaneamente (antes da primeira acabar), ambas passam o check e ambas publicam. A janela de race condition é o tempo de resposta do Getlate (5-30s).

**2. Frontend escreve em `publication_attempts` — violando single source of truth**
Apesar do memory documentar que "o edge function é a única fonte", o frontend ainda faz updates em `publication_attempts` (linhas 922-929 e 961-974 de `usePublishWithProgress.ts`). Isto não cria duplicados directamente, mas pode causar conflitos de estado com o edge function (ambos a escrever no mesmo registo simultaneamente).

**3. Sem constraint de unicidade na BD**
Não existe nenhum constraint que impeça dois registos `publication_attempts` com o mesmo `post_id + format` num intervalo curto. A base de dados aceita duplicados silenciosamente.

### Plano de correcção (3 alterações)

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `supabase/functions/publish-to-getlate/index.ts` | **Idempotência pré-publicação**: Mover o `INSERT` da chave de idempotência para ANTES de chamar o Getlate. Se o insert falhar (key já existe), retornar o resultado em cache. Isto bloqueia chamadas concorrentes. |
| 2 | `src/hooks/usePublishWithProgress.ts` | **Remover writes redundantes em `publication_attempts`**: Eliminar os blocos de update nas linhas 922-929 (success) e 961-974 (error). O edge function já gere estes estados — o frontend não deve interferir. |
| 3 | Migration SQL | **Dedup na BD**: Adicionar verificação antes de inserir novo attempt — se já existe um com mesmo `post_id + format + platform` nos últimos 2 minutos, não inserir novo (guard no edge function). |

### Detalhe técnico

**Ponto 1 — Reservar chave ANTES de publicar:**

```typescript
// ANTES (race condition):
// 1. Check key → not found
// 2. Call Getlate API (5-30s)
// 3. Store key with result

// DEPOIS (bloqueio imediato):
// 1. INSERT key with result=null → se falha, key já existe → retornar cache
// 2. Call Getlate API
// 3. UPDATE key with result

// No edge function, antes de chamar publishToGetlate():
if (idempotency_key) {
  const { error: reserveError } = await supabase
    .from('idempotency_keys')
    .insert({ key: idempotency_key, result: null, expires_at: ... });
  
  if (reserveError?.code === '23505') { // unique violation
    // Outro request já reservou esta key — buscar resultado
    const { data } = await supabase.from('idempotency_keys')
      .select('result').eq('key', idempotency_key).single();
    if (data?.result) return cached response;
    // Se result é null, o primeiro request ainda está a correr — rejeitar
    return Response("Publication in progress", 409);
  }
}
```

**Ponto 2 — Remover do frontend:**

```typescript
// REMOVER linhas 922-929:
// await supabase.from('publication_attempts').update(...)

// REMOVER linhas 961-974:
// await supabase.from('publication_attempts').update(...)
```

**Ponto 3 — Guard no edge function antes de inserir attempt:**

```typescript
// Antes de inserir novo attempt, verificar se já existe um recente
const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const { data: existing } = await supabase
  .from('publication_attempts')
  .select('id, status')
  .eq('post_id', post_id)
  .eq('format', format)
  .gte('attempted_at', twoMinAgo)
  .limit(1);

if (existing?.length > 0) {
  console.log(`[publish-to-getlate] ⚠️ DEDUP: attempt already exists for ${post_id}/${format}`);
  return existing[0]; // Reutilizar o attempt existente
}
```

### Resultado esperado

- Chamadas concorrentes ao mesmo endpoint → bloqueadas pela chave de idempotência pré-reservada
- Edge function é a **única** entidade a escrever em `publication_attempts`
- Guard temporal impede duplicados mesmo sem idempotency key
- Cada publicação = exactamente 1 chamada à API Getlate por plataforma

