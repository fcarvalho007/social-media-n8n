# Integração completa do Hub — 19 de outubro de 2026

## Pacote e reconciliação

Destino: projeto Lovable f100a3a8-d8dc-4aa5-89a4-d25e3de0bb36, repositório fcarvalho007/social-media-n8n. PR 13, de `codex/hub-integracao-completa-2026-10-19` para `codex/hub-campanhas-descobertas`.

A base Cloud era `ed53aa40`. A reconciliação local `99f7cdb2` preserva ambas as histórias e tem a árvore `7584f3332cd128763a5df4d23ef6aba0b52febca`, idêntica ao local previamente validado. A transferência pelo conector GitHub verificou todos os SHA dos blobs e produziu exatamente essa árvore no commit `7fcea914`. As correções Cloud de ZIP/HTTP, leitura de composições privadas, permissões/rename no Edge e PDFium estão incluídas. A resolução foi autorizada expressamente pelo proprietário.

Inclui: plano e redação de artigos, focus keyword e reutilização de pesquisa real, voz/conhecimento por site, séries, inventário de ligações, imagens privadas e metadados, integrações/eventos, glossários, campanhas sequenciais com formatos escolhidos e ideias por campo, fontes PDF por projeto com escolha explícita de importação e design azul uniforme. Não inclui um mapa de temas/GSC; isso continua uma proposta de produto.

A migração nova é `0067_artigos_imagens.sql`. Instalar interface e ambas as funções nativas `hub-editorial` e `hub-editorial-worker`; não editar os runtimes gerados. Não é necessário alojamento Node adicional para este pacote.

## Auditoria e correções de dependências

A auditoria npm inicial de produção encontrou 8 pacotes sinalizados (6 altos, 2 moderados; zero críticos). Foram atualizadas as famílias router, moment, lodash e fflate. O Excel usa agora o pacote oficial SheetJS 0.20.3 com integridade no lockfile; o npm público só distribuía uma versão antiga vulnerável. Referência: [distribuição oficial](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).

