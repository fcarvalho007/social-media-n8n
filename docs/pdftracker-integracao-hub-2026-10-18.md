# PDFTracker → Documentos do Hub

**Revisão posterior:** o inventário real de 99 fontes, os testes de rede, a recolha persistente e a geração automática de capas estão documentados em [Revisão das fontes, PDFs e capas](revisao-fontes-pdfs-capas-2026-10-18.md). Este documento conserva o diagnóstico e o âmbito da primeira integração.

Estado: primeira integração funcional **local**, sem publicação, deploy, migração da base de dados ou ativação de agendamentos. Branch: `codex/hub-biblioteca-pdfs-local-2026-10-18`.

## Decisão

O conceito é útil: um acervo de fontes, com entrada por upload ou recolha web, que alimenta o motor editorial. Integrar como **Documentos** no Hub, reutilizando projetos, extração PDF e compositor. Não incorporar a aplicação antiga inteira nem manter um segundo login, editor, renderer ou gateway de IA.

O percurso editorial é: documento → páginas verificadas → excerto com proveniência → briefing → rascunho → revisão → destino. Um relatório não é automaticamente uma notícia; uma data de recolha não é uma data de publicação; encontrar uma ligação não demonstra que o PDF foi guardado. Documentos externos são fontes, não instruções para o sistema nem autorização para publicar.

## O que foi analisado

- ZIP `pdftracker.zip`: 160 entradas, 376 407 bytes comprimidos e 1 180 786 bytes descomprimidos. Extração segura para pasta de auditoria separada; `.env`, diretórios de dependências e metadados Git excluídos. Não foram executados scripts nem instaladas dependências do ZIP.
- Código React/Vite, hooks de rastreio, 19 Edge Functions, migrations, storage e políticas.
- Uma pergunta em modo **Chat**, de leitura, ao projeto Lovable antigo em 18/10/2026. Sem pedir scans, chamadas pagas de scraping/IA, alterações ou valores de secrets.

## Diagnóstico do código antigo

| Problema | Evidência no ZIP | Consequência |
| --- | --- | --- |
| Exigir `.pdf` no caminho | `validate-pdf`, `discover-pdfs-advanced` e viewer | Perde downloads sem extensão ou com parâmetros. |
| Aceitar só pela extensão após falha HTTP | `scan-single-source`, `discover-pdfs-advanced` | Pode contar HTML, bloqueios ou URLs mortos como PDFs. |
| Interpretar binário como UTF-8 | `analyze-pdf`, `extractBasicPDFInfo` | Não extrai corretamente texto comprimido. O percurso `process-pdf-with-claude` é diferente e envia um documento PDF real. |
| Datas ausentes substituídas por hoje | `scan-single-source` | Confunde descoberta com publicação recente. |
| Blacklist de títulos por substring, incluindo `form` | `scan-single-source` | Exclui relatórios potencialmente úteis sem critério editorial suficiente. |
| Fontes consideradas confiáveis pelo nome | `scan-single-source` | O nome não comprova a entidade ou o domínio. |
| Orquestração no navegador e lotes sem continuação garantida | `usePDFs`, `scan-pdfs` | Fechar o browser interrompe o manual; o cron pode terminar num checkpoint sem continuar. |
| Pausas longas e IA em cascata na mesma função | `scan-pdfs` | Vulnerável a limites de duração, falhas e custos difíceis de reconciliar. |
| Buckets/políticas públicas e funções sem validação JWT | migrations, `config.toml`, handlers com service role | Não importar este modelo de acesso para o Hub. |
| Guardar ficheiro substitui URL de origem | `store-pdf` | Perde proveniência e dificulta migração. |
| Falhas devolvidas como lista vazia e zero tokens | `discover-pdfs-advanced` | “Sem resultados” pode esconder erro e consumo não registado. |

## Situação comunicada pelo Lovable

Os valores seguintes foram comunicados pelo assistente do Lovable como leituras da BD/logs; não são uma exportação independente do catálogo obtida pelo Hub. A disponibilidade de uma secret não demonstra que o fornecedor funciona. A existência de um objeto no Storage não demonstra a integridade do PDF.

