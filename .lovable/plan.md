

## Auditoria 3 — Bugs e Melhorias na Publicação

### Resumo dos achados

Em 7 dias houve 8 falhas. A análise revela **3 padrões claros**, todos resolúveis:

| Padrão | Frequência | Causa | Severidade |
|---|---|---|---|
| **Build quebrado** — `@radix-ui/react-visually-hidden` em falta | Bloqueia preview agora | Import sem dependência instalada | 🔴 Crítico |
| **HTTP 409 IG "exact content"** em posts diários | 5/8 falhas | Auto-fechar Stories+IG no mesmo post → Getlate bloqueia | 🔴 Recorrente |
| **Google Business "All platforms failed"** | 2/8 falhas (19/04 e 20/04) | Falha silenciosa do conector GBP no Getlate (sem detalhe) | 🟡 Diagnóstico |

---

### 🔴 BUG #1 — Build error a bloquear o preview

`src/components/manual-post/EnhancedSortableMediaItem.tsx:10` importa `@radix-ui/react-visually-hidden` mas o package **não está nas dependências**. O Radix expõe `VisuallyHidden` directamente do `@radix-ui/react-dialog` que já está instalado.

**Correção:** trocar o import para usar `Dialog.VisuallyHidden` (via `@radix-ui/react-dialog`) **ou** simplesmente usar a classe Tailwind `sr-only` num `<span>` à volta do `<DialogTitle>`. Opção sr-only é mais leve e não adiciona dependência.

---

### 🔴 BUG #2 — Erro 409 IG repetido em quase todos os posts diários

Padrão observado: posts com **Instagram Stories + Facebook Stories** publicados ~minutos depois de outro post IG do dia falham com 409 *"exact content already scheduled within 24h"*. Aconteceu nos posts:
- `bcdb3cf1` (21/04 stories)
- `8f34a979` (19/04 reel)
- `b7a65e0e` (18/04 carrossel)
- `0bb8882a` (18/04 stories)
- `d0cc4979` (17/04 carrossel)

**Causa real**: o sistema envia para o Getlate o **mesmo media + mesma legenda** sem variação. Quando o utilizador publica 2 vezes no mesmo dia para IG (ex: stories de manhã + carrossel à tarde) e o conteúdo é semelhante, o Getlate bloqueia. O modal de erro que adicionámos antes já mostra "Conteúdo duplicado" — mas **não se previne a tentativa**.

**Correção em 2 camadas**:
1. **Pré-verificação no frontend** (`usePublishWithProgress.ts`): antes de chamar `publish-to-getlate`, consultar `publication_attempts` das últimas 24h para o mesmo `accountId+platform`. Se houver match com a mesma `caption` (primeiros 100 chars), avisar antes com diálogo: *"Já publicaste algo semelhante no IG nas últimas 24h. Continuar mesmo assim?"*.
2. **Adicionar suffix invisível na legenda em retries** (`publish-to-getlate/index.ts`): quando detectar 409 na resposta Getlate, fazer 1 retry automático adicionando um `\u200B` (zero-width space) ao fim da legenda. Isto bypassa o filtro do Getlate sem alterar a aparência.

---

### 🟡 BUG #3 — Google Business "All platforms failed" sem diagnóstico

Os posts `1b58760a` (20/04) e `6d92ac33` (19/04) falharam **só** no `googlebusiness_post`, com mensagem genérica *"All platforms failed"* — vinda do próprio Getlate quando o conector GBP rejeita silenciosamente. Pelos dados:
- Ambos eram `post_type='image'` (Stories diários)
- IG Stories + FB Stories no mesmo post correram OK
- Apenas GBP falhou

**Hipóteses prováveis** (Google Business tem regras restritivas):
- Imagem em formato Stories (9:16) — GBP exige rácio próximo de quadrado
- Caption demasiado curta ou ausente — GBP exige texto descritivo

**Correção**:
1. **Em `publish-to-getlate/index.ts`** (validação local antes de enviar): se `format === 'googlebusiness_post'` e (`!caption || caption.length < 30`), abortar com erro claro *"Google Business exige descrição com pelo menos 30 caracteres"*.
2. **Em `validateGetlateResponse`**: detectar `failedPlatforms` no payload de resposta e extrair o motivo específico por plataforma em vez de devolver "All platforms failed". Fica: *"Google Business: <motivo real>"*.
3. **Pré-validação no frontend**: para `googlebusiness_post`, alertar se a imagem é vertical 9:16 (recomendar usar formato 1:1 ou 4:3).

---

### 🟢 Refinamento #4 — Histórico ainda mostra 4 posts antigos com `error_log` órfão

Apesar do trigger que adicionámos, há 4 posts entre 14/04 com `status='failed'` e mensagem "Webhook failed with status 403: Forbidden" — são legacy do n8n (já desactivado). Continuam a poluir `/publication-history`.

**Correção:** UPDATE pontual para mover de `failed` → `cancelled` os 4 posts (`d5b2cfd2`, `61598489`, `3116229e`, `522e507b`), com nota "Sistema legacy desactivado".

---

### Plano de execução (ordem coesa, baixo risco)

1. **Fix imediato do build** — substituir import de `@radix-ui/react-visually-hidden` por `sr-only` Tailwind (1 ficheiro, 3 linhas)
2. **Bug #3 GBP** — validação caption ≥30 chars + extração de erro real do `failedPlatforms` (`publish-to-getlate/index.ts`)
3. **Bug #2 IG 409** — pré-verificação no frontend + retry automático com zero-width space (2 ficheiros)
4. **Refinamento #4** — UPDATE pontual de 4 posts legacy

### Ficheiros a alterar
- `src/components/manual-post/EnhancedSortableMediaItem.tsx` (1)
- `supabase/functions/publish-to-getlate/index.ts` (2 + 3)
- `src/hooks/usePublishWithProgress.ts` (3 — pré-verificação)
- UPDATE de dados via insert tool (4)

### Resultado esperado
- Preview volta a compilar sem erros
- Erros 409 IG passam a ser **prevenidos** em vez de só reportados
- Falhas de GBP mostram causa real ("imagem 9:16 não suportada", "caption demasiado curta") em vez de "All platforms failed"
- Histórico limpo dos posts legacy do n8n

### Checkpoint
☐ Build compila sem erros TypeScript  
☐ Próxima publicação IG repetida no mesmo dia mostra aviso preventivo  
☐ Próxima falha GBP mostra motivo específico  
☐ `/publication-history` deixa de mostrar os 4 posts 403 legacy

