

## Correcção do Histórico de Publicações — Duplicações e UX

### Problemas confirmados com dados reais

**Base de dados**: O post `06757d6e` (publicado com sucesso em Instagram, Facebook, YouTube, TikTok) tem **8 attempts** quando deveria ter **4**. Cada plataforma tem 2 registos: um "pending" e um "success", porque a edge function **insere um novo registo** em vez de actualizar o existente.

**UI**: O ecrã mostra 9 cards separados (8 attempts + 1 post falhado anterior), quando deveria mostrar **2 cards** consolidados. A lógica de agrupamento por `post_id` existe no código mas aparenta não estar a funcionar correctamente no browser — possível problema de deploy ou cache.

### Plano de implementação

| # | Ficheiro | Alteração |
|---|----------|-----------|
| 1 | `supabase/functions/publish-to-getlate/index.ts` | **Corrigir duplicação na origem**: Em vez de inserir "pending" + inserir "success/failed", inserir "pending" com `id` guardado, depois fazer `UPDATE` desse registo para "success" ou "failed". Elimina duplicações futuras. |
| 2 | Migração SQL | **Limpar duplicados existentes**: Remover attempts duplicados (manter apenas o mais recente por combinação `post_id + platform + format`). |
| 3 | `src/pages/PublicationHistory.tsx` | **Deduplicar no UI como safety net**: Dentro de cada grupo consolidado, deduplicar platforms por `platform + format`, mantendo o registo com status final (success/failed > pending). |
| 4 | `src/pages/PublicationHistory.tsx` | **Melhorar UX/UI dos cards**: (a) Mostrar tema/legenda de forma proeminente no título do card; (b) Mostrar todas as plataformas como badges compactos numa linha; (c) Adicionar contagem de plataformas (ex: "4 redes · Sucesso"); (d) Thumbnail maior e mais limpa; (e) Melhor hierarquia visual entre cards consolidados e detalhe expandido. |
| 5 | `src/pages/PublicationHistory.tsx` | **Melhorar subtítulo descritivo**: Substituir "Todas as publicações e tentativas" por "Centro de comando — registo de todas as publicações e tentativas" (já parcialmente feito). |

### Detalhe técnico

**Edge function — eliminar duplicações (ponto 1)**:
```typescript
// Inserir attempt inicial e guardar o ID
const { data: attemptData } = await supabase
  .from('publication_attempts')
  .insert({ post_id, platform: network, format, status: 'pending' })
  .select('id')
  .single();

const attemptId = attemptData?.id;

// Após resultado da API, actualizar em vez de inserir novo
await supabase
  .from('publication_attempts')
  .update({ status: 'success', response_data: result.data })
  .eq('id', attemptId);
```

**Deduplicação no UI (ponto 3)**:
```typescript
// Dentro de cada grupo de attempts por post_id,
// deduplicar por platform+format, preferindo status final
const deduped = new Map<string, PlatformResult>();
for (const pr of postAttempts) {
  const key = `${pr.platform}-${pr.format}`;
  const existing = deduped.get(key);
  if (!existing || pr.status !== 'pending') {
    deduped.set(key, pr);
  }
}
```

**Card consolidado melhorado (ponto 4)**:
- Título: `"15:11 · Será que o mercado precisa de um marketer T-shaped"`
- Subtítulo: `"4 redes · Reel · Sucesso total"` ou `"3/4 redes · Falha parcial"`
- Badges compactos: `[IG ✓] [FB ✓] [YT ✓] [TT ✓]`
- Expandir para ver detalhes por plataforma

**Limpeza de dados (ponto 2)**:
```sql
DELETE FROM publication_attempts a
USING publication_attempts b
WHERE a.post_id = b.post_id
  AND a.platform = b.platform
  AND a.format = b.format
  AND a.status = 'pending'
  AND b.status IN ('success', 'failed')
  AND a.id <> b.id;
```

### Resultado esperado

- Um post publicado em 4 redes = **1 card** com 4 badges de plataforma
- Sem duplicações no histórico
- Tema/legenda visível directamente no card
- Contagem de stats precisa (207 → ~105 posts reais)