Para eliminar os alertas restantes de navegação e os críticos das ferramentas, foram atualizados React Router 7.18.4, Vite 6.4.4 e Vitest 4.1.12. A aplicação continua uma SPA React, sem migração para outro framework ou SSR. Referências: [compatibilidade react-router-dom](https://api.reactrouter.com/v7/modules/react-router-dom.html), [migração Vitest](https://v4.vitest.dev/guide/migration.html).

A auditoria final **de produção** apresentou zero alertas em todas as gravidades. Isto é uma medição npm, não uma prova de ausência de vulnerabilidades. O relatório completo, incluindo ferramentas de desenvolvimento, é acompanhado separadamente; não se oculta dívida de tooling.

O relatório completo mantém 13 alertas de ferramentas (8 moderados e 5 altos; zero críticos), nas famílias Tailwind/typography, drizzle-kit e lovable-tagger. A migração dessas ferramentas exige uma ronda própria. Não são ocultados pela medição de produção.

Npm e Bun ficam alinhados pelas versões resolvidas. A instalação real revelou Bun 1.3.14 na Cloud, incapaz de ler o lockfile v2 gerado pelo Bun 1.4.3. O lockfile foi regenerado com o Bun **1.3.14**, a partir do package-lock. Uma instalação limpa em diretório temporário com `--frozen-lockfile --ignore-scripts` terminou com código 0 (650 pacotes). O binário antigo redundante foi retirado automaticamente pela conversão oficial. Não foram executados scripts de instalação dos pacotes atualizados. O teste usa o motor real de leitura Excel para XLSX, XLS antigo, cabeçalhos, português, zeros e folha vazia.

## Validação local desta integração

- Antes das atualizações: 1 277 testes aprovados e dois opcionais ignorados.
- Após as correções: **1 280 testes aprovados**, dois opcionais ignorados, 204 ficheiros aprovados e um opcional ignorado; processo terminou com código 0.
- Após a compatibilidade Cloud e retoma: **1 299 testes aprovados**, dois opcionais ignorados (206 ficheiros aprovados e um ignorado); tipos da interface/backend, build, arranque isolado e grafo Edge novamente aprovados. 31 testes dirigidos cobrem os downloads/transportes e a recuperação de PDFs.
- Tipos da interface e backend e compilação de produção aprovados após as atualizações.
- Grafo Edge: 255 ficheiros alcançáveis verificados.
- Arranque Deno isolado: API/worker sem sessão 401, origem alheia 403, leituras autenticadas simuladas 200; sem pedidos externos reais.
- Avisos de chunks globais grandes e dívida de lint preexistente mantêm-se identificados. Não foi mascarado um erro alterando o limite do bundler.

## Conferência Cloud anterior à instalação

Na pré-visualização existente: projeto DIGITALSPRINT com 30 documentos e conferência de 28/28 PDFs legados. O documento State of Search Q4 2025 tem original/capa e estava parado em 5 de 35 páginas de reextração. A versão local inclui continuação por jobs independentes deduplicados; comprovar a retoma após instalar.

## Instalação e ensaios Cloud

A PR 13 foi integrada na branch sincronizada do Lovable. O projeto confirmou HEAD `06fd242b` e a árvore exata `a0d59606de8f971e9062a1163b7ed69e3a888430`. A migração 0067 e ambas as funções nativas foram instaladas; a 0068 regista os comentários do catálogo, depois de criar o bucket pela ferramenta Storage. O código da 0067 não foi reescrito. Tipos gerados e metadados de migração foram reconciliados localmente.

Resultados do ensaio Cloud de instalação: build aprovado, 129 testes dirigidos em 14 ficheiros aprovados; leituras autenticadas SEO, custos, integrações, imagens, 30 documentos e 99 fontes devolveram 200. Sem sessão: 401; Origin alheio: 403; worker anónimo: 401. Ficheiros OCR devolvem 200 com MIME correto. O bucket `hub-artigos` é privado, limite 8 MB PNG/JPEG/WebP; imagens e recibos WordPress têm RLS e escrita exclusiva pelo serviço.

A auditoria de isolamento usou transação revertida: duas contas/projetos veem apenas documentos, artigos, analítica, imagens e recibos próprios; conta sem papel vê zero; escritas diretas ou alheias são recusadas. Não foram criadas contas reais nem alteradas políticas, credenciais ou cadências.

No navegador Cloud foi criada a campanha identificada **TESTE CLOUD · Integração 19 outubro**, apenas com Artigo e Story. A reabertura preservou os formatos, o texto, a verificação da fonte e a composição. O Story foi editado, guardado e reaberto no compositor, preservando o fundo `#15395b`. Artigo ligado criado sem IA paga, com focus keyword editável. São rascunhos internos, sem envio ou publicação.

Dois problemas adicionais encontrados nos ensaios foram corrigidos localmente para a instalação final:

- O PDF histórico State of Search permanecia em `a_processar` com uma tarefa `incerto`, sem botão de recuperação. O leitor passa a mostrar **Verificar e retomar extração**, preservando texto e OCR; o servidor deduplica tentativas quando já existe tarefa ativa. Testes de interface e serviço cobrem a retoma.
- A recolha APAN falhava antes da ligação porque o Supabase Edge 1.77 (Deno 2.1.4) não implementa `node:https ClientRequest.options.lookup`. O diagnóstico efémero confirmou DNS normal, `lookup` não suportado e ligação nativa `Deno.connect` + `Deno.startTls` funcional. A via Edge liga ao IP previamente validado, verifica TLS/SNI no domínio original e implementa HTTP/1.1 limitado, sem pool/redirect automático. Mantém robots e revalidação DNS por salto, recusa redes privadas e respostas ambíguas, limita headers, bytes e descompressão, e fecha em erro/cancelamento. A via Node local mantém o lookup fixado existente. O robots.txt público APAN respondeu 200/427 bytes com o novo transporte em ensaio Deno local.

A PR 14 foi integrada e instalada (HEAD `3f43f0de`, árvore `af4e92f9`): ambos os deploys, lockfile Bun bloqueado e build confirmados na Cloud. Os 30 testes de protocolo/serviço passaram; o teste UI de retoma ficou impedido de carregar o worker PDF.js fora da raiz do executor Cloud. O teste passou localmente e foi isolado do carregador PDF.js (que não faz parte da retoma); a própria retoma foi acionada e observada no navegador.

A recolha real APAN passou de bloqueada para **Acesso confirmado**, com dois PDFs candidatos. Foi escolhido **WFA DEI Portugal 2021**: download real de 2,3 MB, original privado, 28 páginas identificadas, capa real da primeira página e texto pesquisável já disponível nos primeiros lotes. Não houve importação automática do outro candidato. A biblioteca passou de 30 para 31 documentos. O processamento permanente está ativo a cada minuto; execuções HTTP 200 e lotes sucessivos foram confirmados, sem alterar o agendamento.

O artigo de teste reabriu na versão 4, preservando texto, focus keyword, slug, descrição, imagem privada, alt e crédito. A exportação ZIP real passou a integridade e inclui imagem.png, artigo.md, artigo.html, fontes.json e metadados.json. Os bloqueios de aprovação/publicação do rascunho incompleto mantêm-se ativos.

A verificação de ligação WordPress pela UI encontrou o mesmo `ClientRequest.options.lookup` não implementado. A correção reutiliza a via TLS nativa também no WordPress e nos webhooks, preservando autenticação só no domínio exato, corpo binário/JSON, assinatura HMAC e identificador de evento. Nunca segue redirects autenticados nem repete escritas automaticamente. Seis novos casos cobrem POST 201, bytes UTF-8, autenticação restrita, HMAC, IP privado e enquadramento de headers. Não foram enviados artigos nem webhooks reais.

## Resultado observado antes da revisão final de desempenho

Código Cloud: PRs [13](https://github.com/fcarvalho007/social-media-n8n/pull/13), [14](https://github.com/fcarvalho007/social-media-n8n/pull/14) e [15](https://github.com/fcarvalho007/social-media-n8n/pull/15) integradas. HEAD `ce8d64c0890363277ed79012e364609a8b7740b8`, árvore `049fc78010e1d2a38f89f25b96f8cfa815e19a1b`, confirmados na Cloud e reconciliados no checkout local. Ambas as funções reinstaladas a partir dos runtimes, sem edições manuais. **52/52 testes Cloud aprovados** nos cinco ficheiros finais. Build real Cloud com código 0 em 17,8 s; Bun frozen aprovado, lockfile inalterado. Auditoria HTTP repetida após o último deploy: API/worker anónimos 401, Origin alheio 403, leituras autenticadas 200 (31 documentos, 99 fontes, uma imagem privada).

Validação local final: **1 305 testes aprovados**, dois opcionais ignorados, tipos interface/backend, grafo Edge 255, arranque isolado e lint do novo transporte aprovados. A compilação de interface tinha passado após as alterações de dependências e leitor; a compilação final do mesmo código foi também comprovada na Cloud.

Ensaios no navegador com backend real:

- Campanha de teste criada, reaberta e editada; apenas Artigo e Story incluídos. Verificação de fonte gravada. Story criado sem IA paga, editado no compositor, guardado e reaberto com o design preservado.
- Artigo ligado, versão 4 reaberta com texto visual, focus keyword, slug, descrição, capa privada, alt e crédito. ZIP descarregado e validado sem erros, com texto/HTML/imagem/metadados. Rascunho incompleto continua bloqueado para aprovação/publicação.
- **Ligação real ao fredericocarvalho.pt verificada com sucesso** pela interface após corrigir o transporte. Não foi criada/alterada publicação WordPress.
- **State of Search Q4 2025 concluído: 35/35 páginas com texto pesquisável e capa**, recuperado dos 5/35 históricos sem apagar texto ou histórico. Confirmado após reabrir.
- **WFA DEI Portugal 2021 concluído: 28/28 páginas com texto pesquisável e capa real**, importado por escolha explícita após descoberta APAN. Imagem carregada e renderizada a 600 × 338.
- Nova importação do mesmo PDF devolveu «Este PDF já está no acervo. Não foi duplicado.» e preservou 31 entradas e a identidade do documento.
- Estado «Lido» guardado e reaberto; reposto em «Por ler» depois do ensaio. Importação legada indica 28/28 PDFs no projeto.

### Publicação da interface

A tentativa de abrir «Publish» foi bloqueada pela revisão automática: considerou necessária nova autorização explícita devido à instrução anterior do proprietário para só publicar quando voltasse a pedir. Foi pedida autorização para atualizar `hub-conteudo.lovable.app`; não foi tentado nenhum contorno. **Código e backend estão instalados na pré-visualização Cloud; a aplicação pública não foi atualizada nesta ronda enquanto a resposta estiver pendente.**

### Custos e linhas da integração

Saldo inicial: 3 654,219970703125; saldo observado antes da reabertura da auditoria de desempenho: 3 631,6099999999997 créditos do plano. Créditos diários: zero em ambos. **Variação parcial observada: 22,609970703125 ≈ 22,61 créditos; a 0,30 €/crédito: 6,7829912109375 ≈ 6,78 €.** O fecho inclui ainda o diagnóstico/correção de desempenho abaixo; medir novamente ao terminar. É a variação do saldo partilhado do workspace, não uma fatura individual por prompt; não é possível excluir atividade simultânea noutros projetos só com este indicador. Nesta ronda não foram executados pedidos pagos de conteúdo/SEO. Cloud e fornecedores têm contabilidade separada. Não é inferida uma poupança contrafactual por linha de código.

Diferença instalada face à base Cloud `ed53aa40`: **215 ficheiros, 14 363 linhas acrescentadas e 7 119 removidas**. Inclui 6 664 linhas acrescentadas nos dois bundles gerados (não escritas duas vezes), 2 387 em dependências/locks e 898 em testes. Ficheiros de fonte/DB: 3 210 acrescentadas e 842 removidas, incluindo 94 linhas de tipos Supabase gerados. Documentação, referências inertes, metadados e configurações completam o total. A atualização deste relatório final fica registada localmente à parte desses números; não muda o código da aplicação.

### Limites reais que permanecem

- A UI da pesquisa mostra **DataForSEO por configurar e serviços pagos pausados**; sem pesquisas reais guardadas no DIGITALSPRINT. Nenhum volume sintético é apresentado. O piloto pago depende de credenciais/configuração e limites confirmados; não foi executado nesta ronda.
- Não foi feito envio real de newsletter nem publicação de artigo/social ou entrega real a webhook. O fluxo pós-envio e a prevenção de duplicados WordPress têm testes, mas não são aqui apresentados como um ensaio externo realizado.
- Não foi acrescentado mapa de temas/GSC. OCR de digitalizações continua no navegador, com persistência privada; não foi transformado num serviço OCR permanente nesta ronda.
- Mantêm-se 13 alertas npm em ferramentas de desenvolvimento e avisos de chunks grandes, sem alertas npm de produção na medição realizada. Não constituem declaração de ausência de vulnerabilidades.

## Revisão final de desempenho do acervo

Foi observado um alerta de leitura depois do processamento. O ensaio Cloud reproduziu um 422 em 21,8 s seguido de leituras 200 em 6,3 e 2,8 s. A causa foi confirmada nos registos SQL: `statement timeout` (57014) ao agregar os dados completos de 31 PDFs numa única página de 100 linhas (2,4 MB, um documento com 759 kB). O histórico de recolhas não falhou. Não se ignorou este erro como se fosse uma biblioteca vazia.

A correção local preserva os contratos e a pesquisa existente: lê no máximo oito documentos por consulta, com cursor UUID estável e projeção explícita das colunas necessárias, sem trazer caminhos internos do original. Se a base de dados indicar timeout, reduz o lote até uma linha; não repete falhas de permissão nem devolve sucesso parcial. Não aumenta timeouts nem relaxa permissões. Cinco testes verificam leitura completa, isolamento de projeto, cursores, redução do lote e falha explícita sem ciclos infinitos. Uma futura biblioteca muito maior deve passar a índice leve e carregamento do texto ao abrir; esta correção resolve a agregação observada mantendo compatibilidade com os seletores de fontes, campanhas e pesquisa atual.

A instalação e as medições repetidas deste ajuste são registadas após o ensaio Cloud.

Saldo inicial desta ronda: 3 654,219970703125 créditos do plano; zero diários. A medição anterior de 3 654,85 pertence à ronda interrompida e não é usada como débito desta instalação. Valor indicado pelo proprietário: 0,30 €/crédito. Infraestrutura Cloud e fornecedores são custos separados.

Não enviar newsletters nem publicar artigos ou peças sociais durante a instalação. Preservar conteúdo, dados privados e configurações de automação. O ensaio da aplicação não autoriza ativar cadências ou fornecedores pagos.
