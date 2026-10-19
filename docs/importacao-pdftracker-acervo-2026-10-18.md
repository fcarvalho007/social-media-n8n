# Importação do acervo PDF Tracker — 18/10/2026

**Atualização em 19/10/2026:** os 28 PDFs recuperáveis foram entretanto importados no backend privado DIGITALSPRINT. A prova, o OCR e as limitações Cloud constam da secção final. Por instrução posterior do proprietário, todo o desenvolvimento seguinte fica local até novo pedido de integração.

**Revisão posterior:** navegação, leitor, filtros e controlos refinados em [Revisão de UX/UI dos documentos](revisao-ux-documentos-2026-10-18.md). Este relatório conserva a prova da importação.

Branch local: `codex/hub-biblioteca-pdfs-local-2026-10-18`. Sem push, deploy, publicação, escritas no backend antigo ou alterações de permissões/cron.

## Resultado comprovado

- **30 registos completos** da tabela real `tracked_pdfs`, exportados por PostgREST (`select=*`, ordenados por ID). Preservados os 32 campos, incluindo todos os resumos, etiquetas, publisher, datas, estados, soft deletes e propostas de texto social. São metadados importados, sem nova validação editorial ou geração de IA.
- **30 objetos PDF** no Storage antigo, **246 596 550 bytes**. Todos descarregados. Dois pares têm conteúdo idêntico por SHA-256: IDs **91/97** e **93/98**. Existem **28 binários únicos**, **234 161 000 bytes**, com hashes revalidados no disco após a cópia.
- **33 objetos de capa antigos (30 imagens únicas)**, descarregados e preservados com o manifesto; incluem capas de registos que já não existem. Não foram eliminados objetos antigos.
- **28 documentos únicos importados no IndexedDB do projeto de demonstração «Frederico Carvalho · exemplo»**, abertos pelo PDF.js, com texto por página e **28 novas capas reais da primeira página**. A interface confirmou 28 cartões importados com «capa pronta», sem capas pendentes. O acervo passou de 12 para **40 documentos**; os 12 anteriores foram preservados.
- Inclui o objeto órfão `1767433347561-ai_203_cenarios.pdf`: 23,9 MB e 158 páginas, com texto e capa. Identificado como «Objeto recuperado»; o título **AI 2030 Scenarios** foi confirmado na capa e guardado na interface. O nome original continua no manifesto.
- O **Digital News Report 2025** foi lido com **171 páginas e 17,8 MB**; o sistema antigo apresentava zero páginas em vários registos. A contagem atual provém do parser do binário.
- O ID **78**, anteriormente eliminado, contém apenas um URL temporário do LinkedIn. Devolveu HTTP **403**; não existe binário correspondente no Storage. Os metadados completos e a capa foram preservados. O ID 92 tem o mesmo título, mas isso não comprova igualdade de binários, pelo que não foi criada uma associação automática.

## Reconciliação dos estados

Havia 28 registos ativos e dois com `deleted_at`. O ID 91 eliminado e o ID 97 ativo partilham o mesmo hash: um só documento conserva os dois registos e os respetivos estados. O ID 91 não foi reativado. O ID 78 continua identificado como eliminado e sem ficheiro recuperável.

A reconciliação usa `storage_path` ou a correspondência exata do URL ao bucket conhecido. Não associa URLs de outros domínios só pelo nome do ficheiro. Um mesmo título não deduplica PDFs. Um objeto sem registo não recebe autor ou data inventados.

## Biblioteca do Hub

A página antiga foi observada em `https://pdftracker.lovable.app/` e o código fornecido foi consultado para preservar as capacidades úteis sem importar o segundo login/editor.

- Vista inicial em grelha, capas inteiras maiores, título, editora/origem, resumo antigo, páginas e categoria. Alternância para lista/leitor.
- Pesquisa no título, fonte, etiquetas, resumos antigos e texto real das páginas; categorias conservadas. «Do LinkedIn» identifica a categoria legada, sem inventar classificação temática.
- Estados **Por ler, Lido e Arquivado**, gravados localmente por documento/projeto, com ações reversíveis. Os estados originais dos registos antigos permanecem nos metadados.
- Conferência da migração e erros acessível na própria página; importação retomável pelo hash, sem duplicar os documentos ou apagar edições locais.
- Resumos antigos apresentados como importados e sem revisão editorial. Datas antigas mantidas na proveniência; não são convertidas automaticamente em datas de publicação verificadas.
- Original, capa PNG, texto/páginas e preparação explícita de fontes para Artigos e para o compositor existente continuam disponíveis.

