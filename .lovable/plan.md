
## Diagnóstico

O problema principal não é o thumbnail em si: o rascunho continua a aparecer no Dashboard porque o fluxo de publicação cria um novo registo de publicação, mas não elimina nem invalida o rascunho original depois de publicar com sucesso.

Encontrei também um segundo problema relacionado: o post associado ficou com estado `failed` porque uma rede falhou primeiro, mas depois outras redes foram publicadas com sucesso. O sistema atual permite que uma falha parcial marque a publicação inteira como falhada antes de o resultado agregado estar concluído.

## Plano de correção

### 1. Remover automaticamente o rascunho após publicação bem-sucedida

Atualizar o fluxo de `/manual-create` para que, quando um rascunho carregado for publicado com sucesso:

- apague o registo correspondente em `posts_drafts`;
- limpe o `currentDraftId`;
- invalide a cache de rascunhos;
- limpe a cache do calendário;
- atualize imediatamente o Dashboard sem depender apenas de realtime.

Também aplicar a mesma regra quando um rascunho for submetido para aprovação com sucesso.

### 2. Corrigir a lógica de estado em publicações multi-rede

Ajustar o fluxo de publicação para evitar que uma falha isolada marque o post inteiro como `failed` enquanto ainda existem redes em processamento.

Nova regra:

```text
Todas falharam       -> failed
Alguma publicou      -> published
Agendada aceite      -> scheduled
Ainda a processar    -> publishing / scheduled
```

Isto evita que casos como “LinkedIn falhou, mas TikTok/YouTube/Facebook publicaram” fiquem presos como falha total.

### 3. Melhorar a função de publicação

Na backend function `publish-to-getlate`:

- deixar de marcar o post como `failed` de forma definitiva quando apenas uma plataforma falha;
- registar a falha em `publication_attempts`;
- deixar o estado final do post para o agregador do frontend;
- quando uma plataforma publica sem URL externo, guardar pelo menos o identificador da plataforma/Getlate nos metadados;
- marcar o post como `published` quando há confirmação real de sucesso, mesmo que a API não devolva link público.

### 4. Reconciliar dados antigos ou inconsistentes

Adicionar uma rotina de reconciliação leve no carregamento do Dashboard e/ou Histórico:

- se um post estiver `failed`, mas tiver `publication_attempts.status = success`, corrigir visualmente o estado para “Parcial/Publicado”;
- não mostrar como rascunho pendente um rascunho que corresponde claramente a uma publicação já criada/publicada;
- aplicar uma limpeza pontual ao rascunho atual que já foi usado para publicar, para sair imediatamente do Dashboard.

### 5. Melhorar a deteção futura no Dashboard

Atualizar `usePendingContent` para não depender apenas de `posts_drafts.status = draft`.

A listagem de rascunhos deve excluir automaticamente rascunhos que tenham:

- mesma legenda;
- mesmo utilizador;
- publicação criada depois do rascunho;
- tentativa de publicação bem-sucedida ou estado `published/scheduled/publishing`.

Isto funciona como rede de segurança caso uma eliminação automática falhe por cache, ligação ou mudança de página.

### 6. Melhorar a página de Rascunhos

Atualizar `useDrafts` para seguir a mesma regra de exclusão, evitando que `/drafts` mostre rascunhos já consumidos pela publicação.

Também adicionar invalidação de cache após:

- publicar;
- submeter para aprovação;
- eliminar rascunho;
- mover/agendar no calendário.

### 7. Testes e validação

Validar:

- publicar a partir de rascunho remove o rascunho do Dashboard;
- publicar a partir de rascunho remove o rascunho de `/drafts`;
- falha parcial não deixa o post como falha total se alguma rede publicou;
- respostas de sucesso sem URL continuam a marcar o post como publicado;
- Dashboard não mostra rascunhos “fantasma” após refresh;
- TypeScript sem erros;
- testes unitários dos helpers de reconciliação passam.

## Ficheiros previstos

- `src/hooks/manual-create/usePublishOrchestrator.ts`
- `src/hooks/usePublishWithProgress.ts`
- `src/hooks/usePendingContent.ts`
- `src/hooks/useDrafts.ts`
- `supabase/functions/publish-to-getlate/index.ts`
- testes associados aos helpers de publicação/rascunhos

## Checkpoint

- ☐ Rascunho publicado deixa de aparecer no Dashboard.
- ☐ Rascunho publicado deixa de aparecer em `/drafts`.
- ☐ Publicação parcial deixa de ficar marcada como falha total.
- ☐ Sucessos sem URL externo continuam a atualizar o estado da publicação.
- ☐ Dashboard passa a filtrar rascunhos fantasma automaticamente.
- ☐ O rascunho antigo já publicado é limpo dos dados atuais.
- ☐ Validação TypeScript e testes ficam verdes.
