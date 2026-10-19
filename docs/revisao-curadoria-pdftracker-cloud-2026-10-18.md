# Revisão de Curadoria e PDF Tracker na aplicação Lovable

Ronda de 18 de outubro de 2026. Branch `codex/hub-campanhas-descobertas`. A inspeção começou na pré-visualização autenticada do Lovable, com Notícias, Aprovadas, Emails e Fontes de notícias reais. Os refinamentos foram desenvolvidos localmente para conservar o fluxo GitHub e reduzir créditos de construção. A publicação da interface pública fica fora desta ronda.

## Problemas confirmados e refinamentos

| Prioridade | Evidência e efeito | Correção |
| --- | --- | --- |
| P1 | Abrir Emails produzia HTTP 500: relação ambígua entre `nl_noticias` e `nl_edicoes`. | A consulta identifica a relação pela coluna `edicao_id`. O mesmo problema foi corrigido na procura de URLs duplicados; uma falha nessa consulta impede prosseguir como se não existissem duplicados. |
| P1 | O painel de notícias extraídas podia mostrar zero itens após erro; o de ferramentas podia desaparecer. | Erro explícito, original preservado e recuperação por nova leitura, sem reprocessar email nem chamar IA. |
| P1 | A ligação «Abrir» de uma notícia extraída apontava para a antiga raiz do editor. | Abre a notícia em `/curadoria?noticia=…`. |
| P1 | A seleção das fontes PDF permitia escolher mais de 12, apesar do limite do servidor. | Seleção em lote limitada a 12, indicação do limite e conservação das escolhas entre pesquisas. |
| P2 | Voltar de Emails/Fontes reiniciava a decisão, pesquisa e filtros das notícias. | Filtros no endereço, com nomes próprios que não colidem com filtros dos emails ou PDFs; regresso pelo navegador conserva o contexto. |
| P2 | Havia código para todo o histórico, mas o seletor só permitia até 30 dias. | Opção «Todo o histórico», consultada com `desde=null`. |
| P2 | Decidir a última notícia da página final podia deixar uma página vazia, apesar de existirem notícias noutras páginas. | Regresso automático à página ainda disponível. |
| P2 | Notícias aprovadas tinham quatro ações de criação de peças visíveis em cada cartão. | Menu «Criar peça» com roteiro, carrossel, post e Story; «Criar campanha» conserva o seu acesso próprio quando o serviço está disponível. |
| P2 | O formulário PDF anunciava 50 MB na nuvem; o processamento Edge aceita 32 MB. | A interface mostra 32 MB na nuvem e recusa antecipadamente ficheiros maiores. O limite local de 50 MB mantém-se. |
| P3 | Os resultados Cloud ainda diziam «descarregados em disco» e «Reimportar do disco». | Rótulos distinguem o servidor do disco local. |
| P3 | Havia uma ligação interativa dentro do botão expansível de ferramentas. | Controlos separados, foco e áreas principais de 44 px; painel de notícias com estado expandido acessível. |
| P3 | «Fontes ativas» no cabeçalho podia ser confundido com as fontes de PDFs. | «Fontes de notícias ativas» e título do gestor «Fontes de notícias». |

## Consistência e auditoria

Mantidos tema claro, tokens, tipos, breadcrumbs e componentes existentes do Hub. Documentos e relatórios continua dentro de Curadoria. Reutilizados Button, Alert, DropdownMenu e restantes primitivos existentes; nenhuma dependência nova. As peças gráficas não foram redesenhadas nesta ronda.

Avaliação heurística inicial das superfícies inspecionadas: acessibilidade 2/4, desempenho 3/4, responsividade 3/4, tokens 3/4 e hierarquia/complexidade 2/4 (13/20). É uma leitura de prioridades, não uma certificação WCAG nem uma medição de Core Web Vitals. Os principais problemas funcionais acima foram priorizados antes de alterações decorativas.

## Verificações locais

- **1 120 testes aprovados e um ignorado**, em 183 ficheiros aprovados e um ignorado.
- **45 testes dirigidos aprovados**, incluindo falhas recuperáveis dos emails, destino da notícia, favoritos com filtros, botão voltar, paginação e limite de fontes.
- TypeScript, build e grafo Edge aprovados. O grafo verifica 255 ficheiros; a execução com Deno disponível passou. O gerador da newsletter foi executado a partir das fontes inertes; não houve edição manual dos ficheiros gerados.
- Lint dos módulos revistos: zero erros, cinco avisos existentes de exportações Fast Refresh/dependências de hooks. O build mantém os avisos existentes de chunks grandes.
- Biblioteca local: 99 fontes disponíveis; «Selecionar até 12 fontes» confirmou 12 selecionadas; seleção de teste limpa, sem recolher ou consultar fontes externas. A largura móvel de 390 px não apresentou transbordamento horizontal (`scrollWidth = clientWidth = 390`).
- Documentos arquivados continuam acessíveis pelo filtro. Os dados dessa demonstração não são apresentados como acervo Cloud importado.

## Instalação e validação Cloud

A auditoria Cloud confirmou o commit `b5bf92bd0d4e3781e3a32f5aa299c2cea3d0d628`, árvore `89aac4dd1938a8ba22ac0947848d54465f732c44`. Foram instaladas **apenas `nl-api` e `nl-hooks`**, com as consultas corrigidas. Nenhuma migração adicional ou configuração foi alterada.

