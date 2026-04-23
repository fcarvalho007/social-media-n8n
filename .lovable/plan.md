

## Auditoria — Validações & Mensagens de Erro no Post Review (`/review/:id`)

### Problemas detectados

| # | Problema | Severidade |
|---|---|---|
| 1 | `CaptionEditor` (IG) mostra contador a vermelho quando >2200, mas `<Textarea>` **sem `maxLength`** — permite escrever indefinidamente | Alta |
| 2 | `RichTextEditor` (LinkedIn) usa default `maxLength=2200` quando o limite real é **3000**. Pior: trunca silenciosamente via `slice(0, maxLength)` | Alta |
| 3 | Sem contador de hashtags (#N/30) visível — utilizador só descobre erro ao tentar aprovar | Média |
| 4 | `useEffect` de validação tem guard `if (post && caption)` — se apagar tudo, `validations` fica **stale** | Média |
| 5 | `disabledReason` genérico ("Corrigir os erros indicados") — não diz QUAL erro nem ONDE | Alta |
| 6 | Quando ambas plataformas activas, contador mostra só 2200 sem indicar "limite IG mais restritivo" | Média |
| 7 | State `hashtags` (carregado da BD) desincroniza das hashtags inline na caption | Alta |
| 8 | Warnings (⚠️) só aparecem como ícone na badge — texto nunca é mostrado | Média |
| 9 | `>20` hashtags = warning, `>30` = erro. Utilizador não percebe a diferença | Baixa |

### Plano de correções (3 fases)

**Fase 1 — Limites correctos por plataforma (correcções críticas)**

1.1. `RichTextEditor.tsx`: remover truncagem silenciosa. Mudar `e.target.value.slice(0, maxLength)` para `e.target.value` (deixa passar; validação reporta o excesso). Contador fica vermelho quando excede, em vez de cortar.

1.2. `Review.tsx`: passar `maxLength={3000}` explícito ao `RichTextEditor` do LinkedIn body (linha onde for usado).

1.3. `CaptionEditor.tsx`: adicionar prop opcional `maxLength` (default 2200) e propagar para o `<Textarea>` (sem `maxLength` HTML — apenas validação visual). Adicionar `aria-invalid` + mensagem inline `"Excede limite IG de 2200 caracteres por X."` quando excede.

**Fase 2 — Sincronizar hashtags e mostrar contador**

2.1. Em `Review.tsx`, derivar `hashtags` da `caption` (regex `/#[\w\u00C0-\u017F]+/g`) **na validação**, em vez de usar o state `hashtags` (que vem da BD e nunca é actualizado quando utilizador edita inline). Manter o state apenas para guardar na BD.

2.2. Adicionar contador de hashtags ao lado do contador de caracteres no `CaptionEditor`:  
`23/30 #` — verde até 20, âmbar 20-30, vermelho >30 (para Instagram).

2.3. Corrigir guard do `useEffect` (linha 155): mudar `if (post && caption)` → `if (post)`. Caption vazia deve revalidar (pode ser válido ou não consoante regras).

**Fase 3 — Mensagens de erro contextuais e bloqueio claro**

3.1. Criar componente `ValidationSummary.tsx` (~60 linhas) que renderiza, perto do `ActionBar`, uma lista compacta dos erros e warnings activos:

```text
❌ Instagram: legenda excede 2200 (atual: 2342)
❌ Instagram: 32 hashtags (máximo 30)
⚠️ LinkedIn: 7 hashtags (recomendado até 5)
```

3.2. Substituir `disabledReason` genérico por mensagem específica do primeiro erro:
```ts
disabledReason: firstErrorMessage ?? 'Selecionar template e plataforma'
```

3.3. No tooltip do botão "Aprovar" e "Agendar", mostrar a mesma mensagem (já existe a estrutura, falta o conteúdo).

3.4. Indicador de proximidade do limite no contador de caracteres: amarelo a partir de 90% (1980/2200), vermelho a partir de 100%.

### Detalhe técnico

- **Ficheiros a editar:** `RichTextEditor.tsx`, `CaptionEditor.tsx`, `Review.tsx` (linhas 149-172, ~1660-1686).
- **Ficheiro a criar:** `src/components/publishing/ValidationSummary.tsx`.
- **Sem alterações a `publishingValidation.ts`** — a lógica está correcta, falta apenas expor.
- **Tipo de hashtags:** continuar a guardar `hashtags_edited` na BD com a derivação da regex no momento do save.

### Checkpoint

☐ `RichTextEditor` deixa de truncar silenciosamente; LinkedIn passa a permitir até 3000  
☐ `CaptionEditor` aceita `maxLength` por prop e mostra mensagem inline ao exceder  
☐ Contador de hashtags `N/30` visível com cores semáforo (verde / âmbar / vermelho)  
☐ Validação revalida quando caption fica vazia (guard corrigido)  
☐ Hashtags sincronizadas a partir da caption (single source of truth)  
☐ `ValidationSummary` renderizado acima do `ActionBar` listando erros e avisos  
☐ `disabledReason` mostra a primeira mensagem de erro específica  
☐ Tooltips de Aprovar e Agendar mostram a mensagem específica  
☐ `npx tsc --noEmit` 0 erros  
☐ `bun run build:dev` passa  
☐ Testes existentes (`Recovery`, `Quota`) continuam verdes

### Fora do escopo

- Validações de imagem (já cobertas por `useImagePrevalidation`)
- Refactor do tamanho de `Review.tsx` (1762 linhas) — prompt dedicado
- Validação de caracteres especiais ou emojis múltiplos no LinkedIn

