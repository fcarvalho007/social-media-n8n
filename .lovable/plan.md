## Plano de implementação — Opções por rede em `/manual-create`

### Enquadramento importante
A UI e a persistência dos novos campos são diretas. A parte de publicação real para comentários, colaboradores, tags em fotografia, YouTube e Google Business depende do que o conector de publicação atual aceita. Hoje o fluxo publica através da função `publish-to-getlate`, que envia um payload genérico para a API de publicação. Não existe, no código atual, chamada direta à Meta Graph API, LinkedIn API, YouTube Data API v3 ou Google Business Profile API.

Por isso, a implementação deve ser faseada:

1. Primeiro criar a UI, estado, rascunhos e validações.
2. Depois passar os metadados avançados para a função de publicação.
3. Só ativar envio real para cada campo quando houver suporte confirmado no conector/API. Quando não houver suporte, guardar como metadado e apresentar aviso não bloqueante em vez de prometer que foi publicado.

---

## Fase 1 — Base técnica e estrutura visual

### 1. Criar modelo único de dados
Criar um tipo central para as opções avançadas por rede, por exemplo:

```ts
networkOptions = {
  instagram: {
    firstComment: string,
    collaborators: string[],
    formatVariant: 'feed' | 'story' | 'reel' | 'carousel',
    photoTags: [{ username, x, y, slideIndex }]
  },
  linkedin: {
    firstComment: string,
    mentions: [{ profile, displayName }],
    disableLinkPreview: boolean
  },
  facebook: {
    firstComment: string,
    formatVariant: 'feed' | 'story' | 'reel'
  },
  youtube: {
    title: string,
    tags: string[],
    visibility: 'public' | 'unlisted' | 'private',
    category: string
  },
  googlebusiness: {
    ctaEnabled: boolean,
    ctaType: 'book' | 'order_online' | 'buy' | 'learn_more' | 'sign_up' | 'call_now',
    ctaUrl: string
  }
}
```

### 2. Adicionar a secção “Opções por rede”
Criar um novo componente entre “Legenda” e “Agendamento”:

- Secção principal colapsável: “Opções por rede”.
- Fechada por defeito.
- Dentro, um accordion por cada rede selecionada.
- Cada bloco mostra ícone + nome da rede.
- Se a rede não estiver selecionada, o bloco não aparece.
- Todos os campos continuam opcionais, exceto os defaults obrigatórios de YouTube: visibilidade e categoria.

Estrutura prevista:

```text
Legenda

Opções por rede
  Instagram
    First comment
    Collaborators
    Variante de formato
    Tag people in photo
  LinkedIn
    First comment
    @mention
    Disable link preview
  Facebook
    First comment
    Variante de formato
  YouTube
    Título
    Tags
    Visibilidade
    Categoria
  Google Business
    Call-to-action button

Agendamento
```

---

## Fase 1.1 — First comment

### UI
Adicionar `First comment` nos blocos:

- Instagram: limite 2200.
- LinkedIn: limite 1250.
- Facebook: limite 8000.

Cada campo terá:

- Textarea.
- Placeholder: “Adiciona contexto extra ou um CTA aqui.”
- Contador de caracteres.
- Estado visual de erro se exceder o limite.

Nota: o componente antigo `FirstCommentInput.tsx` existe, mas está desalinhado com a nova regra porque só mostra um campo global e atualmente considera LinkedIn/Facebook como não suportados. A nova implementação deve substituir esse padrão por campos por rede.

### Validação
Integrar no painel “Corrige X problemas para publicar”:

- First comment acima do limite da rede → erro bloqueante.
- Botão “Corrigir” foca diretamente o campo da rede correspondente.

### Publicação
- Guardar os first comments no post/draft.
- Enviar para a função de publicação dentro de `network_options`.
- Se o conector suportar primeiro comentário por rede, publicar após o post principal.
- Se não suportar, guardar aviso em `publish_metadata` e não marcar a publicação como falhada.

---

## Fase 1.2 — Mentions e colaboradores

### Instagram — Collaborators
Adicionar no bloco Instagram:

- Input para `@username`.
- Botão para adicionar.
- Lista de colaboradores adicionados.
- Máximo 3.
- Validação: tem de começar por `@`, sem espaços, com username válido.

Erros:

- Mais de 3 colaboradores → erro bloqueante.
- Formato inválido → erro bloqueante ou aviso, conforme severidade final escolhida no validador.

### LinkedIn — @mention
Adicionar no bloco LinkedIn:

