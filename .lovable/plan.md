

## Plano: Corrigir Login + Optimizar Storage

### Problema 1: Login não funciona

Os logs de rede confirmam **dois problemas críticos**:

1. **URL errada**: O browser está a chamar `ztmoabaxvwizglkaaomw.supabase.co` em vez de `vtmrimrrppuclciolzuw.supabase.co`. Isto é um bundle antigo em cache — o `.env` e o `client.ts` estão correctos mas o browser serve um JS compilado com as credenciais do projecto anterior. **Solução**: forçar rebuild limpo (o próprio acto de editar código e fazer deploy resolve isto).

2. **Password inconsistente**: `AuthContext.tsx` usa `internal-whitelist-auth-2024` mas `admin-reset-password/index.ts` tem `TARGET_PASSWORD = '#Click123@'`. Quando o fluxo tenta fazer reset da password via edge function, define uma password diferente da que o login usa. **Solução**: alinhar ambos para a mesma password.

### Alterações para corrigir login

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/admin-reset-password/index.ts` | Mudar `TARGET_PASSWORD` de `#Click123@` para `internal-whitelist-auth-2024` |
| `src/contexts/AuthContext.tsx` | Adicionar melhor tratamento de erro para "Failed to fetch" (mostrar mensagem clara ao utilizador) |

### Problema 2: Optimização de Storage no Cloud

**Situação actual**: ~4 GB usados (67% vídeos, 20% imagens, 10% PDFs).

### Opções de storage externo avaliadas

| Opção | Custo | Prós | Contras |
|-------|-------|------|---------|
| **Cloudflare R2** | Grátis até 10 GB/mês + 0 egress | Sem custos de saída, S3-compatible, CDN integrado | Requer conta Cloudflare, migração manual |
| **Backblaze B2** | Grátis até 10 GB | Barato, S3-compatible | Egress pago fora Cloudflare |
| **Google Drive** (já usado) | 15 GB grátis | Já integrado via `upload-to-drive` | Não é object storage, API lenta |
| **Manter no Cloud** + limpeza | $0 (dentro do crédito) | Zero migração | Limite de crescimento |

### Recomendação: Limpeza imediata + migração futura para R2

**Fase 1 — Limpeza imediata (poupa ~2 GB)**:
- Criar edge function `cleanup-storage` que elimina ficheiros de posts `failed` (>30 dias) e `published` (>90 dias)
- Corrigir fallback do bucket `pdfs` para não receber vídeos/imagens
- Adicionar botão em `/quota-settings` para executar limpeza manual

**Fase 2 — Quando ultrapassar 6 GB**:
- Migrar média para Cloudflare R2 (0 custo de egress)
- Guardar apenas URLs na base de dados
- Edge function de proxy para upload directo ao R2

### Ficheiros a alterar/criar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/admin-reset-password/index.ts` | Alinhar TARGET_PASSWORD |
| `src/contexts/AuthContext.tsx` | Melhor erro para network failures |
| `supabase/functions/cleanup-storage/index.ts` | **Novo** — limpeza de ficheiros antigos |
| `src/pages/QuotaSettings.tsx` | Botão para executar limpeza + mostrar espaço usado |

