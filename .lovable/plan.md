

## Refinamentos ao Diagnóstico de Upload

### Problemas encontrados

1. **Falso positivo na detecção de "Invalid key"** (linha 39 de `usePublishWithProgress.ts`): O check `msg.includes('key')` é demasiado amplo — qualquer erro que contenha a palavra "key" (ex: "API key invalid", "primary key") seria incorrectamente classificado como problema de nome de ficheiro. Deve ser mais restritivo.

2. **Newline no toast não renderiza**: O `\n` dentro do `description` do toast sonner não cria uma quebra de linha visível — o texto aparece colado. Deve ser separado em linhas distintas ou usar outro padrão.

3. **Formato não suportado dá falso positivo se MIME estiver vazio**: Quando `file.type` é vazio (acontece em alguns browsers para ficheiros arrastados), a condição `!allSupported.includes(file.type)` é verdadeira, e o diagnóstico diz "formato não suportado" mesmo que a extensão seja válida (ex: `.mp4`).

### Plano de correção

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `src/hooks/usePublishWithProgress.ts` | **Corrigir falso positivo "key"**: Mudar `msg.includes('key')` para apenas `msg.includes('invalid key')` (remover o check solto de `'key'`). |
| 2 | `src/hooks/usePublishWithProgress.ts` | **Corrigir toast description**: Substituir `\n` por ` — ` para manter a sugestão visível numa linha. Ex: `"ficheiro.mp4 contém caracteres especiais — Renomeie usando letras e hífens"`. |
| 3 | `src/hooks/usePublishWithProgress.ts` | **Corrigir detecção MIME vazia**: Antes de declarar "formato não suportado", verificar se a extensão do ficheiro é válida (`.mp4`, `.jpg`, etc). Se a extensão for válida mas o MIME estiver vazio, não classificar como formato inválido — deixar cair no fallback genérico. |

### Detalhe técnico

**Ponto 1** — Linha 39:
```typescript
// ANTES (falso positivo)
if (msg.includes('invalid key') || msg.includes('invalid input') || msg.includes('key')) {

// DEPOIS (preciso)
if (msg.includes('invalid key') || msg.includes('invalid input')) {
```

**Ponto 2** — Linha 580:
```typescript
// ANTES (newline não renderiza)
description: `${diagnosis.detalhe}\n💡 ${diagnosis.sugestao}`,

// DEPOIS
description: `${diagnosis.detalhe} — 💡 ${diagnosis.sugestao}`,
```

**Ponto 3** — Linhas 57-63:
```typescript
// ANTES
if (!allSupported.includes(file.type) || msg.includes('mime') || ...) {

// DEPOIS — verificar se a extensão é conhecida antes de rejeitar
const knownExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'qt', 'm4v'];
const hasValidExt = knownExts.includes(ext);
if ((!allSupported.includes(file.type) && !hasValidExt) || msg.includes('mime') || ...) {
```

Correcções cirúrgicas, sem alterar a estrutura existente.