- Campo “username ou URL do perfil”.
- Campo “nome a apresentar”.
- Botão “Inserir”.

Comportamento:

- Ao clicar em “Inserir”, a menção é inserida na legenda LinkedIn na posição atual do cursor quando possível.
- Se o editor estiver em legenda unificada, insere na legenda geral.
- Se estiver em legendas separadas, insere na legenda LinkedIn.

Validação:

- Perfil/URL com formato inválido → aviso.
- Nome a apresentar vazio quando se tenta inserir → aviso ou bloqueio local do botão.

---

## Fase 1.3 — LinkedIn “Disable link preview”

Adicionar checkbox no bloco LinkedIn:

- Texto: “Desativar pré-visualização do link”.
- Guardar em `networkOptions.linkedin.disableLinkPreview`.
- Enviar no payload avançado de publicação.
- Se o conector/API atual não suportar esta opção, registar como aviso de capacidade, sem bloquear publicação.

---

## Fase 2 — YouTube

### Campos
No bloco YouTube:

- Título opcional, contador `0/100`.
  - Se vazio, usar os primeiros 100 caracteres da legenda no payload.
- Tags em chips, adicionadas com Enter.
  - Validar total máximo de 500 caracteres.
- Visibilidade obrigatória:
  - Public (Anyone)
  - Unlisted (Link only)
  - Private (Only you)
  - Default: Public.
- Categoria obrigatória:
  - Film & Animation
  - Autos & Vehicles
  - Music
  - Pets & Animals
  - Sports
  - Travel & Events
  - Gaming
  - People & Blogs
  - Comedy
  - Entertainment
  - News & Politics
  - Howto & Style
  - Education
  - Science & Technology
  - Nonprofits & Activism
  - Default: People & Blogs.

### Validações
- YouTube selecionado sem categoria → erro bloqueante.
- Tags YouTube acima de 500 caracteres no total → erro bloqueante.
- Título acima de 100 caracteres → erro bloqueante.

---

## Fase 3 — Instagram avançado, Facebook e Google Business

### Instagram — Variante de formato
Adicionar tabs no bloco Instagram:

- Feed
- Story
- Reel
- Carousel

A escolha deve sincronizar, sempre que possível, com o formato selecionado em “Selecione onde publicar”. Se houver conflito, mostrar aviso em vez de alterar silenciosamente.

### Instagram — Tag people in photo
Adicionar:

- Botão “+ Adicionar tag”.
- Modal com:
  - Campo `@username`.
  - Seleção de slide para carrossel.
  - Clique na imagem para gravar coordenadas `x` e `y` entre `0.0` e `1.0`.
  - Box informativa azul com instruções.
- Lista de tags adicionadas.
- Botão remover.

Validação:

- Coordenadas fora de `0.0–1.0` → erro bloqueante.
- Username inválido → erro bloqueante.

### Facebook — Variante de formato
Adicionar tabs:

- Feed
- Story
- Reel

Sincronizar com formatos selecionados quando possível.

### Google Business — CTA
Adicionar:

- Checkbox: “Adicionar botão de call-to-action (opcional)”.
- Quando ativo:
  - Dropdown: Book, Order online, Buy, Learn more, Sign up, Call now.
  - Input URL, exceto para Call now.

Validação:

- CTA ativo sem URL quando o tipo não é “Call now” → erro bloqueante.
- URL inválida → erro bloqueante.

---

## Persistência em rascunhos e posts

### Base de dados
Adicionar colunas JSONB para evitar multiplicar colunas por rede:

- `posts_drafts.network_options jsonb default '{}'`
- `posts.network_options jsonb default '{}'`

Opcionalmente, se preferirmos reaproveitar campos existentes:

- `posts.first_comment` já existe, mas é global e não chega para first comment por rede.
- `posts.publish_metadata` já existe, mas misturar dados editáveis do utilizador com telemetria de publicação torna o histórico mais confuso.

Recomendação: criar `network_options` para dados de criação/publicação e deixar `publish_metadata` para resultado técnico.

### Rascunhos
Atualizar:

- Auto-save local.
- Guardar rascunho explícito.
- Carregar rascunho.
- Recuperar/reutilizar post.

---

## Validação e foco direto no campo

Criar um novo validador, por exemplo `networkOptionsValidator`, integrado no sistema existente.

Novos problemas no painel:

