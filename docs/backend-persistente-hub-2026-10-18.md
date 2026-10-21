# Backend persistente do Hub — 18 de outubro de 2026

Branch local: `codex/hub-backend-persistente`. Base: `20fc39c5`.

**Desenvolvido e testado localmente. As novas migrações, funções e agendamentos não foram instalados nem publicados.** A última instrução do proprietário foi concluir a preparação local, deixando Lovable Cloud como destino futuro. Publicar só o frontend continua a não instalar o backend.

## Resultado desta ronda

| Área | Implementação local | Situação externa |
| --- | --- | --- |
| PDFs privados | Originais e capas em Storage privado; texto, proveniência, revisões e estados de leitura em PostgreSQL; extração por lotes e retomável; biblioteca ligada ao mesmo projeto/sessão do Hub | Pacote preparado; nenhuma migração para o Cloud executada |
| SEO e custos | Repositório persistente para pesquisas, propostas, políticas, conhecimentos de marca, autorizações, reservas, custos e respostas dos fornecedores | Nenhum pedido pago DataForSEO/DeepSeek executado; secrets DataForSEO ausentes no Cloud auditado |
| Automação | Fila durável, reservas exclusivas, progresso, pausa, cadência editorial e recolhas diárias/semanais na hora de Lisboa; worker nativo Cloud | Scheduler nasce desligado; não há execução permanente enquanto não for instalado e ativado |
| WordPress | Rascunho/publicação separados, versão e destino, proteção contra duplicação e alterações diretas no WordPress; reconciliação de resultado incerto só por leitura | Nenhum artigo criado ou publicado nesta ronda; ainda exige piloto por destino |
| Recuperação | Cópia portátil com os binários efetivos, hashes e restauro em projeto novo e vazio; barreira de escrita durante snapshot | Restauro comprovado em PostgreSQL local; não é um ensaio de recuperação do alojamento Cloud |

A alternativa Node.js/Docker está incluída, mas não é um requisito do percurso Lovable Cloud. O WordPress não recebe o acervo privado nesta proposta: mantém-se como destino dos artigos. Colocar PDFs em Multimédia torná-los-ia normalmente acessíveis por URL e não substituiria a base de dados, os estados de leitura ou o agendador do Hub.

## Como funciona

1. O frontend usa a sessão existente e o projeto persistido. `VITE_HUB_BACKEND_URL` pode apontar à função HTTPS `/functions/v1/hub-editorial`. Sem essa opção, o modo local atual mantém-se; não há migração silenciosa.
2. A API verifica a sessão no Supabase e as permissões existentes do projeto. Leitura respeita `mc_pode_ler`; escrita respeita `mc_pode_escrever` (proprietário do projeto e papel autorizado no modelo atual). Os clientes não passam a escrever diretamente nas novas tabelas. As chaves privadas nunca usam prefixo `VITE_`.
3. Os PDFs são identificados por SHA-256 e guardados antes do processamento. Texto e capa têm trabalhos distintos: uma capa difícil não impede a extração do texto. As edições do título e da leitura usam revisão CAS; uma resposta antiga não substitui uma edição nova.
4. PDFium WebAssembly extrai até cinco páginas por invocação, com checkpoint em PostgreSQL. Não depende de browser, canvas, Poppler ou de um serviço externo de conversão no Cloud. O binário é versionado e verificado por hash; a distribuição conserva as licenças upstream. O percurso Node opcional usa Poppler.
5. O worker recebe uma chamada autenticada pelo token privado do agendador, reserva um trabalho e guarda o resultado. A recolha Cloud avança uma fonte por invocação; o motor SEO avança uma fase paga por invocação. A continuação não depende de o navegador permanecer aberto.
6. Pesquisa, estrutura e redação mantêm as políticas e os limites monetários já existentes. Um pedido pago ou WordPress com desfecho desconhecido não é repetido automaticamente. A reserva de custo mantém-se até reconciliação; custo desconhecido não é contado como zero.
7. O site pessoal exige aprovação humana da versão. Nos outros destinos, publicação automática só é elegível se a política, o artigo, a autorização de produção, as credenciais e a opção privada do servidor a permitirem. `ensinoemcasa.com` e `leigdpr.pt` continuam planeados, sem ligação de publicação.

