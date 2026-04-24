## Plano — Auditoria extensa e consolidação dos Prompts 0–4

Objetivo: confirmar, ponto a ponto, o que foi pedido nos últimos prompts de desenvolvimento, separar o que já está feito do que está incompleto, e implementar as correções por fases para fechar o módulo de IA/insights com consistência.

## Leitura inicial da auditoria

Pelo que já foi possível verificar em modo leitura, a base está avançada, mas há lacunas prováveis que merecem validação e correção controlada:

1. **Prompts 0–1: fundações e assistente desde upload**
   - Há serviço central de IA, custos, logs e componentes reutilizáveis.
   - O fluxo do assistente existe, mas há pontos a auditar: retoma real após reload, persistência do botão “Já tenho a legenda”, geração automática de alt text quando a preferência está ativa, e consumo exato de 5 créditos.

2. **Prompt 2: hashtags editoriais**
   - Existe caixa de hashtags sem métricas inventadas e lista local de risco.
   - Lacunas prováveis: não há aplicação robusta dos limites por rede no momento de publicação; o pedido original falava em tabs por rede dentro da caixa e excesso marcado por rede; cache em `hashtag_metadata` pode estar pouco ou nada usada; gestão de marca parece guardada em `ai_preferences.brand_hashtags`, não numa tabela dedicada `user_brand_hashtags`.

3. **Prompt 3: funções pontuais de IA**
   - Reescrita por tom, primeiro comentário, alt text e ferramentas de vídeo estão implementadas.
   - Lacunas prováveis: capítulos/frases são copiados diretamente sem modal de revisão; falta bloquear ferramentas de vídeo quando não há transcrição; geração automática de alt text após upload pode não acontecer; indicadores de “gerado por IA” podem não estar consistentes por campo/rede.

4. **Prompt 4: aprendizagem contínua e insights**
   - Existem tabelas, funções `collect-post-metrics` e `generate-insights`, dashboard `/insights`, banner e preferências.
   - Lacunas importantes a corrigir/auditar:
     - migrations versionadas ainda contêm `cron.schedule` com URL/chave do projeto;
     - `AI_CRON_SECRET` só é exigido se estiver definido, o que deve ser endurecido;
     - CORS das funções não inclui `x-cron-secret` nos headers permitidos;
     - recolha de métricas ainda depende parcialmente de tokens globais e adaptadores incompletos para YouTube/TikTok;
     - cálculo/classificação multi-rede guarda apenas uma classificação global no post, podendo perder nuances por rede;
     - `post_metrics_raw` deduplica por janela no código, mas o índice atual não é uma constraint única;
     - `/insights` é funcional, mas ainda básico para uma fase final.

## Fase 1 — Auditoria técnica completa, sem alterar comportamento

Produzir uma matriz de conformidade para os Prompts 0, 1, 2, 3 e 4:

- Reconstituir todos os requisitos/checklists a partir do histórico.
- Mapear cada requisito para ficheiros, componentes, funções e tabelas atuais.
- Classificar cada ponto como:
  - Feito;
  - Parcial;
  - Em falta;
  - Feito mas com risco técnico;
  - Fora de escopo por dependência externa.
- Auditar ficheiros bloqueados e confirmar se não é necessário editá-los diretamente.
- Auditar custos de IA na UI, `aiService`, `ai-core` e logs.
- Auditar pt-PT, removendo termos pt-BR ou copy inconsistente no plano de correção.

Entrega desta fase: um relatório interno resumido na conversa e, se fizer sentido, atualização de `.lovable/plan.md` com a matriz de fecho.

## Fase 2 — Correções críticas de backend, segurança e dados

Prioridade máxima porque afeta confiança, privacidade e operação automática.

- Endurecer `collect-post-metrics` e `generate-insights`:
  - exigir sempre `AI_CRON_SECRET` em produção;
  - rejeitar chamadas se o segredo não estiver configurado;
  - incluir `x-cron-secret` nos headers CORS;
  - manter respostas de erro em pt-PT e logs técnicos em inglês.
- Limpar/neutralizar cron inseguro nas migrations futuras:
  - criar migration de correção operacional para remover jobs com headers antigos;
  - recriar jobs apenas se for possível injetar o segredo de forma segura no backend;
  - caso contrário, deixar jobs desativados e documentar o passo operacional seguro.
- Reforçar deduplicação de métricas:
  - evitar múltiplos snapshots por post/rede/janela horária;
  - preferir uma coluna/índice determinístico para upsert, se necessário, em vez de depender só de pesquisa por `captured_at`.
- Confirmar que `account_insights` mantém escrita apenas via backend/RPC, sem abrir updates diretos ao cliente.
- Corrigir qualquer divergência entre `dismiss`, `mute`, `dismissed_count`, `dismissed_until` e `never_show`.

## Fase 3 — Fecho funcional dos Prompts 1–3 no `/manual-create`

- Assistente desde upload:
  - garantir que “Já tenho a legenda” persiste no rascunho e não reaparece após reload;
  - garantir retoma real se o reload acontecer após transcrição mas antes da geração;
  - garantir consumo exato de 5 créditos no fluxo completo;
  - validar que vídeos fora de 5s–600s não mostram o card de forma enganadora.
