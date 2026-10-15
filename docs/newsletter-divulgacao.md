# Divulgação da newsletter

Extensão do Hub existente: um Story convida a ler a crónica no dia do envio; um carrossel dos destaques dá uma segunda razão para visitar a edição no dia seguinte. Esta cadência é uma hipótese editorial a ajustar com os dados da conta, sem garantia de alcance, conversão ou melhor horário.

Estado em 15 de outubro de 2026: a extensão inicial está instalada desde 14 de outubro. O refinamento visual e a edição no compositor descritos abaixo estão no código local, revistos no âmbito indicado, e **ainda não estão instalados nem publicados**.

## Comportamento

A confirmação `sent` de uma campanha de lista real na E-goi prepara rascunhos editáveis a partir da fonte conservada da edição. A simples aceitação do envio não chega. A preparação destas duas peças não chama IA paga, não publica no Instagram e não agenda conteúdos. Se faltar preparar a divulgação, a ação «Preparar divulgação · sem IA» permite retomá-la.

O Story usa o título, um excerto literal da crónica e um convite à leitura. O carrossel usa os destaques e conserva as fontes e a leitura aprovada de Frederico, repartindo texto longo quando necessário. Um carrossel ou Story já guardado não é substituído pela preparação nem por uma repetição do pedido; os rascunhos antigos continuam disponíveis. Edições antigas sem destaques mantêm o editor anterior da crónica.

O teste interno mantém-se pré-envio. «Preparar divulgação de teste · sem IA» cria um rascunho separado da composição atual, sem job de envio real, chamadas à E-goi ou alteração do estado de envio. Um teste interno marcado como enviado nunca confirma a divulgação real. A edição 319 e o teste interno 970 devem ser preservados.

## Abrir, rever e exportar — versão instalada em 14 de outubro

1. Abre a edição no editor da newsletter e encontra «Divulgação no Instagram». Depois da preparação, escolhe «Rever Story e carrossel». Antes do envio real, usa a caixa «Teste · pré-envio» e «Preparar divulgação de teste · sem IA» ou «Rever divulgação de teste». O destino é `/estudio/redes-sociais/<conteudo_id>`; também podes reabrir o rascunho na lista de carrosséis do Estúdio.
2. Em «Dia do envio · Story», revê o título, excerto, convite e «Ligação do autocolante». Guarda em «Guardar Story» e só depois escolhe «Marcar como revisto». Os estados distinguem alterações por guardar, guardado por rever e revisto com publicação manual. Uma alteração posterior exige guardar e rever de novo. Em conflito de versões, o texto mantém-se no editor; copia-o antes de reabrir. Há recuperação local para alterações não guardadas.
3. Escolhe «Descarregar Story» para obter o PNG de 1080 × 1920. «Copiar ligação» copia o endereço do campo, incluindo os parâmetros de medição. O PNG não contém uma ligação clicável: ao publicar manualmente no Instagram, adiciona o autocolante «Ligação» no espaço livre por baixo do convite e cola esse endereço.
4. Em «Dia seguinte · Carrossel», percorre os slides, confirma capa, factos, fontes, leitura e legenda e usa «Guardar». «PNG (ZIP)» exporta os slides de 1080 × 1350 e `legenda.txt`; «PDF» exporta o documento. A pré-visualização e a exportação usam o mesmo desenho. Texto que não cabe bloqueia a exportação com uma indicação para o encurtar.
5. «Criar rascunho social» encaminha a versão guardada para revisão no fluxo social existente; não publica. Se já existir, usa «Abrir revisão do rascunho». A publicação e a colocação da ligação à edição no perfil continuam manuais. «Gerar com IA» ou «Gerar alternativa com IA» são ações explícitas do editor existente, com confirmação de consumo; não fazem parte da preparação automática gratuita.

## Refinamento de 15 de outubro — ainda não instalado

O refinamento torna a arte mais expressiva dentro da identidade existente da DIGITALSPRINT: papel, navy, lima e azul, com Space Grotesk nos títulos e Inter no corpo. Não cria uma marca ou um sistema visual novo. A notícia usa papel e uma faixa de fonte; a opinião usa navy, o título «A minha leitura» e a assinatura discreta `@fredericocarvalho`; a crónica distingue-se por um bloco azul. O Story combina título sobre navy com excerto sobre papel e reserva espaço para o autocolante de ligação.

