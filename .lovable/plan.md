Plano para implementar o Prompt 4 — Aprendizagem contínua e insights.

Notas antes de implementar:
- O projeto já tem `account_insights`, `ai_preferences.insights_enabled`, `posts.ai_features_extracted`, `posts.performance_classification` e `posts.metrics_captured_at`.
- Existe um componente inicial `EditorialInsightBanner`, mas ainda não há ciclo completo de métricas, classificação, dashboard `/insights` nem geração semanal de insights.
- O ficheiro `supabase/config.toml` está listado como locked para chaves de projeto; só será alterado, se necessário, com blocos específicos de funções. Para os cron jobs, vou preferir migração SQL e evitar mexer em chaves de projeto.
- Há uma tensão técnica: a recolha direta via Meta Graph, LinkedIn Marketing, YouTube Analytics e TikTok Display exige tokens/credenciais por rede. Como o sistema atual publica via Getlate e já guarda referências externas, vou implementar a arquitetura real com adaptadores por rede e fallback seguro. Onde não houver token/ID suficiente, o post fica registado como “skipped” no resultado da função, sem quebrar o cron. Isto permite ativar as APIs assim que as credenciais/permissões estiverem disponíveis.

## 1. Base de dados e políticas

Criar uma migração para:

- Criar `post_metrics_raw` com os campos do prompt, mais campos úteis para operação:
  - `user_id` para RLS e consultas por utilizador.
  - `external_post_id` ou referência externa quando disponível.
  - `engagement_rate_normalized` para auditoria do cálculo.
  - `created_at`/`captured_at`.
- Ativar RLS:
  - utilizadores autenticados só veem as suas métricas;
  - service role gere inserts/updates via funções agendadas.
- Adicionar índices:
  - `(post_id, network, captured_at desc)`;
  - `(user_id, network, captured_at desc)`;
  - `posts(user_id, published_at, status)` se ainda não existir.
- Garantir upsert estável em `account_insights` por `(user_id, insight_type, network)`.
- Se necessário, adicionar/confirmar campos em `ai_preferences` para a preferência de privacidade. Vou reutilizar `insights_enabled` como “usar publicações para gerar insights”, porque já existe e já está ligado às Preferências > IA.

## 2. Biblioteca partilhada de analytics editorial

Criar utilitários em `src/lib/insights` e replicar a lógica necessária nas funções backend:

- `calculateEngagementRate(metrics)` com a fórmula ponderada:
  - likes x1;
  - comentários x2;
  - partilhas x3;
  - guardados x2;
  - dividido por alcance.
- `extractPostFeatures(post)`:
  - comprimento da legenda;
  - pergunta na primeira frase;
  - número no início;
  - emoji na primeira linha;
  - quebras de linha;
  - contagem e grupos de hashtags;
  - primeiro comentário;
  - alt text;
  - link na legenda;
  - tipo e quantidade de média;
  - duração de vídeo quando disponível;
  - hora e dia da semana de publicação.
- Funções estatísticas:
  - média;
  - desvio padrão;
  - teste t simples aproximado;
  - cálculo de delta percentual;
  - agrupamentos de hora, dia, tom, hashtags e formato.

## 3. Função agendada `collect-post-metrics`

Criar a Edge Function `collect-post-metrics` para correr a cada 6 horas.

Fluxo:

1. Buscar posts `published` com `published_at` entre 24h e 96h atrás.
2. Respeitar a preferência:
   - se `ai_preferences.insights_enabled = false`, recolhe métricas para visualização, mas não extrai features nem gera insights.
3. Para cada rede em `selected_networks`/`publish_targets`:
   - identificar referência externa em `external_post_ids`, `linkedin_external_id`, `publish_metadata` ou URL publicado;
   - chamar adaptador da rede quando houver credenciais suficientes;
   - normalizar métricas para `reach`, `impressions`, `likes`, `comments`, `shares`, `saves`, `clicks`, `video_completion_rate`.
4. Inserir linha em `post_metrics_raw`.
5. Calcular `engagement_rate` normalizada e atualizar `posts.engagement_rate`.
6. Extrair `ai_features_extracted` quando permitido.
7. Detetar tom com IA via Lovable AI Gateway, com custo de 1 crédito por post quando aplicável.
8. Classificar performance:
   - buscar últimos 30 posts anteriores do mesmo utilizador e rede;
   - se houver menos de 10, guardar `insufficient_data`;
   - caso contrário aplicar `above_average`, `worked`, `normal`, `did_not_work`.
9. Atualizar `posts.performance_classification` e `posts.metrics_captured_at`.

Adaptadores por rede:
- Meta/Instagram/Facebook, LinkedIn, YouTube e TikTok serão isolados em funções pequenas dentro da Edge Function.
- Se faltar token/permissão/ID, a função não falha globalmente; regista no `raw_data`/logs que a rede foi ignorada.
- Não vou expor tokens no cliente.

## 4. Função agendada `generate-insights`

Criar a Edge Function `generate-insights` para correr semanalmente ao domingo às 03:00.

Fluxo:

