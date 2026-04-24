## Plano de consolidação e consistência

Objetivo: rever os refinamentos introduzidos nos Prompts 3 e 4 e corrigir inconsistências que podem comprometer estabilidade, créditos, privacidade, dados analíticos e manutenção futura.

## Principais pontos encontrados

1. **Ficheiros bloqueados foram alterados anteriormente**
   - `src/integrations/supabase/types.ts` e `supabase/config.toml` constam em `LOCKED_FILES.md`.
   - O plano é não os voltar a editar. Se forem necessárias alterações de esquema, usar apenas migrações para regeneração automática dos tipos.

2. **Jobs agendados foram colocados em migrations com URL/chave do projeto**
   - Existem migrations com `cron.schedule(...)` contendo URL e chave do backend.
   - Isto deve ser consolidado: manter migrations portáveis para esquema/RLS/índices e mover configuração de cron específica do projeto para operação direta no backend, fora das migrations versionadas.

3. **Falta autenticação/segurança explícita nas novas funções agendadas**
   - `collect-post-metrics` e `generate-insights` aceitam chamadas sem validar um segredo interno ou JWT de serviço.
   - Como usam service role internamente, devem exigir um header interno simples, por exemplo `x-cron-secret`, validado contra segredo configurado.

4. **Inconsistência no primeiro comentário**
   - O frontend envia `network`, mas `ai-core` lê `body.networks[0]`; o prompt pode cair sempre em “instagram”.
   - Corrigir contrato para aceitar `network` ou normalizar no serviço antes de invocar a função.

5. **Privacidade e dismiss de insights incompletos**
   - A UI tenta atualizar `account_insights` diretamente, mas a tabela só permite SELECT ao utilizador. O dismiss/mute pode falhar silenciosamente.
   - Criar fluxo seguro via função backend ou RPC parametrizada para `dismiss` e `mute`, respeitando `dismissed_count`, `dismissed_until` e `never_show`.

6. **Preferência `muted_insight_types` não está aplicada**
   - Existe no tipo e na tabela, mas a seleção de insights no `/manual-create` não filtra tipos silenciados.
   - Aplicar filtro no carregamento do banner e/ou ao guardar preferência.

7. **Créditos de IA e logging precisam de alinhamento**
   - `AI_CREDIT_COSTS` não lista as ações novas de forma explícita, embora os overrides funcionem.
   - Consolidar constantes e labels para: reescrita por tom, primeiro comentário, alt text, capítulos, frases e perguntas de insight.

8. **Extração de features pode consumir créditos em background**
   - `collect-post-metrics` consome 1 crédito por post para classificar tom. Num job automático isto pode surpreender o utilizador.
   - Ajustar para: não consumir créditos em background, usar classificação heurística simples, ou registar consumo apenas se a política do produto o exigir. Recomendação: não debitar créditos em jobs automáticos.

9. **Dados de métricas podem duplicar snapshots**
   - `post_metrics_raw` permite múltiplos inserts por post/rede sem controlo de janela temporal.
   - Criar índice/estratégia de deduplicação por `post_id`, `network` e período ou usar upsert por dia/hora para evitar ruído nos insights.

10. **Página `/insights` ainda é funcional mas básica**
   - Falta estado vazio quando há 30+ posts mas nenhum insight válido.
   - O PDF exportado é simples e não inclui filtros/geração com nome semântico.
   - Melhorar textos, estados e exportação mantendo pt-PT.

## Implementação proposta

### 1. Segurança e backend
- Criar/usar segredo interno para chamadas agendadas.
- Atualizar `collect-post-metrics` e `generate-insights` para rejeitarem chamadas sem o header correto.
- Garantir que todos os responses incluem CORS.
- Remover dependência de chamadas públicas sem autenticação operacional.

### 2. Migrações de consolidação
- Criar uma migration apenas com alterações portáveis:
  - índices de deduplicação para métricas;
  - função/RPC segura para dispensar e silenciar insights, se aplicável;
  - policies mínimas necessárias sem abrir escrita direta da tabela ao cliente.
- Não editar `types.ts`; deixar regeneração automática.
- Não editar project-level keys de `supabase/config.toml`.

### 3. Contratos de IA
- Atualizar tipos e `aiService` para suportar explicitamente `network` em `first_comment_generation`.
- Atualizar `ai-core` para validar e usar `network`, `segments`, `finding` e demais campos de forma consistente.
- Tornar as respostas JSON mais robustas com fallback quando o modelo devolve texto parcialmente inválido.

### 4. Créditos e custos
- Expandir `AI_CREDIT_COSTS` e os tipos associados para cobrir todas as ações novas.
- Garantir que botões, logs e backend usam os mesmos custos.
- Remover débito automático de créditos em jobs de aprendizagem contínua, ou substituí-lo por regra explícita sem cobrança ao utilizador.

### 5. Insights e privacidade
- Aplicar `insights_enabled` antes de extrair features e antes de gerar insights.
- Aplicar `muted_insight_types` no banner e na dashboard.
- Corrigir dismiss/mute via backend seguro para funcionar com RLS.
- Preservar “modo silencioso” abaixo de 30 posts e evitar mostrar insights de amostra pequena.

### 6. UI/UX de consolidação
- Em `/manual-create`:
  - melhorar feedback de erro/sucesso ao dispensar ou silenciar insight;
  - desativar ações quando a legenda está vazia ou créditos são insuficientes;
  - garantir copy pt-PT consistente.
- Em `/insights`:
  - adicionar estado vazio quando já há massa crítica mas nenhum insight válido;
  - melhorar labels de redes/categorias;
  - melhorar exportação PDF com filtros ativos e nome semântico.

### 7. Verificação
- Executar build TypeScript.
- Verificar fluxos críticos:
  - primeiro comentário usa a rede correta;
  - dismiss/mute de insight persiste;
  - modo silencioso abaixo de 30 posts;
  - `/insights` não mostra insights inválidos;
  - custos exibidos batem com custos debitados;
  - alt text continua limitado a 125 caracteres;
  - SRT/capítulos/frases continuam funcionais.

## Checklist de checkpoint

☐ Não editar ficheiros bloqueados (`types.ts`, `.env`, project-level `config.toml`).  
☐ Funções agendadas protegidas por segredo interno.  
☐ Cron específico do projeto removido de migrations versionadas ou neutralizado com abordagem segura.  
☐ Primeiro comentário usa a rede selecionada corretamente.  
☐ Dismiss/mute de insights funciona com RLS.  
☐ `muted_insight_types` aplicado no banner e na dashboard.  
☐ Jobs de background não debitam créditos inesperadamente.  
☐ Custos de IA alinhados entre UI, serviço e backend.  
☐ Deduplicação de métricas definida.  
☐ Estados vazios e exportação PDF de `/insights` refinados em pt-PT.  
☐ Build final sem erros.