- YouTube selecionado sem categoria → erro.
- LinkedIn @mention com formato inválido → aviso.
- Instagram com mais de 3 colaboradores → erro.
- First comment acima do limite da rede → erro.
- Tag de pessoa em foto com coordenadas fora de `0.0–1.0` → erro.
- Google Business CTA ativo com URL inválida → erro.

Adicionar `fixHelpers.focusNetworkOption(network, field)` para os botões “Corrigir” abrirem:

1. A secção “Opções por rede”.
2. O accordion da rede.
3. O campo específico.

---

## Publicação e limitações da API

### Frontend
Atualizar `usePublishWithProgress` para enviar:

```ts
network_options: networkOptions
```

em cada chamada à função de publicação.

### Função de publicação
Atualizar `publish-to-getlate` para:

- Validar o novo payload no servidor.
- Incluir opções suportadas no payload enviado ao conector.
- Guardar opções e avisos em `posts.network_options` e `posts.publish_metadata`.
- Tratar falhas secundárias, como first comment, como aviso e não como falha total.

### Nota crítica
A instrução “usar Meta Graph API, LinkedIn API, YouTube Data API v3, Google Business Profile API” não pode ser implementada diretamente sem autenticação/tokens dessas APIs por rede. O projeto atual publica através do conector existente. Portanto:

- Se o conector suportar estes campos, mapeio diretamente.
- Se não suportar, deixo os campos guardados e validados, mas marco como “não enviado por falta de suporte do conector” em `publish_metadata`.
- Não vou criar integrações OAuth novas para Meta/LinkedIn/YouTube/Google nesta fase, porque isso seria uma feature separada de autenticação por rede.

---

## Ficheiros prováveis a alterar

- `src/pages/ManualCreate.tsx`
- `src/components/manual-post/steps/Step3CaptionCard.tsx`
- Novo componente: `src/components/manual-post/steps/NetworkOptionsCard.tsx`
- Possíveis subcomponentes:
  - `InstagramOptions.tsx`
  - `LinkedInOptions.tsx`
  - `FacebookOptions.tsx`
  - `YouTubeOptions.tsx`
  - `GoogleBusinessOptions.tsx`
- `src/hooks/useAutoSave.ts`
- `src/hooks/manual-create/useDraftRecovery.ts`
- `src/hooks/manual-create/usePublishOrchestrator.ts`
- `src/hooks/usePublishWithProgress.ts`
- `src/hooks/useSmartValidation.ts`
- `src/lib/validation/types.ts`
- `src/lib/validation/runValidators.ts`
- Novo validador: `src/lib/validation/validators/networkOptionsValidator.ts`
- Testes de validação novos
- `supabase/functions/publish-to-getlate/index.ts`
- Migração de base de dados para `network_options`

Não serão editados ficheiros bloqueados como `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts` ou `.env`.

---

## Ordem de execução recomendada

1. Implementar Fase 1.1: first comment por rede, persistência e validação.
2. Testar guardar/carregar rascunho com first comment.
3. Implementar Fase 1.2 e 1.3: colaboradores, mentions LinkedIn e disable link preview.
4. Testar rascunho e validação.
5. Implementar Fase 2: YouTube.
6. Testar rascunho e validação YouTube.
7. Implementar Fase 3: Instagram/Facebook variants, tags em fotografia e Google Business CTA.
8. Atualizar publicação e metadados avançados.
9. Validar TypeScript e testes.

---

## Checkpoint

- ☐ Nova secção “Opções por rede” aparece entre “Legenda” e “Agendamento”.
- ☐ A secção e os blocos por rede ficam colapsados por defeito.
- ☐ Só aparecem blocos das redes selecionadas.
- ☐ First comment existe por Instagram, LinkedIn e Facebook com limites próprios.
- ☐ Colaboradores Instagram aceitam no máximo 3 usernames válidos.
- ☐ Menção LinkedIn pode ser inserida na legenda.
- ☐ LinkedIn permite desativar preview de link.
- ☐ YouTube tem título, tags, visibilidade e categoria com defaults corretos.
- ☐ Instagram tem variante de formato e tags em fotografia com coordenadas.
- ☐ Facebook tem variante de formato.
- ☐ Google Business tem CTA opcional com validação de URL.
- ☐ Todos os campos são guardados e recuperados em rascunhos.
- ☐ Validações aparecem no painel “Corrige X problemas para publicar”.
- ☐ Botões “Corrigir” abrem diretamente o campo certo.
- ☐ Publicação envia `network_options` para a função backend.
- ☐ Falha de first comment gera aviso, não falha total.
- ☐ TypeScript e testes ficam verdes.