O compositor reutiliza o editor Operate existente através de `CompositorDivulgacao` e `EditorGrafico`. Permite ajustar texto, posição, cor, tamanho e elementos da arte. Pré-visualização, editor e exportação partilham o renderer do documento gráfico, incluindo os ajustes guardados.

Fluxo a usar depois da instalação:

1. Abre o rascunho e revê o texto. No carrossel, «Repartir texto · sem IA» divide passagens longas sem cortar conteúdo, conserva as referências e as leituras aprovadas completas e atualiza os títulos antigos de leitura para «A minha leitura». A ação prepara alterações no editor; revê e guarda a nova versão antes de compor. Se forem necessários mais slides do que o limite suportado, informa o problema e não corta o conteúdo.
2. Guarda primeiro as alterações de origem: «Guardar Story» ou «Guardar» no carrossel. Abre «Editar Story no compositor» ou «Editar no compositor» na peça pretendida.
3. Ajusta a arte e usa «Guardar composição». A composição de Story e a de carrossel são guardadas separadamente. O texto de origem da newsletter e do rascunho editorial é preservado.
4. Usa «Voltar à divulgação», reabre o compositor e confirma os ajustes. Descarrega o Story ou exporta o carrossel em «PNG (ZIP)» ou «PDF»; as exportações usam a composição ajustada. Revê o resultado e a ligação antes da publicação manual.

A composição canónica usa `DocumentoGrafico`, dentro do pacote guardado em `divulgacao.composicoes.story` ou `divulgacao.composicoes.carrossel`, separada do texto de origem. A gravação usa a mesma comparação de versão (`divulgacao_versao`, CAS) já existente para divulgação. Não exige uma nova migração, alteração de RLS ou novas credenciais.

Guardar uma origem diferente conserva a composição anterior. Ao reabri-la, o aviso «O texto de origem mudou» exige «Recriar a partir do texto» para adotar a fonte nova; os ajustes anteriores só são substituídos ao guardar a nova composição. Pode exportar-se o JSON do documento antes de recriar. Um conflito de versão ou de origem mantém a composição em edição, com recuperação local para alterações por guardar; não substitui silenciosamente o trabalho.

A preparação e a repartição do texto continuam sem IA paga. As alternativas com IA continuam ações explícitas, com confirmação de consumo. Este refinamento não envia emails, publica ou agenda no Instagram. A edição 319 e a campanha interna 970 ficam preservadas; a repartição do rascunho pré-envio só deve ser feita por ação explícita.

As práticas de carrossel aplicadas são hierarquia legível, contraste, uma ideia por slide, fonte e autoria visíveis, um convite principal, margens e exportações consistentes. O número de slides resulta do conteúdo e do encaixe. Não se assume um número ótimo rígido, uma grelha quadrada obrigatória ou uma promessa de desempenho algorítmico.

## Refinamento de subscrição — 15 de outubro

O último slide das novas propostas promove a subscrição: «Recebe a próxima edição», um benefício curto e `podes.entrar.pt/news`. A ligação curta foi aberta no navegador e encaminhou para a página de inscrição, com o formulário E-goi disponível. A legenda e a ligação do PDF usam o destino canónico `https://fredericocarvalho.pt/newsletter-marketing-economia-digital/`, com UTM. A edição completa, a crónica, as fontes e o curso continuam nas referências da legenda; deixam de disputar o convite principal no último slide. Partilhar é um convite secundário na legenda. Não se reproduzem números de leitores ou superlativos do exemplo fornecido sem confirmação.

As composições já guardadas são preservadas. Para adotar o fecho novo num rascunho existente, edita o último slide de origem, guarda e usa «Recriar a partir do texto» no compositor. Só «Guardar composição» substitui a cópia visual guardada.

A opinião conserva o fundo navy, o título «A minha leitura» e a assinatura discreta `@fredericocarvalho`, sem fotografia automática.

## Medição

As ligações preparadas usam `utm_source=instagram`, `utm_medium=organic_social`, `utm_campaign=digitalsprint_<numero>` e `utm_content=story_d0` ou `carrossel_d1`. O Story aponta para a crónica; a subscrição e as ligações acrescentadas à legenda do carrossel permitem distinguir a segunda peça. Se editares a ligação do Story, confirma que os UTM pretendidos continuam presentes.

Compara visitas à crónica/edição e cliques no autocolante; para o carrossel, acompanha também guardados e partilhas. A avaliação cruza os dados do site com os dados da conta Instagram. «Dia do envio» e «Dia seguinte» são sugestões editoriais; o Hub não define uma hora nem garante resultados.

## Validação local e evidência visual

Na raiz do projeto:

