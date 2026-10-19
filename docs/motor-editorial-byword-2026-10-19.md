# Motor editorial do Hub — ronda local de 19 de outubro de 2026

Branch: `codex/hub-motor-editorial-local`. Esta ronda fica local para revisão; não altera a aplicação pública nem instala funções no projeto Lovable.

## Percursos implementados

| Capacidade | Onde experimentar | Comportamento |
| --- | --- | --- |
| Pesquisa orientada ao negócio | Artigos → Pesquisa SEO | Ordena por adequação aos temas do destino, procura e dificuldade; mostra motivos, métricas ausentes, temas excluídos e sobreposição com pautas ou páginas existentes. Mantém os pedidos DataForSEO e respetivos orçamentos já existentes. |
| Estrutura antes da redação | Plano editorial → pauta → Estrutura | Permite usar perguntas da pesquisa, editar e reordenar secções com as suas fontes. Na preparação manual, a redação exige uma estrutura confirmada para a versão atual do brief, das fontes e da marca. |
| Voz por marca | Automação → Conhecimento | Tratamento do leitor, até três amostras de escrita e vocabulário preferido, além da identidade já configurada em Sites e regras. Os exemplos de voz são contexto de estilo, nunca provas de factos. |
| Conhecimento próprio | Conhecimento → Escolher páginas de um PDF | Seleciona até 20 páginas com texto e guarda o excerto integral, título, hash e páginas. Na nuvem, o servidor relê o documento do projeto e recusa excertos adulterados. Continua a aceitar referências manuais aprovadas de formações, casos e textos. |
| Produção em lote | Artigos → Produção em lote; seleção na Pesquisa SEO | Cria até 20 pautas numa transação, com calendário segundo a cadência do site, teto em USD e acompanhamento de custos e progresso. Identifica temas já planeados sem os substituir. O mesmo pedido de criação não duplica o lote. |
| Ligações internas | Conhecimento → Páginas existentes | Descobre URLs nos sitemaps e importa/verifica destinos em grupos de até dez: HTTP, HTML, canonical, meta robots e X-Robots-Tag. As páginas novas exigem aprovação editorial antes de serem sugeridas. |

## Regras de execução

- Criar um lote, organizar a estrutura, definir voz, selecionar PDFs e verificar páginas não chama serviços de IA pagos.
- «Rever custo da próxima etapa» escolhe uma pauta pronta e propõe o orçamento da estrutura ou do texto. Fontes e contributo incompletos impedem a chamada paga. Uma estrutura proposta aguarda revisão no percurso manual.
- Autorizar a cadência de um lote exige a política automática do site. O motor existente executa a sequência com os limites globais, os limites por site e o teto do lote. Uma alteração à política ou ao conhecimento exige renovar essa autorização. Editar o brief de uma pauta autorizada pausa a cadência do lote.
- O teto inclui pedidos de produção e pesquisas automáticas associadas às pautas do lote. Custos conhecidos e reservas contam antes da chamada. Custos desconhecidos impedem novas etapas. Uma cobrança acima da estimativa pausa os serviços; o teto é um controlo de novos pedidos, não uma garantia de faturação do fornecedor.
- Aprovar preparação e aprovar publicação são decisões distintas. `fredericocarvalho.pt` mantém sempre aprovação humana para publicação.
- Texto e estruturas já editados são preservados. A confirmação de orçamento continua ligada à versão e à assinatura do contexto; não há repetição automática de chamadas incertas.
- As referências privadas aparecem no artigo com título e páginas, sem criar um link vazio ou divulgar um endereço privado do acervo. Não são enviados IDs nem hashes do documento no prompt do fornecedor.
- A descoberta só segue HTTPS do domínio registado e do seu alias `www`. Reutiliza verificação DNS público, ligação ao IP validado, limites de tamanho, redirecionamentos e robots.txt. Exclui índices de anexos e destinos de acesso, checkout ou ficheiros. Não executa scripts das páginas.
- Os dados usam o repositório editorial existente, com isolamento de projeto e lease/CAS no backend. `lotes` e os novos campos são opcionais para preservar estados antigos; não é necessária uma nova migração SQL nesta ronda.

## Verificação efetuada

