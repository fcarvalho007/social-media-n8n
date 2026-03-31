

## Plano: Refinamentos de Higiene e Comunicação com o Utilizador

Após revisão completa do código, identifiquei os seguintes pontos a melhorar:

### 1. Diagnóstico no Auth.tsx mostra informação técnica desnecessária

O bloco de erro mostra o domínio Supabase (`vtmrimrr...`) ao utilizador. Isto é confuso — o utilizador não sabe o que é um domínio Supabase. Deve ser substituído por uma mensagem amigável com acção clara.

**Alteração em `src/pages/Auth.tsx`**: Substituir o bloco de diagnóstico técnico por uma mensagem simples: _"Não foi possível ligar ao servidor. A tentar corrigir automaticamente..."_ — sem mostrar URLs ou domínios.

### 2. Auth.tsx — redirect automático não previne loop infinito

O `useEffect` que detecta bundle antigo faz `window.location.href = ...?cb=timestamp` mas se o cache persistir, entra em loop infinito de redirects.

**Alteração em `src/pages/Auth.tsx`**: Adicionar guarda anti-loop — verificar se já existe `?cb=` na URL actual. Se sim, não redirigir novamente; em vez disso, mostrar mensagem ao utilizador pedindo hard refresh manual.

### 3. AuthContext — signOut antes do login pode falhar em rede

O `signOut()` silencioso na linha 70-74 faz um pedido de rede ao Supabase. Se a rede está em baixo (o cenário exacto do "Failed to fetch"), isto pode atrasar ou bloquear o login.

**Alteração em `src/contexts/AuthContext.tsx`**: Em vez de `supabase.auth.signOut()`, limpar apenas o localStorage do Supabase localmente (`localStorage.removeItem` das chaves `sb-*`), evitando o pedido de rede.

### 4. DevHelper visível em preview (não-PROD)

O componente `DevHelper` com botão "Add Mock Data" aparece no preview Lovable (que não é `import.meta.env.PROD`). Não afecta produção mas polui a UI no preview.

**Alteração em `src/components/DevHelper.tsx`**: Adicionar condição adicional — só mostrar se `localStorage.getItem('devMode') === 'true'`, para não aparecer acidentalmente.

### 5. Toasts duplicados no fluxo de login

Quando o login falha com "Failed to fetch", o AuthContext mostra um toast de erro E depois faz redirect. O utilizador vê o toast por 1.5 segundos e depois a página recarrega — o toast desaparece sem ser lido. Além disso, o Auth.tsx também mostra o bloco de diagnóstico.

**Alteração em `src/contexts/AuthContext.tsx`**: No caso de "Failed to fetch" com auto-redirect, não mostrar toast — o redirect é a acção. Se o redirect falhar (loop detectado), aí sim mostrar mensagem clara.

### 6. ErrorBoundary — botão "Recarregar" usa reload() simples

O ErrorBoundary usa `window.location.reload()` que pode servir o bundle antigo do cache.

**Alteração em `src/components/ErrorBoundary.tsx`**: Substituir por `window.location.href = window.location.pathname + '?cb=' + Date.now()`.

### Ficheiros a alterar

| Ficheiro | Alterações |
|----------|-----------|
| `src/pages/Auth.tsx` | Mensagem amigável sem URLs técnicas; guarda anti-loop no useEffect |
| `src/contexts/AuthContext.tsx` | Limpar localStorage localmente em vez de signOut de rede; remover toast no auto-redirect |
| `src/components/ErrorBoundary.tsx` | Cache-bust no botão recarregar |
| `src/components/DevHelper.tsx` | Esconder por defeito no preview |

