

## Auditoria 5 — Estado actual e ajustes finos

### Resumo executivo
A app está **muito estável**: zero erros 4xx/5xx em edge functions nas últimas 24h, cron `cleanup-storage-daily` activo, **36 publicações com `status='success'` e 0 falhas reais** nos últimos 7 dias, scheduled_jobs sem entradas presas. Encontrei **2 inconsistências menores** e **1 melhoria preventiva**.

---

### 🟡 BUG #1 — TTL marcou 2 posts como `failed` quando deviam ser `cancelled`

A correção da Auditoria 2 introduziu um TTL no cron mas a limpeza pontual desses dois posts ficou inconsistente:

| Post | created_at | failed_at | Problema |
|---|---|---|---|
| `b86413b4` (IG) | 06/01/2026 | 20/04/2026 | Marcado `failed` em vez de `cancelled` |
| `db89519d` (LI) | 06/01/2026 | 20/04/2026 | Idem |

Ambos têm `error_log = "Agendamento expirado — cancelado automaticamente por estar parado há mais de 7 dias"`. A mensagem diz **cancelado** mas o status é **failed**, fazendo com que apareçam como falhas reais recentes em `/publication-history` (com `failed_at` de 20/04, parecem erros de ontem).

**Correção:** UPDATE pontual: `status = 'rejected'` (consistente com a estratégia das auditorias anteriores — `PublicationHistory.tsx` filtra `rejected` do feed).

---

### 🟡 BUG #2 — 11 stories aprovadas há 5+ meses sem `scheduled_date` nem publicação

A Auditoria 4 limpou 11 *posts* `approved` órfãos, mas **stories** seguiu o mesmo padrão e **não foi limpo**. 11 stories de Nov/2025 ficam em estado `approved` permanente, sem `scheduled_date`, sem `getlate_post_id`, e poluem queries de "pendentes" no Dashboard se houver indicador de stories.

**Correção:** UPDATE para `status = 'rejected'` com nota "Aprovado mas nunca publicado — arquivado". Mantém audit trail.

---

### 🟢 REFINAMENTO #3 — Mensagem do TTL devia mencionar "rejected" ou ser mais sintética

O texto actual no `send-scheduled-posts` (que produziu os 2 posts do Bug #1) escreve `"Agendamento expirado — cancelado automaticamente por estar parado há mais de 7 dias"` mas grava `status='failed'`. Para futuros casos:

**Correção:** sempre que o cron descartar um post/story por TTL, gravar **directamente** `status='rejected'` (não `failed`) e mensagem mais curta: `"Expirado por TTL (>7 dias sem processamento)"`. Isto evita repetir o Bug #1 quando aparecerem novos casos.

---

### 🟢 OBSERVAÇÃO POSITIVA — Não foi detectado nada urgente

| Métrica | Valor | Avaliação |
|---|---|---|
| Edge function errors (24h) | 0 | ✅ Excelente |
| Publicações com sucesso (7d) | 36 | ✅ Saudável |
| Falhas reais (7d) | 0 | ✅ Estável |
| Posts com `error_log` órfão | 0 | ✅ Trigger funciona |
| Scheduled_jobs presos | 0 | ✅ TTL funciona |
| Posts `approved` órfãos | 0 | ✅ Limpo |
| Storage >7d (2.479 MB) | Mantém-se | ⏳ Próximo cron 02:00 esta noite |

A 1ª execução automática do `cleanup-storage` (02:00 Lisboa) ainda não aconteceu — verificar amanhã se baixou para <500 MB.

---

### Plano de execução (1 loop, baixíssimo risco)

1. **Bug #1** — UPDATE dos 2 posts (`b86413b4`, `db89519d`): `status='rejected'`, manter `error_log`.
2. **Bug #2** — UPDATE dos 11 stories `approved` órfãos (>3 meses): `status='rejected'`, `error_log='Aprovado mas nunca publicado — arquivado em auditoria 5'`.
3. **Refinamento #3** — em `send-scheduled-posts/index.ts`, futuras expirações por TTL gravam directamente `status='rejected'` em vez de `'failed'`. (Apenas uma alteração defensiva — actualmente o cron não está a marcar como expirado nada novo.)

### Ficheiros a alterar
- UPDATE de dados via insert tool (Bug #1, Bug #2)
- `supabase/functions/send-scheduled-posts/index.ts` — só se houver lógica de TTL que escreva `failed`; senão é apenas documental

### Resultado esperado
- `/publication-history` deixa de mostrar 2 falhas falsas de 20/04.
- 11 stories órfãs arquivadas, dashboard fica limpo.
- Próximas expirações por TTL (se ocorrerem) gravam status correcto à partida.

### Checkpoint
☐ `b86413b4` e `db89519d` deixam de aparecer em `/publication-history` como falhas  
☐ `SELECT COUNT(*) FROM stories WHERE status='approved'` retorna 0  
☐ Amanhã: `cleanup-storage` libertou >1 GB às 02:00 (verificar logs)

