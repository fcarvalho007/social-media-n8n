# Estratégia do motor editorial do Hub

Proposta para revisão de Frederico Carvalho, 18 de outubro de 2026.

**Decisão posterior do proprietário:** Byword passa a ser a referência funcional principal para a criação e a sequência dos artigos. O Hub adota o percurso pesquisa → estrutura → redação → revisão e a associação de voz, conhecimento e páginas a cada site. A implementação local está descrita em [Sequência editorial inspirada no Byword](sequencia-byword-local-2026-10-18.md). Esta decisão não contrata Byword nem autoriza publicar no Lovable ou nos WordPress.

O Hub deve gerir uma operação editorial com várias marcas: descobrir oportunidades, preparar artigos com fontes, adaptar cada texto ao site certo e executar a política de aprovação desse destino. A prioridade inicial é crescer o tráfego orgânico relevante. A captação de contactos, os pedidos de proposta e as inscrições serão a etapa seguinte, com os percursos de conversão preparados desde o início.

O desenvolvimento deverá continuar local, com demonstrações e revisão visual. Esta proposta não ativa geração paga, agendamentos, ligações de publicação nem alterações no Lovable.

## Funcionalidades das ferramentas analisadas

As funcionalidades abaixo são anunciadas nas páginas oficiais consultadas. Não representam um ensaio comparativo da qualidade dos artigos produzidos em contas pagas.