1. Encontrar utilizadores com `insights_enabled = true`.
2. Para cada utilizador/rede, buscar posts dos últimos 90 dias com:
   - `performance_classification` preenchido;
   - `ai_features_extracted` preenchido;
   - métricas recentes em `post_metrics_raw`.
3. Só gerar insights se houver pelo menos 30 posts classificados.
4. Avaliar os tipos definidos:
   - pergunta no início;
   - número no início;
   - emoji no início;
   - legenda curta vs longa;
   - com/sem primeiro comentário;
   - manhã/tarde/noite;
   - dia da semana;
   - tom detetado;
   - grupos de hashtags;
   - formato.
5. Publicar apenas insights com:
   - mínimo 10 posts por grupo comparado;
   - delta absoluto >= 20%;
   - p < 0.1.
6. Fazer upsert em `account_insights` por `(user_id, insight_type, network)`, preservando controlos de dispensa quando fizer sentido.

## 5. Cron jobs

Adicionar agendamentos via migração SQL:

- `collect-post-metrics`: a cada 6 horas.
- `generate-insights`: domingos às 03:00.

Usar `pg_cron` e `pg_net` já existentes no projeto. Os jobs chamarão as funções com `net.http_post` e autenticação adequada, sem exigir ação manual do utilizador.

## 6. Banner no `/manual-create`

Evoluir o `EditorialInsightBanner` e integrá-lo dentro do bloco “Legenda”, acima do editor.

Regras:

- Mostrar no máximo um banner por sessão.
- Não mostrar enquanto houver menos de 30 posts classificados.
- Filtrar por:
  - utilizador;
  - rede selecionada quando aplicável;
  - `never_show = false`;
  - `dismissed_until` vazio ou expirado;
  - preferência de IA ativa.
- Ordenar por `confidence desc`.

Ações:

- “Sugere uma pergunta”:
  - chama `ai-core` com uma nova ação `insight_question_suggestions`;
  - gera 2–3 perguntas relevantes à legenda/transcrição atual;
  - custa 1 crédito;
  - mostra opções para inserir no topo da legenda.
- “Dispensar”:
  - incrementa `dismissed_count`;
  - se chegar a 3, define `dismissed_until = now() + 30 days`.
- Menu “...”:
  - “Nunca mostrar este tipo de insight” define `never_show = true` para esse insight/tipo;
  - “Ver todos os insights” navega para `/insights`.

## 7. Dashboard `/insights`

Criar rota `/insights` e entrada na barra lateral.

Conteúdo:

- Cabeçalho “Os teus insights”.
- Contador: “Baseados em X publicações dos últimos Y dias.”
- Modo silencioso se < 30 posts classificados:
  - “Estamos a aprender sobre o teu conteúdo. Vais começar a ver insights quando tiveres 30 posts publicados. Atualmente: X/30.”
- Lista de insights por categoria:
  - Conteúdo;
  - Timing;
  - Formato;
  - Tom.
- Cada cartão mostra:
  - finding;
  - amostra;
  - confiança;
  - delta;
  - rede;
  - gráfico comparativo simples com Recharts.
- Filtros:
  - rede social;
  - categoria;
  - período 30/60/90 dias.
- Exportar relatório PDF com `jspdf`, sem adicionar dependências.

## 8. Preferências > IA

Refinar `AISettings.tsx`:

- Trocar o copy atual “Ativar banners de insights” por:
  - label: “Usar as minhas publicações para gerar insights”;
  - descrição: “Os insights são calculados apenas para a tua conta. Os dados nunca são partilhados com outros utilizadores nem usados para treinar modelos externos.”
- Manter default ligado.
- Quando desligado:
  - não extrair features;
  - não gerar insights;
  - não mostrar banners;
  - manter recolha de métricas brutas para visualização.

## 9. Validação

Depois da implementação, validar:

- build TypeScript;
- CORS e autenticação das novas funções;
- cron criado nos horários certos;
- modo silencioso com menos de 30 posts;
- banner respeita `dismissed_count`, `dismissed_until` e `never_show`;
- classificação usa a base dos últimos 30 posts da mesma rede;
- `/insights` filtra por rede/categoria/período;
- exportação PDF gera um ficheiro legível;
- preferência de privacidade bloqueia features/insights.

## Checkpoint

☐ Criar tabela `post_metrics_raw`, índices, RLS e constraints necessárias.
☐ Implementar `collect-post-metrics` com adaptadores por rede e fallback seguro.
☐ Implementar cálculo de engagement, extração de features e classificação de performance.
☐ Implementar `generate-insights` com critérios estatísticos e upsert em `account_insights`.
☐ Agendar cron de recolha a cada 6h e geração semanal ao domingo às 03:00.
☐ Integrar `InsightBanner` no bloco “Legenda” do `/manual-create`.
☐ Implementar ações de sugerir pergunta, dispensar e nunca mostrar.
☐ Criar dashboard `/insights` com filtros, modo silencioso, gráficos e exportação PDF.
☐ Atualizar Preferências > IA com toggle de privacidade e copy transparente.
☐ Validar build e fluxos principais.