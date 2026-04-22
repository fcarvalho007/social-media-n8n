

## Refinamentos Finais — Pré-validação Inteligente (Fase 2)

Após a integração inicial, identifiquei **7 pontos de polimento** que fecham a feature com qualidade. Todos têm baixo risco, alteram apenas ficheiros já criados nesta auditoria.

---

### 🔴 R1 — Remover bloqueio 24h legado em `usePublishWithProgress.ts`

O bloco das linhas 482-516 ficou no sítio mas é **redundante**: o `duplicateValidator` já mostra a mesma informação no painel, sem fazer query extra à BD no momento de publicar (que adiciona latência ao botão).

**Acção:** apagar o bloco inteiro (`if (!params.skipDuplicateCheck && caption?.trim()) { ... }`). Backend continua a fazer ZWSP retry como hoje.

---

### 🔴 R2 — Hashtags reais no `useSmartValidation`

Em `ManualCreate.tsx:556` passa-se `hashtags: []` hardcoded. Isto faz com que o `captionValidator` nunca detecte excesso de 30 hashtags — bug silencioso.

**Acção:** descobrir o estado real de hashtags na página (existe `hashtagsList`/`hashtags`?) e ligar correctamente. Se não houver estado dedicado, extrair via regex `/#\w+/g` da `caption` no próprio hook.

---

### 🟡 R3 — Eliminar `<AspectRatioWarning>` triplicado

Aparece 3 vezes (linhas 2401, 2408, 2591), duas das quais marcadas como deprecated. Como o `mediaAspectValidator` já cobre o caso com auto-fix, removem-se as 3 ocorrências e o import. Reduz código e evita avisos duplicados ao utilizador.

---

### 🟡 R4 — Substituir gating legado pelo `smartValidation`

O `handlePublishWithValidation` (linha 710-714) ainda usa `hasErrors` da função antiga `getValidationErrors()`. Com o `smartValidation.canPublish` activo, o utilizador vê **dois** sistemas de erros: cards no painel + toast vermelho.

**Acção:**
- Substituir `if (hasErrors) ... toast.error(...)` por `if (!smartValidation.canPublish) { setValidationSheetOpen(true); toast.error('Resolve os problemas no painel de validação'); return; }`.
- Manter `getValidationErrors()` apenas para `handleSubmitForApproval` (linha 1267) e `handlePublishNow` (linha 1441) onde valida campos não cobertos pelo smart validator (ex: conta/perfil seleccionado), ou migrar também (a verificar caso a caso).
- Remover o estado `showValidation` se deixar de ser usado.

---

### 🟡 R5 — `canPublish` permite GBP só com texto

Actualmente exige `mediaFiles.length > 0`. O Google Business **aceita** posts apenas-texto, e o `formatValidator` já bloqueia formatos que requerem mídia. A condição extra impede publicação válida.

**Acção:** remover `mediaFiles.length > 0` de `canPublish` em `useSmartValidation.ts:180`. Deixar essa decisão aos validadores específicos (`formatValidator` já reporta "requer mídia" quando aplicável).

---

### 🟢 R6 — Cache key inclui hashtags

`buildValidationCacheKey` em `runValidators.ts` não inclui `hashtags`, logo alterações ao array não invalidam o cache → user adiciona/remove hashtag e o painel não actualiza.

**Acção:** adicionar `hashtagsCount: ctx.hashtags.length, hashtagsHead: ctx.hashtags.slice(0, 10).join(',')` ao objecto serializado.

---

### 🟢 R7 — Estabilizar IDs em validadores de mídia

`mediaAspectValidator` e `mediaResolutionValidator` usam `affectedIndices.join(',')` no `id`. Quando o utilizador reordena ou remove mídia, o `id` muda mas o estado `dismissed` no hook ainda contém o antigo. Não é bug crítico, mas suja `dismissed` ao longo da sessão.

**Acção:** `useEffect` adicional em `useSmartValidation` que limpa `dismissed` para IDs que deixem de existir em `issues`. Pequeno garbage collector.

---

### Ficheiros a editar

| Ficheiro | Pontos |
|---|---|
| `src/hooks/usePublishWithProgress.ts` | R1 (remover ~35 linhas) |
| `src/pages/ManualCreate.tsx` | R2, R3, R4 (~40 linhas tocadas) |
| `src/hooks/useSmartValidation.ts` | R5, R7 (~10 linhas) |
| `src/lib/validation/runValidators.ts` | R6 (2 linhas) |

### Resultado esperado

- Botão Publicar deixa de ter latência extra (sem query 24h)
- Hashtags >30 são detectadas em tempo real
- Apenas **um** sistema de avisos visível (sem duplicação)
- GBP só-texto pode publicar normalmente
- Painel actualiza ao mudar hashtags
- Estado interno do hook fica auto-limpo

### Checkpoint
☐ Cole 35 hashtags na caption IG → painel mostra warning "Mais de 30 hashtags"  
☐ Selecione apenas `googlebusiness_post` + caption ≥30 chars sem mídia → botão Publicar fica activo  
☐ `<AspectRatioWarning>` deixa de aparecer (apenas o card do painel)  
☐ Botão Publicar reage instantaneamente (sem 200-500 ms de query 24h)  
☐ Mudar hashtags reflecte no painel sem precisar tocar na caption

