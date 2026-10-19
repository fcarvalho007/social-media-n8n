# Instalação do pacote no Lovable — 18 de outubro de 2026

Instalação de backend autorizada pelo proprietário. Projeto: [Hub-Conteúdo](https://lovable.dev/projects/f100a3a8-d8dc-4aa5-89a4-d25e3de0bb36). Branch GitHub: `codex/hub-campanhas-descobertas`. A interface pública não foi republicada nesta ronda.

## Resultado

O código de prevenção de duplicados e isolamento, percurso editorial/pesquisa transversal, configuração guiada dos sites e campanhas a partir de descobertas foi importado. As migrações e as 12 funções previstas foram instaladas. O backend responde com autenticação e recusa os pedidos anónimos. A ligação da pré-visualização ao novo serviço ainda aguarda a autorização específica indicada abaixo; não se declara validação integral pela interface Cloud.

### Versões preservadas

- Base remota anterior: `4bb0a543bbc434c28b9e9b208b9c8f263fcc57b0`.
- Código local importado: commit remoto `411e9daf62121fee4d9cb4ccd4dc9c40dd22b434`, árvore `d5d9457e23628180b9e92dd4a5b610018bc189b5`, idêntica ao desenvolvimento local.
- Após adaptações Cloud: `26fcea91b055dcfc9340670f76d5cd90eecf663f`, árvore `0c9dc2105dd008a1d307cb82242c50efefc6f71b`.
- Runtime final instalado: `e599db742a8165476caa8ed574547996a18464a9`, árvore `274e717152df13c5720769c2477f1782ab367c03`. HEAD e árvore confirmados pelo Lovable antes do redeploy final.
- O trabalho anterior foi preservado. Não houve reset, merge para main ou publicação da interface pública.

## Base de dados

O catálogo exigiu uma adaptação da ordem e das restrições do ambiente gerido. Foram aplicados:

1. `0064_hub_isolamento_colunas_preflight.sql`: três colunas de projeto necessárias antes da reserva social.
2. `0065_publicacao_segura_cloud.sql`: DDL de publicação segura, autoria UUID obrigatória sem FK ao esquema de autenticação gerido, grants antes de RLS.
3. `0066_isolamento_social.sql`: isolamento de publicações, rascunhos, artigos e analítica.

As migrações 0062/0063 não foram reaplicadas. Os ficheiros originais 0064/0065 permanecem como referência; as variantes Cloud foram registadas no journal. Nenhum histórico foi apagado ou reatribuído. Clientes continuam sem escrita direta no estado Hub e nos documentos privados.

O primeiro comando que incluía a desativação do cron foi integralmente revertido por falta de permissão sobre `cron.job`. O DDL foi aplicado sem esse comando. Depois, a desativação foi concluída diretamente no painel oficial **Cloud → Jobs** e a listagem atualizada confirmou **send-scheduled-posts = Paused**. Esse bloqueio inicial está resolvido.

## Funções instaladas

| Função | Resultado |
| --- | --- |
| hub-editorial | Instalada e novamente instalada com o runtime final |
| hub-editorial-worker | Instalada e novamente instalada com o runtime final |
| callback | Instalada |
| get-getlate-accounts | Instalada |
| import-instagram-data | Instalada |
| import-instagram-profiles | Instalada |
| incoming | Instalada |
| publish-proxy | Instalada |
| publish-to-getlate | Instalada |
| send-scheduled-posts | Instalada com implementação retirada, HTTP 410; não invocada no teste |
| submit-to-n8n | Instalada |
| sync-getlate-posts | Instalada |

A função worker está instalada, mas a execução permanente do Hub e o respetivo cron continuam inativos. Os outros crons existentes não foram ativados nem modificados. Não foram alteradas credenciais WordPress.

## Dependências e correções

Não foram instaladas nem atualizadas dependências. Manifestos e lockfiles mantêm-se. Foram corrigidos campos opcionais no catálogo do percurso e declarações de tipos de jsdom para resolver erros de compilação do Cloud.

Os dois runtimes foram depois regenerados **localmente pelo gerador do projeto**, propagando as seis proteções de campos opcionais em cada ficheiro. Não houve edição manual de bundles. Essa revisão foi importada por GitHub e instalada apenas nas duas funções Hub, sem repetir migrações.

## Validação efetiva

- Antes da importação: **1 112 testes locais aprovados e um ignorado**.
- Instalação no Lovable: **143 testes distintos aprovados**, além de 51 repetições após correções.
- Após regenerar os runtimes localmente: **73 testes dirigidos aprovados**; tipos da interface e backend, build, grafo de 255 ficheiros e verificações Edge passaram.
- API e worker sem autenticação: **401**. Origem não autorizada: **403**.
- Com a sessão existente: `/operacao/estado`, `/seo/estado`, `/operacao/percurso` e `/operacao/pesquisa`: **200**, JSON válido.
- Depois do último redeploy: `/seo/estado` e `/operacao/pesquisa` autenticados **200**; ambos anónimos e worker anónimo **401**.
- Getlate, apenas leitura: contas **200 / 6 contas**; posts **200 / 5 resultados / read_only=true**; anónimos **401**.
- Matriz transacional com `SET LOCAL ROLE authenticated` e rollback: contas A/B leem documentos, artigos e analítica próprios **1/1/1** e alheios **0/0/0**. Conta sem papel lê **0/0/0**. Atualização própria aceite; atualização/inserção alheia e escrita direta de documentos recusadas. Restaram **zero fixtures**.
- Consulta de posts, rascunhos, artigos e analítica alheios pela sessão atual: **zero linhas**.
- Bucket de documentos privado, limite de 50 MB. Ledger social vazio. Edição 319 conserva estado enviado, data e snapshot.
- A revisão visual local das campanhas terminou aprovada em desktop e telemóvel; isso não substitui o ensaio Cloud.

Resultados de segurança disponíveis no Lovable estavam desatualizados: não são apresentados como uma nova aprovação de segurança desta versão. A matriz de isolamento acima foi efetivamente executada nesta instalação.

## Custo desta instalação

| Etapa | Créditos | Custo a 0,30 €/crédito |
| --- | ---: | ---: |
| Instalação, adaptações e verificações principais | 14,50 | 4,35 € |
| Redeploy final restrito das duas funções | 1,70 | 0,51 € |
| **Total observado** | **16,20** | **4,86 €** |

Saldo inicial observado: **3 690,58**; intermédio: **3 676,08**; final: **3 674,38 créditos**. Valores brutos do indicador: 3690.580078125, 3676.080078125 e 3674.3798828125; diferença arredondada a duas casas. O primeiro total também foi corroborado pelo detalhe do pedido (14,5). A medição por saldo é da workspace, não uma fatura individual de infraestrutura.

Não foram feitas chamadas pagas a DataForSEO, DeepSeek, imagens ou outros fornecedores de conteúdo. Custos de infraestrutura Cloud futuros são separados dos créditos de construção acima.

## Por concluir ou comprovar

1. **Ligar a pré-visualização ao backend.** O preview Vite usa modo development e não carrega `.env.production`. Foi proposta a criação de `.env.development` com apenas o URL público de `hub-editorial`, sem credenciais e sem alterar o `.env` gerido. A revisão automática recusou publicar esse ficheiro, interpretando a regra de configuração gerida como impedimento. Foi solicitada autorização humana específica. O ficheiro não foi enviado, e não se tentou contornar a recusa por outro mecanismo.
2. **Ensaio Cloud de escrita de campanha e compositor**: criar campanha sintética, preparar Story/carrossel, editar, guardar e reabrir. Ainda não foi possível pela interface, por depender da configuração anterior. Os testes locais e HTTP de leitura não provam este fluxo de escrita em produção.
3. **Envio real → rascunhos**: não foi enviado qualquer newsletter nesta ronda. A criação automática após envio real não foi comprovada novamente.
4. **Importação privada dos 37 PDFs**: continua pendente e não foi executada nesta instalação.
5. **Execução permanente e operações externas**: worker Hub não ativado; publicações WordPress/sociais e piloto pago não executados. A instalação não equivale a autorizar o início dessas operações.

Nenhuma newsletter foi enviada, nenhuma publicação externa foi criada e nenhuma peça real foi sobrescrita. A aplicação pública permanece na versão anteriormente publicada.

## Ligação da pré-visualização concluída — 19 de outubro de 2026

O proprietário respondeu «Autorizar a ligação da pré-visualização» ao pedido específico sobre `.env.development`. O bloqueio de autorização do ponto 1 acima está resolvido. O ficheiro foi criado localmente, contendo exclusivamente a URL pública já instalada, e importado na branch `codex/hub-campanhas-descobertas` pelo commit `dbcf46362df24306dc7e125f36a591e6d51a6212` (árvore `6dca700bab11d3573fc657f8699e1e07a2ce1ca1`). O `.env` gerido foi preservado. A compilação em modo development e os 22 testes dirigidos passaram.

O teste no navegador revelou também uma recusa CORS: o Lovable usa duas origens próprias para as pré-visualizações estática e ativa. A configuração pública `HUB_ORIGENS` foi atualizada pelo formulário Cloud, preservando as duas origens anteriores e acrescentando apenas as duas deste projeto:

- `https://hub-conteudo.lovable.app` — preservada;
- `https://preview--hub-conteudo.lovable.app` — preservada;
- `https://id-preview--f100a3a8-d8dc-4aa5-89a4-d25e3de0bb36.lovable.app` — pré-visualização estática;
- `https://f100a3a8-d8dc-4aa5-89a4-d25e3de0bb36.lovableproject.com` — pré-visualização ativa.

Não foram usados wildcards nem alteradas autenticação, RLS ou credenciais. Não foi necessário redeploy. OPTIONS na pré-visualização ativa devolveu 204 com a origem exata e os cabeçalhos necessários; leitura anónima continuou 401 e origem alheia 403. O Lovable confirmou ainda quatro leituras autenticadas 200: estado com zero trabalhos, fontes com 99 entradas, acervo e tarefas vazios.

A validação final foi feita diretamente no navegador do proprietário, após entrar com a conta existente na origem ativa: Biblioteca (0), serviço «Tarefas em pausa», recolha periódica desligada, Sites com PDFs com 99 fontes, pesquisa «Stanford» com um resultado e histórico com zero entradas. A pesquisa foi limpa e o separador de fontes ficou aberto. Estas leituras não comprovam upload, extração, capas ou importação do acervo anterior.

O pedido restrito no Lovable apresentou **Credits used 3**: **3 créditos diários**, equivalentes a **0,90 €** a 0,30 €/crédito. O indicador diário passou de 5 para 2; o saldo do plano permaneceu em 3 665,53. Não houve chamadas a fornecedores pagos. A alteração de código/configuração versionada foi de uma linha; as restantes alterações desta ronda são documentação.

Continuam pendentes os pontos 2–5 da lista anterior: ensaio de escrita de campanhas/compositor, reconfirmação envio real → rascunhos, importação privada dos 37 PDFs e ativação/validação separada da execução permanente e operações externas. A interface pública não foi republicada.