| Ferramenta | Funcionalidades relevantes | Aplicação ao Hub |
| --- | --- | --- |
| Byword | Pesquisa de keywords, intenção, concorrência, agrupamentos temáticos e oportunidades; geração com voz e conhecimento da marca; edição, sugestões de SEO e integração com CMS. | Principal referência para ligar pesquisa, plano e produção. Adaptar a sequência ao nosso trabalho editorial e às fontes do Hub. [Research](https://byword.ai/features/research/), [geração](https://byword.ai/features/generation/), [integrações](https://byword.ai/features/integrations/). |
| Bunzy | Pesquisa e planeamento, artigos recorrentes, voz de marca, imagens, ligações internas, publicação em CMS e escolha entre revisão e piloto automático. Também anuncia backlinks e notas de SEO/GEO. | Referência para gerir um calendário que se mantém abastecido e políticas por site. Não adotar comprimento fixo, pontuação ou criação automática de backlinks como prova de qualidade. [Bunzy](https://bunzy.io/pt). |
| Aissist.io | Agentes para atendimento e vendas, informação apoiada em conhecimento aprovado, regras de execução e passagem contextual para uma pessoa. | Referência para controlo e recuperação. O produto apresentado neste domínio não é um motor especializado em artigos SEO. [Aissist](https://aissist.io/). |
| Quillbot | Reformulação, correção linguística, resumo, citações e verificação de semelhança. O centro de ajuda declara que não disponibiliza API B2B ou B2C. | Inspirar edição por seleção e revisão linguística dentro do Hub, sem depender de uma integração Quillbot. PT-PT deve ser verificado com exemplos nossos; a página de gramática também identifica português do Brasil. [Ferramentas](https://quillbot.com/), [API](https://help.quillbot.com/hc/en-us/articles/4541472549527-Does-Quillbot-Offer-an-API), [gramática](https://quillbot.com/grammar-check). |
| Simplified | Memória de marca, produção de peças, calendário, aprovação, publicação e resultados; acesso por API, webhooks e MCP. A revisão é o padrão e a publicação automática é opcional. | Referência para integrar a operação sem transportar texto entre ferramentas. O Hub já tem parte destes percursos sociais. [Simplified](https://simplified.com/). |

Recomendação: construir as capacidades necessárias no Hub, aproveitando o motor textual existente e DataForSEO como fornecedor de dados. Não é necessário contratar ou integrar os seis produtos para reproduzir a experiência útil. A escolha do modelo textual deve ser validada num conjunto de artigos de teste; a arquitetura existente usa DeepSeek direto, sem gateway de IA do Lovable.

Notas de SEO ou GEO são diagnósticos de uma ferramenta. Não demonstram que um artigo irá posicionar, gerar tráfego ou ser citado por uma IA. O Google recomenda avaliar utilidade e valor original e alerta para produção em escala sem valor acrescentado. [Orientação sobre IA](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content).

## Estratégia para as quatro marcas prioritárias

As funções editoriais devem ser distintas, mesmo quando partilham investigação. A identidade de cada destino deve definir público, problemas, vocabulário, exemplos aprovados, oferta, fontes, temas excluídos e chamada para ação.

| Site | Papel editorial | Famílias iniciais de temas | Conversão a preparar | Política proposta |
| --- | --- | --- | --- | --- |
| smsonline.pt | Resolver problemas de empresas que usam ou podem usar SMS marketing. | Campanhas por setor, exemplos de mensagens, lembretes, fidelização, integração e medição de resultados. | Plataforma, demonstração ou contacto comercial; formação quando adequada ao tema. | Piloto de automatização em guias previamente delimitados. Conteúdo legal, preços ou funcionalidades não confirmadas exige revisão. |
| teletrabalhoweb.com | Atrair procura sobre trabalho remoto e desenvolver competências que conduzam às formações de Frederico. | Procura de emprego remoto, competências digitais, produtividade, ferramentas, IA aplicada ao trabalho e preparação profissional. | Guia ou tutorial útil, inscrição segmentada e formação existente no catálogo. | Automatização posterior de guias estáveis. Apoios, salários, legislação e oportunidades concretas exigem validação e data. |
| digitalfc.pt | Ajudar gestores, CEOs e diretores a decidir sobre transformação e desempenho digital. | Diagnóstico, auditoria digital, processos, automação, escolha de ferramentas, maturidade digital e retorno de iniciativas. | Checklist ou diagnóstico que conduz a auditoria e proposta de consultoria. | Produção assistida e revisão inicial. Automatizar depois apenas formatos e temas já validados. |
| fredericocarvalho.pt | Consolidar a prática de formador e consultor em IA e marketing digital. | Formação de equipas, aplicação prática de IA, marketing, SEO, aprendizagem e análise pessoal das novidades. | Programas de formação, workshops, palestras, newsletter e cursos. | Aprovação humana obrigatória em todas as publicações. |

As famílias de temas são hipóteses editoriais. Ainda não têm volumes de pesquisa medidos nesta investigação.

### Um acontecimento pode dar origem a trabalhos diferentes

Uma novidade sobre IA no trabalho pode justificar uma análise para gestores na DIGITALFC, um tutorial de competências no Teletrabalho Web e uma reflexão de Frederico sobre formação. Cada versão deve resolver uma pergunta própria e acrescentar conteúdo específico. Não basta trocar o nome da marca no mesmo artigo.

Cada oportunidade terá um destino principal. Um segundo destino só é proposto com uma diferença explícita de público, intenção ou contributo. Ligações entre sites devem ajudar o leitor a continuar uma tarefa, sem uma obrigação de ligar todos os domínios entre si.

## Mapa dos restantes domínios

| Domínio indicado | Observação no acesso de 18 de outubro | Consequência para o plano |
| --- | --- | --- |
| academiamarketing.pt | Página de preparação/renovação. | Definir primeiro a função editorial e a relação com os cursos. Não iniciar cadência automática durante a renovação. |
| certificacaomarketing.pt | O navegador devolveu erro de resolução do nome neste acesso. | Confirmar o domínio, funcionamento e proposta antes de o tratar como destino. |
| digitalsprint.pt | Apresenta formação empresarial em marketing e IA. | Delimitar a diferença face ao site pessoal, para evitar artigos concorrentes sem função própria. Manter separado o backup LearnDash da newsletter. |
| ensinoemcasa.com | Encaminhou para aulas.fredericocarvalho.pt. | **A desenvolver mais tarde.** Prever um futuro WordPress independente no catálogo de destinos, inicialmente inativo. O encaminhamento atual não exclui esse projeto. |
| leigdpr.pt | Encaminhou para fredericocarvalho.pt. | **A desenvolver mais tarde.** Prever um futuro WordPress independente no catálogo de destinos, inicialmente inativo. Se publicar conteúdo jurídico, prever revisão especializada. |
| auditoriaseo.pt | Apresenta a ferramenta phpRank de relatórios SEO. | Validar CMS e espaço editorial; pode ser uma ferramenta de captação ligada à DIGITALFC. Não presumir que aceita artigos pela API WordPress. |

O utilizador confirmou **teletrabalhoweb.com**. O domínio inicialmente indicado, teletrabalho.pt, encaminhou para bitwoci.pt no acesso efetuado e fica fora do catálogo proposto. Estas são observações de navegação, não uma auditoria de alojamento, propriedade ou DNS.

### Destinos previstos para desenvolvimento posterior

O catálogo deve permitir registar um site antes de existir uma instalação WordPress funcional. `ensinoemcasa.com` e `leigdpr.pt` ficam previstos como destinos independentes com o estado **Planeado** e o aviso **A desenvolver mais tarde**. Poderão ter identidade editorial e temas próprios preparados, sem exigir credenciais ou uma ligação ativa.

O estado de preparação do site é distinto do estado dos seus artigos e da política de aprovação. Um destino planeado não recebe publicações, agendamentos, produção automática nem verificações periódicas pagas. O encaminhamento atual fica registado como observação; não transforma o site de chegada no destino de publicação desse projeto.

Quando cada WordPress estiver pronto, o destino passa por configuração e teste de ligação, autor, categorias, pré-visualização e política editorial antes de ser ativado. Acrescentar ou ativar um site deve reutilizar o mesmo motor, sem exigir uma nova implementação por domínio.

No Teletrabalho Web existem conteúdos antigos destacados, incluindo um título com 2022. A revisão do arquivo deve entrar no plano de produção: confirmar atualidade e intenção, atualizar o que mantém valor e consolidar sobreposições. Artigos sobre apoios precisam de verificação própria antes de serem promovidos novamente.

## Pesquisa com DataForSEO

O acesso autenticado ao Playground foi confirmado. A página enviada era Business Data, destinada a informação de negócios locais. Para este motor interessam principalmente **DataForSEO Labs**, **Keywords Data** e **SERP**. Não foram executados pedidos pagos nem extraídas credenciais.

| Necessidade | Dados ou serviço a usar |
| --- | --- |
| Descobrir procura a partir de um tema | Keyword Suggestions, Related Keywords e Keyword Ideas. |
| Avaliar oportunidade | Volume estimado, intenção, dificuldade orgânica, tendência e data do conjunto de dados. |
| Entender a concorrência | Páginas já posicionadas, perguntas e formato dos resultados; pesquisa de lacunas face aos sites relevantes. |
| Evitar produzir o artigo errado | Comparar intenção e resultados com os artigos já existentes no próprio site. |
| Confirmar resultados depois de publicar | Search Console por página e consulta; DataForSEO complementa a pesquisa de mercado. |

As métricas dependem da localização e do idioma. A configuração inicial proposta é Portugal e português, com redação e revisão PT-PT. Português do Brasil ou procura global não devem ser misturados com o mercado português no mesmo indicador. O volume é uma estimativa e a concorrência de anúncios não é a dificuldade de posicionamento orgânico. [Keyword Overview](https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_overview-live/), [Keyword Suggestions](https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_suggestions-live/).

O Hub deve mostrar porque recomenda cada tema: procura, intenção, compatibilidade com o site, concorrência e contributo que conseguimos acrescentar. Ordenar apenas por maior volume favoreceria temas amplos sem ligação à formação ou aos serviços. Uma notícia recente também pode ainda não ter histórico suficiente nas bases de keywords; nesse caso, deve aparecer como oportunidade editorial, sem inventar volume.

Antes de gerar, o motor decide entre criar uma página nova, atualizar uma existente ou não avançar. Variantes da mesma intenção devem alimentar um artigo completo, em vez de gerar várias páginas muito semelhantes.

### Custos de pesquisa

A tabela atual de DataForSEO Labs Google indica, para os endpoints sem exceções, **US$0,012 por tarefa e US$0,00012 por item**. Alguns parâmetros e endpoints têm custos diferentes; clickstream duplica o custo onde está disponível. [Preço oficial](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api).

Exemplo apenas de dados de pesquisa: 20 tarefas que devolvem 500 itens cada custariam `20 × (0,012 + 500 × 0,00012) = US$1,44`. Não inclui SERPs adicionais, redação, imagens ou outros serviços. Não é uma previsão do custo mensal do motor.

Para controlar custos: reutilizar resultados por país/idioma/data, enriquecer só os temas selecionados, guardar o custo real por pedido e aplicar limites por site e por mês. Não refazer toda a pesquisa sempre que se abre o editor. Os primeiros testes de integração podem usar respostas de exemplo antes de consumir dados reais.

## Funcionamento do motor editorial

O ponto de partida pode ser uma notícia da curadoria, um tópico indicado por Frederico, uma keyword ou uma página existente que precisa de atualização.

1. **Escolher a oportunidade e o destino.** Explicar a relação com o público, o objetivo e o conteúdo já publicado.
2. **Preparar o plano do artigo.** Fixar pergunta principal, intenção, estrutura, contributo original, fontes, exemplos e chamada para ação.
3. **Reunir evidência.** Guardar fonte, data, trecho relevante e afirmações que pode sustentar. Distinguir factos, opinião, experiência fornecida pelo autor e exemplos hipotéticos.
4. **Redigir com a identidade do site.** Usar a base de conhecimento e as ofertas aprovadas. Não inventar experiências pessoais, clientes, resultados, estatísticas ou citações.
5. **Rever conteúdo e linguagem.** Confirmar suporte das afirmações importantes, nomes, números, datas, fontes, PT-PT, utilidade, repetição e semelhança com o nosso arquivo. Uma comparação com fontes consultadas não equivale a uma verificação de plágio de toda a web.
6. **Preparar a publicação.** Validar título, resumo, estrutura, slug, imagem, texto alternativo, ligações e dados específicos do WordPress. O conteúdo preparado e o conteúdo enviado devem derivar da mesma versão.
7. **Aplicar a política do destino.** Guardar em rascunho, pedir aprovação ou avançar automaticamente quando todas as condições estejam cumpridas.
8. **Confirmar e acompanhar.** Registar o ID e a versão remotos, confirmar estado/conteúdo e acompanhar resultados. Uma resposta ambígua exige reconciliação, não uma segunda criação imediata.

A investigação serve para fundamentar o artigo, não para imitar a estrutura dos primeiros resultados. O contributo pode ser um procedimento testado, uma análise própria, exemplos úteis, uma comparação com critérios claros ou uma ferramenta. Citar uma fonte não substitui esse trabalho. [Qualidade de conteúdo segundo o Google](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

### Conhecimento e voz por marca

Cada marca precisa de um conjunto pequeno de artigos aprovados, descrição de público, catálogo de ofertas, factos comerciais confirmados, exemplos autorizados e regras de linguagem. As correções humanas podem originar propostas de melhoria destas regras; o motor não altera silenciosamente a identidade nem generaliza uma correção de uma marca para todas as outras.

No site pessoal, a primeira pessoa deve corresponder a uma opinião ou experiência fornecida e revista por Frederico. Nos outros sites, o tom pode ser educativo ou empresarial conforme o público. A qualidade não será medida por uma percentagem de “texto humano” nem por um tamanho obrigatório de artigo.

### Condições para publicação automática

O conteúdo só pode seguir automaticamente se o destino permitir, o tema e o formato estiverem autorizados, as verificações obrigatórias passarem, as fontes estiverem acessíveis e atuais para as afirmações e o orçamento permitir a operação. Um tema jurídico, apoio público, preço, alegação comercial ou experiência pessoal fora da base aprovada deve passar para revisão.

Uma nota média alta não pode compensar uma afirmação importante sem suporte. A revisão por IA ajuda a detetar problemas, mas não garante a verdade. Falhas críticas devem indicar a causa e interromper a publicação.

## Cadência e reserva editorial

Como ponto de partida, propor **duas peças por semana em cada site que entrar no piloto**, em dias configuráveis e no fuso Europe/Lisbon. No site pessoal, estas são propostas para aprovação e não uma autorização de envio automático. Não ativar os dez domínios em simultâneo.

Uma distribuição inicial possível é 70% de guias duradouros, 20% de atualizações ou análise de novidades e 10% de conteúdo de autoridade. Esta mistura é uma hipótese a ajustar aos resultados. A unidade de trabalho pode ser uma atualização relevante de um artigo existente; não precisa de ser sempre uma URL nova.

Manter quatro semanas de plano e duas semanas de reserva pronta. Abaixo da reserva mínima, a fila propõe novos temas ou atualizações. Se uma notícia perder atualidade, um guia válido pode ocupar o lugar. Se não houver conteúdo que cumpra os critérios, o sistema avisa e ajusta o calendário em vez de publicar texto fraco para preencher o horário.

Preparação automática e publicação automática são permissões diferentes. O motor pode investigar e propor artigos para Frederico sem nunca os tornar públicos sem a sua aprovação.

## Crescimento e captação de contactos

O primeiro painel de resultados deve mostrar cliques orgânicos relevantes, impressões, consultas e páginas que ganham procura, separados por site e país. Comparar períodos e considerar a sazonalidade; não prometer um prazo de posicionamento. A API Search Console permite consultar desempenho por página, consulta, país e dispositivo, com autorização de leitura. [Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

Preparar desde o início a associação entre tema, recurso gratuito e formação ou serviço. No Teletrabalho Web, por exemplo: guia útil sobre competências digitais → recurso prático que desenvolve essa competência → contacto segmentado → formação adequada do catálogo. O artigo deve entregar valor mesmo a quem não se inscreve.

Numa segunda fase, medir downloads, inscrições confirmadas, interesse por temas, pedidos de proposta e inscrições em formação. Guardar a origem do contacto e o artigo associado permite perceber que tráfego tem valor. A existência de uma oferta ou formulário visível não comprova que o percurso completo de captação esteja a funcionar; esse ensaio fará parte da implementação.

## Experiência dentro do Hub

Manter **Artigos** como entrada principal. A proposta é organizar esta área em Oportunidades, Plano editorial, Textos e Resultados, reutilizando a Curadoria como origem e os padrões existentes de calendário e revisão. Os sites ficam associados às marcas/projetos, com as integrações na área de Ligações. Evitar criar um menu independente para cada domínio ou para cada etapa técnica.

Na oportunidade, mostrar tema, destino sugerido, motivo, métricas datadas e opção de criar/atualizar. No editor, dar prioridade ao texto e à pré-visualização, com fontes e verificações acessíveis quando necessárias. Na revisão, mostrar exatamente o que será publicado, em que site, sob que autor e em que momento. A aprovação refere-se a essa versão; uma alteração editorial posterior exige nova revisão.

O painel deve distinguir “preparado”, “aguarda revisão”, “agendado”, “a publicar”, “confirmação pendente”, “publicado” e “falhou”. Também precisa de pausa por site, pausa geral e ações claras de recuperação. O utilizador não deve ter de abrir logs técnicos para perceber o que exige atenção.

## Publicação em WordPress

Cada destino terá configuração e credenciais próprias no servidor, autor, categorias, fuso, imagem e política de publicação. A API WordPress distingue `draft`, `pending`, `future` e `publish` e disponibiliza o ID e a ligação do artigo. [Referência oficial](https://developer.wordpress.org/rest-api/reference/posts/).

A integração deve descobrir as capacidades reais de cada site e dos seus plugins de SEO, sem pressupor que todos aceitam os mesmos campos. Encaminhamentos inesperados para outro domínio devem impedir o envio de credenciais e a escrita. Precisamos de versões por artigo/destino, prevenção de duplicados e confirmação por leitura antes de declarar sucesso.

O código atual de Artigos apenas guarda rascunhos. Já existe integração específica da crónica com Frederico e um backup LearnDash separado para DIGITALSPRINT. São pontos de partida, não um publicador genérico pronto. Devem ser resolvidos os riscos de concorrência e reconciliação identificados na auditoria anterior antes de reutilizar essas operações.

O desenvolvimento, a demonstração e os testes ficam locais. A execução autónoma quando o computador está desligado terá de acontecer no backend, reutilizando a infraestrutura existente onde adequado. Publicar a interface no Lovable, instalar funções e ativar calendários editoriais são passos separados.

## Organização dos sites e PBN

A recomendação é uma rede editorial de marcas com públicos e contributos próprios. Ter vários sites pode servir estes objetivos. Usá-los principalmente para criar ligações artificiais ou replicar conteúdo em escala seria uma estratégia diferente e arriscada para o tráfego que se pretende construir. As políticas do Google abrangem esquemas de ligações e produção em escala destinada a manipular a pesquisa, incluindo a criação de vários sites para ocultar essa escala. [Políticas de spam](https://developers.google.com/search/docs/essentials/spam-policies).

Começar por quatro sites com funções claras permite aprender com o tráfego e reduzir sobreposições. Os restantes entram quando houver uma função editorial, um destino funcional e uma oferta definida.

## Desenvolvimento proposto e critérios de prontidão

1. **Aprovar o conceito.** Confirmar papéis das marcas, temas, mercado inicial, cadência, políticas e objetivo do piloto. Esta é a fase atual.
2. **Protótipo local do percurso.** Usar exemplos sem custos para experimentar pesquisa, plano, edição, fontes, revisão, destinos e falhas. Rever UX antes de ligar a geração real.
3. **Motor de pesquisa e produção local.** Ligar DataForSEO com limite explícito, preparar a base de conhecimento e usar o motor textual existente. Ensaiar 20 artigos, cinco por site, incluindo notícia adaptada, guia duradouro e atualização de conteúdo. Registar custos e correções necessárias.
4. **Publicador e testes de recuperação.** Simular primeiro. Depois, quando solicitado, preparar um rascunho WordPress controlado, confirmar a versão e ensaiar timeout, repetição, falha parcial e edição posterior à aprovação.
5. **Piloto restrito.** Propor SMS Online como primeiro candidato à automatização, pela oferta delimitada. Frederico continua sempre com aprovação. Alargar formatos e sites com base nos erros, no trabalho de revisão e nos resultados.
6. **Avaliar instalação.** Mostrar o resultado local, o conjunto de testes e as pendências. Só depois de um pedido explícito instalar/publicar no Lovable e ativar execução real.

Critérios mínimos: aprovação humana impossível de contornar no site pessoal; ausência de publicações duplicadas nos ensaios de repetição; preservação de edições humanas; fontes verificáveis para afirmações relevantes; PT-PT adequado; destino e versão inequívocos; custos registados; estados e recuperação compreensíveis. O conjunto de artigos precisa de revisão editorial humana, para além dos testes de software.

## Decisões para a próxima revisão

- Manter os quatro sites prioritários para o piloto. Incluir desde o início `ensinoemcasa.com` e `leigdpr.pt` no modelo do catálogo como destinos planeados, com o aviso **A desenvolver mais tarde**; a sua ativação fica para uma fase posterior.
- Usar Portugal e PT-PT como mercado inicial, a confirmar para eventuais públicos adicionais.
- Validar duas peças semanais por destino ativo como hipótese inicial, com reserva editorial e qualidade acima do preenchimento do calendário.
- Confirmar SMS Online como candidato ao primeiro piloto automático; manter os restantes em revisão durante a calibração e Frederico sempre com aprovação.
- Definir o limite de consumo para os ensaios de dados e IA antes de os executar.

Não houve nesta investigação desenvolvimento do motor, alterações de DNS, credenciais ou conteúdos, ativação de horários nem instalação no Lovable. A próxima ação proposta é rever esta estratégia, não publicar.
