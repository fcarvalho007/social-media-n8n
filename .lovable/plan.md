

## Diagnóstico — Porque é que posts não entraram corretamente

### Dados (últimos 14 dias)

| Métrica | Valor |
|---|---|
| Tentativas com sucesso | **51** |
| Tentativas falhadas | **7** |
| Taxa de sucesso real | **88%** |
| Taxa de sucesso final do post (com retry ZWSP automático) | **~95%** |

### Categorização das 7 falhas

| Causa | Nº | Detalhe |
|---|---|---|
| **Conteúdo duplicado 24h (HTTP 409)** | 3 | Getlate bloqueia mesma caption; o retry ZWSP existe mas em **2 casos não disparou** porque o `error_message` chegou como `"All platforms failed"` em vez de conter `409`/`already scheduled` |
| **Timeout > 10 min** | 3 | Edge function aborta carrosséis pesados sem espaço para extensão |
| **Upload falha (chave inválida no Storage)** | 1 | Nome de ficheiro com caracteres `[`, `]`, espaços e acentos — sanitização incompleta |

Adicionalmente, **5 posts antigos** ficaram com `status='failed'` mas **`error_log=NULL`** — ruído visual no histórico que dificulta diagnóstico.

### Padrão raiz mais relevante (caso `b4339f25` de hoje, 22/04)

1. Post `226784b9` publicado com sucesso ontem 19:11 → Getlate guarda fingerprint da caption por 24h.
2. Hoje 08:13, utilizador volta a publicar **a mesma caption** (clone/reutilização).
3. Backend chama Getlate → recebe 409.
4. **ZWSP retry deveria correr** (linha 720 de `publish-to-getlate/index.ts`) mas o `result.error` veio sem prefixo `409` na string serializada nesta versão, logo a regex falhou e a falha persistiu até ao utilizador.
5. Frontend só descobriu a falha **após** clicar em Publicar → já não mostrou o aviso preventivo do `duplicateValidator` porque a query atual filtra apenas `status IN ('success','pending','scheduled')` na tabela `publication_attempts`, ignorando casos onde o post **já está em flight** sem registo final.

---

## Plano de melhorias

### Eixo A — Fechar o retry ZWSP de forma robusta (fonte das 3 falhas 409)

**A1. Detecção alargada do duplicado em `supabase/functions/publish-to-getlate/index.ts`**

Substituir a heurística de regex pela inspeção do código HTTP devolvido pela `publishToGetlate`:

```ts
// Em vez de /409/.test(result.error), capturar status no objeto result
const looksLikeDuplicate =
  !result.success && (result.statusCode === 409 ||
    /already (scheduled|posted|publishing)/i.test(result.error || '') ||
    /exact content/i.test(result.error || ''));
```

Implica devolver `statusCode` em `publishToGetlate()` (já existe internamente como `response.status`).

**A2. Segundo retry com sufixo invisível alternativo**

Se a primeira retry com `\u200B` falhar **também** com 409 (raro, mas observado), adicionar `\u2063` (Invisible Separator) e tentar terceira vez. Total: 3 tentativas, ainda dentro do timeout.

**A3. Log estruturado da retry**

Gravar em `publication_attempts.response_data` o campo `{retry_strategy: 'zwsp', retried_at, original_error_code}` para análise futura.

---

### Eixo B — Pré-validação preventiva (evitar 409 antes de chegar ao backend)

**B1. Reforçar `duplicateValidator.ts`**

A query atual filtra apenas `success/pending/scheduled`. Alargar para incluir o caso real desta semana:

```ts
.in('status', ['success', 'pending', 'scheduled', 'failed'])
.gte('attempted_at', dayAgo)
```

E devolver **warning bloqueante** (em vez de info) quando a caption coincide com **publicação bem-sucedida** nas últimas 24h — não bloqueia totalmente mas exige confirmação explícita "Sim, sei que é igual".

**B2. Auto-fix "Adicionar variação subtil"**

Botão no card de issue que insere automaticamente uma quebra de linha + emoji aleatório no fim da caption (`✨`, `🔹`, `📍`) — torna o conteúdo único sem impacto visual significativo. Move o problema do backend para o utilizador, com escolha consciente.

