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

A preencher após sincronização e auditoria restrita do Lovable. O backend da ronda anterior está instalado. Nesta ronda, a pré-visualização ainda não tem o endpoint configurado: a ligação exige a autorização específica pedida após a recusa da revisão automática. Não se alterou `.env`, `.env.production`, `.env.development` ou mecanismo alternativo de configuração.

Sem essa ligação não se declara validação pela UI Cloud de upload, extração, capa, leitura ou transferência de documentos para campanha/compositor. Também não foram importados os PDFs antigos nem ativado o worker. As funcionalidades locais e a presença do código não substituem essas provas.

## Referências técnicas

A relação explícita segue a [documentação de resource embedding do PostgREST](https://docs.postgrest.org/en/v13/references/api/resource_embedding.html). A composição dos menus e alertas segue a documentação dos [menus shadcn](https://ui.shadcn.com/docs/components/radix/dropdown-menu) e [alertas shadcn](https://ui.shadcn.com/docs/components/radix/alert). O CLI de documentação não conseguiu alcançar o registry npm neste ambiente; foram usados os componentes já instalados e as páginas oficiais, sem instalar pacotes.

Não foram aprovadas/rejeitadas notícias reais, processados emails, feitos pedidos pagos ou publicados conteúdos durante a inspeção.
