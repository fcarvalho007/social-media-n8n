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

Npm e Bun ficam alinhados pelas versões resolvidas. O Bun textual foi regenerado a partir do package-lock; o binário antigo redundante foi retirado automaticamente pela conversão oficial. Não foram executados scripts de instalação dos pacotes atualizados. O teste usa o motor real de leitura Excel para XLSX, XLS antigo, cabeçalhos, português, zeros e folha vazia.

## Validação local desta integração

- Antes das atualizações: 1 277 testes aprovados e dois opcionais ignorados.
- Após as correções: **1 280 testes aprovados**, dois opcionais ignorados, 204 ficheiros aprovados e um opcional ignorado; processo terminou com código 0.
- Tipos da interface e backend e compilação de produção aprovados após as atualizações.
- Grafo Edge: 255 ficheiros alcançáveis verificados.
- Arranque Deno isolado: API/worker sem sessão 401, origem alheia 403, leituras autenticadas simuladas 200; sem pedidos externos reais.
- Avisos de chunks globais grandes e dívida de lint preexistente mantêm-se identificados. Não foi mascarado um erro alterando o limite do bundler.

## Conferência Cloud anterior à instalação

Na pré-visualização existente: projeto DIGITALSPRINT com 30 documentos e conferência de 28/28 PDFs legados. O documento State of Search Q4 2025 tem original/capa e estava parado em 5 de 35 páginas de reextração. A versão local inclui continuação por jobs independentes deduplicados; comprovar a retoma após instalar.

## Instalação e ensaios Cloud

Em curso. Não considerar esta secção como comprovativo de instalação antes de registar os resultados reais.

Saldo inicial desta ronda: 3 654,219970703125 créditos do plano; zero diários. A medição anterior de 3 654,85 pertence à ronda interrompida e não é usada como débito desta instalação. Valor indicado pelo proprietário: 0,30 €/crédito. Infraestrutura Cloud e fornecedores são custos separados.

Não enviar newsletters nem publicar artigos ou peças sociais durante a instalação. Preservar conteúdo, dados privados e configurações de automação. O ensaio da aplicação não autoriza ativar cadências ou fornecedores pagos.
