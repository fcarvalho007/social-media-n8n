

## Plano: Blindar Login + Validar Cleanup

### 1. Auth — Estado Actual

Acabei de testar ambos os sistemas directamente:

- **`admin-reset-password`**: Respondeu com `success: true` para ambos os emails. Passwords sincronizadas com `internal-whitelist-auth-2024`.
- **Ambos os utilizadores existem** na base de dados, emails confirmados.
- **O código está correcto**: `AuthContext.tsx` e `admin-reset-password` usam a mesma password.
- **Cache headers** já estão no `index.html` (no-cache, no-store, must-revalidate).

**O problema "Failed to fetch" é 100% cache do browser** — o bundle antigo (compilado com URL do projecto anterior `ztmoabax...`) está a ser servido pelo disk cache. Nenhuma alteração de código resolve isto directamente; o utilizador precisa de fazer hard refresh.

### Refinamentos para blindar o login

| Alteração | Ficheiro | Descrição |
|-----------|----------|-----------|
| Auto-retry com signOut + localStorage clear | `AuthContext.tsx` | Se o primeiro `signInWithPassword` falhar com `Failed to fetch`, limpar TODO o localStorage (incluindo tokens Supabase antigos) e tentar novamente uma vez |
| Forçar reload automático se URL errada | `AuthContext.tsx` | No catch de `Failed to fetch`, verificar se `VITE_SUPABASE_URL` contém `vtmrimrr`. Se não, forçar `window.location.reload(true)` para obter o bundle novo |
| Adicionar `?v=timestamp` no script src | `index.html` | Cache-bust no script principal para forçar download do bundle novo |

### 2. Cleanup — Estado Actual

Testei a edge function directamente:

```text
dryRun: true
filesToDelete: 1,738 ficheiros
posts falhados: 8  (>30 dias)
posts publicados: 1,000  (limite — há mais, query limitada a 1000)
```

**Problemas detectados:**

| Problema | Impacto | Correção |
|----------|---------|----------|
| Query limitada a 1000 rows (default Supabase) | Não encontra todos os posts publicados antigos | Adicionar paginação ou `.limit(10000)` |
| `cleanup-storage` exige JWT (`verify_jwt = true`) mas na UI é chamado com token do utilizador | Funciona apenas para utilizadores autenticados — correcto, mas se a sessão expirar falha silenciosamente | OK, manter como está |
| Storage list também limitada a 1000 | Contagem de ficheiros por bucket pode ser incorrecta | Adicionar paginação no list |

### Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/contexts/AuthContext.tsx` | No catch de "Failed to fetch": limpar localStorage, tentar reload se URL errada. Adicionar retry automático |
| `supabase/functions/cleanup-storage/index.ts` | Adicionar paginação na query de posts publicados (loop até esgotar) e no storage list |

### Resultado esperado

- Login funciona **sempre** para ambos os emails, mesmo com cache antigo (auto-corrige via reload)
- Cleanup encontra **todos** os posts elegíveis, não apenas os primeiros 1000
