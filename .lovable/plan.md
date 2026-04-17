

## Diagnóstico: Porque é que o Instagram falhou

### O que aconteceu (factos confirmados na BD)

**Post:** `d0cc4979-69e4-4e7c-bb7e-495d744075e7` (carrossel IA semana — Claude Opus 4.7, Codex 2.0, Adobe Firefly)

| Plataforma | Resultado | Detalhe |
|---|---|---|
| LinkedIn (Documento PDF) | ✅ Publicado | `urn:li:ugcPost:7450941897558237184` às 16:23:00 |
| Instagram (Carrossel) | ❌ Falhou | Getlate devolveu HTTP **409** às 16:23:12 |

### Causa raíz (mensagem real do Getlate)

```
"This exact content is already scheduled, publishing, or was posted 
to this account within the last 24 hours."
existingPostId: 69e25e7035b27f33762e021d
```

O Getlate detetou que **o mesmo conteúdo (mesma legenda + mesmo media)** já tinha sido enviado para o Instagram nas últimas 24h e bloqueou a publicação por **proteção anti-duplicação do lado deles**. Já existe um post com ID `69e25e7035b27f33762e021d` em curso/publicado.

Provavelmente publicaste (ou tentaste publicar) este mesmo carrossel no Instagram nas últimas 24 horas — a publicação anterior pode até estar no Instagram já, ou ainda em "publishing" no Getlate.

### Porque o modal mostrou "Erro inesperado" + badge "Interno"

O `classifyErrorFromString` em `src/lib/publishingErrors.ts` **não tem nenhum caso para 409 + "exact content already"**. O erro caiu no fallback final:
- código: `UNKNOWN`
- source: `internal` (porque não detetou nenhum padrão)
- mensagem: "Ocorreu um problema desconhecido"

Isto é enganador — o erro **não é interno nem desconhecido**: é uma proteção legítima do Getlate, **acionável** pelo utilizador (basta esperar 24h, alterar a legenda, ou verificar se a publicação anterior já saiu).

### Plano de correção (1 ficheiro)

**`src/lib/publishingErrors.ts`** — adicionar:

1. **Nova entrada em `ERROR_MESSAGES`:**
```ts
duplicate_content: {
  title: 'Conteúdo duplicado',
  description: 'Este conteúdo já foi publicado ou está em publicação nesta conta nas últimas 24h.',
  action: 'Verifica no Instagram/Getlate se já está publicado, ou altera a legenda',
  isRetryable: false,
  source: 'getlate',
}
```

2. **Novo bloco em `classifyErrorFromString`** (antes do fallback final), detectando:
   - `lower.includes('exact content')` ou
   - `lower.includes('already scheduled')` ou  
   - `lower.includes('within the last 24 hours')` ou
   - `httpStatus === 409` combinado com qualquer dos acima
   
   Devolve código `DUPLICATE_CONTENT`, source `getlate`, action específica e `isRetryable: false`.

3. **Mapping em `getErrorInfoFromStructured`:** adicionar `'DUPLICATE_CONTENT': 'duplicate_content'`.

### Resultado depois da correção

O modal passará a mostrar:
- 🔗 **Getlate** (badge correto — não "Interno")
- **"Conteúdo duplicado"** (título)
- **"Este conteúdo já foi publicado ou está em publicação nesta conta nas últimas 24h."**
- Ação: "Verifica no Instagram/Getlate se já está publicado, ou altera a legenda"

### O que fazer agora (ação imediata, sem código)

1. Verifica o Instagram `@frederico.m.carvalho` — o carrossel da newsletter DIGITALSPRINT provavelmente já está publicado (ou em processamento).
2. Se sim, marca este post como publicado manualmente ou ignora o erro.
3. Se queres mesmo republicar, edita ligeiramente a legenda (ex: muda emoji/ordem) para o Getlate aceitar.