- Relação `nl_edicoes!edicao_id` confirmada no catálogo real.
- Email processado: **HTTP 200 e quatro notícias**, uma ligada à edição 318 e três sem edição. Email em fila: **200 e zero notícias**. Pedido anónimo: **401**.
- Consulta autenticada de duplicados: **200 e um resultado**, apenas leitura.
- Serviço Hub, projeto atual: **200 nas três leituras**; **99 fontes, zero documentos e zero tarefas**. Estes valores são do projeto atual e não de todos os projetos.
- **27 testes dirigidos aprovados no Lovable**. Não havia registo automático de compilação disponível nessa sessão; o build local passou.
- Fluxos comprovados no Lovable: menu com quatro opções e teclado Enter/setas/Escape; Todo o histórico; alternância de separadores conservando filtros; botão voltar; abertura de uma notícia do email na Curadoria e regresso aos Emails. A inspeção direta nesta ronda voltou a confirmar os quatro itens, o texto guardado da notícia e os filtros conservados.
- Vista móvel Lovable: `scrollWidth = clientWidth = 393`.

A última correção de apresentação das ferramentas mantém o painel recolhido até abertura explícita. Foi importada separadamente em `b1cee940e4e7d589b6759683b37a69fed7f8fae7`, árvore `0f22bed5aadc3979d1ab9031e5c4e0fab7ffa0fc`; não muda o código das funções instaladas. Os três testes do painel passaram após essa correção.

**Bloqueio pendente:** a pré-visualização ainda não tem o endpoint configurado e oculta Documentos e relatórios. A ligação exige a autorização específica pedida após a recusa da revisão automática. Não se alterou `.env`, `.env.production`, `.env.development` ou mecanismo alternativo de configuração.

Sem essa ligação não se declara validação pela UI Cloud de upload, extração, capa, leitura ou transferência de documentos para campanha/compositor. Também não foram importados os PDFs antigos nem ativado o worker. As funcionalidades locais e a presença do código não substituem essas provas.

## Limites editoriais e próximos ensaios

O acervo Cloud do projeto atual está vazio: as 99 fontes configuradas não equivalem a 99 PDFs importados. A importação do acervo antigo é um trabalho separado. Sem o worker ativo não se declara que extração e capas correm continuamente.

Uma notícia histórica consultada conserva um texto que inclui outras notícias do email de origem. A leitura está corretamente identificada como texto guardado; esta ronda não reescreveu o histórico. Antes de produção autónoma, importa ensaiar a delimitação da evidência por notícia e a revisão das fontes para evitar transportar contexto alheio para um artigo.

O ensaio do leitor local confirmou uma capa, duas páginas com texto, seleção explícita de páginas e habilitação dos destinos Artigo, compositor e campanha. Não foram acionados esses destinos nem criada qualquer peça. Os testes de seleção foram limpos.

## Custos e fecho da ronda

A execução terminou já em 19 de outubro. Saldo Lovable observado antes do pedido de auditoria: **3 673,84**; após conclusão: **3 669,24 créditos**. Diferença desta ronda: **4,60 créditos**, ou **1,38 € a 0,30 €/crédito**. Valores brutos do indicador: 3673.840087890625 e 3669.239990234375, arredondados a duas casas. É uma medição da workspace durante o pedido; não é faturação de infraestrutura Cloud nem prova de consumo de fornecedores externos.

A revisão técnica principal confirmou o erro dos emails resolvido; uma confirmação adicional do mesmo pedido terminou com zero erros de execução ou respostas 500. O último ajuste visual foi importado pelo GitHub e a atualização de preview acionada. A interface pública não foi republicada. A ligação do PDF Tracker no preview permanece pendente da autorização específica já pedida. Não foi enviada nova tentativa de configuração nem feita alteração equivalente para contornar a revisão automática.

## Atualização de 19 de outubro: pré-visualização ligada

Após a autorização específica do proprietário, a ligação foi concluída e testada no navegador: 99 fontes, pesquisa funcional, biblioteca vazia e histórico vazio no projeto DIGITALSPRINT. Foram configuradas apenas as origens exatas das duas pré-visualizações deste projeto, preservando as anteriores, autenticação e isolamento. O detalhe, verificações e custo de 3 créditos constam do aditamento em [Instalação do pacote](instalacao-pacote-2026-10-18.md#ligação-da-pré-visualização-concluída--19-de-outubro-de-2026). O bloqueio de ligação descrito acima ficou resolvido; a importação do acervo e a execução permanente continuam por concluir.

O último ajuste do painel de ferramentas foi verificado com **três testes dirigidos aprovados** e novo build aprovado. A bateria completa de 1 120 testes refere-se à revisão imediatamente anterior; não foi repetida integralmente por esta correção de apresentação.

## Referências técnicas

A relação explícita segue a [documentação de resource embedding do PostgREST](https://docs.postgrest.org/en/v13/references/api/resource_embedding.html). A composição dos menus e alertas segue a documentação dos [menus shadcn](https://ui.shadcn.com/docs/components/radix/dropdown-menu) e [alertas shadcn](https://ui.shadcn.com/docs/components/radix/alert). O CLI de documentação não conseguiu alcançar o registry npm neste ambiente; foram usados os componentes já instalados e as páginas oficiais, sem instalar pacotes.

Não foram aprovadas/rejeitadas notícias reais, processados emails, feitos pedidos pagos ou publicados conteúdos durante a inspeção.
