# Ronda de consistência e fiabilidade do Hub — 18 de outubro de 2026

Esta ronda melhora a navegação comum e os estados de trabalho editorial, com desenvolvimento e pré-visualização locais. É uma intervenção delimitada sobre a aplicação existente. Não constitui uma certificação de toda a plataforma, nem implementa ainda o sistema de publicação de artigos em vários WordPress.

## Base e âmbito

- O ZIP fornecido foi comparado com a origem GitHub e corresponde à base `5ebe187f`.
- Branch de trabalho: `codex/hub-ux-consistencia-2026-10-18`.
- Mantêm-se autenticação, base de dados e motores existentes. Esta ronda não introduz tabelas, fornecedor de IA ou migrações de esquema.
- Os padrões aprovados da divulgação da newsletter continuam sem retrato e com fecho de subscrição. Os Briefs e o radar preservam os destinos existentes.
- A branch foi importada no Lovable, que confirmou o commit `5188552bcfbf60d9773dc4b82409d1facb9fef49`, a árvore `ae64c2f84780e1296531e530ab3dabe5d6423078` e a área de trabalho limpa. Os sete deploys de funções foram confirmados. A publicação da interface pública está pendente de autorização específica pedida pela revisão automática.

## Alterações realizadas

| Área | Problema observado | Comportamento após a alteração |
| --- | --- | --- |
| Navegação comum | Menu, pesquisa e migalhas mantinham listas e nomes divergentes. | Um catálogo partilhado define destinos, nomes, grupos e descrições. A divulgação da newsletter fica acessível no menu e na pesquisa. |
| Pesquisa global | Procurava projetos e tarefas mesmo fechada; teclado, falhas de consulta e correspondência de acentos eram inconsistentes. | Carrega os dados ao abrir, aceita Ctrl/Cmd+K, pesquisa sem depender de acentos e distingue carregamento, erro e ausência de resultados. As tarefas abrem o respetivo projeto. |
| Cabeçalho e recuperação | A localização e a recuperação de falhas podiam perder contexto. | Migalhas adaptáveis, títulos de separador, ligação para saltar para o conteúdo e carregamento por página. As rotas carregadas a pedido têm `Suspense`; uma falha de página conserva o cabeçalho. Recarregar preserva parâmetros e fragmento. |
| Notificações | Abrir, marcar como lida e eliminar não tinham uma separação fiável; falhas podiam ser confundidas com lista vazia. | Destinos resolvidos com os dados acessíveis à conta, botões separados e erros explícitos. Consultas, mutações e atualização em tempo real ficam associadas ao utilizador. |
| Mudança de sessão | A cache global podia sobreviver à troca de conta. | Cada conta recebe uma cache própria, cancelada e limpa na desmontagem; a saída da conta tem tratamento de falha. |
| Curadoria | Respostas de filtros anteriores podiam continuar acionáveis; seleção e ações assíncronas podiam aplicar-se ao contexto errado. | Resultados pertencem a uma chave de filtro/edição. Carregamento e ações bloqueiam seleções incompatíveis e respostas antigas não substituem o contexto atual. |
| Preferências de IA | Gravações não verificavam todos os erros, podiam anunciar sucesso e substituir campos de outras superfícies. | Leitura e gravação têm estados explícitos, confirmação do servidor, escrita dos campos alterados e bloqueio de gravações concorrentes. Hashtags novas são adicionadas antes de remover as antigas. Após falha parcial é necessária nova leitura. |
| Lembretes e preferências | Uma falha de leitura podia deixar valores iniciais prontos a gravar; o teste de email aceitava respostas insuficientes. | Falha de leitura bloqueia gravação até recarregar; o formulário conserva escolhas numa falha ao guardar. O cliente exige `ok: true` e `sent: 1` para confirmar o teste. O servidor também verifica a confirmação do fornecedor e da gravação SQL antes de indicar sucesso. |
| Projetos | Erros de projetos ou tarefas podiam aparecer como ausência de projetos ou estatísticas a zero. | Erro de lista tem recuperação própria. Falha das tarefas permite abrir projetos, mas identifica as estatísticas como indisponíveis. |
| Biblioteca e histórico | Erros de leitura podiam apresentar conteúdo vazio ou resultados incompletos. | Falhas têm mensagem e repetição. A biblioteca não inicia sincronização automática com base numa consulta falhada; o histórico não calcula resultados com uma das duas fontes indisponível. |
| Artigos | Gravação ou eliminação assíncrona podia competir com abertura de outro rascunho. | As operações ficam protegidas contra repetição e troca de rascunho. Durante gravação, é possível continuar a escrever; durante eliminação, a edição aguarda a confirmação. O formulário também deixa de alargar a página no telemóvel. |
| Cartões de rascunhos | A abertura do cartão e a eliminação partilhavam uma área interativa sobreposta. | Abertura e eliminação usam botões separados, com foco e nomes acessíveis. |
| Divulgação após envio | Uma exceção ao consultar a confirmação de entrega podia entrar no tratamento genérico de tentativas dos trabalhos antigos com IA. | O trabalho permanece em `aguarda_confirmacao`, conserva o contador e agenda nova consulta. A falha não autoriza geração paga. A descrição da página distingue os rascunhos gratuitos dos trabalhos históricos com IA. |