```sh
npm run dev -- --mode divulgacao --host 127.0.0.1 --port 5182 --strictPort
```

Abre `http://127.0.0.1:5182/estudio/redes-sociais/local-newsletter-319`. Este modo usa a composição de demonstração da 319, identificadores sintéticos e armazenamento local; as operações Cloud, envios, IA paga e publicação estão desligados. Permite editar, guardar, reabrir, rever, copiar a ligação e exportar sem tocar no teste 970.

```sh
npm test -- src/test/newsletter-divulgacao.test.ts src/test/divulgacao-editor.test.tsx src/test/carrossel-proposta-envio.test.ts
npm test -- src/test/divulgacao-composicao.test.ts src/test/divulgacao-compositor-ui.test.tsx src/test/compositor-refinamentos.test.ts
npm run typecheck
npm run check:edge
npm run build
```

As fixtures cobrem a separação de campanhas internas/reais, confirmação exigida, fonte literal, UTM, preservação dos rascunhos, conflitos e revisão. O disparo real completo em produção não pode ser testado de ponta a ponta sem um envio real; essa validação não deve ser simulada como concluída nem motivar um envio de teste para listas reais.

Na revisão da extensão de 14 de outubro, quatro capturas foram comparadas localmente com a identidade e os componentes existentes, em desktop e móvel, e não foram incluídas no GitHub. Preservavam papel/navy/lima da DIGITALSPRINT e o editor shadcn, com colunas no desktop e conteúdo empilhado no móvel. A revisão visual considerou essa extensão pronta, sem correções materiais. Não foi aprovada uma mudança de identidade ou de sistema visual.

O refinamento de 15 de outubro tem sete capturas locais: compositor em desktop e móvel, Story em desktop e móvel, notícia em desktop, leitura em desktop e carrossel em móvel. Um revisor independente concluiu que estava pronto no âmbito dessas capturas e do código revisto. A crónica com bloco azul foi verificada apenas no código. As capturas permanecem locais, sem ligações a ficheiros ausentes no GitHub. Esta revisão não constitui aprovação geral de produção nem confirmação de instalação.

Os novos testes de encaixe usam fontes TTF reais e incluem o caso de 338 caracteres fornecido pelo utilizador. Após a correção da altura da caixa da crónica, a bateria completa passou: 644 testes, com um teste anterior ignorado. Typecheck, build Vite e verificação das funções Deno (249 ficheiros) passaram. No navegador local foram verificados guardar/reabrir uma alteração visual do Story, repartir e guardar o carrossel, reabrir as composições, ausência de deslocação horizontal no móvel e exportação de dez PNG a 1080 × 1350 e PDF de dez páginas. A instalação posterior em produção está registada abaixo.

## Instalação confirmada em 14 de outubro

Instalação confirmada em 14 de outubro de 2026: migração 0061 aplicada, cinco funções republicadas e aplicação publicada a partir de `codex/newsletter-divulgacao`. O rascunho de teste da 319 foi aberto na aplicação publicada, com Story guardado por rever e o carrossel anterior de 12 slides preservado. Guardar/reabrir e exportar PNG/ZIP foram verificados, incluindo revisão móvel. Não foram enviados emails, publicados conteúdos no Instagram nem executada geração paga de conteúdo. O próximo envio real continua necessário para observar o disparo completo em produção.

Validação: 630 testes passaram (um teste anterior ignorado); após o ajuste final do excerto, os 14 testes focados passaram. Typecheck, build Vite e verificação Deno de 248 ficheiros passaram no estado final. O verificador próprio do Lovable apresenta um aviso de resolução da versão Supabase nas funções; não impediu os cinco deploys nem a publicação da aplicação. PDF e criação de rascunho social pertencem ao fluxo existente e não foram repetidos nesta instalação.

Receita histórica da instalação inicial, a partir de `codex/newsletter-divulgacao`, preservando as migrações anteriores e os dados existentes:

1. Aplicar uma vez `drizzle/migrations/0061_newsletter_divulgacao.sql`. Acrescenta `divulgacao` e `divulgacao_versao` à tabela existente; não altera grants nem RLS.
2. Fazer deploy de `nl-conteudos`, `nl-worker-conteudos`, `nl-api`, `nl-newsletter` e `nl-hooks`, incluindo o respetivo grafo de módulos partilhados.
3. Publicar a aplicação com o código da mesma branch.
4. Verificar o rascunho pré-envio da 319: abrir/preparar sem IA, editar, guardar, reabrir, rever, copiar ligação e exportar. Confirmar que a 319 e o teste 970 permanecem intactos e que o teste não cria divulgação real. Não enviar email nem publicar no Instagram para validar a instalação.

