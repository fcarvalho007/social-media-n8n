# Percurso editorial e pesquisa transversal

Implementação local na branch `codex/hub-percurso-pesquisa`, 18 de outubro de 2026. Não instalada no Lovable nem publicada nesta ronda.

## Utilização

- **Artigos → Percurso editorial** (`/artigos/percurso`): escolher projeto, filtrar artigos por título/site ou estado, abrir um artigo e continuar a etapa correspondente no editor. O telemóvel mostra lista ou detalhe com «Voltar aos artigos».
- **Pesquisar no Hub** (`/pesquisa`): pesquisa por vários termos em conjunto, sem distinguir acentos. Filtros PDF, notícia, artigo e peça social, contagens, paginação e excerto da correspondência. A pesquisa também aparece no atalho Cmd/Ctrl+K.
- Um resultado de PDF abre o leitor com a pesquisa preenchida e a página correspondente. Uma notícia abre um painel de leitura na Curadoria, sem mudar a decisão editorial. Um artigo abre o respetivo editor; um rascunho social é destacado na lista e as composições abrem o compositor existente.

## Verdade do percurso

O percurso é uma projeção dos registos existentes, sem manter uma segunda cópia do estado editorial:

1. **Fonte**: fontes guardadas na pauta, excertos e verificação. Não infere relações por semelhança de títulos.
2. **Pesquisa**: ligação exata `pauta.pesquisaId → pedido.resultadoId`. Pesquisa não associada fica opcional; referência em falta pede atenção. Exemplos e Sandbox conservam essa identificação.
3. **Artigo**: texto, proposta, versão e bloqueios existentes. Uma proposta não substitui automaticamente o texto humano.
4. **Aprovação**: revalida versão e SHA-256 da pauta, fontes, estrutura e política da marca. Uma aprovação antiga não é apresentada como válida.
5. **Publicação**: junta `hub_publicacoes` por pauta + site + versão e `hub_jobs` WordPress por pauta + versão. Distingue fila, envio incerto/reservado, falha, rascunho WordPress, publicação e versão anterior publicada. Não faz envios nem reconciliação ao abrir.
6. **Resultados**: a integração de tráfego orgânico por URL ainda não existe. O percurso apresenta esta indisponibilidade explicitamente; não reutiliza estatísticas sociais como visitas de artigos.

O plano acompanha pautas do motor editorial. Textos avulsos de `art_rascunhos` continuam pesquisáveis e editáveis, mas não recebem artificialmente um percurso de pesquisa/publicação que não esteja registado.

## Fontes da pesquisa

| Tipo | Dados consultados | Contexto |
| --- | --- | --- |
| PDF | Título, origem, entidade e texto de páginas extraídas | Acervo do projeto; localmente apenas este navegador |
| Notícia | Título, descrição e corpo guardado | Curadoria partilhada acessível pela RLS da conta |
| Artigo | Brief/texto de pautas e textos avulsos | Estado do projeto; textos avulsos filtrados também pelo autor |
| Social | Legendas de `posts_drafts`, versões atuais do compositor e Story/carrossel da newsletter | Projeto atual; rascunhos também filtrados pelo autor |

Só são indexados campos de texto editorial de composições. URLs de imagens, tokens e metadados opacos não entram nos excertos. O HTML original é tratado como texto, nunca executado.

Na nuvem a pesquisa é executada no servidor e devolve até 20 excertos por página, sem enviar todo o corpus PDF ao navegador. Usa o cliente autenticado sujeito a RLS, com filtros explícitos de projeto e, quando aplicável, autor. Não usa o cliente de serviço para contornar acesso. Notícias partilhadas são identificadas como tal.

A pesquisa espera 350 ms após escrita, recusa entradas com menos de dois caracteres, cancela leituras antigas quando possível e não apresenta resultados de uma consulta anterior sob o texto novo. As chaves de cache incluem conta e projeto. O catálogo local é reutilizado por 60 s; «Atualizar» força nova leitura. Falhas parciais preservam as fontes disponíveis e mostram aviso; contagens incompletas mostram «—» ou «≥», sem fingir que uma fonte indisponível tem zero registos.

## Limites desta ronda

- Pesquisa textual, sem embeddings, sem serviços pagos e sem OCR. PDFs digitalizados sem texto só são encontrados pelos metadados.
- O catálogo em cada fonte de base de dados está limitado a 500 registos, com aviso de resultado incompleto. O motor local usa o acervo existente no navegador; o adaptador PDF na nuvem recusa acima de 100 documentos com aviso explícito. Para acervos maiores, falta índice de texto/páginas no PostgreSQL e paginação por relevância no servidor. Estes limites não devem ser apresentados como pesquisa exaustiva de arquivos maiores.
- O histórico do percurso consulta até 1 000 envios e 1 000 trabalhos WordPress. A aplicação não inicia uma publicação para completar uma etapa.
- Não foi executado teste de isolamento contra novas identidades reais em produção nesta ronda. Os testes locais verificam os filtros e a recusa de leituras anónimas; não substituem auditoria RLS de produção.
- Fontes com URL externa continuam disponíveis na pauta. Não existe associação retroativa entre um PDF/notícia e uma pauta sem referência guardada.
- Instalação do novo backend e interface na nuvem aguarda pedido explícito. Permanecem pendentes as alterações de produção descritas em `docs/publicacao-segura.md`.

## API preparada

POST autenticado com `Authorization` e `X-Hub-Projeto`:

- `/operacao/percurso`: projeção completa do plano, próximas ações, envios, avisos e momento de consulta. Apenas leitura, também permitida a leitores durante backup.
- `/operacao/pesquisa`: `{ "consulta": "formação empresas", "tipo": "todos", "pagina": 1 }`. `tipo`: `todos`, `pdf`, `noticia`, `artigo`, `social`. Consulta até 160 caracteres. Não chama IA, DataForSEO nem publicadores.

O preview usa `/__hub-seo/percurso` com o mesmo projetor, o cliente isolado de demonstração e IndexedDB. O motor SEO local é partilhado dentro desta demonstração, como indicado no ecrã; não representa isolamento entre projetos de produção.

Fontes de backend em `scripts/backend/percurso.ts` e `src/features/percurso`. Os bundles `supabase/functions/hub-editorial/runtime.js` e `hub-editorial-worker/runtime.js` são gerados por `npm run build:edge-hub`; nunca os editar manualmente. Uma futura instalação exige sincronizar código, regenerar/verificar bundles, instalar backend e só depois disponibilizar a interface.

## Verificação

- Bateria completa: **1 044 testes aprovados, 1 ignorado**, incluindo Poppler após configurar `HUB_POPPLER_DIR` para o runtime instalado.
- TypeScript da aplicação e backend, build de produção e grafo Edge: aprovados (255 ficheiros alcançáveis).
- Deno check do entrypoint Hub: aprovado.
- Navegador: percurso e pesquisa em 1280 e 390 px, sem transbordo horizontal; ação «Rever fontes» abre a secção Fontes; Cmd/Ctrl+K encontra conteúdo e abre notícia em leitura. Capturas de revisão em `.impeccable/review/percurso-pesquisa/` (scroll interno: evidência em segmentos sobrepostos).

Custos desta ronda: **0 créditos Lovable = 0,00 €**, e nenhum pedido pago a fornecedores. Desenvolvimento e testes locais apenas.
