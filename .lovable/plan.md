

## Plano: Corrigir Login "Failed to fetch" + Higiene Auth

### Diagnóstico

Os logs de rede confirmam que o browser continua a chamar `ztmoabaxvwizglkaaomw.supabase.co` (projecto antigo) em vez de `vtmrimrrppuclciolzuw.supabase.co`. **Nenhum ficheiro no código contém esta URL antiga** — o problema é 100% um bundle JavaScript em cache no browser.

Qualquer alteração ao código fonte força um rebuild com as variáveis `.env` correctas, mas o browser pode continuar a servir o bundle antigo se tiver cache agressivo (service worker, disk cache, etc.).

### Alterações

#### 1. Forçar invalidação de cache (ficheiro `index.html`)
Adicionar meta tags `Cache-Control` e `Pragma` no `<head>` do `index.html` para evitar que o browser sirva bundles antigos:
```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
```

#### 2. Adicionar diagnóstico visível no ecrã de login (`src/pages/Auth.tsx`)
Quando o login falha com "Failed to fetch", mostrar na UI qual URL o Supabase client está a usar. Isto permite ao utilizador confirmar visualmente se o bundle está actualizado ou se persiste cache antigo. Exemplo:
```
"A tentar ligar a: vtmrimrrppuclciolzuw.supabase.co — se vir outro domínio, limpe o cache."
```

#### 3. Limpar sessão antiga antes do login (`src/contexts/AuthContext.tsx`)
No início de `signInWithEmail`, chamar `supabase.auth.signOut()` silenciosamente para limpar qualquer token/sessão residual do projecto antigo que esteja em `localStorage`.

#### 4. Melhorias de higiene na auth

| Problema | Solução |
|----------|---------|
| Password hardcoded em 2 sítios (AuthContext + edge function) | Mover para constante partilhada; no edge function já está alinhado (`internal-whitelist-auth-2024`) |
| Whitelist hardcoded no frontend (visível no bundle JS) | Manter whitelist no frontend para UX rápida, mas adicionar validação server-side no edge function |
| `signUp` com `emailRedirectTo` desnecessário (auto-confirm deveria estar activo para whitelist) | Verificar config de auto-confirm; se activo, remover `emailRedirectTo` |
| Fluxo de fallback complexo (signIn → reset → signUp → signIn) | Simplificar: tentar signIn, se falhar invocar edge function que garante user+password, depois signIn final. Máximo 2 tentativas |
| Toast genérico "Erro ao entrar" sem contexto | Incluir `error.message` no toast para debugging |

### Ficheiros a alterar

| Ficheiro | Alteração |
|----------|-----------|
| `index.html` | Meta tags anti-cache |
| `src/pages/Auth.tsx` | Diagnóstico visual da URL Supabase quando há erro |
| `src/contexts/AuthContext.tsx` | Limpar sessão antiga; simplificar fluxo de fallback; melhor mensagem de erro |

