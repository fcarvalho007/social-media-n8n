## Plano — transformar `/manual-create` em assistente editorial com IA

### Observações importantes antes de implementar

- O projeto já tem uma função `improve-caption` com OpenAI, mas a regra atual do produto recomenda usar Lovable AI por defeito para novas funcionalidades. Vou criar novas funções de backend com Lovable AI para texto/visão, mantendo a função antiga intacta.
- Para transcrição de vídeo, Lovable AI não substitui diretamente Whisper. Como já existe `OPENAI_API_KEY`, a transcrição pode usar Whisper no backend, apenas para áudio extraído/ficheiro enviado. A geração textual seguinte usa Lovable AI.
- Não vou inventar scores de hashtags. A Fase 2 só mostra círculos de saturação quando houver fonte verificada; caso contrário, mostra chips sem score.
- A Fase 4 depende de métricas reais das redes. Como o projeto publica via Getlate e nem todas as APIs analíticas estão configuradas, vou implementar a estrutura, jobs e fallback seguro; a recolha real por rede fica ativada apenas onde houver credenciais/dados disponíveis.
- Não vou editar ficheiros bloqueados: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env` nem chaves globais em `supabase/config.toml`.

---

## Fase 1 — Assistente desde o upload

### UI no `/manual-create`

- Detetar após upload se existe exatamente 1 ficheiro e se é vídeo elegível:
  - vídeo vertical ou formato de vídeo isolado;
  - duração entre 5 segundos e 10 minutos;
  - excluir imagens, PDFs, carrosséis e vídeos fora do intervalo.
- Mostrar card destacado acima da secção “Legenda”:
  - título: “Queres que a IA prepare tudo por ti?”
  - botões: “Já tenho a legenda” e “Transcrever com IA”
  - texto de apoio conforme especificação.
- Se escolher “Já tenho a legenda”, esconder o card e manter o fluxo normal.
- Se escolher “Transcrever com IA”, mostrar skeleton/loading nos campos que serão preenchidos com a mensagem:
  - “A ouvir o vídeo e a preparar os campos… (15-20 segundos)”

### Backend IA

- Criar função backend `ai-editorial-assistant` para:
  1. receber vídeo/URL ou ficheiro preparado pelo frontend;
  2. transcrever áudio com Whisper usando segredo já existente;
  3. chamar Lovable AI uma vez para devolver estrutura com:
     - título do rascunho;
     - legenda base;
     - variantes por rede;
     - hashtags por grupo;
     - primeiro comentário;
     - alt text;
     - frases citáveis.
- Validar inputs e devolver erros pt-PT claros.
- Não bloquear o fluxo se a IA falhar; mostrar toast:
  - “A IA está indisponível. Podes preencher manualmente ou tentar de novo.”

### Persistência

- Adicionar campos necessários por migração:
  - `posts_drafts.raw_transcription`;
  - `posts.raw_transcription`;
  - metadados de IA em JSON, se necessário, para título/frases/estado.
- Garantir que rascunhos e publicações transportam a transcrição.
- Adicionar botão “Ver transcrição” de forma discreta, não visível por defeito.

### Teste isolado da Fase 1

- Testar upload de vídeo vertical válido.
- Confirmar que o card aparece só nos casos elegíveis.
- Confirmar que a IA preenche legenda, legendas por rede, hashtags e primeiro comentário.
- Guardar rascunho e recarregar para confirmar persistência da transcrição.

---

## Fase 3.2 — Reescrita por tom

### UI

- Adicionar barra compacta acima do textarea da legenda com botões:
  - “Mais direto”
  - “Mais emocional”
  - “Mais técnico”
  - “Mais curto”
  - “Mais longo”
  - “Tom LinkedIn”
  - “Tom Instagram”
- Cada botão terá loading próprio.
- A resposta substitui a legenda atual.
- Guardar histórico local das últimas 5 versões para permitir desfazer.

### Backend

- Criar/reutilizar função backend para reescrever texto com Lovable AI.
- Enviar apenas legenda atual, rede/contexto e instrução de tom.
- Prompt fica no backend, não no cliente.

### Teste isolado

- Testar cada tom com legenda curta e longa.
- Confirmar que Ctrl+Z/desfazer recupera versões anteriores.
- Confirmar que erros de IA não apagam a legenda original.

---

## Fase 3.4 — Alt text automático

### UI

- Na secção “Média”, abaixo do preview, adicionar campo “Alt text”.
- Mostrar:
  - texto gerado;
  - botão “Regenerar”;
  - contador 0/125;
  - checkbox “Aplicar a todas as imagens do carrossel” quando aplicável.

### Backend

- Criar função `ai-generate-alt-text` com Lovable AI multimodal.
- Para vídeo, usar o primeiro frame já extraído ou gerar frame antes de enviar.
- Guardar resultado em `alt_texts` existente, sem alterar a estrutura principal se não for necessário.

### Teste isolado

- Testar imagem única.
- Testar primeiro frame de vídeo.
- Testar carrossel com “Aplicar a todas”.
- Confirmar limite de 125 caracteres.

---

## Fase 2 — Caixa de hashtags inteligente

### UI dentro de “Legenda”

- Criar secção “Hashtags sugeridas” imediatamente abaixo do textarea principal.
- Organizar em 3 grupos:
  - “Alcance” — “Volume alto · Maior exposição”;
  - “Nicho” — “Volume médio · Comunidade ativa”;
  - “Marca” — “As tuas fixas”.
- Chips clicáveis:
  - clicar adiciona ao fim da legenda;
  - clicar novamente remove;
  - estado visual claro selecionado/não selecionado.
- Adaptar por rede ativa:
  - Instagram: até 30, recomendado 8-15;
  - TikTok: 3-5;
  - LinkedIn: 3-5;
  - X: 1-2;
  - Facebook: 2-3.
- Mostrar contador, por exemplo:
  - “5/15 selecionadas para Instagram”.

### Scores reais de saturação

- Criar modelo de dados para `hashtag_intelligence` com:
  - hashtag;
  - estado verificado;
  - volume estimado;
  - fonte;
  - última verificação.
- Só mostrar círculo colorido quando existir dado verificado.
- Se não houver fonte ligada, os chips aparecem sem círculo.
- Não inventar nem simular volume/shadowban.

### Hashtags de marca

- Criar preferências de IA/perfil com campo de hashtags fixas.
- Essas hashtags aparecem sempre no grupo “Marca”.

### Teste isolado

- Testar adicionar/remover chips.
- Testar contadores por rede.
- Testar ausência de scores sem dados verificados.
- Testar hashtags de marca guardadas no perfil/preferências.

---

## Fase 3.3 — Primeiro comentário com IA

### UI

- No campo “Primeiro comentário” já existente, adicionar botão pequeno “IA”.
- Ao clicar, gerar 3 opções:
  - pergunta de engagement;
  - CTA;
  - continuação/complemento da ideia principal.
- Mostrar dropdown/popover para o utilizador escolher.
- Não inserir automaticamente sem escolha.

### Backend

- Criar endpoint Lovable AI para gerar opções com base em:
  - legenda;
  - rede;
  - tipo de post;
  - limite de caracteres da rede.

### Teste isolado

- Testar Instagram, LinkedIn e Facebook.
- Confirmar respeito pelos limites de caracteres.
- Confirmar que escolher opção preenche apenas o campo certo.

---

## Fase 3.1 — SRT, capítulos e frases citáveis

### UI

- No painel do vídeo, adicionar botão “Ferramentas de IA”.
- Menu com:
  - “Gerar ficheiro SRT”;
  - “Gerar capítulos”;
  - “Extrair frases citáveis”.
- Se não houver transcrição, oferecer gerar primeiro.

### Backend

- Reutilizar `raw_transcription` da Fase 1.
- Para SRT, guardar/gerar ficheiro `.srt` descarregável.
- Para capítulos, devolver lista com timestamps e títulos.
- Para frases citáveis, reaproveitar ou gerar 2-3 frases.

### Teste isolado

- Testar vídeo com transcrição existente.
- Testar vídeo sem transcrição.
- Confirmar download de `.srt`.

---

## Fase 4 — Aprendizagem contínua

### 4.1 Dados e classificação

- Criar tabela `post_performance` com:
  - `post_id`, `network`, `engagement_rate`, `classification`, `captured_at`, `features_extracted`.
- Criar função agendada para correr a cada 6 horas.
- Recolher métricas onde houver fonte real disponível.
- Calcular:
  - `engagement_rate = (likes + 2*comentários + 3*partilhas + 2*guardados) / alcance`.
- Classificar face à média móvel dos últimos 30 posts da mesma conta/rede.

### 4.2 Features dos posts

- Extrair:
  - começa com pergunta;
  - começa com número;
  - emoji no início;
  - número de hashtags;
  - tem primeiro comentário;
  - comprimento da legenda;
  - hora/dia de publicação;
  - formato;
  - tom detetado por IA.

### 4.3 Insights

- Criar tabela `account_insights`.
- Gerar insights semanais apenas com:
  - amostra mínima de 20 posts;
  - diferença estatisticamente relevante, p < 0.1.

### 4.4 Banner no `/manual-create`

- Mostrar um banner discreto acima da legenda com o insight mais relevante.
- Máximo um banner por sessão.
- Ações:
  - “Sim, sugere uma”;
  - “Não, obrigado”;
  - “Nunca mostrar”.
- Guardar dispensas e bloquear por 30 dias após 3 recusas seguidas.

### 4.5 Página `/insights`

- Nova rota com:
  - lista de insights;
  - filtros por rede e tipo;
  - gráficos simples;
  - exportação PDF mensal.

### Teste isolado

- Testar com dados reais existentes onde possível.
- Testar fallback sem métricas disponíveis.
- Confirmar que insights não são inventados sem amostra suficiente.

---

## Custos e créditos de IA

- Criar tabela de consumo de IA por utilizador.
- Registar ações:
  - transcrição: 1 crédito/minuto;
  - geração de campos: 2 créditos;
  - reescrita por tom: 1 crédito;
  - alt text: 0,5 créditos/imagem;
  - primeiro comentário: 1 crédito.
- Mostrar CTA de upgrade quando esgotar, sem destruir o fluxo manual.
- Como os planos/créditos mensais ainda serão definidos depois, vou implementar a infraestrutura com limites configuráveis.

---

## Preferências de IA

- Criar secção “Preferências de IA” no perfil/definições.
- Campos:
  - idioma preferido, default PT-PT;
  - tom por defeito;
  - hashtags de marca fixas;
  - ativar/desativar banners de insights.

---

## Ordem de implementação proposta

1. Fase 1 — Assistente desde upload.
2. Fase 3.2 — Reescrita por tom.
3. Fase 3.4 — Alt text automático.
4. Fase 2 — Hashtags inteligentes sem scores inventados.
5. Fase 3.3 — Primeiro comentário com IA.
6. Fase 3.1 — SRT, capítulos e frases citáveis.
7. Fase 4 — Aprendizagem contínua e página `/insights`.

---

## Checkpoint

- ☐ Card “Queres que a IA prepare tudo por ti?” aparece só para vídeos elegíveis.
- ☐ Transcrição é gerada, guardada em rascunho e acessível via “Ver transcrição”.
- ☐ IA preenche legenda, variantes por rede, hashtags, primeiro comentário, alt text e título.
- ☐ Reescrita por tom funciona com histórico de 5 versões.
- ☐ Alt text automático funciona para imagem e primeiro frame de vídeo.
- ☐ Hashtags sugeridas funcionam sem inventar scores.
- ☐ Hashtags de marca são configuráveis nas preferências.
- ☐ Primeiro comentário por IA mostra 3 opções antes de inserir.
- ☐ SRT, capítulos e frases citáveis reutilizam a transcrição guardada.
- ☐ Créditos de IA são registados por ação.
- ☐ Erros de IA não bloqueiam publicação manual.
- ☐ Fase 4 só gera insights com dados reais e amostra mínima.
- ☐ Nova página `/insights` lista e exporta conclusões reais.
- ☐ Interface mantém pt-PT, visual compacto e mobile-first.