- Bateria completa: **1 151 testes aprovados, um ignorado** (teste visual pré-existente). Inclui **30 testes novos** do motor e da interface.
- TypeScript da interface e backend: aprovado.
- Build da interface e geração dos dois runtimes nativos: aprovados.
- Verificação do grafo Edge: 255 ficheiros alcançáveis verificados.
- Arranque dos runtimes sem `node_modules` local: API anónima 401, worker anónimo 401, origem estranha 403, leituras autenticadas do motor, operação e acervo 200; zero pedidos reais externos nesse ensaio.
- Lint dos novos módulos: sem erros nem avisos após ajuste final das dependências do efeito.
- Navegador: criação de lote de duas pautas sem custo, calendário, bloqueio por falta de fontes, seleção de páginas de PDF e navegação com breadcrumb correto. A 390 px, documento e corpo medem 390 px, sem overflow horizontal.
- Ensaio real de descoberta em **smsonline.pt**: 40 URLs editoriais encontradas após filtrar índices de anexos. Dois destinos importados para o inventário **local**, ambos com HTTP 200, HTML indexável e canonical coincidente; ficaram **por confirmar**, sem aprovação editorial automática:
  - `https://smsonline.pt/guia-completo-de-sms-marketing/`
  - `https://smsonline.pt/aumentar-a-conversao-sms-marketing/`
- O teste Poppler inicialmente falhou por os executáveis não estarem no PATH. Passou com o runtime já instalado, sem instalar pacotes nem alterar configurações do projeto:

```sh
HUB_POPPLER_DIR=/Users/fcarvalho/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/poppler/bin npm test -- --maxWorkers=2 --minWorkers=1
```

## Limites e passos posteriores

1. Ainda não foi feita a importação desta branch nem o deploy/publicação no Lovable. Os dois runtimes gerados ficam preparados para esse passo posterior.
2. Não foram feitas chamadas pagas DataForSEO/DeepSeek nesta ronda. A qualidade dos artigos, a latência e a faturação real desta sequência continuam a exigir o piloto autorizado, com orçamento controlado.
3. A pesquisa por relevância e a seleção de conhecimento são editoriais e lexicais, sem embeddings, previsão de rankings ou leitura automática de todo o acervo. As páginas dos PDFs são escolhidas e confirmadas; não há OCR novo.
4. A descoberta é limitada a seis sitemaps e 100 URLs por ação; a verificação lê até dez páginas, com limite de tempo. Não é uma auditoria completa do site nem um crawler ilimitado.
5. A verificação técnica representa aquele momento. Páginas já aprovadas manualmente continuam identificadas como tal até à sua primeira verificação; não se apresenta uma validação HTTP que não ocorreu. Não foi criada uma nova rotina permanente de reverificação de todas as URLs.
6. O lote agrupa e prepara artigos; a publicação WordPress continua pelo percurso e política existentes. Não houve envios de newsletters, redes sociais ou publicações WordPress nesta ronda.
7. O funcionamento permanente das novas opções na nuvem, com dados de produção e contas distintas, exige validação depois da instalação. Os testes locais de projeto, referências e runtimes não equivalem a esse ensaio em produção.

## Custos desta ronda

- Prompts/comandos enviados ao Lovable: **0**.
- Créditos Lovable consumidos nesta ronda: **0** → **0,00 €**, à taxa indicada de 0,30 €/crédito.
- Chamadas pagas DataForSEO/DeepSeek: **0**. As consultas públicas de sitemap/HTML não usam esses fornecedores.
- Não é atribuída uma poupança hipotética: não há medição de quantos créditos um desenvolvimento equivalente no Lovable consumiria.
- Diff desta ronda: **557 linhas de código autoral adicionadas e 78 removidas**, em 31 ficheiros TypeScript/TSX; **90 linhas de testes adicionadas**. Os dois runtimes gerados têm mais 2 778 linhas e menos 1 968; são apresentados separadamente para não inflacionar a contagem de desenvolvimento autoral. A contagem depende da formatação e não mede, por si só, a dimensão funcional.

## Referências de produto consultadas

