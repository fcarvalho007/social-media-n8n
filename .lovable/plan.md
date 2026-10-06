# Página «Custos»: custos reais com DeepSeek, Kie.ai e fal.ai

## O que existe hoje (verificado)

- O bloco «Custos do mês» do Painel **não mostra custos reais**. Conta stories e carrosséis e multiplica por valores fixos (0,02 € e 0,08 €), sem relação com qualquer fornecedor.
- Registos reais que já existem:
  - **DeepSeek (newsletter):** 922 pedidos desde 25/07/2026, com tokens e custo em dólares. Soma cerca de 0,55 $.
  - **DeepSeek (Estúdio/carrosséis):** pedidos registados, mas sem custo calculado (o campo está vazio e marcado como «incerto»).
  - **Kie.ai:** 5 tarefas, todas falhadas ou com resultado desconhecido. Não há campo de custo.
  - **fal.ai:** a geração de imagens antiga calcula um custo estimado, mas não deixa um registo por pedido que se possa somar.
  - Há ainda 7 pedidos antigos da newsletter com Gemini e 2 pedidos ao Lovable AI. Não pertencem a nenhum destes três fornecedores e aparecem à parte como «Outros».

## O que vai ser construído

### 1. Um registo único e fiel de custos
- Cada pedido pago passa a deixar uma linha com data, fornecedor, modelo, ação, estado e custo.
- O custo é calculado no servidor a partir do que o fornecedor devolve:
  - **DeepSeek:** tokens de entrada (com e sem cache) e de saída, multiplicados pela tabela de preços oficial em dólares e convertidos para euros com uma taxa guardada com a data.
  - **Kie.ai:** créditos gastos por tarefa, quando a Kie os indica. Tarefas recusadas antes de cobrar ficam a 0 €.
  - **fal.ai:** custo por pedido segundo o preço publicado do modelo.
- Cada linha diz como foi calculada: **«confirmado»** (o fornecedor indicou o valor), **«calculado»** (tokens × preço oficial) ou **«estimado»** (sem dados do fornecedor). Nunca se mistura sem indicação.
- O histórico entra sem apagar nem alterar nada. A newsletter da DeepSeek usa os custos já guardados. Os pedidos do Estúdio são recalculados a partir dos tokens guardados. Os da Kie e da fal só entram se houver dados suficientes, e caso contrário ficam marcados como «sem custo conhecido».

### 2. Conferência com o saldo real
- Um botão «Conferir saldos» lê no servidor o saldo atual da DeepSeek e da Kie. Isto não gera custos.
- O ecrã mostra lado a lado o saldo e a soma registada, para se perceber se falta alguma coisa.
- A fal.ai só permite esta leitura com uma chave de administração. Se a chave atual não o permitir, a página diz isso claramente.

### 3. Nova entrada «Custos» no menu
```text
Custos                                   [Esta semana][Este mês][3 meses][12 meses][Tudo]
[Fornecedor: todos v] [Ação: todas v] [Pesquisar modelo/ação]

Total do período: 1,23 €   DeepSeek 0,80 €  ·  Kie 0,40 €  ·  fal 0,03 €  ·  Outros 0,00 €
Grau de certeza: 92 % confirmado/calculado · 8 % estimado

[ Gráfico de linhas conjunto, uma cor por fornecedor ]   [ Gráfico circular por fornecedor ]

DeepSeek  [gráfico de linhas próprio]  pedidos · tokens · custo
Kie.ai    [gráfico de linhas próprio]  imagens · falhadas · custo
fal.ai    [gráfico de linhas próprio]  leituras/imagens · custo

Tabela de pedidos (data DD/MM/AAAA · fornecedor · modelo · ação · estado · custo · origem do valor)
```
- Os filtros de período, fornecedor e ação, e a pesquisa, valem para tudo o que está no ecrã. Ficam no endereço, para se poder partilhar a vista.
- A escala do gráfico é diária até 3 meses e mensal a partir daí. Os dias sem custos aparecem a 0, não em branco.
- Valores em euros com o formato português. O fuso horário é o de Lisboa.
- O bloco «Custos do mês» do Painel passa a ler o mesmo registo, com totais reais por fornecedor, e liga à nova página.

## Detalhes técnicos

- Nova tabela `custos_ia`, só de acrescentar: id, criado_em, fornecedor, modelo, acao, origem_tabela, origem_id (único), estado, unidades (jsonb), custo_eur, custo_origem (confirmado/calculado/estimado/desconhecido), taxa_usd_eur, project_id. Com GRANT e RLS: leitura para staff, escrita só pelo servidor.
- `_shared/custos.server.ts` fica como o único sítio onde se calculam custos e se escreve o registo. Tabela de preços versionada por data, chamada a partir de `deepseek-direto.ts`, do worker do motor, de `kie.server.ts` (imagem, visão e logótipo), do fal da visão e de `fal-generate-image`.
- Recolha do histórico: uma função de servidor idempotente que importa `nl_ia_uso`, `mc_chamadas_ia`, `mc_kie_tarefas` e `ai_usage_log` através de `origem_id`. Pode correr várias vezes sem duplicar.
- Agregação por RPC `custos_resumo(desde, ate, fornecedor, acao, granularidade)` no servidor, no fuso de Lisboa. A tabela de pedidos usa paginação no servidor.
- Saldos: operação nova no `mc-motor`, só para administradores e só de leitura (DeepSeek `/user/balance`, Kie créditos). Nunca é chamada sozinha.
- UI: `src/pages/Custos.tsx`, `src/services/custos.ts` e gráficos com `recharts`, que já faz parte do projeto (a confirmar antes de implementar; sem dependências novas). Usa só os tokens de cor já existentes. Validado no computador e a 375 px.
- Testes: cálculo de preços, idempotência da importação, agregação por período no fuso de Lisboa, e a regra de que custos estimados nunca são mostrados como confirmados.

## Riscos e decisões

- **Preços:** a tabela de preços oficiais da DeepSeek, Kie e fal é confirmada nas páginas de cada fornecedor antes de implementar. Os valores de 0,02 € e 0,005 € que usei antes eram estimativas.
- **Câmbio:** a DeepSeek e a fal cobram em dólares. A taxa usada para converter fica registada em cada linha.
- **Histórico do Estúdio e da Kie:** poucos registos, quase todos falhados. O total histórico deve ficar perto de 0,55 €, quase todo da newsletter.
