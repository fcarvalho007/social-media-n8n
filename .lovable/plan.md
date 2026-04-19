

## Auditoria do Projeto — Bugs e Refinamentos Detectados

### Resumo Executivo
Encontrei **3 bugs com impacto real**, **2 problemas de dados** e **3 refinamentos UX**. Os mais urgentes são (1) e (2) abaixo, que afectam directamente a experiência de publicação.

---

### 🔴 BUGS CRÍTICOS

**1. Posts marcados como "publicados" com `error_log` sujo**

3 posts recentes têm `status='published'` mas guardam `error_log = "instagram_carousel: Erro inesperado no processamento"`:
- `0bb8882a-...` (18/04 — Manual post stories)
- `d0cc4979-...` (17/04 — newsletter IA)
- `48642d49-...` (12/04)

A causa é o **catch genérico em `usePublishWithProgress.ts:935`** que escreve "Erro inesperado no processamento" no `error_log` mesmo quando, segundos depois, o polling do Getlate confirma que o post saiu com sucesso. O resultado é que o `/publication-history` mostra um aviso de erro num post que está perfeitamente publicado.

**Fix:** Quando o polling pós-publicação detecta sucesso (linhas 960+), limpar `error_log` no `posts` para esse formato.

**2. Posts antigos "presos" em estado `scheduled` / `approved`**

A query revela:
- 2 posts em `scheduled` desde **06/01/2026** (3 meses — agendados para data já passada)
- 8 posts em `approved` desde **25-26/10/2025** (6 meses)

Estes posts nunca executam mas continuam a poluir queries do Calendário e contadores do Dashboard. Não há job de cleanup nem alerta visual.

**Fix:** Adicionar ao `/dashboard` um aviso "Tens X posts presos há mais de 7 dias" com botão para os mover para `failed` ou `draft`. Em alternativa, um cron de limpeza.

**3. `classifyErrorFromString` — captura demasiado agressiva como `MEDIA_ERROR`**

Linha 338-341: a regra `lower.includes('image') || lower.includes('video')` faz match com qualquer mensagem que mencione "image" ou "video", mesmo quando o erro real é outro (ex: "video processing rate limit"). Isto pode mascarar erros de rate-limit ou auth como sendo de média.

**Fix:** Mover o bloco `MEDIA_ERROR` para depois de `RATE_LIMIT` e `TOKEN_EXPIRED`, e exigir co-ocorrência com palavras como `format`, `size`, `aspect`, `dimension`.

---

### 🟡 PROBLEMAS DE DADOS

**4. `media_library` com 2.824 MB acumulados (2.082 ficheiros > 7 dias)**

A política de retenção de 7 dias documentada em memória **não está activa**. Há 2.824 MB em `source='publication'` com mais de 7 dias. O bucket vai continuar a crescer e eventualmente atingir limites de storage.

**Fix:** Activar/criar cron `cleanup-storage` para correr diariamente e apagar `media_library` + ficheiros do Storage com `created_at < NOW() - 7 days` e `source='publication'`.

**5. `idempotency_keys` — apenas 2 registos, ambos expirados**

Tabela está praticamente vazia. Confirma que o cleanup funciona, mas sugere que o sistema de idempotency raramente é exercitado (TTL de 5min). Não é bug, apenas validação.

---

### 🟢 REFINAMENTOS UX

**6. Modal de erro de duplicação — adicionar botão "Marcar como publicado"**

Já corrigimos o modal para mostrar "Conteúdo duplicado" correctamente. Mas quando o utilizador vê este erro, sabe que o post já está no Instagram. Falta um botão único: **"Já está publicado — fechar"** que actualize `status='published'` e remova o erro do histórico.

**7. `/publication-history` — filtrar inconsistências**

Devido ao bug #1, o histórico mostra posts com badge de erro que estão de facto publicados. Adicionar lógica: se `status='published'` E `published_at IS NOT NULL`, ignorar `error_log` no display do badge.

**8. `scheduled_jobs` — 4 jobs em `requires_attention`**

Jobs que esgotaram retries continuam na BD sem visibilidade. Adicionar um indicador no Dashboard ou em `/publication-history` para estes casos.

---

### Plano de Execução Recomendado

Priorização sugerida (4 ordens, do mais ao menos urgente):

1. **Bug #1 + Refinamento #7** (mesma origem, mesma sessão) — limpeza de `error_log` ao confirmar publicação + filtro no histórico.
2. **Bug #3** — reordenar regras de classificação de erro.
3. **Refinamento #6** — botão "Já está publicado" no modal de duplicação.
4. **Bug #2 + Problema #4** — cleanup de posts presos + activação de retenção de média.

Posso avançar com qualquer um destes individualmente — recomendo começar pelo **#1** porque é o que causa mais confusão visível ao utilizador (badges vermelhos em posts que correram bem).