## Pré-visualização local

```sh
npm install
npm run dev:hub
```

Abrir `http://127.0.0.1:5183/`. A faixa «Demonstração local» identifica dados fictícios. O percurso representativo inclui Painel, Curadoria, Rascunhos, Calendário, Artigos e Projetos; custos também são exemplos identificados.

As alterações suportadas nesta demonstração ficam apenas no armazenamento do navegador, na chave `hub:demo:plataforma:v1`. Remover a chave repõe os exemplos. O adaptador não importa o cliente Supabase real e recusa operações sem fixture, IA, envios, publicação, armazenamento remoto e chamadas de servidor não previstas. O modo acrescenta uma política de ligação que bloqueia pedidos externos diretos e não pode ser compilado para distribuição.

Esta pré-visualização serve para rever a interface e o comportamento local. Não valida RLS, sessões reais, cron, filas externas, quotas ou entrega de mensagens. A documentação técnica do modo está em `src/dev/HUB_LOCAL.md`.

## Validação

A base tinha 650 testes aprovados e um teste já ignorado. As alterações acrescentam regressões para navegação, pesquisa, notificações, isolamento de conta, estados de falha, preferências, curadoria, concorrência no editor de artigos e confirmação de entrega. Resultado final: **715 testes aprovados, 1 teste preexistente ignorado; 130 suites aprovadas e 1 ignorada**. Typecheck e build de produção aprovados. O grafo Edge de 250 ficheiros e as funções de newsletter passaram no Deno; o lembrete foi verificado separadamente. O detector de design não reportou ocorrências nos alvos revistos. A revisão visual em Chrome, incluindo viewport de 393 × 852, confirmou a correção do formulário de artigos e a pesquisa por teclado; não substitui testes em dispositivos físicos.

```sh
npm run test
npm run typecheck
npm run check:edge
npm run build
```

A revisão visual local usa páginas representativas em desktop e telemóvel. As capturas e registos locais de revisão não fazem parte dos ficheiros a enviar para o GitHub. Testes locais ou simulações não são prova de um envio E-goi, publicação WordPress ou publicação no Instagram.

A verificação ESLint direcionada identificou seis erros preexistentes em `PublicationHistory.tsx`, nas regras `no-explicit-any` e `no-empty`. A ronda não declara o lint integralmente limpo; a limpeza desse código legado fica por concluir.

## Pendências e limites desta ronda