Prompt histórico da instalação inicial:

> Instala o código já commitado da branch `codex/newsletter-divulgacao`, seguindo `docs/newsletter-divulgacao.md`. Não cries nem reescrevas a implementação e não geres conteúdo com IA. Aplica uma vez a migração 0061, faz deploy de `nl-conteudos`, `nl-worker-conteudos`, `nl-api`, `nl-newsletter` e `nl-hooks` com os módulos partilhados e publica a aplicação. Verifica apenas o rascunho seguro pré-envio da edição 319, preservando a edição e o teste interno 970: guardar/reabrir, revisão, copiar ligação e exportar. Não envies email, não publiques nem agendes no Instagram e não consumas IA paga. Reporta os passos efetivamente concluídos e as limitações.

## Instalação confirmada do refinamento de 15 de outubro

Instalação confirmada em 15 de outubro de 2026: as cinco funções foram republicadas com os módulos partilhados e a aplicação foi publicada a partir do commit `ff0a0ae1dee7282921ffe0045b05db8c5d831b8a` da branch `codex/newsletter-compositor-visual`. Não foi criada uma migração nova nem alteradas permissões ou credenciais.

Na aplicação publicada, o rascunho pré-envio da 319 ficou na versão 4: 17 slides com passagens longas repartidas, capa com 84 caracteres de corpo, legenda de 240 caracteres e fecho de subscrição com 76 caracteres de benefício. A versão anterior de 12 slides permanece no histórico. As leituras aprovadas mantêm-se completas; a opinião está sem fotografia. Story e carrossel ficaram guardados como composições editáveis, por rever, e reabriram com a gravação preservada.

Foram verificados Story PNG a 1080 × 1920, ZIP real com 17 PNG a 1080 × 1350 e legenda atualizada, e PDF real de 17 páginas com ligação final à subscrição e UTM. As provas da aplicação publicada ficam locais. Nenhum email ou conteúdo de Instagram foi enviado, publicado ou agendado. O disparo automático após um envio real continua por observar no próximo envio real.

Validação final: 644 testes passaram, com um teste anterior ignorado; typecheck, build Vite e verificação Deno dos 249 ficheiros passaram. O Lovable mantém um aviso de resolução de dependências no seu ambiente de compilação; os deploys pelo canal próprio foram confirmados. Uma tentativa posterior de reparar esse ambiente foi interrompida após os deploys, sem alterações adicionais à branch.

Receita de reinstalação pelo GitHub, sem reimplementar o código:

1. Preservar a migração 0061 já aplicada, as restantes migrações, RLS, credenciais e dados existentes. Este refinamento não tem uma migração nova.
2. Fazer redeploy de `nl-conteudos`, `nl-worker-conteudos`, `nl-api`, `nl-newsletter` e `nl-hooks`, com os respetivos módulos partilhados, e publicar a interface da mesma branch.
3. Verificar num rascunho pré-envio o fluxo completo: repartir explicitamente se necessário, guardar origem, abrir o compositor de cada peça, ajustar, guardar composição, voltar, reabrir e exportar. Verificar também o aviso de origem alterada e a preservação da edição em conflitos.
4. Preservar a edição 319 e a campanha interna 970. Não enviar emails, publicar ou agendar no Instagram para validar. A repartição do rascunho pré-envio exige uma ação explícita; não deve ser aplicada automaticamente aos dados existentes.

Prompt de referência para reinstalação:

> Instala pelo GitHub o código já commitado da branch `codex/newsletter-compositor-visual`, seguindo a secção de refinamento de 15 de outubro de `docs/newsletter-divulgacao.md`. Reutiliza a implementação existente; não a reescrevas no Lovable. Não há migração nova: preserva a 0061, RLS, credenciais e dados. Faz redeploy de `nl-conteudos`, `nl-worker-conteudos`, `nl-api`, `nl-newsletter` e `nl-hooks` com os módulos partilhados e publica a interface da mesma branch. Verifica apenas num rascunho pré-envio o compositor de Story e carrossel, guardar, voltar, reabrir e exportar com os ajustes. Preserva a edição 319 e a campanha interna 970; só reparte texto do rascunho por ação explícita. Não envies emails, não publiques nem agendes no Instagram e não consumas IA paga. Reporta o que foi efetivamente instalado e verificado e as limitações.