- [Byword Research](https://byword.ai/features/research/): pesquisa de oportunidades e SERPs.
- [Artigos](https://byword.ai/learn/docs/content/articles/), [voz](https://byword.ai/learn/docs/settings/voice/) e [ligações internas](https://byword.ai/learn/docs/settings/linking/).
- O endereço antigo `learn.byword.ai/custom/documents` redirecionou para a documentação geral; não foi usado para presumir funcionalidades não confirmadas.

## Consolidação local de Artigos — 19 de outubro, ronda seguinte

Branch: `codex/hub-artigos-fluxo-seo-local-2026-10-19`. Continua exclusivamente local, sem push, importação, deploy ou publicação no Lovable.

- Entrada Artigos abre o Plano de artigos. O antigo Percurso remete para o quadro; a prova de publicação e resultados continua acessível separadamente. Os rascunhos livres anteriores são preservados.
- Novo tema segue destinos e formato → pesquisa/focus keyword por artigo → revisão do plano. Suporta um artigo, uma série e versões por vários sites. A criação é transacional e idempotente, com prevenção de sobreposição de keywords por site. Séries criam calendário e teto próprios por destino, sem autorizar produção ou publicação.
- Pesquisa SEO apresenta somente resultados reais. A biblioteca permite procurar nas consultas e nas keywords devolvidas; conserva as datas originais de recolha e atualização do fornecedor. Antes de pedir dados novos, a interface procura resultados guardados compatíveis. O servidor reutiliza pesquisas manuais equivalentes mesmo antigas; a automação conserva os limites de validade. Atualização explícita exige revisão de custo. Não há pontuações, intenções, demografia ou cliques inventados.
- Detalhes de keyword mostram apenas métricas disponíveis: volume, dificuldade orgânica, CPC em USD, concorrência Ads e histórico mensal recebido. Zero permanece zero; ausência permanece ausência. Dados de Portugal, Brasil e Reino Unido não são misturados.
- O quadro calcula os estados a partir do trabalho efetivo; arrastar um cartão não pode contornar aprovação. Texto/estrutura aprovados não são prova de publicação no WordPress.
- O editor visual usa Tiptap já instalado, sem nova dependência. Inclui negrito, itálico, H2/H3, listas, citações, ligações e imagens públicas HTTPS com alt. Mantém Markdown e recuperação de alterações; formatação não suportada usa modo de código para evitar perda. Pré-visualização e WordPress partilham um renderer que escapa HTML e rejeita URLs perigosas. Durante gravações, o editor visual fica bloqueado para não perder escrita concorrente.
- SEO no editor: focus keyword destacada, descrição, prévia de resultado de pesquisa, verificações locais e preparação/exportação de Article/BlogPosting JSON-LD. Não é uma previsão de ranking ou uma pontuação Rank Math.
- Assistente permite pedir revisão do artigo completo ou de um parágrafo/excerto único. Usa DeepSeek direto, o orçamento e a contabilidade existentes. Guarda proposta separada, preserva exatamente o exterior de um excerto e impede aplicar uma revisão se o texto entretanto mudou. Pode descartar a proposta. Nenhuma chamada paga foi executada nesta ronda.
- Perfis dos sites e Séries e calendário substituem nomes menos claros. Automação passa a distinguir preparação, aprovação, cadência e orçamento reservado, com resumo do estado real.

Validação: 140 testes direcionados aprovados em 12 ficheiros, incluindo os 13 testes novos de criação atómica, duplicados, séries, cache, datas, métricas ausentes, navegação e revisão de parágrafos. TypeScript da interface e do backend e lint dos ficheiros alterados aprovados. Runtimes nativos regenerados. Build de produção aprovado; permanecem avisos globais de chunks grandes e Browserslist antigo. Teste no navegador local: tema para dois sites, pesquisa e regresso sem perder escolhas, gravação/reabertura com formatação e descrição preservadas, quadro por estado e automação a 390 px sem transbordo horizontal. Os dois artigos de prova estão explicitamente identificados como «Validação local», sem publicação.

Para a próxima integração autorizada:

1. Instalar juntos interface e runtimes; repetir os percursos com sessões Cloud e projetos distintos. Esta ronda não confirma alterações em produção.
2. Validar resultados, latência e custos com credenciais reais de DataForSEO/DeepSeek e orçamento do piloto; os ensaios automáticos usam fornecedores simulados isolados e não fornecem métricas à interface normal.
3. Ligar metadescrição/focus keyword/schema ao plugin SEO concreto de cada WordPress, com verificação de suporte e prevenção de JSON-LD duplicado. Os campos estão guardados no Hub; não são apresentados como já aplicados no site. O WordPress continua a receber o resumo no excerpt pelo publicador existente.
4. Acrescentar upload direto para a biblioteca de multimédia e seleção de imagem destacada integrada; nesta ronda a inserção no corpo usa URL HTTPS.
5. Para um histórico muito grande, evoluir a biblioteca para índice e paginação no servidor. A implementação atual lê os artefactos do projeto sem chamadas pagas, conserva falhas visíveis e reutiliza a cache da interface.

Custos desta ronda: 0 prompts Lovable, 0 créditos Lovable = 0,00 € (0,30 €/crédito), 0 pedidos pagos aos fornecedores. Não se estima uma poupança hipotética.

Referências técnicas: [DataForSEO Keyword Overview](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/), [Google Ads Search Volume](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/), [verificações de conteúdo Rank Math](https://rankmath.com/kb/score-100-in-tests/) e [checklist WordPress](https://rankmath.com/blog/wordpress-seo-checklist/). As verificações locais não replicam nem garantem a pontuação desses produtos.

## Artigos completos, integrações e glossários — bloco local seguinte

Branch `codex/hub-artigos-media-integracoes-glossarios-local-2026-10-19`. Exclusivamente local; não houve push, publicação, importação ou prompts Lovable, nem pedidos pagos aos fornecedores. Custo Lovable deste bloco: **0 créditos × 0,30 € = 0,00 €**. Sem novas dependências npm.

### Peça completa no editor

- Imagem destacada separada do corpo: upload PNG/JPEG/WebP até 8 MB, importação HTTPS com proteção contra SSRF, reutilização da biblioteca privada e capa editorial PNG de 1200×630 criada gratuitamente no próprio navegador. Não há imagem de IA a fingir ser fotografia documental.
- Validação de assinatura e dimensões do cabeçalho (até 40 MP/10 000 px), recusa de SVG, verificação de hash na leitura e deduplicação por SHA-256. A verificação do cabeçalho não é uma alegação de descodificação integral de todos os formatos.
- Alt, título, legenda e crédito acompanham a versão e invalidam aprovação quando alterados. A prévia de uma imagem antiga consulta o seu ID, independentemente das 200 imagens recentes da galeria.
- Cloud preparada com bucket privado `hub-artigos` e `hub_artigo_imagens`; URLs assinadas expiram em 15 minutos e são renovadas pela interface. Escritas apenas pelo backend e leitura de metadados sujeita ao projeto. Local usa o catálogo privado `.seo-local/imagens`.
- Título SEO independente do título editorial, descrição, prévia de pesquisa, schema e aplicação opt-in no WordPress. ZIP entrega Markdown, HTML seguro, referências (sem excertos privados), imagem binária e metadados. Não exporta uma URL assinada temporária como imagem definitiva.

### WordPress, recibos e eventos

- Destino continua resolvido pela pauta e pelo catálogo permitido, nunca por um domínio arbitrário recebido na API. Preserva aprovação humana no site pessoal, versão, pausa, identidade remota e prevenção de duplicados.
- Upload de imagem tem reserva própria por projeto/site/conteúdo+metadados. O mesmo recurso confirmado é reutilizado; uma resposta perdida fica incerta e apenas pode ser confirmada por leitura. Nome, alt e legenda/crédito são verificados.
- O recibo do artigo grava a imagem esperada e o início durável da escrita. Falha conhecida antes do POST pode ser corrigida e preparada novamente; uma escrita tentada ou interrompida nunca é repetida só porque não chegou resposta. Artigo, HTML, estado, imagem e metadados têm de corresponder para confirmar.
- Plugin local `integrations/wordpress/hub-editorial-bridge` prepara o contrato de metadados. Sem a capacidade do destino, o envio SEO é bloqueado antes da reserva. Rank Math/Yoast mantêm a autoria do schema. O plugin não foi instalado nem executado num WordPress nesta ronda.
- Alterações editoriais geram eventos na mesma gravação transacional do estado. Publicação, rascunho remoto e incerteza vêm de recibos `hub_publicacoes`, nunca só da aprovação. A campanha ligada mostra esse resultado confirmado, mantendo as restantes peças independentes.
- Página Integrações mostra o histórico real e os destinatários configurados para o projeto. Segredos e endpoints vivem apenas no servidor, em `HUB_WEBHOOKS_EDITORIAIS`; a interface ativa as subscrições. A configuração vazia mantém apenas o registo interno.
- Webhooks HMAC-SHA256 sobre `timestamp.corpo-exato`, identificador estável, proteção de destinos públicos HTTPS/DNS, sem redirects, prazo de 10 segundos e cinco tentativas com espera crescente. Repetição explícita autoriza outro bloco de cinco e conserva o total e o ID. Entrega é pelo menos uma vez: o recetor tem de verificar HMAC/tempo (janela sugerida 5 min) e deduplicar. Payload não inclui corpo dos artigos, PDFs nem credenciais.
- Worker preparado para sincronizar até 20 recibos e processar até duas entregas por minuto, independentemente da pausa de serviços SEO pagos, respeitando a pausa global do projeto. A configuração continua vazia; não foram enviados webhooks reais.

### Bibliotecas educativas

- Nova área Glossários: site, nome, focus keyword, termos, definições, exemplos próprios confirmados, fontes lidas e relações. Edição com recuperação local e controlo de versão; o destino fica fixo após guardar.
- Preparar página completa ou artigo por conceito é gratuito, determinístico e não inicia IA, agenda ou publicação. Repetir o mesmo pedido reutiliza a peça. Uma revisão posterior propõe texto separado e preserva o trabalho humano; aplicação exige base atual.
- Página completa tem âncoras entre conceitos, preservadas pelo editor visual/Markdown e renderer WordPress. Artigos individuais só ligam a conceitos com URL publicada confirmada; antes disso, mantêm os nomes como texto. Não inventa URLs.
- Exporta DefinedTermSet JSON-LD; a aplicação automática desse grafo especializado no plugin SEO de cada WordPress ainda não foi acrescentada. A peça normal segue como Article/BlogPosting.
- Até 100 termos por biblioteca, oito fontes e 20 relações por conceito; bibliotecas extensas acima de 250 mil caracteres são divididas para manter a edição utilizável. Não se corta silenciosamente o conteúdo para cumprir o limite do artigo.

### Integração e migração preparadas

`0067_artigos_imagens.sql` e journal preparados: tabelas/bucket privados, recibos de uploads e colunas de confirmação/outbox. A migração também inclui as novas imagens no backup/restauro e na barreira de cópia consistente. Aceita manifestos antigos de sete tabelas; novos incluem as duas tabelas de imagens. Restauro troca IDs/referências privadas, conserva os binários e deixa automações e subscrições externas inativas. Runtimes devem ser regenerados com `npm run build:edge-hub`, nunca editados manualmente.

Provas locais no navegador: capa criada, alt e título SEO editados, gravação e reabertura preservadas; glossário com fonte pública guardado/reaberto e preparado no editor; histórico regista as alterações reais, sem fingir publicação. Revisão a 390 px sem transbordo horizontal; navegação desloca-se até à área ativa. Dados de prova estão identificados como Validação local, sem publicação.

### Pendências para a próxima integração autorizada

1. Aplicar migração 0067 e instalar juntos interface e ambos os runtimes, repetindo os percursos com duas sessões Cloud/projetos distintos. Não afirmar que este bloco já está em produção.
2. Validar PHP e instalar a ponte num WordPress de staging; testar imagem, alt, legenda/crédito, título/descrição/focus keyword, HTML efetivo e plugins SEO de cada site. Só depois executar um piloto autorizado; nenhum post foi criado em sites reais nesta ronda.
3. Configurar um destino real de webhook e ensaiar HMAC, 2xx, interrupção e deduplicação. Nenhum destino/segredo foi inventado ou pedido pago realizado.
4. Evoluir a descoberta/ilustração visual com banco de imagens ou fornecedor de IA, caso desejado, com direitos e custos explícitos. O bloco atual entrega upload/reutilização/importação e capa tipográfica local.
5. Para acervos grandes, separar eventos, glossários e inventário editorial em tabelas/índices paginados. Neste bloco acompanham a persistência do projeto existente, com históricos concluídos limitados e entregas pendentes preservadas.

Referências técnicas: [WordPress Posts](https://developer.wordpress.org/rest-api/reference/posts/), [Media](https://developer.wordpress.org/rest-api/reference/media/) e [campos REST adicionais](https://developer.wordpress.org/rest-api/extending-the-rest-api/modifying-responses/). A referência funcional Byword não implica clonagem das suas métricas ou garantias de qualidade.

Validação final deste bloco: a regressão integral passou com **1 213 testes aprovados e dois opcionais ignorados** (composição de imagem opt-in e Poppler nativo indisponível neste PATH; a via Cloud PDFium/WASM tem os seus próprios testes). Após o último ajuste de recuperação antes do POST, passaram novamente **45 testes direcionados**, incluindo o novo caso de falha sem escrita remota — 1 214 casos únicos aprovados no conjunto das execuções. TypeScript de interface/backend, lint dos ficheiros alterados, build de produção e arranque dos runtimes nativos aprovados. O ensaio de arranque não usou node_modules local e confirmou 401 anónimo/worker, 403 para origem estranha, 200 nas leituras autenticadas simuladas e zero pedidos externos reais. O ZIP descarregado pelo navegador foi aberto e validado: cinco ficheiros, PNG 1200×630, título SEO e alt persistidos, sem URL assinada no manifesto. Os avisos globais de chunks grandes e Browserslist antigo mantêm-se; não são apresentados como resolvidos.

Contagem do bloco contra a base da branch: **538 linhas autorais TS/TSX/PHP adicionadas e 79 removidas, em 42 ficheiros**; **62 linhas SQL novas**; testes: **111 adicionadas e 18 removidas, em dez ficheiros**. Os runtimes gerados ficam separados: **2 654 adicionadas e 1 518 removidas**. A formatação compacta do repositório influencia a contagem; linhas não são uma medida de qualidade nem permitem estimar créditos que não chegaram a ser gastos.

## Espaço de redação inspirado no Content Editor — bloco local

Branch `codex/hub-redacao-editor-local-2026-10-19`, a partir de `ef057280`. Referência funcional e de disposição: [Surfer Content Editor](https://surferseo.com/content-editor/), consultado em 19 de outubro de 2026. Sem copiar recursos gráficos, alegações de ranking ou métricas proprietárias.

### Implementado e verificado

- O passo **4. Redação** abre uma superfície dedicada: texto ao centro, barra de formatação fixa durante a escrita, regresso ao plano e gravação sempre acessíveis. Título/descrição para pesquisa e imagem destacada podem ser expandidos, mantendo a escrita visível. A restante navegação do Hub reaparece ao regressar aos outros passos.
- Cinco painéis: **Orientações, Estrutura, Fontes, Assistente e Publicar**. Em telemóvel, uma alternância entre Escrever e Ferramentas evita uma coluna lateral estreita; os dois lados conservam o seu estado. Controlos de escrita com alvos de pelo menos 44 px e painel de ferramentas com deslocamento independente.
- Dezasseis verificações transparentes do conteúdo/planeamento, contagens de palavras, parágrafos, imagens e subtítulos. URLs, marcadores de referências, texto alternativo e identificadores de âncora não entram na contagem de palavras. O título principal está fora da contagem do corpo. Não se afirma que completar as verificações garanta aprovação ou posicionamento.
- Termos: expressão principal do plano e palavras efetivamente recebidas numa pesquisa **real guardada**. O painel abre apenas `resultado`, com o projeto explícito; não faz uma nova pesquisa paga. Mostra contagens literais e data/mercado; não cria intervalos ideais, dificuldade, entidades NLP ou volume inexistente. Sandbox/exemplos não alimentam recomendações reais.
- Estrutura navegável: saltar para cada subtítulo, consultar perguntas reais da pesquisa e acrescentar só os títulos ainda ausentes da estrutura confirmada e atual. É uma comparação literal de títulos, sem alegar deteção semântica de lacunas. Não substitui texto nem inicia redação paga.
- Fontes: excertos e estado de confirmação selecionados para o artigo, ligações HTTPS ou referências privadas às páginas dos PDFs, voz e amostras da marca. Não apresenta a confirmação humana como certificação automática dos factos.
- Ligações internas: sugestões do inventário aprovado do próprio domínio. A inserção procura a primeira ocorrência contínua e ainda sem ligação da âncora; mantém o formato e permite anular. Não inventa uma passagem ou URL e não substitui ligações existentes. Se a âncora atravessa várias marcas de formatação ou não existe, orienta para a seleção manual.
- Assistente: atalhos Simplificar, Voz ativa, Exemplo prático e Aprofundar preenchem o pedido. Podem atuar no artigo, num parágrafo ou num excerto único. Preserva o fluxo DeepSeek direto → orçamento → autorização → proposta → aceitação; não gera nem cobra ao clicar num atalho.
- Publicação: mantém slug, resumo, metadados/schema, imagem/alt/crédito, ZIP/Markdown, prévia, afirmações/fontes, auditoria, aprovação e WordPress. Guardar continua separado de aprovar/publicar. O botão do painel conduz diretamente à edição dos metadados, incluindo no telemóvel.
- Alterações conservadas ao alternar entre os quatro passos; recuperação privada por conta/projeto e proteção de saída pelo botão de regresso do editor. A versão permanece sujeita ao controlo de concorrência existente.
- Corrigida uma falha real da conversão Markdown: ligação dentro de negrito/itálico agora é interpretada recursivamente, em vez de voltar como sintaxe literal e perder o destino na reabertura. Editor, prévia e HTML WordPress usam a mesma conversão; ambos os runtimes foram regenerados localmente. Não foi necessário acrescentar dependências npm.

### Evidência e validação

No navegador, o rascunho **Validação local · Aprender IA na prática** passou das versões 3 → 4 → 5: edição de corpo e metadados, mudança entre passos sem perder alterações, gravação e reabertura, manutenção da imagem, navegação pelos subtítulos e visita aos cinco painéis. A 390×844 px, largura do documento igual à do viewport, sem transbordo horizontal. A dimensão temporária foi reposta e a prévia ficou aberta. Não se aprovou nem publicou este rascunho.

- Regressão integral: **1 227 aprovados, dois opcionais ignorados**, em 197 ficheiros (196 aprovados e um inteiramente opcional). Os ignorados são a composição de imagem opt-in e o Poppler nativo indisponível; não se apresentam como verificados.
- Treze novos testes cobrem contagens/Unicode, preservação de formatação e ligações na conversão partilhada, anulação, tabela protegida, custo explícito, pesquisa guardada real vs. Sandbox, inventário aprovado, gravação, passos e proteção de saída. O bloco direcionado inclui também os quatro testes anteriores de imagem/metadados.
- TypeScript da interface, lint dos onze ficheiros TS/TSX alterados, build de produção e ensaio de arranque Cloud preparados localmente. O ensaio confirmou 401 sem sessão, 403 para origem externa e 200 nas leituras autenticadas simuladas; zero pedidos externos reais.
- `npm run lint` global continua a falhar em ficheiros fora deste bloco: **334 erros e 147 avisos**. O lint direcionado não tem erros ou avisos. Mantêm-se avisos globais de bundles acima de 500 kB, Browserslist antigo e duas classes de duração ambíguas; não foram ocultados nem apresentados como resolvidos.
- Depois da versão final carregada e da passagem pelos cinco painéis, nenhum novo erro de execução no navegador. O histórico da sessão continha erros transitórios anteriores de hot reload, não reproduzidos na reabertura da versão final.

Provas: `../../evidencias-hub-2026-10-19/redacao-surfer-desktop.png` e `../../evidencias-hub-2026-10-19/redacao-surfer-mobile.png` (fora do repositório da aplicação).

### Limites e próxima integração

1. Este bloco **não está instalado na aplicação Cloud**. Integrar interface e ambos os runtimes só quando autorizado novamente, incluindo as pendências de migração 0067 do bloco anterior.
2. Não se implementou a análise proprietária de 500 fatores, NLP/entidades, link equity, autoridade tópica, previsão de ranking ou intervalos concorrenciais do Surfer. Uma evolução dessas recomendações precisa de recolha real e de critérios auditáveis, com orçamento explícito. Não se adicionou uma alegada forma de evitar detetores de IA.
3. Não foi executado um pedido real DeepSeek/DataForSEO nem uma publicação WordPress neste bloco. O contrato de orçamento e as operações foram testados localmente; repetir o percurso autenticado com duas contas/projetos e um destino de staging na próxima integração autorizada.
4. Pesquisa lexical e comparação de títulos são deliberadamente limitadas; não se apresentam como análise semântica ou verificação factual automática. Texto com tabelas/código/listas aninhadas mantém o modo Markdown protegido.
5. A dívida de lint, os bundles globais grandes e as validações reais pendentes do bloco anterior mantêm-se identificados para trabalho posterior.

Custos deste bloco: **0 prompts Lovable, 0 créditos × 0,30 € = 0,00 €**, zero pedidos pagos aos fornecedores. Nenhum push, importação, migração remota ou publicação.

Contagem deste bloco contra `ef057280`: **143 linhas TS/TSX autorais adicionadas e 33 removidas**, mais **86 linhas CSS**; **44 linhas de testes** (13 casos); runtimes gerados: **oito adicionadas e oito removidas**. A formatação compacta do repositório influencia estes totais; não corresponde a créditos ou a uma medida de qualidade.