| Pendência | Consequência e próximo passo |
| --- | --- |
| Idempotência dos lembretes | A recusa do fornecedor já não produz falso sucesso. Se o fornecedor aceitar o email e a gravação SQL seguinte falhar, uma repetição futura ainda pode reenviar o lembrete. Falta uma reserva durável e uma chave de idempotência no fornecedor para esse caso. |
| Hashtags gravadas em duas tabelas | A ordem das escritas e a recuperação foram melhoradas, mas o espelho continua sequencial, sem transação conjunta. Uma falha intermédia pode exigir recarregar e reconciliar. Uma RPC transacional deve ser avaliada numa ronda de base de dados. |
| Fluxos externos reais | Não foram disparados nesta ronda envios para a lista geral, publicações WordPress nem publicações/agendamentos Instagram. Falta observar esses percursos num ensaio autorizado com os serviços reais. |
| Acessibilidade e temas | Foram corrigidos alvos, nomes acessíveis e estados nas superfícies revistas. Não foi realizada uma auditoria WCAG automatizada completa, nem uma revisão exaustiva do tema escuro, gestos e todos os editores. |
| Tamanho da aplicação | O carregamento por página reduz o código inicial de várias áreas, mas continuam a existir módulos grandes e avisos de tamanho na compilação. A divisão dos motores e bibliotecas pesadas exige análise específica. |
| Trabalhos históricos de IA | O caminho legado é conservado para propostas já pedidas. O processamento manual desses trabalhos pode ter custo; o novo fluxo gratuito após envio real não o substitui retroativamente. |
| Publicação de artigos em vários WordPress | Fase seguinte: modelar sites, destinos, permissões, estados de publicação e reconciliação com cada site, incluindo fredericocarvalho.pt. Nesta ronda, Artigos continua a guardar rascunhos; não publica automaticamente. |

## Custos e instalação

O desenvolvimento, a demonstração e os testes locais desta ronda consumiram **0 créditos Lovable**. Os dois pedidos de instalação consumiram **0,50 + 0,80 = 1,30 créditos**, confirmados nos menus das respostas do Lovable, equivalentes a **0,39 €** à taxa indicada de 0,30 €/crédito. O primeiro parou por ainda estar selecionada a branch anterior; a branch foi depois trocada nas definições Git. Não se atribui uma poupança hipotética por linha de código.

Para a instalação final, enviar a alteração consolidada da branch depois da validação. O código partilhado de confirmação de entrega é alcançado por `nl-api`, `nl-conteudos`, `nl-hooks`, `nl-newsletter`, `nl-publico` e `nl-worker-conteudos`; estas funções requerem atualização além da aplicação frontend. Atualizar também `send_story_reminder`, cuja confirmação de sucesso foi corrigida e testada sem envios reais. Conferir o resultado remoto e registar os passos efetivamente concluídos; não tratar a importação do código como prova de funcionamento dos serviços externos.


## Registo da instalação

- PR: https://github.com/fcarvalho007/social-media-n8n/pull/10 (aberta, sem merge na branch anterior).
- Versão de código instalada nas funções: `5188552bcfbf60d9773dc4b82409d1facb9fef49`.
- Lovable confirmou deploy individual de `nl-api`, `nl-conteudos`, `nl-hooks`, `nl-newsletter`, `nl-publico`, `nl-worker-conteudos` e `send_story_reminder`.
- O agente Lovable reportou não ter alterado ficheiros, dependências, migrações, credenciais, permissões ou dados, nem executado jobs, envios ou publicações de conteúdo.
- A revisão automática recusou o clique em «Publish changes», por considerar que a autorização para sincronização/deploy não cobria suficientemente o passo separado de atualização da aplicação pública. Foi solicitada autorização específica ao proprietário; não foi usada uma via alternativa para contornar a recusa.
- A pré-visualização local continua disponível em `http://127.0.0.1:5183/`, sem Cloud ou operações externas. Falta validar a interface publicada depois dessa aprovação.