- 11 tabelas ativas, RLS ativado mas políticas públicas `USING(true)` / `WITH CHECK(true)`, sem foreign keys.
- 99 fontes; **1 ativa**, `SoCX`, com URL para o próprio backend; 98 inativas. Um perfil LinkedIn ativo.
- 30 registos de PDFs: 28 visíveis, 2 com soft delete, todos `status='new'`.
- 29 registos apontam ao bucket de PDFs: 17 com `storage_path`, 12 só pelo URL; 1 apenas URL externo. Storage: 30 objetos PDF, aproximadamente 235 MB; 33 thumbnails, aproximadamente 34 MB. A diferença entre registos e objetos exige reconciliação, não eliminação automática.
- Bucket `pdfs` público, limite 50 MB e sem restrição MIME; políticas públicas de leitura/upload/delete. `thumbnails` público, escrita service role.
- Dois jobs pg_cron ativos, quinta e sábado às 08:00 UTC, apesar de `app_settings.cron_enabled=false`. A pausa mostrada pelo UI não equivale a desativar os jobs da infraestrutura.
- Últimas execuções reportadas: 08, 10, 15 e 17/10/2026, `checkpoint`, 0 fontes concluídas, 1 com erro, 0 PDFs, fonte SoCX. Últimos cinco registos do histórico antigo datam de 01–02/12/2025.
- O cron chama `scan-pdfs` com `scheduled:true`, que termina o lote 1 à espera de nova chamada para lote 2; o agendador não faz essa continuação. O histórico final só é gravado no último lote. Este é o mecanismo provável do bloqueio, corroborado pelos checkpoints comunicados.
- Secrets reportadas presentes (só nomes): ANTHROPIC_API_KEY, APIFY_API_KEY, BROWSERACT_API_KEY, FIRECRAWL_API_KEY, LOVABLE_API_KEY, PDF_CO_API_KEY, RESEND_API_KEY e variáveis Supabase injetadas. Não foram copiadas para o Hub.
- As 19 funções existentes são: scan-pdfs, scan-single-source, send-alert-email, generate-content, discover-pdfs, discover-pdfs-advanced, discover-pdfs-claude, extract-pdf-metadata, process-pdf-with-claude, validate-pdf, analyze-pdf, scrape-linkedin-posts, generate-social-content, store-pdf, translate-summary, generate-pdf-thumbnail, generate-batch-thumbnails, migrate-linkedin-pdf, serve-pdf. Inventário comunicado; não foram invocadas para teste.

Não alterámos o projeto antigo: acervo, agendador e permissões continuam no estado em que estavam. Os cron jobs e a exposição pública merecem uma ronda própria antes de voltar a usar esse backend.

## Primeira versão local

Abrir `http://127.0.0.1:5183/documentos` com `npm run dev:hub`.

- Navegação integrada no Hub, por projeto da conta de demonstração.
- Upload real: original, SHA-256, bytes e texto por página persistidos em IndexedDB. Deduplicação atómica por conta/projeto/hash. Sucesso só após commit da transação.
- Pesquisa por título, origem e texto, sem depender de acentos ou maiúsculas.
- Recolha manual de um endereço HTTPS: HTML → candidatos → verificação individual; ou descarga direta de PDF. Não depende da extensão ou de um HEAD cross-origin.
- Download local com limite de tempo, tamanho e redirecionamentos. Resolução DNS verificada em cada salto e fixada à ligação HTTPS; redes privadas recusadas. Sem cookies ou credenciais. O endpoint só existe no servidor de demonstração e aceita POST JSON da mesma origem loopback.
- PDF passa pela assinatura e pelo parser já existente no Hub; falhas de parsing não são sucesso. Limites atuais: 15 MB e 60 páginas. Páginas vazias, com imagem sem texto ou com erro ficam identificadas. OCR não é simulado.
- Histórico distingue ligação recebida, descarga em processamento, PDF guardado, duplicado e falha. Para páginas HTML, regista quantos candidatos foram encontrados e que nenhum PDF foi guardado nessa etapa.
- Seleção de páginas, leitura de texto, download do original e cópia de excerto com título, URL, páginas, data de recolha e hash.
- Transferência explícita para o compositor existente e para Artigos. Uma fonte oferecida não substitui automaticamente texto recuperado nem rascunhos editados. Nenhuma chamada de IA ou publicação ao transferir.
- Sem data de publicação inventada. O artigo recebe excertos e referência para desenvolver; não é apresentado como artigo original acabado. O compositor mantém metadados PDF e confirmação explícita de leitura parcial.
- Módulo deliberadamente condicionado a `DEV && MODE=hub`; não aparece no build público. Guardar no browser não é sincronizar nem fazer backup. Exportar os originais antes de limpar dados do navegador.

