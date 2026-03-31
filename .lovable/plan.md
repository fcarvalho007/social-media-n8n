

## Diagnóstico: Estado Actual do Cloud Storage

### Resultados da auditoria

**O storage NÃO diminuiu.** A limpeza nunca foi executada pelo utilizador — apenas o código foi actualizado. Os números actuais:

| Bucket | Ficheiros | Tamanho | > 7 dias | Tamanho > 7 dias |
|--------|-----------|---------|----------|------------------|
| publications | 1,834 | 2,828 MB | 1,805 | 2,697 MB |
| pdfs | 812 | 1,287 MB | 789 | 1,270 MB |
| ai-generated-images | 1 | 6 MB | 1 | 6 MB |
| **Total** | **2,647** | **4,121 MB** | **2,595** | **3,973 MB** |

**96% dos ficheiros têm mais de 7 dias** e podem ser eliminados, libertando ~3.9 GB.

Após limpeza, o storage ficaria com ~148 MB (29 publications + 23 pdfs recentes).

### Bug crítico encontrado

**225 de 233 posts falhados não têm `failed_at` preenchido.** O cleanup filtra por `failed_at < 7 dias`, mas esses 225 posts têm `failed_at = NULL` — são invisíveis ao cleanup e os seus ficheiros nunca serão eliminados.

### Plano de refinamentos

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `supabase/functions/cleanup-storage/index.ts` | **Corrigir bug**: para posts falhados, usar `created_at` como fallback quando `failed_at` é NULL. Adicionar segunda query para posts falhados sem `failed_at`. Adicionar **limpeza directa por data** nos buckets storage — listar ficheiros e eliminar os com `created_at > 7 dias`, independentemente de estarem referenciados em posts. |
| 2 | `supabase/functions/cleanup-storage/index.ts` | Devolver **tamanho em bytes** no resultado (não apenas contagem de ficheiros), para a UI mostrar quanto espaço foi libertado. |
| 3 | `src/pages/QuotaSettings.tsx` | Mostrar **resumo do estado actual** do storage (tamanho total, ficheiros totais) antes dos botões de limpeza — não apenas após executar. Adicionar indicador visual de quanto espaço seria libertado. Mostrar tamanhos em MB/GB em vez de apenas contagem de ficheiros. |
| 4 | `src/pages/QuotaSettings.tsx` | Adicionar **confirmação antes de executar limpeza real** (dialog de confirmação com texto explícito do que será eliminado). |

### Detalhe técnico

**Correcção do bug `failed_at`**: A query de posts falhados passará a filtrar por `OR (failed_at IS NULL AND created_at < sevenDaysAgo)`, capturando os 225 posts invisíveis.

**Limpeza directa de storage**: Após a limpeza baseada em posts, o cleanup listará todos os ficheiros em cada bucket via `supabase.storage.from(bucket).list()` e eliminará os que tenham `created_at` anterior a 7 dias. Isto garante que ficheiros órfãos (sem post associado) também são eliminados.

**Resultado na resposta**: O cleanup passará a devolver `totalStorageBytes` e `freedBytes` para que a UI possa mostrar "3.9 GB libertados de 4.1 GB".

**UI do QuotaSettings**: Ao carregar a página, faz uma chamada `dryRun: true` automática para mostrar imediatamente o estado do storage, sem o utilizador ter de clicar.

