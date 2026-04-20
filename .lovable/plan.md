

## Auditoria 2 — Estado Actual e Refinamentos Pendentes

### Resumo
A correção do Bug #1 (limpeza de `error_log` ao confirmar sucesso) **regrediu**: 2 posts novos publicados a 19 e 20 de Abril voltam a mostrar `error_log = "Erro inesperado no processamento"`. Além disso, há novos achados críticos: **11 jobs presos em `requires_attention` com erros 403 do n8n stories** (URL obsoleto a poluir os logs do cron a cada minuto), e os problemas #2 e #4 da auditoria anterior continuam por resolver e a piorar.

---

### 🔴 BUG REGRESSIVO — A correção anterior não cobre todos os formatos

Posts publicados com sucesso mas com `error_log` sujo:

| Post | Formato | Publicado | Error_log |
|---|---|---|---|
| `1b58760a` | googlebusiness_post | 20/04 09:20 | "Erro inesperado no processamento" |
| `8f34a979` | instagram_reel | 19/04 17:52 | "Erro inesperado no processamento" |

A limpeza implementada na sessão anterior dentro do polling (linha ~1003) **só dispara quando o polling detecta sucesso após erro inicial**. Se o `published_at` é gravado pelo edge function **mas o front-end nunca entra no loop de verificação** (por o utilizador ter fechado o modal, ou porque o status mudou demasiado depressa), o `error_log` fica órfão.

**Correção:** mover a limpeza do `error_log` para um **trigger BEFORE UPDATE** na BD, garantindo invariante: `WHEN status = 'published' AND published_at IS NOT NULL THEN error_log = NULL, failed_at = NULL`. Este trigger sobrepõe-se a qualquer caminho de código (front-end, edge function, sync manual). Limpa também os 2 posts existentes via UPDATE.

---

### 🔴 NOVO BUG CRÍTICO — Cron `send-scheduled-posts` a queimar invocações

O cron corre a cada minuto e tenta processar:
- 14 stories legacy com webhook stories `'Webhook-insta-n8n'` (string inválida, não URL)
- 2 posts legacy com webhook que devolve **403 Forbidden** continuamente
- 11 jobs em `requires_attention` (já esgotaram retries) que **continuam a aparecer no log de erros**

Resultado: cada minuto gera ~30 linhas de erro nos logs, custos de invocação inúteis, e impossibilidade de detectar erros reais.

**Correção:**
1. **Em `send-scheduled-posts/index.ts`:** adicionar filtro para excluir jobs com `status='requires_attention'` ou `attempts >= max_attempts`. Adicionar TTL: ignorar jobs com `scheduled_for < NOW() - 7 days`.
2. **Limpeza de dados via UPDATE:** marcar como `cancelled` os 14 stories legacy + 2 posts legacy + 11 jobs requires_attention (todos com >3 meses).

---

### 🔴 BUG #3 (auditoria anterior) — `MEDIA_ERROR` continua agressivo

`src/lib/publishingErrors.ts` linha 338-341 não foi corrigido. Continua a capturar qualquer mensagem com `image`/`video`/`media` antes de regras mais específicas (rate-limit, auth).

**Correção:** mover bloco `MEDIA_ERROR` para **depois** de `TOKEN_EXPIRED`, `QUOTA_EXCEEDED` e `NETWORK_ERROR`. Restringir gatilhos largos (`image`, `video`, `media` sozinhos) — exigir co-ocorrência com `format`, `size`, `aspect`, `dimension`, `resolution`, `pixel`, `width`, `height`, `allowed range`.

---

### 🟡 PROBLEMA #2 (continua) — Posts presos sem cleanup

| Status | Count | Mais antigo | Acção |
|---|---|---|---|
| `approved` | 11 | 20/10/2025 | Mover para `draft` ou `cancelled` |
| `scheduled` | 2 | 06/01/2026 (data passada) | Mover para `failed` |

**Correção:** UPDATE pontual via insert tool — mover os 11 `approved` >3 meses para `cancelled`, e os 2 `scheduled` com `scheduled_date < NOW()` para `failed` com mensagem "Agendamento expirado".

---

### 🟡 PROBLEMA #4 (continua a crescer) — 2.479 MB órfãos

`media_library` tem **2.102 ficheiros >7 dias** ocupando 2.479 MB (cresceu desde a última auditoria). A função `cleanup-storage` existe mas **não está agendada via pg_cron**.

**Correção:** agendar `cleanup-storage` para correr diariamente às 03:00 Lisboa via pg_cron + pg_net, com `dryRun: false`. Validar antes com chamada manual em modo dryRun.

---

### Ordem de execução recomendada

Tudo num único loop (mudanças coesas, baixo risco):

1. **Trigger BD** que garante invariante `published → error_log NULL` + cleanup dos 2 posts afectados (resolve regressão #1).
2. **Filtros em `send-scheduled-posts`** + UPDATE para cancelar 27 jobs/posts/stories antigos (resolve novo bug + problema #2).
3. **Reordenação de `classifyErrorFromString`** (resolve bug #3).
4. **Agendamento pg_cron de `cleanup-storage`** (resolve problema #4).

### Ficheiros a alterar
- `supabase/migrations/` — novo trigger + `cleanup-storage` cron
- `supabase/functions/send-scheduled-posts/index.ts` — filtros de exclusão
- `src/lib/publishingErrors.ts` — reordenação e restrição de gatilhos
- UPDATE de dados via insert tool (posts presos, jobs antigos, error_log dos 2 posts)

### Resultado esperado
- 0 logs de erro 403 do cron por minuto (poupa centenas de invocações/dia).
- Histórico de publicações sem badges falsos vermelhos.
- Erros classificados correctamente como Rate-limit/Auth quando aplicável.
- Storage estabilizado a longo prazo (cresce <100 MB/semana após cleanup inicial).

