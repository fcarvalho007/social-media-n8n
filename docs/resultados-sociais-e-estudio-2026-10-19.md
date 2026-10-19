# Resultados sociais e estúdio visual — ronda local, 19/10/2026

Branch: `codex/hub-resultados-visuais-2026-10-19`. Sem publicação, alteração de credenciais, pedidos a fornecedores ou prompts Lovable nesta ronda.

## Diagnóstico confirmado no código

- O estúdio impunha tokens verdes e Work Sans à interface, sobrepondo o design claro/azul do Hub. As peças produzidas têm um sistema separado.
- Analytics lê `instagram_analytics` e `instagram_profiles`, privados por utilizador/projeto. Estes dados vêm de `import-instagram-data` e `import-instagram-profiles`: ficheiros fornecidos pelo utilizador, com eventual cópia das imagens neles indicadas. Não há descoberta/scraping de publicações nesta página. A proveniência de um ficheiro histórico não pode ser comprovada pelo seu formato.
- A importação estava escondida por uma lista de um email antigo na interface. O importador de lotes não enviava `project_id`, podia fechar mesmo após falha e não contabilizava respostas incompletas. A função de perfis e a interface limitavam contas a oito nomes fixos, sem relação com os projetos.
- A comparação misturava amostras de datas diferentes, convertia falta de seguidores em zero e calculava um score composto de pesos arbitrários. O KPI de frequência assumia que todos os ficheiros cobriam 30 dias.
- Sugestões lia `account_insights`, gerado separadamente a partir de `posts` com métricas e características classificadas. Ignorava erros SQL e não explicava a diferença em relação aos ficheiros Instagram. A tabela de aprendizagens não tem projeto; não é correto apresentar essas conclusões como específicas do projeto ativo.

## Implementação

O estúdio herda tokens, tipografia, cabeçalho, superfícies e navegação do Hub. As paletas/tipografias dos documentos gráficos existentes não são alteradas. Os estados de biblioteca vazia e erro têm contexto e recuperação. O modo de demonstração explica que a biblioteca criativa permanece no Cloud, sem a consultar.

O menu e os breadcrumbs agrupam Resultados sociais, Sugestões editoriais e Comparar contas. As páginas partilham uma navegação, origem/limites, data da última importação e seleção persistida do projeto, com falha explícita sem mudar a seleção. Pesquisa SEO/DataForSEO mantém-se em Artigos; não mede Instagram, tráfego ou inscrições.

A comparação usa o mesmo filtro temporal, quantidade de publicações, datas cobertas e média dos gostos + comentários registados. Não atribui uma pontuação global nem inventa seguidores, alcance ou frequência. Removidos os três componentes de benchmark obsoletos (406 linhas). O KPI semanal fictício foi substituído pelo número real de formatos da amostra. Visualizações sem valores positivos ficam indisponíveis porque o histórico não permite distinguir ausência de zero.

Sugestões passa a fornecer observações descritivas dos ficheiros importados: uma publicação a retomar, formatos presentes e respetivas médias, com base/amostra, filtros e ligação à criação de campanha. Não chama IA nem promete causalidade. A aprendizagem antiga fica separada, com erros recuperáveis e limiar de 30 publicações elegíveis; é visível apenas no âmbito agregado da conta para não misturar projetos.

A importação usa os papéis existentes de editor/administrador, mantendo a autorização do servidor. Envia o projeto, preserva ficheiros após falha, apresenta resultados incompletos, valida contagens explícitas e identificação e documenta os formatos aceites. Perfis são importados em lotes de 25. A função de perfis aceita nomes válidos em vez da antiga lista fixa; exige a mesma autenticação, papel e acesso ao projeto. Não foram alteradas políticas nem credenciais. Novas medições de posts já existentes continuam a ser ignoradas como duplicados, não uma série temporal de métricas.

A demonstração local usa bibliotecas analíticas vazias explícitas, sem dados fictícios de performance; aceita os mesmos filtros de leitura de projeto. Permite rever ficheiros, mas mantém gravações e funções externas desligadas. Não pode ser confundida com um teste Cloud da importação.

## Estratégia para os próximos blocos

1. Base disponível nesta ronda: importar ficheiros conhecidos, analisar uma amostra identificada e levar uma hipótese para campanha/artigo. A aprovação editorial mantém-se separada da análise.
2. Para automação real de métricas: validar a recolha existente do fornecedor social e, se necessário, ligar uma API autorizada das contas próprias, com identificação da conta, fonte, data de medição, erros, limites e histórico. Não substituir autorização oficial por scraping implícito de concorrentes.
3. Para o objetivo de tráfego orgânico: integrar desempenho de páginas/queries do Search Console e sessões/conversões do GA4, com UTMs e ligação a artigo/campanha. DataForSEO apoia a pesquisa anterior à escrita; volume de keyword não é tráfego observado nem contactos captados. Este bloco não foi implementado aqui.
4. Antes de chamar uma ideia de recomendação de performance, exigir dados suficientes e comparáveis; separar sempre descrição da amostra, hipótese editorial e resultado de um teste efetivamente realizado.

## Validação e instalação pendente

Os resultados dos comandos finais e a revisão no navegador são registados abaixo antes do commit. A futura integração exige instalar a interface e a função `import-instagram-profiles`; não há nova migração nem novos segredos. Depois é necessário comprovar importação real/reabertura por projeto, falha parcial e repetição sem duplicação, sem enviar publicações ou newsletters.

A execução em produção de `collect-post-metrics` e `generate-insights` não foi comprovada nesta ronda. Não foi criada uma ligação oficial Meta/GSC/GA4 nem prometida atualização automática de métricas. O modo de demonstração não é usado como prova de funcionamento Cloud.

### Resultado da verificação local

- 61 testes dirigidos aprovados em dez ficheiros: origem/estado vazio, acesso de editor sem dependência de email, contagens descritivas, falta de seguidores/visualizações, falha e repetição de importação com ficheiro preservado, transmissão do projeto, navegação, isolamento local e parser Excel.
- Compilação de produção aprovada, incluindo o código final dos validadores; mantêm-se avisos preexistentes de chunks grandes e utilitários Tailwind ambíguos, sem ocultar limites do bundler.
- `deno check --no-lock --cached-only --config /tmp/deno-nl.json supabase/functions/import-instagram-profiles/index.ts`: aprovado. A tentativa inicial com o lock global dependia de resolução npm indisponível; a verificação isolada usa as dependências Deno já instaladas e não altera locks.
- ESLint dos quatro módulos novos/reformulados (contexto, comparação, sugestões e cálculo descritivo): aprovado.
- Navegador local: percursos Resultados → Sugestões → Comparar, origem/datas/projeto e importador conferidos. Comparação, sugestões e estúdio a 390 px com conteúdo de 341 px e sem transbordamento horizontal observado. O tamanho temporário foi reposto.
- Botão do estúdio confirmado no navegador: `rgb(4, 106, 215)`; tipografia Inter. Documentos gráficos não foram reescritos.
- Evidências: pasta `../evidencias-hub-2026-10-19/resultados-visuais/` (estúdio, resultados e comparação móvel). Pré-visualização mantida em `http://127.0.0.1:5183/estudio/carrosseis`.

A validação local não substitui o ensaio de importação/gravação/reabertura com o backend Cloud após instalar a branch. Nenhuma base de dados de produção foi alterada nesta ronda. Créditos Lovable de desenvolvimento usados nesta ronda: **0**.

`npm run typecheck` do código final: aprovado, código 0.
