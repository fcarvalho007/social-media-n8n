## Plano — Próxima fase de consolidação pós-redesenho

Objetivo: fechar os pontos ainda frágeis dos Prompts 1–4 depois do redesenho visual de `/manual-create`, sem adicionar uma funcionalidade nova grande e sem alterar regras de negócio. O foco é garantir consistência funcional, estados corretos, pt-PT e bloqueios seguros.

## Estado atual confirmado

Já está implementado:

- Redesenho visual de `/manual-create` com grelha 2/3 + 1/3, preview compacto, selector em 2 colunas, média hierarquizada e drawer mobile.
- Assistente desde o upload com transcrição, geração de legenda, hashtags, primeiro comentário, alt text e persistência em `ai_metadata`/`raw_transcription`.
- Caixa editorial de hashtags sem providers pagos e sem métricas inventadas.
- Reescrita por tom, primeiro comentário com IA, alt text por média e ferramentas de vídeo.
- Insights com modo silencioso no banner e no dashboard, protegidos por `AI_CRON_SECRET` nas funções agendadas.

## Lacunas a fechar nesta fase

1. O cartão do assistente usa `aiPreferences.insights_enabled` como bloqueio genérico de IA. Isto mistura privacidade de insights com disponibilidade do assistente editorial.
2. As ferramentas de vídeo ainda são botões inline no card “Média”, apesar de existir um componente de menu `VideoAiTools`. Falta consolidar UI e estados de loading.
3. Capítulos e frases de vídeo ainda copiam diretamente para clipboard. A especificação pedia revisão em modal/lista antes de copiar.
4. Capítulos/frases não validam de forma visível se há transcrição suficiente antes de cobrar/chamar IA.
5. O SRT exige segmentos, mas falta uma opção clara para “gerar transcrição primeiro” quando só existe texto simples ou não há timestamps.
6. No `Step3CaptionCard`, a ordem visual ficou `Legenda -> editor -> barra de tons`, mas o Prompt 3 pedia a barra de tons logo acima do textarea.
7. O botão “Ctrl+Z” evita atuar quando o foco está dentro de textarea/input; isto protege edição nativa, mas contraria parcialmente a expectativa “Ctrl+Z reverte” após reescrita. Deve haver fallback claro via botão “Reverter”.
8. O `/insights` mostra modo silencioso quando há menos de 30 posts classificados, mas ainda permite carregar a página normalmente. Isto é aceitável, mas pode ficar mais claro como “modo silencioso” e não como dashboard vazio.
9. `classifiedPostCount` no `/manual-create` conta todos os posts classificados, não necessariamente dentro dos últimos 90 dias. O dashboard usa período; convém alinhar a lógica para evitar banner prematuro.
10. Há pequenos riscos de copy/labels inconsistentes e componentes duplicados depois do redesenho.

## Fase 1 — Corrigir separação entre IA editorial e insights

- Remover o uso de `aiPreferences.insights_enabled` como bloqueio do assistente de upload.
- Manter `insights_enabled` apenas para recolha/uso de dados pessoais e banners/dashboards de insights.
- Se existir uma preferência específica para assistente/IA editorial, usá-la. Se não existir, não bloquear o assistente por causa da preferência de insights.
- Rever mensagens para evitar confusão entre “IA desligada” e “insights desativados”.

## Fase 2 — Consolidar ferramentas de vídeo

- Substituir os três botões inline no `Step2MediaCard` pelo menu compacto `VideoAiTools`, ou evoluir o componente existente para cumprir o layout final.
- Adicionar estado de loading por ação:
  - `srt`;
  - `chapters`;
  - `quotes`.
- Desativar ações quando não houver vídeo ou quando a publicação estiver em estado de guardar/publicar.
- Manter copy em pt-PT:
  - “Gerar ficheiro SRT”;
  - “Gerar capítulos”;
  - “Extrair frases citáveis”.

## Fase 3 — Modais de revisão para capítulos e frases

- Criar um modal simples para capítulos gerados:
  - lista `00:45 Título`;
  - botão “Copiar capítulos”;
  - botão “Fechar”.
- Criar um modal simples para frases citáveis:
  - timestamp;
  - frase;
  - botão “Copiar frases”.
- Só copiar para clipboard depois de o utilizador rever e clicar.
- Guardar os últimos resultados em estado local e, se fizer sentido, em `aiMetadata.video_tools` para recuperação leve no rascunho.

## Fase 4 — Bloqueios corretos antes de chamar IA de vídeo

- Antes de gerar capítulos/frases:
  - exigir `rawTranscription` com tamanho mínimo útil;
  - mostrar erro claro se não houver transcrição: “Gera primeiro a transcrição do vídeo com o assistente.”
- Para SRT:
  - exigir `transcription_segments` com timestamps;
  - se houver apenas transcrição sem segmentos, explicar que é preciso voltar a transcrever com timestamps.
- Para capítulos:
  - bloquear vídeos com duração inferior a 2 minutos quando a duração estiver disponível;
  - se a duração não estiver disponível, permitir mas validar pela extensão da transcrição.
- Garantir que chamadas pagas só acontecem depois destes bloqueios locais passarem.

## Fase 5 — Reposicionar barra de reescrita por tom

- Mover `CaptionRewritePanel` para aparecer antes do `NetworkCaptionEditor`, cumprindo o Prompt 3.
- Garantir scroll horizontal em mobile.
- Manter botão “Reverter” visível quando existir histórico.
- Atualizar o texto de apoio para ser explícito: “Reverte a última reescrita com o botão Reverter.”

## Fase 6 — Alinhar modo silencioso de insights

- No `/manual-create`, contar posts classificados dentro da janela relevante dos insights, idealmente últimos 90 dias, para alinhar com `generate-insights`.
- No `/insights`, reforçar o estado de modo silencioso:
  - explicar que os insights só aparecem a partir de 30 posts classificados;
  - indicar progresso `x/30`;
  - esconder gráficos/filtros se ainda não houver massa crítica suficiente.
- Garantir que `muted_insight_types` e `insights_enabled` continuam respeitados.

## Fase 7 — QA de consistência e build

- Rever copy nova para pt-PT e Acordo Ortográfico de 1990.
- Confirmar que não há métricas inventadas em hashtags.
- Confirmar que não há edição de ficheiros bloqueados:
  - `src/integrations/supabase/client.ts`;
  - `src/integrations/supabase/types.ts`;
  - `.env`;
  - chaves de projeto em `supabase/config.toml`.
- Executar build TypeScript.
- Validar estados principais no preview:
  - sem transcrição;
  - com transcrição sem segmentos;
  - com segmentos para SRT;
  - com menos de 30 posts classificados;
  - com insights silenciados/desativados.

## Fora de escopo nesta fase

- Não criar novas tabelas.
- Não mexer em RLS/storage.
- Não reativar cron jobs.
- Não integrar providers pagos de hashtags.
- Não alterar publicação/Getlate nesta fase, exceto se surgir erro direto causado pelas alterações acima.
- Não refazer o redesenho visual de `/manual-create`; apenas consolidar componentes que ficaram inconsistentes.

## Checkpoint

☐ Assistente editorial deixa de depender da preferência de insights.  
☐ Ferramentas de vídeo consolidadas num menu compacto com loading por ação.  
☐ Capítulos e frases passam por modal de revisão antes de copiar.  
☐ SRT/capítulos/frases bloqueiam corretamente quando falta transcrição/timestamps.  
☐ Barra de reescrita por tom aparece acima do editor de legenda.  
☐ Modo silencioso de insights alinhado com 30 posts classificados na janela certa.  
☐ Copy pt-PT revista.  
☐ Build final validado.