## Dependências e custos

Não foram acrescentados pacotes. React, Vite, shadcn, IndexedDB e `pdfjs-dist@4.10.38` já existem no Hub; parser e worker vêm do mesmo pacote. O `react-pdf` do ZIP não é necessário. Não importar a antiga combinação de versões Deno, Supabase e date-fns.

A pesquisa, download, parsing e preparação de fontes desta versão não usam IA/Firecrawl. A conversa de diagnóstico no Lovable pode ter o consumo definido pelo plano; não foi verificado um extrato de créditos, pelo que não se atribui um valor inventado. Geração editorial posterior deve usar DeepSeek direto e o livro de custos existente, com ação explícita. OCR e scraping de páginas dinâmicas só após orçamento e teste numa fonte concreta.

Referências técnicas consultadas: [PDF.js](https://mozilla.github.io/pdf.js/examples/), [React-PDF](https://github.com/wojtekmaj/react-pdf), [Firecrawl Scrape](https://docs.firecrawl.dev/features/scrape). A API antiga de extração Firecrawl deve ser validada contra a versão contratada; não assumir que o payload legado é compatível com a API atual.

## Próxima integração de produção: contrato proposto

Estas entidades são desenho técnico, **não migrations aplicadas**:

| Entidade | Dados e regras |
| --- | --- |
| `doc_fontes` | owner/project, nome, URL, tipo (página/RSS/sitemap/API), idiomas/temas, frequência, allowlist de domínios, termos/robots verificados, limites por execução, ativa por defeito false. |
| `doc_recolhas` | source, janela, estado, cursor, lease/heartbeat, tentativas, próximo retry, erro estruturado, candidatos/descargas/ficheiros/extrações; idempotência por fonte/janela. |
| `doc_candidatos` | URL original e final, página de descoberta, MIME/status/bytes/etag/last-modified; estado separado de documento; motivos de rejeição auditáveis. |
| `doc_documentos` + `doc_versoes` | documento lógico, versões imutáveis por hash, título/editora/idioma/tags, data de publicação nullable e evidência, datas de descoberta/recolha separadas, direitos de uso. Nova URL do mesmo hash liga proveniência; mesmo URL com novo hash cria nova versão. |
| `doc_paginas` / `doc_excertos` | versão, número, estado OCR/texto, texto, intervalos; texto original separado de resumo/edição; excerto com páginas e hash. |
| `doc_usos` | ligações às versões de artigo/compositor/newsletter; distinguir citação, síntese factual e opinião; não inventar referências após edição. |

Storage privado, caminho por owner/projeto/versão; URL assinada de curta duração, nunca bucket público para acervo interno. RLS segue o modelo owner/equipa do Hub e verifica o projeto. Escritas por RPC autorizada; processamento técnico via worker service role, sem expor chaves ao browser.

Fila durável com pequenos trabalhos: descobrir → obter → verificar → armazenar → extrair → indexar. O scheduler só enfileira; os workers retomam por cursor, expiram leases e fazem retry limitado com backoff. Uma falha não equivale a “zero PDFs”. Pausa tem de ser verificada pelo scheduler e pelo worker, incluindo jobs já enfileirados. Deduplicação/idempotência impedem duplicados e custos repetidos. Processamento servidor dos PDFs grandes ocorre num worker adequado, não numa Edge Function monolítica.

Recolha automática só em fontes aprovadas, respeitando robots/termos, cadência e limites do domínio. RSS/sitemap/API/HTML primeiro; browser remoto/Firecrawl só quando justificado. Não contornar login, CAPTCHA, paywall ou bloqueios. Uma página dinâmica sem links identificáveis deve ser sinalizada, não gerar URLs por IA.

## Migração do acervo antigo

1. Exportar metadados e manifesto de objetos com IDs antigos, tamanhos e URLs; não mover secrets ou permissões.
2. Resolver os 12 casos sem storage_path pelo URL; reconciliar os 30 objetos e os 29 registos com binário. Soft deletes preservados. Não apagar órfãos nesta ronda.
3. Descarregar e calcular SHA-256 de cada objeto; abrir com parser, confirmar páginas/tamanho e direitos. Não confiar na afirmação genérica de “íntegros”. PDFs >15 MB ou >60 páginas precisam de processamento de servidor/limites próprios; o acervo reportado pode conter vários.
4. Mapear fontes/projetos com confirmação editorial; manter publicação como desconhecida quando só existe data de descoberta.
5. Importar idempotentemente para bucket privado e tabelas do Hub; reconciliar contagens/bytes/hashes e provar restauração antes de desativar o antigo.

## O que fica por concluir

- Exportação e importação dos 29 binários antigos e metadados; a biblioteca local contém apenas os documentos usados em teste.
- Backend privado, RLS, schema/RPCs, sincronização, backup, quota e ciclo de retenção.
- Fila durável, fontes recorrentes, robots/termos e testes prolongados em fontes reais do acervo.
- OCR opcional, PDFs grandes, páginas dinâmicas e extração de tabelas/gráficos com qualidade.
- Metadados editoriais completos (além do título já editável), etiquetas, taxonomia, versões, pesquisa semântica e deteção de documentos atualizados.
- Resumos e propostas editoriais com IA, revisão factual/citações e seleção de destinos WordPress. O rascunho local de Artigos ainda não é um motor de geração nem um publicador.
- Migração/revisão de acesso e suspensão efetiva dos cron jobs antigos, mediante uma ronda de alterações nesse projeto.
- Publicação no Lovable/GitHub: aguarda revisão do trabalho local e pedido posterior do utilizador.

Critério de aceitação de produção: upload e rastreio comprovados em fontes acordadas, falhas recuperáveis, zero acesso cruzado entre projetos, ficheiro recuperável por hash, citações ligadas às páginas, custos auditáveis e automatização que continua sem o browser aberto.

## Verificação desta ronda

- Suite completa: **767 testes aprovados, 1 ignorado** (135 ficheiros aprovados, 1 ignorado). O teste ignorado já existia. Há avisos preexistentes de JSDOM/canvas e React Router; não equivalem a falhas da suite.
- Typecheck da aplicação e do tooling Node aprovados. Build público aprovado, com os avisos de chunks grandes já existentes. Lint dos ficheiros alterados: zero erros, dois avisos preexistentes de Fast Refresh.
- Testes novos exercitam descoberta sem extensão, parâmetros e deduplicação de links, títulos genéricos, pesquisa, seleção/proveniência, isolamento de âmbito, limites, redes privadas/IPv6 mapeado, fixação DNS, redirects revalidados, HTTP 403 e limite de bytes sem Content-Length.
- Navegador: PDF público [Mozilla/PDF.js](https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf), 14 páginas, descarregado, lido e persistido após reload.
- Navegador: página [arXiv 1706.03762](https://arxiv.org/abs/1706.03762) → ligação `/pdf/1706.03762` sem extensão → 15 páginas lidas e binário guardado. Isto comprova este percurso concreto; não demonstra cobertura universal das 99 fontes antigas.
- Upload sintético com três páginas: duas com texto e uma vazia. Repetição identificada pelo hash, sem duplicação. HTML com extensão `.pdf` e PDF protegido recusados, mantendo três documentos válidos no acervo de teste.
- Compositor: oferta explícita da fonte, páginas preservadas e bloqueio de continuação até confirmar a leitura parcial. Sem gerar conteúdo nem chamar IA.
- Artigos: excertos carregados por ação explícita e rascunho guardado **localmente**, com páginas, data de recolha e SHA-256. Não foi publicado.
- Trocar para outro projeto mostrou acervo vazio; regressar recuperou os três documentos. Ecrã de 320 px sem overflow horizontal e navegação acessível; desktop também revisto. Aviso de demonstração ajustado para não tapar a navegação.
- Provas visuais locais em `.impeccable/review/18-out/pdfs-desktop.png` e `pdfs-mobile.png`. Não serão carregadas no repositório.

Os três PDFs de teste e o rascunho sintético existem apenas no perfil do navegador da demonstração, não no backend do Hub nem no ZIP entregue ao GitHub. Não foram usados documentos privados do acervo antigo nos testes.