- Alt text:
  - implementar/validar geração automática quando `auto_alt_text` está ativa;
  - manter geração manual a 2 créditos quando está desativada;
  - garantir limite de 125 caracteres por média;
  - avaliar “Aplicar a todas” se ainda estiver incompleto.
- Reescrita por tom:
  - validar stack máximo de 5 versões;
  - validar Ctrl/Cmd+Z;
  - bloquear quando legenda está vazia ou créditos insuficientes;
  - confirmar prompts em pt-PT.
- Primeiro comentário:
  - confirmar 3 opções reais no modal;
  - garantir uso correto da rede ativa;
  - marcar campo como gerado por IA e limpar indicador ao editar.
- Ferramentas de vídeo:
  - bloquear capítulos/frases/SRT quando não há transcrição;
  - trocar cópia direta para modal de revisão quando necessário;
  - manter SRT a 0 créditos quando a transcrição já existe.

## Fase 4 — Fecho da caixa de hashtags editorial

- Confirmar que não há métricas inventadas, scores falsos ou semáforos de volume.
- Melhorar a UI para refletir melhor o pedido:
  - tabs por rede ou estado ativo claramente sincronizado com a legenda ativa;
  - limite por rede com indicação de excesso;
  - chips de excesso/riscos visualmente distintos.
- Garantir que o conteúdo publicado respeita limites por rede:
  - remover hashtags excedentes no payload final por rede;
  - evitar que o preview mostre uma coisa e a publicação envie outra sem aviso.
- Auditar a persistência das hashtags de marca:
  - se a tabela `user_brand_hashtags` existir e foi pedida, alinhar uso real com ela ou documentar a decisão de usar `ai_preferences.brand_hashtags`;
  - não duplicar fontes de verdade.
- Auditar cache em `hashtag_metadata`:
  - se não houver provider externo, usar cache apenas para classificação editorial/riscos, sem volume.

## Fase 5 — Insights e aprendizagem contínua

- Confirmar o “modo silencioso”:
  - sem banner no `/manual-create` antes de 30 posts classificados;
  - sem publicação de insights inválidos por amostra pequena;
  - `/insights` deve explicar claramente o progresso até 30 posts.
- Melhorar geração de insights:
  - validar amostra mínima de 10 por grupo;
  - validar delta mínimo 20%;
  - validar p-value/confiança;
  - garantir janela máxima de 90 dias.
- Resolver multi-rede:
  - se um post tem várias redes, evitar que a última rede processada sobrescreva conclusões globais de forma enganadora;
  - usar `post_metrics_raw` como fonte mais granular para relatórios, quando aplicável.
- Respeitar privacidade:
  - `insights_enabled=false` deve impedir extração de features novas e geração de insights;
  - avaliar se deve limpar/ignorar features antigas quando o toggle é desligado.
- Melhorar `/insights`:
  - empty states por filtro;
  - labels pt-PT por rede/categoria;
  - PDF com filtros ativos, data, amostra e conteúdo sem cortes;
  - botão desativado quando não há dados exportáveis.

## Fase 6 — QA final e estabilização

- Executar build TypeScript.
- Validar fluxos críticos manualmente ou com testes existentes:
  - créditos e logs;
  - geração de legenda pelo assistente;
  - hashtags por rede;
  - primeiro comentário;
  - alt text;
  - SRT/capítulos/frases;
  - banner de insight;
  - dashboard `/insights`;
  - exportação PDF.
- Auditar erros de consola/rede se houver sintomas no preview.
- Registar, no final, o que ficou fechado e o que depende de APIs externas reais das redes sociais.

## Fora de escopo ou dependente de credenciais externas

Estes pontos só podem ficar como adaptadores/estrutura se não houver tokens e permissões reais configurados:

- Meta Graph Insights com permissões de insights corretas.
- LinkedIn Marketing/Analytics API com permissões da organização/autor.
- YouTube Analytics API com canal/contexto OAuth.
- TikTok Display/Business metrics com scopes adequados.

A implementação deve continuar honesta: quando uma API não está configurada, guardar `skipped`/motivo técnico e não inventar métricas.

## Checklist de checkpoint

☐ Matriz de auditoria Prompts 0–4 criada e classificada por requisito.  
☐ Ficheiros bloqueados respeitados; sem edição manual de `types.ts`, `.env` ou chaves de projeto em `config.toml`.  
☐ Funções agendadas protegidas e sem cron inseguro com chaves antigas.  
☐ Assistente desde upload retoma corretamente e consome exatamente 5 créditos.  
☐ Hashtags editoriais sem métricas inventadas e com limites por rede aplicados até à publicação.  
☐ Funções pontuais de IA bloqueiam estados inválidos e mantêm indicadores consistentes.  
☐ Insights respeitam privacidade, modo silencioso, amostra mínima e filtros.  
☐ `/insights` e exportação PDF refinados em pt-PT.  
☐ Build final validado.  
☐ Lista final de dependências externas pendentes documentada.