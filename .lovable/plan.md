

## Plano — Mensagens de erro claras para leigos

Refazer a apresentação de falhas em três pontos da app (modal de publicação, página `Recovery`, lista `FailedPublications`) para que **qualquer pessoa sem contexto técnico** perceba: **o que falhou, porquê, o que pode fazer agora e quando voltar a tentar**.

---

### Diagnóstico actual

| Problema | Onde | Impacto |
|---|---|---|
| `error_log` cru em font-mono | `Recovery.tsx:287`, `FailedPublications.tsx:427` | Utilizador vê `"403: do not belong"` sem perceber |
| Jargão técnico | `publishingErrors.ts` (Token, OAuth, Rate limit, Quota) | "Token expirado" → leigo não sabe o que é |
| Toast genérico ao falhar | `usePublishWithProgress.ts` | "Erro ao publicar" sem causa nem ação |
| Sem severidade visual | `PublishProgressModal.tsx` | Falha temporária parece desastre |
| Sem cópia para suporte | Todos | Utilizador não consegue partilhar contexto |
| Sem timestamp/retry count | `Recovery.tsx` | Não se sabe se já tentou sozinho |

---

### Soluções (4 eixos)

#### Eixo 1 — Reescrever copy em `publishingErrors.ts`

Cada erro passa a ter **4 campos novos**, redigidos para alguém sem conhecimento técnico:

```ts
{
  title: string;          // "O Instagram não aceitou esta publicação"
  plainExplanation: string; // "Já publicaste esta legenda nas últimas 24h. O Instagram bloqueia conteúdo igual para evitar spam."
  whatToDo: string[];     // ["Edita a legenda (acrescenta uma palavra)", "Ou usa o botão 'Adicionar variação' abaixo"]
  whenToRetry: string;    // "Podes tentar imediatamente" | "Aguarda 15 minutos" | "Esta falha não desaparece sozinha"
  severity: 'info' | 'warning' | 'critical'; // azul/âmbar/vermelho
}
```

Tabela de tradução (excerto):

| Antes (técnico) | Depois (leigo) |
|---|---|
| "Token expirado · Reconecta no Getlate.dev" | "A ligação ao LinkedIn caducou. Vai a **Definições → Contas Sociais** e clica 'Reconectar'." |
| "Rate limit · Aguarda 15-30 min" | "O Instagram bloqueou temporariamente por excesso de pedidos. Volta dentro de **15 minutos**. Não precisas fazer nada agora." |
| "Quota esgotada · Aguarda reset" | "Atingiste o limite diário de publicações. Reabre amanhã ou contacta o admin para aumentar o limite." |
| "Conteúdo duplicado · Altera legenda" | "Já publicaste esta legenda hoje. O Instagram não permite repetir. **Edita uma palavra** ou usa o botão 'Adicionar variação subtil'." |
| "Network error · Verifica internet" | "Falhou a comunicação. Verifica se tens internet e tenta de novo (botão 'Tentar de novo' abaixo)." |
| "Erro inesperado" | "Algo correu mal mas não conseguimos identificar o quê. Copia o código de erro abaixo e envia para suporte@..." |

#### Eixo 2 — Componente unificado `<ErrorExplanationCard>`

Criar `src/components/publishing/ErrorExplanationCard.tsx` reutilizável nos 3 sítios:

```text
┌─────────────────────────────────────────────────┐
│ 🟡 Aviso · Instagram                       [×] │ ← cor por severidade
├─────────────────────────────────────────────────┤
│ O Instagram não aceitou esta publicação        │ ← título humano
│                                                 │
│ Porquê?                                         │
│ Já publicaste esta legenda nas últimas 24h.    │ ← explicação simples
│ O Instagram bloqueia conteúdo igual para       │
│ evitar spam.                                    │
│                                                 │
│ O que fazer:                                    │
│ • Edita a legenda (acrescenta uma palavra)    │ ← passos accionáveis
│ • Ou clica em "Adicionar variação" abaixo     │
│                                                 │
│ ⏱  Podes tentar imediatamente                  │ ← timing claro
│                                                 │
│ ┌──────────────┐  ┌─────────────────────┐    │
│ │ Tentar agora │  │ Adicionar variação  │    │ ← CTAs primários
│ └──────────────┘  └─────────────────────┘    │
│                                                 │
│ ▸ Detalhes técnicos (para suporte)            │ ← collapse fechado
│   ⎘ Copiar código   📋 403: do not belong...  │
└─────────────────────────────────────────────────┘
```

Severidade controla cor da borda + ícone:
- `info` (azul · 🛈) — situação normal, basta esperar (vídeo a processar)
- `warning` (âmbar · ⚠️) — acção rápida do utilizador resolve (editar legenda, reconectar)
- `critical` (vermelho · 🛑) — bloqueio que precisa intervenção (quota, conta desligada)