As tabelas novas são `hub_editorial_estados`, `hub_editorial_artefactos`, `hub_documentos`, `hub_recolhas`, `hub_operacao`, `hub_jobs`, `hub_leases`, `hub_publicacoes` e `hub_worker_config`. Migrações: `0062_hub_backend_persistente.sql` e `0063_hub_worker_nuvem.sql`. As funções nativas são `hub-editorial` e `hub-editorial-worker`; os seus runtimes são gerados por `npm run build:edge-hub` a partir de `scripts/backend/`, não editados à mão.

## Acervo e ensaio de recuperação reais

Foi preparada uma cópia portátil privada em `.hub-backups/migracao-2026-10-18/`, fora do Git:

- 37 PDFs únicos e 37 capas da primeira página, num total de 74 objetos verificados.
- Texto extraído de 2 892 páginas; 592 lotes de até cinco páginas, sem erros de extração no ensaio Deno local.
- Lote de texto mais pesado: aproximadamente 343 ms de CPU; percentil 95: 45 ms. São medições locais, não garantias do alojamento.
- Duas pautas e dois artefactos editoriais, com automações pausadas e aprovações anuladas para revisão no destino.
- Uma referência antiga sem binário recuperável foi preservada como pendência no manifesto; não foi inventado um PDF para preencher esse registo.
- SHA-256 do manifesto: `ac8be5f65faa0de398ba2efb4430548cad79b41fa4ec1047c041267f01422f75`.

O ensaio `scripts/verificar-restauro-hub.ts` verificou os 74 ficheiros e executou a migração e a função real de restauro em PostgreSQL PGlite. Confirmou as contagens, zero documentos visíveis por outro utilizador e recusa de sobrescrever o destino não vazio. Não simulámos apenas uma resposta JSON de sucesso.

Esta cópia cobre o módulo editorial/documental novo, não todas as tabelas históricas de newsletter, Estúdio e redes sociais. O botão «Guardar ponto de recuperação» guarda o manifesto e verifica os objetos que continuam no mesmo Storage; não equivale a uma cópia independente dos binários. A exportação do operador faz essa cópia independente. Backup/PITR do alojamento continua por confirmar.

A cópia inicial foi construída a partir dos binários em disco, do catálogo recuperado e do estado SEO do servidor local. Não exporta o IndexedDB de cada navegador: títulos ou estados de leitura alterados apenas no navegador terão de ser reconciliados antes da importação definitiva. Não se deve apagar o acervo local ao mudar de backend.

## Verificação local

- Suite completa: **1 001 testes aprovados, um previamente ignorado**, 169 ficheiros aprovados e um ignorado. Depois, foi acrescentada e aprovada uma regressão para manter o total inicial de fontes durante as continuações; os testes dos percursos PDF e da divulgação voltaram a passar após as correções finais.
- Typecheck da aplicação e do backend: aprovados.
- Builds frontend, backend Node e duas funções Cloud: aprovados. O frontend conserva o aviso de chunks superiores a 500 kB; não foi escondido.
- Verificação de grafo Edge: 254 ficheiros alcançáveis; verificações Deno existentes e verificação separada das duas funções novas aprovadas.
- Casos locais cobrem autenticação/âmbito, papéis, RPCs e RLS, leases, restauro, checkpoints PDF, agenda, custos/reservas, sequência SEO, confirmação WordPress e reconciliação sem novo POST.
- Navegador: componentes reais com serviço injetado e dados explicitamente sintéticos, em 1440×1000, 390×844 e 1280×720, para controlos de operação e leitor PDF. Sem overflow horizontal nas seis capturas.
- Revisão independente: disposição final `ship`, limitada às duas correções pontuadas — contraste secundário 4,83:1 no fundo secundário e alvo de preparação 44 px. Não certifica o Cloud ou toda a aplicação.
- Detector executado uma vez sobre cinco alvos antes da agenda: `[]`. Agenda e leitor tiveram revisão manual/visual; não foi feito um segundo detector.
- Lint focado nos novos ficheiros do backend e componentes: zero erros. O lint global continua a falhar na dívida histórica: 333 erros e 145 avisos na medição desta ronda, contra 333/144 na base. Não se apresenta esta base como isenta de dívida técnica.

Os logs, capturas e relatórios com dados reais ficam privados em `.impeccable/review/backend-18/` e `/tmp/`. Não entram no Git PDFs, dados de pesquisa, segredos, cópias, logs ou a prévia de demonstração.

## Newsletter 319: resultado observado no Hub público

A crónica guardada foi comparada com o artigo público, parágrafo a parágrafo: 23 correspondências após normalização de espaços. Foi confirmada a fonte histórica em falta. O worker já existente reconciliou a entrega real e deixou Story e carrossel guardados para revisão; o Story abriu no compositor com composição guardada no Hub. O carrossel conserva dez slides, sem retrato, e o fecho «Recebe a próxima edição».

