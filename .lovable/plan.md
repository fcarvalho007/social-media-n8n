

## Plano: Forçar cache-bust real no login

### Diagnóstico

O `window.location.reload()` usado no AuthContext **não invalida o cache do browser** — o bundle antigo (com `ztmoabax...`) continua a ser servido. É preciso forçar um reload com cache-bust real.

### Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/contexts/AuthContext.tsx` | Substituir todos os `window.location.reload()` por `window.location.href = window.location.pathname + '?cb=' + Date.now()` — isto força o browser a pedir o HTML de novo com query string diferente, invalidando o cache do bundle JS |
| `src/pages/Auth.tsx` | Adicionar auto-detecção no mount: se `VITE_SUPABASE_URL` não contém `vtmrimrr`, fazer cache-bust redirect **imediatamente** sem esperar pelo clique do utilizador. Isto garante que o ecrã de login nunca aparece com o bundle errado |

### Detalhe técnico

1. **Auth.tsx — useEffect no mount**: Verificar `import.meta.env.VITE_SUPABASE_URL`. Se não contém `vtmrimrr`, limpar localStorage/sessionStorage e redirigir com `?cb=timestamp`. Isto resolve o problema antes do utilizador interagir.

2. **AuthContext.tsx — substituir reload()**: Nos 2 locais onde faz `window.location.reload()` (linhas 67 e 125), usar navegação com query string para garantir cache-bust real.

### Resultado esperado

O utilizador nunca vê o erro de ligação — a página auto-corrige antes de mostrar o formulário.