#### Eixo 3 — Toast contextual no momento da falha

Em `usePublishWithProgress`, substituir o toast genérico por:

```ts
toast.error(errorInfo.title, {
  description: errorInfo.plainExplanation.slice(0, 120),
  duration: errorInfo.severity === 'critical' ? 10000 : 6000,
  action: errorInfo.whatToDo.length > 0
    ? { label: 'Ver como resolver', onClick: () => openErrorModal() }
    : undefined,
});
```

Se a falha for `info` (vídeo a processar), nem mostra erro vermelho — mostra `toast.info` calmo: "O Instagram está a processar o vídeo. Vamos avisar quando estiver pronto."

#### Eixo 4 — Aplicar nos 3 ecrãs

| Ficheiro | Alteração |
|---|---|
| `src/components/publishing/PublishProgressModal.tsx` (linhas 260-293) | Substituir bloco de erro inline por `<ErrorExplanationCard>` |
| `src/pages/Recovery.tsx` (linhas 285-292) | Substituir bloco mono por `<ErrorExplanationCard>`, passando `error_log` para `classifyErrorFromString` |
| `src/pages/FailedPublications.tsx` (linhas 427-430) | Versão compacta: título + 1ª linha de explicação + botão "Ver detalhes" que expande para o card completo |
| `src/hooks/usePublishWithProgress.ts` (toast de falha) | Toast contextual (Eixo 3) |
| `src/lib/publishingErrors.ts` | Adicionar campos `plainExplanation`, `whatToDo[]`, `whenToRetry`, `severity` em todos os 14 templates |

---

### Detalhe técnico

**Schema novo de `ErrorInfo`** (retrocompatível):

```ts
export interface ErrorInfo {
  title: string;
  description: string;     // mantém — usado em modal compacto
  action: string;          // mantém
  isRetryable: boolean;
  source?: ErrorSource;
  // novos:
  plainExplanation: string;  // 1-2 frases de "porquê", linguagem simples
  whatToDo: string[];        // 1-3 passos numerados
  whenToRetry: 'immediate' | 'short' | 'long' | 'never' | 'auto';
  severity: 'info' | 'warning' | 'critical';
}
```

`whenToRetry` mapeia para texto: `immediate → "Podes tentar agora"`, `short → "Aguarda 5-15 min"`, `long → "Aguarda 1+ hora"`, `never → "Esta falha não desaparece sozinha — segue os passos acima"`, `auto → "Vamos tentar automaticamente"`.

**Função utilitária nova**: `getCopyableErrorReport(structuredError, postId)` devolve string formatada para suporte:

```text
Código: DUPLICATE_CONTENT
Origem: Getlate
Post ID: a1b2c3...
Erro técnico: 409: Exact content already scheduled
Hora: 2026-04-22 15:32 WEST
```

Botão `📋 Copiar para suporte` usa `navigator.clipboard.writeText()`.

---

### Ficheiros a alterar

| Ficheiro | Tipo |
|---|---|
| `src/lib/publishingErrors.ts` | Estender 14 templates + nova função copy report |
| `src/components/publishing/ErrorExplanationCard.tsx` | **Novo** — componente unificado |
| `src/components/publishing/PublishProgressModal.tsx` | Trocar bloco inline pelo card |
| `src/pages/Recovery.tsx` | Trocar `<CardDescription mono>` pelo card |
| `src/pages/FailedPublications.tsx` | Versão compacta + expand |
| `src/hooks/usePublishWithProgress.ts` | Toast contextual com severidade |

### Resultado esperado

- Utilizador vê **título humano** + **porquê em 1 frase** + **o que fazer em passos** + **quando tentar** — tudo no idioma do dia-a-dia
- Falhas leves (vídeo a processar) deixam de parecer desastres
- Erros críticos (conta desligada, quota) ficam visualmente distintos
- Suporte recebe relatórios consistentes (botão de cópia)
- Zero jargão de "Token", "OAuth", "Edge Function", "Rate limit" na UI principal — passa para "Detalhes técnicos" colapsado

### Checkpoint
☐ Falha 409 duplicado mostra "Já publicaste esta legenda hoje" com botão "Adicionar variação" funcional  
☐ Vídeo IG a processar mostra **toast azul info** (não vermelho)  
☐ Conta desligada mostra **borda vermelha + ícone 🛑** + link directo para Definições → Contas  
☐ Em `Recovery.tsx`, `error_log` cru deixa de aparecer — substituído pelo card explicativo  
☐ Botão "📋 Copiar para suporte" copia bloco formatado com código + origem + ID + hora  
☐ `whenToRetry='auto'` para retries que o backend já está a fazer (ZWSP) — toast diz "Estamos a tentar de novo automaticamente"