---

### Eixo C — Robustez de upload (1 falha por chave inválida)

**C1. Validar sanitização ANTES do upload em `src/lib/fileNameSanitizer.ts`**

Adicionar regex de blacklist explícita para `[`, `]`, `(`, `)`, `?`, `&`, `=`, `#` que escapam à normalização NFD atual. Truncar a 50 chars já existe; falta este passo.

**C2. Pré-flight de upload**

Antes do publish, fazer `HEAD` ao URL devolvido pelo Storage para confirmar que o ficheiro existe. Se 404 → erro claro "Reupload necessário" em vez de "Invalid key" críptico.

---

### Eixo D — Robustez de timeout (3 falhas por > 10min)

**D1. Timeout configurável por formato em `publish-to-getlate`**

Carrosséis de >10 imagens para Instagram e LinkedIn Document precisam de margem maior. Subir limite para **15 min** apenas para `instagram_carousel` (>5 itens) e `linkedin_document` (>20 páginas). Documentar no código.

**D2. Polling progressivo do lado do frontend**

Quando publish demora >2 min, mudar barra de progresso para mensagem **"A processar mídia pesada — pode demorar até 15 min. Vais receber email quando concluir"** + libertar a UI para o utilizador continuar a trabalhar.

---

### Eixo E — Higiene de dados históricos (5 posts órfãos)

**E1. Migração one-shot para limpar `failed` sem `error_log`**

```sql
-- Posts em 'failed' há >30 dias sem error_log nem failed_at:
-- arquivar como 'rejected' com mensagem clara para sair do dashboard
UPDATE posts
SET status='rejected',
    error_log='Marcado como falhado mas sem registo de erro — arquivado em limpeza de dados',
    failed_at=COALESCE(failed_at, updated_at)
WHERE status='failed'
  AND error_log IS NULL
  AND created_at < NOW() - INTERVAL '30 days';
```

**E2. Trigger preventivo**

Função PG `set_failed_at_on_status` que garante: sempre que `status` muda para `failed`, se `failed_at IS NULL` então `failed_at := NOW()`. Evita futuros órfãos.

---

### Ficheiros a alterar

| Ficheiro | Eixo |
|---|---|
| `supabase/functions/publish-to-getlate/index.ts` | A1, A2, A3, D1 |
| `src/lib/validation/validators/duplicateValidator.ts` | B1 |
| `src/components/manual-post/ValidationIssueCard.tsx` | B2 (botão auto-fix) |
| `src/hooks/useSmartValidation.ts` | B2 (handler do auto-fix) |
| `src/lib/fileNameSanitizer.ts` | C1 |
| `src/hooks/usePublishWithProgress.ts` | C2, D2 |
| `supabase/migrations/<timestamp>_cleanup_failed_posts.sql` | E1, E2 |

### Resultado esperado

Após implementação, com base no histórico recente:

| Categoria | Antes | Depois |
|---|---|---|
| Falhas 409 não recuperadas | 3/14d | **0** (retry robusto + auto-fix preventivo) |
| Falhas timeout | 3/14d | **≤1** (margem 15min para casos pesados) |
| Falhas upload | 1/14d | **0** (sanitização + pré-flight) |
| Posts `failed` órfãos | 5 | **0** (limpeza + trigger) |
| **Taxa de sucesso prevista** | 88% | **≥97%** |

### Checkpoint de aceitação

☐ Publicar 2x a mesma caption no mesmo dia → segunda publicação tem aviso bloqueante (B1) ou aceita com auto-fix (B2)  
☐ Forçar 409 da Getlate (caption igual a sucesso recente) → log mostra `ZWSP retry succeeded` (A1)  
☐ Upload de ficheiro `foto [final] (v2).jpg` → sanitiza para `foto-final-v2.jpg` antes do upload (C1)  
☐ Carrossel IG com 50 imagens → não dá timeout em <15min (D1)  
☐ `SELECT COUNT(*) FROM posts WHERE status='failed' AND error_log IS NULL` retorna **0** (E1)  
☐ Painel de validação detecta caption igual a publicação `success` ou `failed` das últimas 24h (B1)

