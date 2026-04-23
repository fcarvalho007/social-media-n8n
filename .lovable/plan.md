# Plano: corrigir thumbnail e contexto dos rascunhos em `/dashboard`

## O que vai ser corrigido
1. Tornar o thumbnail de rascunhos com vídeo/reel fiável no Dashboard.
2. Garantir que a legenda/contexto do rascunho aparece sempre no cartão.
3. Corrigir a persistência do tipo real do draft para um reel não voltar a ser tratado como carrossel.
4. Alinhar `/dashboard`, `/drafts` e recuperação de rascunhos para usarem a mesma lógica.

## Problemas encontrados
- O Dashboard lê os rascunhos só com `media_urls` e `caption`, sem metadados de preview.
- Para vídeos, o cartão tenta mostrar diretamente `<video src=...>` sem `poster`; isso depende do browser e pode ficar sem frame visível.
- O `saveDraft` colapsa formatos Instagram para `instagram_carrousel`, o que faz um reel perder o tipo real ao ser guardado.
- O contexto do draft não está totalmente normalizado entre Dashboard, lista de rascunhos e recuperação/edição.

## Implementação proposta
### 1) Persistência de drafts mais completa
- Rever o fluxo `saveDraft` para guardar o formato real do rascunho (ex.: `instagram_reel`, `instagram_carousel`, `linkedin_document`).
- Persistir metadados de preview do media do draft, com prioridade para um thumbnail/poster de vídeo quando o ficheiro for um reel ou outro vídeo.
- Preservar também o contexto de legenda necessário para reabrir o draft sem perda de informação.

### 2) Preview fiável para vídeo no Dashboard
- Atualizar `usePendingContent` para ler os novos metadados do draft e construir o preview com prioridade para `thumbnail/poster`, só caindo para o URL bruto quando não existir alternativa.
- Expandir `mediaPreview.ts` para normalizar estes campos de forma consistente.
- Ajustar `PendingThumbnail` para usar imagem-poster em vídeos sempre que existir, mantendo badge, data e excerto da legenda.

### 3) Consistência entre Dashboard, Drafts e edição
- Aplicar a mesma normalização em `DraftCard` e no carregamento do draft em `/create`.
- Corrigir a recuperação de drafts para respeitar o formato guardado e não reabrir reels como carrossel.
- Garantir que o texto apresentado no Dashboard usa a melhor legenda disponível do draft guardado.

### 4) Validação final
- Confirmar o caso reportado: reel guardado aparece com thumbnail visível em `/dashboard`.
- Confirmar que a legenda/excerto aparece no cartão.
- Confirmar que ao abrir o rascunho em edição o formato continua a ser reel.
- Executar verificação de TypeScript/testes após as alterações.

## Detalhes técnicos
- Ficheiros prováveis: `src/hooks/usePendingContent.ts`, `src/components/PendingThumbnail.tsx`, `src/lib/mediaPreview.ts`, `src/hooks/manual-create/usePublishOrchestrator.ts`, `src/hooks/manual-create/useDraftRecovery.ts`, `src/components/drafts/DraftCard.tsx`.
- Será provavelmente necessária uma migração para enriquecer `posts_drafts` com metadados de formato/preview, mantendo compatibilidade com drafts antigos.
- Os drafts antigos continuarão a usar fallback por `media_urls` quando não tiverem os novos campos.

## Checkpoint
- ☐ Reel guardado mostra thumbnail fiável em `/dashboard`
- ☐ Cartão mostra legenda/excerto quando existir
- ☐ Draft reabre com o formato correto
- ☐ `/dashboard` e `/drafts` usam a mesma lógica de preview
- ☐ TypeScript/testes sem regressões