## Exportação e dados locais

A consulta inicial do inventário/integrações foi feita em modo Chat do Lovable, só leitura. Para evitar a perda de campos longos na resposta do chat, a exportação final foi confirmada diretamente na API do projeto antigo com a chave **publicável/anon** já presente no ZIP fornecido. Nenhuma chave service role foi usada, mostrada, copiada para código ou guardada no backup. Não foram alteradas políticas de acesso.

Os dados e ficheiros estão em `.documentos-local/`, ignorados pelo Git:

- `legado/exportacao.json`: registos completos e manifestos reais de `Storage object/list` para os dois buckets.
- `legado/catalogo.json`: reconciliação, hashes, tamanhos e erros.
- `pdfs/<sha256>.pdf`: binários únicos, incluindo os antigos e as recolhas locais anteriores.
- `legado/capas/<sha256>`: as 30 imagens únicas dos 33 objetos antigos, com MIME/caminho no manifesto.
- **`legado/pdftracker-acervo-2026-10-18.zip`**: cópia portátil do acervo de origem, com exportação, catálogo, 28 PDFs únicos, 30 imagens únicas dos 33 objetos de capa e inventário das 99 fontes. Não inclui secrets, scripts executáveis do ZIP antigo ou permissões públicas. Esta cópia conserva os dados de origem; os novos estados/títulos editados no Hub ficam no IndexedDB deste navegador.

O script `node_modules/.bin/vite-node scripts/documentos/importar-pdftracker.ts` utiliza a exportação local existente para copiar/reconciliar originais. Não exporta credenciais nem ativa o rastreio antigo. Os endpoints `/__hub-documentos/legado/*` são exclusivamente locais, protegidos pelas mesmas verificações de origem, Host, JSON e loopback do motor anterior; não são APIs de produção.

## Integrações antigas: o que foi confirmado e o que aproveitar

| Área | Projeto antigo / evidência | Decisão no Hub local |
| --- | --- | --- |
| Dados e ficheiros | Supabase/PostgREST e Storage: leituras e downloads reais comprovados nesta ronda. | Importar metadados e originais; modelo de produção posterior deve usar autenticação, RLS e bucket privado do Hub. |
| Descoberta e scraping | Firecrawl, Apify, BrowserAct; secrets reportadas presentes pelo Lovable. O diagnóstico antigo não comprova cobertura de todas as fontes, com 98 fontes inativas e problemas de checkpoints. | HTML/RSS/APIs e motor local primeiro. Adaptadores pagos só quando necessários, com controlo de custos e teste dirigido. Não foram invocados nesta ronda. |
| LinkedIn | Código antigo usa Apify (`harvestapi~linkedin-profile-posts`) e posterior cópia para Storage. URLs temporários podem expirar, como o ID 78 demonstra. | Conservar posts/origem e cópia binária. A integração autenticada de recolhas futuras fica por migrar/testar. |
| Extração e resumos | Claude/Anthropic; Lovable reporta uso anterior nos registos 89–105. Os textos existentes foram preservados. | PDF.js extrai o texto localmente. Geração textual futura no Hub mantém a regra existente de **DeepSeek direto**; o gateway Lovable legado não é importado. |
| Capas | PDF.co, confirmado no código `generate-pdf-thumbnail`; 33 capas existentes recuperadas. Não foi executada conversão paga agora. | PDF.js criou 28 capas novas localmente, sem custo por conversão. PDF.co não é dependência desta biblioteca. |
| Tradução e cópia social | Funções legadas `translate-summary` / `generate-social-content`, usando Lovable AI/Anthropic segundo código/inventário. | Preservar os campos existentes como propostas antigas; não os publicar nem substituir o compositor do Hub. |
| Alertas | Resend configurado segundo Lovable; alertas inativos. | Sem envios ou ativação de alertas. |
| Cron | Jobs antigos com quebra no primeiro checkpoint, segundo diagnóstico Lovable. | Não importar esse agendamento. Automatização de produção exige worker/fila durável e pausa efetiva no Hub. |