Não houve novo envio de newsletter, envio para a lista geral, publicação social ou instalação de código. Esta ação usou a versão já instalada do Hub. O novo UI local torna a revisão da fonte acessível antes das abas e impede a preparação prematura de edições antigas.

## Pendências originais: estado honesto

| Pendência | O que foi fechado | O que continua por comprovar/concluir |
| --- | --- | --- |
| PDFs na nuvem | Código, contratos privados, acervo portátil e processamento local | Instalação, importação e piloto no Cloud real |
| SEO/custos persistentes | Repositório servidor, migração e testes | Credenciais do fornecedor, piloto pago limitado e reconciliação real |
| Automação permanente | Worker Cloud, fila e scheduler inativo | Instalar, observar execução sem computador e só depois ativar cadências |
| Piloto editorial pago | Sequência por etapas e controlo de custo | Não executado nesta ronda |
| WordPress em vários sites | Publicador e confirmações, proteção de versões/duplicados | Piloto de rascunho por site; seletor de imagens/taxonomias e upload de imagem ainda não implementados |
| Envio real → divulgação | 319 preparada e compositor observado | Acompanhar uma próxima edição com fonte congelada no momento do envio |
| RLS em produção | Políticas novas e isolamento local testados; auditoria das permissões existentes | Verificação com duas contas reais após instalação |
| Redes/importações reais | Sem nova alteração destas integrações | Ensaio completo das integrações e dos destinos reais |
| Backup/restauro | Cópia com 74 binários e restauro PostgreSQL local | Cópia externa agendada, restauro Cloud e política/PITR do alojamento |
| Lint/design legado | Dois defeitos de acessibilidade desta extensão corrigidos | Redução da dívida histórica por módulo e cobertura de carga/dispositivos reais |

## Limites que não ficam escondidos

O percurso Cloud aceita até 32 MB e 600 páginas por PDF. Não há OCR nesta ronda: páginas sem texto ficam assinaladas. O processamento é gradual e a fila é partilhada; não se promete conclusão instantânea para centenas de páginas.

Uma capa real do corpus demorou cerca de 4,7 segundos de CPU com PDFium, mesmo reduzindo a resolução. É incompatível com o limite típico de CPU de uma Edge Function. Por isso capas e texto foram separados: os 37 documentos iniciais já têm capas pré-processadas; uma capa complexa futura pode ficar em erro e exigir processamento especial. Não se garante extração universal de PDFs nem recolha em sites com autenticação, bloqueio ou JavaScript. Respeitam-se robots, limites e destinos públicos.

A biblioteca carrega o texto do acervo uma vez; depois consulta apenas revisões alteradas. Os originais são obtidos a pedido e as URLs privadas de capa são renovadas. Pesquisa indexada e texto carregado por página para bibliotecas muito grandes são melhorias posteriores. A fila trata interrupções e concorrência por CAS, mas carga e recursos reais do alojamento ainda precisam do piloto.

Um prompt de auditoria foi enviado ao Lovable para confirmar dependências existentes. O consumo de créditos desse prompt não foi medido; não é correto declarar zero créditos nesta ronda nem calcular uma poupança sem o extrato. Nenhum pedido pago DataForSEO/DeepSeek foi executado. Uso de base de dados, armazenamento e funções Cloud terá a faturação do alojamento quando ativado.

## Instalação posterior e referências

O guião separado `lovable-backend-instalacao-posterior.txt` está preparado, **não submetido**. A ordem é reconciliar a branch com o HEAD atual do Lovable, aplicar migrações, instalar funções e secrets privados, preparar um destino vazio com proprietário real, importar a cópia, testar isolamento e um único piloto e só depois considerar a ativação do cron e a publicação da interface. Dados manuais existentes não devem ser substituídos.

Referências oficiais consultadas: [Lovable Cloud](https://docs.lovable.dev/features/cloud), [Storage](https://docs.lovable.dev/features/storage), [Jobs](https://docs.lovable.dev/features/jobs), [limites Edge](https://supabase.com/docs/guides/functions/limits), [WebAssembly em Edge Functions](https://supabase.com/docs/guides/functions/wasm), [PDFium](https://www.embedpdf.com/docs/pdfium/getting-started) e [metadados de anexos WordPress](https://developer.wordpress.org/reference/functions/wp_generate_attachment_metadata/). A decisão é manter o acervo privado no Hub e usar WordPress como destino editorial.
