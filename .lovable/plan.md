

## Auditoria 4 — Estado actual e melhorias finas

### Resumo
A app está **estável**: cron `cleanup-storage-daily` activo, 0 erros nos logs do `send-scheduled-posts`, 0 jobs presos, trigger de limpeza de `error_log` a funcionar. Restam **3 inconsistências** com impacto visível no histórico e **1 limpeza de dados** pendente.

---

### 🔴 BUG #1 — `publication_attempts` marcadas `failed` em posts que afinal publicaram

Os 7 últimos "erros" 409 IG e "All platforms failed" GBP têm todos `posts.status='published'` e `published_at` 2-3 minutos depois da tentativa. Significa que:

- A **primeira** tentativa cai em 409 → atempt fica `failed`.
- O **retry com `\u200B`** (linha 727) tem êxito → o post grava-se como publicado.
- Mas **a tentativa original nunca é actualizada** para `success` — fica eternamente como `failed` no histórico.

Resultado: `/publication-history` mostra 7 posts recentes com badge de erro 409 vermelho, embora estejam publicados.

**Correção:** dentro do bloco do retry ZWSP (linha ~728), quando `result.success === true`, fazer `UPDATE publication_attempts SET status='success', error_message=NULL WHERE id=attemptId` em vez de deixar o registo `pending`. O mesmo para o caminho normal de sucesso (já existe, mas validar). Garantir que o campo `error_message` é limpo quando o retry passa.

---

### 🟡 BUG #2 — 266 posts históricos `status='failed'` poluem `/publication-history`

Distribuição:
- 90 em Out/2025, 99 em Nov/2025, 45 em Dez/2025, 18 em Jan/2026, 10 em Fev/2026, 2 em Mar/2026, 2 em Abr/2026

99% destes são da era pré-Getlate (n8n, sem retry, sem trigger). Continuam a aparecer em `/publication-history` como falhas vermelhas, mas já não se podem republicar (URLs de média expiraram, sistema diferente).

**Correção:** UPDATE pontual dos 264 posts `failed` com `failed_at < '2026-04-01'` para `status='rejected'` e `error_log = 'Sistema legacy n8n — arquivado em auditoria 4'`. Mantém os 2 posts recentes de Abril visíveis para diagnóstico real. O componente `PublicationHistory.tsx` já filtra `rejected` do feed principal.

---

### 🟢 REFINAMENTO #3 — 11 posts `status='approved'` esquecidos desde Out/2025

Aprovados há 6 meses, sem `scheduled_date`, sem `published_at`. Fluxo legacy de aprovação manual que deixou de ser usado. Inflam contadores de "Pendentes" no Dashboard.

**Correção:** UPDATE para `status='rejected'` com `error_log='Aprovado mas nunca publicado — arquivado'`. (Não faço delete — mantém audit trail.)

---

### 🟢 REFINAMENTO #4 — Mensagem de erro 24h pouco accionável

Quando o frontend deteta duplicado IG nas últimas 24h (linha 507 de `usePublishWithProgress.ts`), mostra um toast genérico. Como o utilizador agora sabe que o backend faz retry automático com ZWSP, o aviso devia ser **opcional/informativo** em vez de bloqueante:

> *"⚠️ Conteúdo semelhante publicado no IG nas últimas 24h. Vamos tentar com um carácter invisível extra na legenda — se falhar, edita ligeiramente o texto."*

E **proceder** com a publicação (não bloquear). Assim alinha o comportamento frontend↔backend (o backend já tenta o ZWSP automaticamente).

---

### Plano de execução (1 loop, baixo risco)

1. **Bug #1** — corrigir `publish-to-getlate/index.ts`: actualizar `publication_attempts` para `success` quando o retry ZWSP passa + limpar `error_message`. Cleanup pontual: marcar como `success` os 7 attempts recentes cujos posts estão `published`.
2. **Bug #2** — UPDATE arquivar 264 posts legacy `failed → rejected`.
3. **Refinamento #3** — UPDATE arquivar 11 `approved` órfãos `→ rejected`.
4. **Refinamento #4** — `usePublishWithProgress.ts`: tornar aviso 24h informativo em vez de bloqueante (deixar o backend tratar via ZWSP).

### Ficheiros a alterar
- `supabase/functions/publish-to-getlate/index.ts` (1)
- `src/hooks/usePublishWithProgress.ts` (4)
- UPDATE de dados via insert tool (1 cleanup, 2, 3)

### Resultado esperado
- `/publication-history` deixa de mostrar badges vermelhos em posts publicados.
- Feed do histórico foca apenas em falhas reais e recentes (≤2 entradas em vez de >270).
- Dashboard de "Pendentes" não inclui aprovações órfãs de Outubro.
- Publicação IG repetida no mesmo dia procede automaticamente em vez de bloquear o utilizador.

### Checkpoint
☐ 7 attempts 409/GBP recentes passam de `failed` para `success` no histórico  
☐ Feed de `/publication-history` mostra apenas 2 falhas reais de Abril  
☐ Dashboard de "Pendentes" baixa em 11 unidades  
☐ Próximo IG repetido no dia publica sem mostrar bloqueio