Nomes de secrets reportadas: `ANTHROPIC_API_KEY`, `APIFY_API_KEY`, `BROWSERACT_API_KEY`, `FIRECRAWL_API_KEY`, `LOVABLE_API_KEY`, `PDF_CO_API_KEY`, `RESEND_API_KEY`. Presença não comprova funcionamento atual; os valores não foram recolhidos. Não foram adicionados pacotes npm.

## Verificação e pendências

- **812 testes aprovados**, um teste preexistente ignorado (139 ficheiros aprovados, um ignorado). Novos testes: reconciliação de URLs/objetos órfãos, nomes codificados, deduplicação sem perder soft deletes, estados de leitura, cópia durável/retomada e rejeição de HTML como PDF.
- TypeScript da aplicação e do tooling aprovados. Lint dos ficheiros alterados sem erros. Build público aprovado com os avisos preexistentes de tamanho de chunks.
- No navegador: importação dos 28 binários, 28 capas prontas, leitura real, título do objeto órfão, gravação de Lido/Por ler e Arquivado/Ativo, revertendo os estados usados no teste. Conferência após reload e QA visual descritas abaixo.
- A base de origem está integrada **localmente**, em disco e no navegador. Ainda não foi instalada nas tabelas/buckets do Hub Cloud. A migração de produção, backup externo, workers contínuos e testes de fornecedores pagos continuam por concluir.
- Não recuperável nesta ronda: binário do ID 78 via URL LinkedIn expirado. Metadados/capa conservados e erro explícito. Não é apresentado como PDF importado.
- Não copiados da aplicação antiga: login, permissões públicas, cron, alertas automáticos e geração de IA em cascata. A biblioteca local reutiliza os projetos e editores existentes do Hub.

## QA visual final

Grelha revista em desktop e a 390 px com os documentos importados, incluindo títulos longos, resumos reais, filtros e capas de formatos diferentes. Sem transbordamento horizontal (`scrollWidth = innerWidth = 390`). A grelha conserva as capas inteiras; não corta títulos impressos como a versão antiga fazia em alguns cartões.

A confirmação após reload manteve 40 documentos e o estado «PDF Tracker importado». Os pequenos refinamentos de revisão corrigiram o singular «1 documento» e limpam a seleção do leitor ao mudar pesquisa/categoria, para não mostrar o documento anterior fora do filtro. Provas locais, fora do Git: `.impeccable/review/18-out/pdftracker-importado-desktop.png` e `pdftracker-importado-mobile.png`.

O ZIP portátil tem **254,0 MiB**; a verificação CRC de todas as entradas passou. São 28 PDFs e 30 imagens únicas, reconciliados aos 30 e 33 objetos originais nos manifestos. O build público não contém os endpoints/etiquetas da importação nem o endereço do backend antigo.

## Biblioteca privada e OCR — 19/10/2026

### Comprovado antes da instrução para voltar ao desenvolvimento local

- **28/28 binários recuperáveis importados** através da interface na pré-visualização Cloud, no projeto privado DIGITALSPRINT. Originais, texto por página, capas novas e metadados legados gravados no backend. A biblioteca passou a 30 documentos, incluindo dois documentos sintéticos de QA.
- Importação por ZIP com limites de tamanho, verificação de caminhos, hashes, tamanhos e catálogo; importação sequencial retomável, cancelamento após o ficheiro em curso e deduplicação por projeto/hash. Os pares 91/97 e 93/98 preservam ambos os registos de origem.
- Relatório de importação privado persistido por projeto, com o ID 78 explicitamente não recuperável: URL LinkedIn HTTP 403 e ausência de binário no Storage original. Não foi associado ao ID 92 só por ter o mesmo título.
- **OCR real numa página digitalizada**, com Tesseract 7, modelos português/inglês e confiança reportada de 95%. Resultado persistido no backend, reaberto após reload e localizado pela pesquisa do código GIRASSOL 4827. Documento sintético Cloud: `69e3b018-3feb-4856-b6bd-45ccc87e5e21`.
- OCR também verificado localmente. Executa no navegador, guarda cada página, permite cancelar/retomar e assinala confiança/proveniência. Requer a página aberta durante o reconhecimento; não é OCR autónomo no servidor. Não substitui texto existente nem aprovação editorial.
- Os recursos OCR são preparados pelo próprio arranque Vite, além dos scripts npm. Esta correção resolve o caso do Lovable construir diretamente com Vite e saltar o prebuild. Worker, modelos e core servidos na mesma origem; sem enviar PDFs para um serviço OCR externo.
- Último código instalado na pré-visualização/backend: `ed53aa40b0f36eb5cf75f887f12840661f117ad3`, na branch `codex/hub-campanhas-descobertas`. Sem publicação da interface pública nesta ronda. O bloco Byword local não foi incluído nesta instalação.

### Limitações comprovadas na Cloud

1. As recolhas já iniciadas de Anthropic e Stanford HAI terminaram sem PDFs porque não conseguiram consultar `robots.txt`. A mensagem instalada não preserva a causa técnica concreta; não se pode afirmar se foi rede, fonte ou incompatibilidade do ambiente. Não foram contornadas regras de acesso. A recolha integral Cloud continua por comprovar.
2. O PDF.js não extrai o texto de **State of Search Q4 2025** devido a fontes malformadas. PDFium recuperou as primeiras 5 de 35 páginas na Cloud, mas a continuação usava `hub_job_adiar`, cujo SQL só aceita recolhas de fontes. A correção posterior ficou exclusivamente local.
3. O OCR não foi executado sobre todas as páginas digitalizadas do acervo. A auditoria local com Poppler encontrou 1 530 páginas, 1 474 com texto e 56 sem texto; algumas podem ser páginas vazias. AI Act — O Guia Essencial e Microsoft AI Diffusion Report requerem reconhecimento das digitalizações. Não declarar todo o acervo plenamente pesquisável.

### Correções locais prontas para futura integração

Branch **`codex/hub-biblioteca-pdfs-2026-10-19`**, sem push para a branch sincronizada nem novas instalações após a instrução do proprietário. O commit `1d38d18f` reúne o trabalho PDF anterior (32 ficheiros, 1 064 linhas acrescentadas e 223 removidas, incluindo dependências, testes e runtimes gerados).

- Continuação da recuperação PDFium em tarefas `documento_preparar` independentes, com identificador de execução e deduplicação por intervalo. Evita o RPC incompatível sem alterar permissões, migrações ou o worker instalado.
- **Prova local com o binário real State of Search Q4 2025: 35/35 páginas com texto, sete blocos de cinco, estado concluído.** PDFium real; armazenamento e fila em memória. Não é prova de conclusão na Cloud. Evidência local em `.documentos-local/prova-continuacao-2026-10-19.json`.
- Diagnósticos seguros de robots distinguem incompatibilidade do ambiente, DNS, timeout, ligação e certificado HTTPS. Nunca expõem URLs/credenciais do erro nem autorizam recolha quando a verificação falha.
- Singular «1 página» corrigido nos cartões.
- **228 testes aprovados**: 144 dirigidos à biblioteca em 18 ficheiros e 84 nos sete ficheiros de módulos que partilham a simulação de persistência/fila. Cobrem importação, OCR, permissões, persistência, limites de rede e continuação/deduplicação das tarefas. Typechecks da aplicação, backend e tooling (`tsconfig.node.json`) aprovados; lint dos ficheiros alterados e regeneração local dos dois runtimes aprovados. O build Vite e a verificação nativa Cloud passaram antes das últimas correções locais; não substituem uma nova prova do backend instalado.

Antes da próxima instalação autorizada: integrar os commits locais deliberadamente, gerar os runtimes, validar ambos os endpoints, retomar o relatório de 35 páginas e repetir uma recolha real com diagnóstico. Se o runtime bloquear a rede necessária, avaliar um transporte compatível que preserve DNS público, validação de redirecionamentos e robots; não enfraquecer essas proteções.

### Custos e evidências desta ronda PDF

Saldo observado antes do bloco PDF: 3 662,42 créditos do plano e zero diários. Saldo após a última instalação: 3 657,21 e zero diários. Diferença: **5,21 créditos × 0,30 € = 1,563 €, arredondado a 1,56 €**. É uma diferença de saldo do workspace, não uma fatura individual por prompt. Os 4,10 créditos da ronda anterior de campanhas são separados.

**Após o pedido para trabalhar exclusivamente local: zero novos prompts de desenvolvimento e zero créditos Lovable adicionais utilizados por este trabalho.** Nenhum pedido a fornecedores pagos de SEO/IA/OCR nesta ronda; armazenamento e execução Cloud são custos de infraestrutura separados, não medidos aqui.

Capturas fora do repositório, no diretório `../evidencias-hub-2026-10-19/`: `cloud-biblioteca-importada.png`, `cloud-ocr-reaberto.png` e `local-ocr-validado.png`.
