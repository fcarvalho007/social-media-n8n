# Revisão das fontes, recolha de PDFs e capas — 18/10/2026

**Ronda posterior:** o acervo antigo já foi copiado e integrado localmente; ver [Importação do acervo PDF Tracker](importacao-pdftracker-acervo-2026-10-18.md). Este relatório conserva os resultados da revisão das fontes.

Trabalho local, na branch `codex/hub-biblioteca-pdfs-local-2026-10-18`. Sem deploy, publicação, ativação de cron ou alteração da base de dados do projeto antigo.

## Resultado e limites da prova

O inventário real de **99 fontes** foi exportado numa consulta de leitura ao Lovable, incluindo as 98 fontes anteriormente inativas. O endereço interno de SoCX foi redigido e não é consultado. O ZIP só continha dez fontes de exemplo e migrations incompletas; por isso não foi usado como inventário atual.

A auditoria consultou todas as 99 fontes. Após corrigir e voltar a testar o HubSpot e o World Bank, o balanço é **61 consultadas sem erro, 19 com limitações, 10 não acessíveis e 9 que requerem atenção**. Há **276 candidatos a PDF e 2 775 referências** nas páginas consultadas. Estes são candidatos extraídos do HTML/feeds; não são 276 PDFs já validados ou guardados. O relatório JSON conserva os diagnósticos por fonte; os dados completos das descobertas ficam nos manifestos privados locais.

A consulta é limitada a quatro páginas por fonte. Não prova que foi encontrado tudo num domínio nem que uma referência sem data é recente. «Detetada pela primeira vez» é uma comparação com o histórico do projeto, separada da data de publicação.

## O que ficou implementado

- Área **Fontes e rastreio** dentro de Documentos, com as fontes reais, pesquisa, categorias, seleção explícita e diagnóstico individual. A escolha local não altera o `active` do projeto antigo.
- Um botão **Recolher PDFs e novidades** percorre as páginas da fonte, feeds RSS/Atom, sitemaps e metadados/JSON-LD. Só utiliza endereços encontrados ou um adaptador público documentado e verificado; não pede a uma IA para inventar URLs.
- Suporte a downloads sem extensão, parâmetros, `citation_pdf_url`, enclosures, embeds, atributos de download e caminhos de repositórios. Identifica ligações de artigos separadamente dos PDFs.
- Compressão HTTP gzip/deflate/Brotli, limites sobre bytes descomprimidos, DNS público fixado à ligação TLS e revalidação de todos os redirects. HTML até 8 MB; PDFs até 50 MB. Preferência por IPv4 quando disponível após validar todas as respostas DNS. Isto resolveu o erro de tamanho no HubSpot.
- Leitura conservadora de robots.txt, grupos do agente, regras mais específicas, wildcard, Allow em empate e cache limitada. Erros ou bloqueios são visíveis. Não há contorno de CAPTCHA, login, paywall ou bloqueios do fornecedor.
- **Adaptador World Bank/DSpace**: os links públicos `/bitstreams/<uuid>/download` devolviam apenas a aplicação JavaScript. O conteúdo real é obtido pelo endpoint público `/server/api/core/bitstreams/<uuid>/content`, no host exato verificado, sem autenticação. O teste do documento completo devolveu HTTP 200, `application/pdf`, 8 942 591 bytes e assinatura PDF. O mesmo percurso já descarregou, extraiu e criou uma capa no Hub.
- Prioridade para documentos ainda não descarregados e para relatórios completos. Atingir uma ligação que falha não consome uma das três vagas de PDFs guardados por fonte; há até oito tentativas limitadas. Os candidatos antigos não bloqueiam permanentemente os seguintes depois da primeira recolha.
- Fila local com três consultas de fonte concorrentes, downloads serializados, checkpoints por fonte, gravações JSON ordenadas e escrita atómica de PDFs. Uma tarefa incompleta é marcada como interrompida ao reiniciar e pode ser retomada. Fechar o browser não cancela os downloads; o servidor local tem de continuar ligado.
- Os PDFs descarregados ficam em `.documentos-local/pdfs/`, identificados por SHA-256. Os manifestos ficam em `.documentos-local/tarefa-<id>.json`. São ficheiros privados locais, ignorados pelo Git. O Hub valida o PDF com PDF.js, extrai texto por página e guarda o acervo/capas em IndexedDB. As etapas não são confundidas: descarregado, organizado e capa criada têm estados próprios.
- As imagens são PNGs da **primeira página real do PDF**, renderizadas localmente; não são capas fabricadas por IA. Criação automática nas novas entradas, regeneração e download PNG no documento. Falha na capa não apaga o PDF nem finge sucesso.
- Acervo até 600 páginas por PDF, com progresso de leitura, pesquisa no texto, origem, categoria e capa. Páginas sem texto, vazias ou com erro continuam identificadas. Não é feita simulação de OCR. Os limites do compositor continuam separados: relatórios extensos passam como excertos com referência às páginas e ao hash, sem ultrapassar os limites de metadados do compositor.
- Documentos e resultados permitem recuperar um PDF do disco e reimportá-lo no navegador. A cópia local em disco não é um backup fora deste computador.
- Referências de notícias/artigos com pesquisa e paginação; pode-se escolher a recolha histórica a consultar. **Ler e preparar artigo** lê o texto editorial de um candidato escolhido, remove menus/scripts/rodapés, identifica fontes insuficientes e abre a oferta de uma fonte no editor de Artigos. A referência, o hash do HTML e qualquer truncagem são conservados. Não há geração de texto por IA ou publicação, e um rascunho existente não é substituído automaticamente.

## Provas funcionais desta ronda

1. Auditoria de rede das 99 fontes reais, seguida de retestes dirigidos às falhas corrigidas.
2. No navegador: seleção de **World Bank + Fundação Francisco Manuel dos Santos**, clique em recolher, seis candidatos encontrados, cinco PDFs descarregados e **cinco organizados com cinco capas reais**.
3. Um dos documentos do World Bank tem **412 páginas**, 11,3 MB, 394 páginas com texto e capa criada. As restantes páginas não foram inventadas nem dadas como texto lido.
4. Correção DSpace confirmada no navegador: uma recolha posterior guardou três PDFs e três capas, incluindo o download sem extensão pela API pública. Dois PDFs já existentes foram reconhecidos, sem duplicar o acervo.
5. Testes automatizados exercitam HTML, RSS/Atom, sitemaps, JSON-LD, metadados académicos, downloads sem extensão, gzip/Brotli, limites, DNS/redirects/IPv6, robots, persistência, retomada, isolamento por projeto, falsos PDFs, seleção de páginas e fontes para Artigos/compositor.
6. As propostas/rascunhos ficam locais. Nenhum conteúdo foi enviado para E-goi, Instagram, WordPress ou listas de contactos.
7. Recolha repetida confirmada: prioriza candidatos ainda não descarregados e voltou a organizar três PDFs com três capas. O acervo de teste terminou com nove PDFs reais únicos e três documentos de testes anteriores.
8. Leitor de artigos confirmado com «Ensino superior e emprego jovem em Portugal», da FFMS: a seleção incorreta de cartões `<article>` do menu foi corrigida, dando prioridade ao corpo editorial Drupal. O texto, a origem e o hash do HTML chegaram ao editor e foram guardados num novo rascunho local. Um teste de regressão cobre cartões longos e conteúdo relacionado antes/depois do corpo.

## Verificação final

- **806 testes aprovados**, um teste preexistente ignorado; 138 ficheiros de testes aprovados. TypeScript da aplicação e dos scripts passou; lint sem erros, com um aviso preexistente de Fast Refresh em `CarrosselNovo.tsx`. Build de produção aprovado, com avisos preexistentes de tamanho de chunks.
- Acervo e fontes revistos no navegador em desktop e a 390 px. Sem transbordamento horizontal no painel de fontes. Nove capas reais carregadas, com larguras de 553–600 px; o estado «capa pronta» corresponde a imagens renderizadas.
- Provas visuais locais, fora do Git: `.impeccable/review/18-out/fontes-pdfs-desktop.png` e `fontes-pdfs-mobile.png`.
- Pré-visualização: `http://127.0.0.1:5183/documentos`. Iniciar com `npm run dev:hub` se o servidor estiver parado. O servidor e este navegador têm de conservar os respetivos dados locais.
- Para repetir a auditoria técnica pública: `node_modules/.bin/vite-node scripts/documentos/auditar.ts`; passar IDs de fontes para um reteste dirigido. Não usar este script como agendamento de produção.

## Fontes que ainda não ficam garantidas nesta ronda

Dez fontes responderam com erro de acesso, URL obsoleto, redirecionamento ou bloqueio: **McKinsey, OECD, OpenAI, Deloitte Insights, Forrester, Gartner, CIGI, Banco de Portugal, IDC Portugal e SSRN**. A causa exata de cada uma está na matriz abaixo; vários casos são HTTP 403.

Nove exigem atenção: **UNCTAD, The Information, INE, GEE, ANACOM, Portugal Digital, ERC, AHRESP e SoCX**. Os motivos incluem robots.txt indisponível ou restritivo, resposta HTML no lugar do ficheiro de regras, problemas de ligação e o endereço interno inválido de SoCX.

Não seria correto prometer que um extrator HTTP consegue sempre entrar em todos estes sites. Os próximos passos são adaptar os endpoints oficiais que existam, corrigir URLs com confirmação da fonte e avaliar um serviço de browser/scraping quando for necessário. Nesta ronda não foram feitos pedidos pagos nem contornados bloqueios. Upload ou endereço direto continuam disponíveis para documentos obtidos legitimamente pelo utilizador.

## Publicação e integração de produção por concluir

- Este motor está ligado apenas ao servidor `npm run dev:hub` e não é exposto pelo build público. Os endpoints verificam origem, método, JSON, Host e ligação loopback; não são um substituto da autenticação/RLS da versão alojada.
- Falta portar o contrato para o backend do Hub com autenticação, RLS, bucket privado, quota, workers adequados, backup e monitorização. Não publicar o plugin Vite como API de produção.
- Falta migrar e reconciliar o acervo antigo de 29 registos com binário/30 objetos; não foram copiados secrets ou permissões públicas antigas.
- OCR, extração de tabelas/gráficos, páginas que dependem de JavaScript sem API pública, cobertura profunda dos sites e agendamento 24/7 não foram ativados.
- Alguns sites dão títulos genéricos a downloads e o PDF pode não ter título nos metadados. O acervo permite editar o título; não se inventa um título por IA nesta entrada. Os documentos de teste anteriores à correção de contexto conservam os títulos originalmente guardados.
- A produção editorial com IA e a publicação em WordPress continuam sujeitas ao motor/fluxo de aprovação previsto; esta ronda fornece fontes verificadas e rascunhos para desenvolver.
- Limites da recolha: quatro páginas, até três PDFs guardados por fonte, oito tentativas PDF por fonte, doze PDFs e 150 MB de PDFs por tarefa. São limites deliberados; o diagnóstico mostra os candidatos e as limitações. Mudanças no conteúdo de um mesmo URL exigem revalidação do ficheiro; a verificação é pelo hash, não pelo nome.

## Custos e dependências

Não foram acrescentados pacotes: JSDOM, PDF.js, React e os componentes já existiam no Hub. A consulta do inventário foi feita em Chat do Lovable. A recolha, extração e capas não usam Lovable AI, Firecrawl, Claude ou geração de imagens paga. Não foi consultado um extrato de créditos do Lovable, pelo que não se atribui um custo fictício à conversa de leitura.

Referências técnicas: [PDF.js](https://mozilla.github.io/pdf.js/examples/), [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html), [contrato oficial DSpace para bitstreams](https://github.com/DSpace/RestContract/blob/main/bitstreams.md).

## Matriz das 99 fontes

Os números são candidatos e referências nas páginas efetivamente consultadas. «Consultada» não significa que todos os PDFs do site foram descarregados.

| Fonte | Estado | PDFs candidatos | Referências | Diagnóstico |
| --- | --- | ---: | ---: | --- |
| [McKinsey & Company](https://www.mckinsey.com/capabilities/quantumblack/our-insights) | Não acessível | 0 | 0 | HTTP 403: https://www.mckinsey.com/capabilities/quantumblack/our-insights |
| [PwC](https://www.pwc.com/gx/en/issues/artificial-intelligence.html) | Consultada | 2 | 33 | Sem erro nas páginas consultadas. |
| [OECD](https://www.oecd.org/en/publications.html) | Não acessível | 0 | 0 | HTTP 403: https://www.oecd.org/en/publications.html |
| [World Bank](https://www.worldbank.org/en/research) | Com limitações | 24 | 20 | Redirecionamento para openknowledge.worldbank.org; identidade editorial por confirmar. |
| [Stanford HAI](https://hai.stanford.edu/ai-index) | Consultada | 2 | 34 | Sem erro nas páginas consultadas. |
| [OpenAI](https://openai.com/research) | Não acessível | 0 | 0 | HTTP 403: https://openai.com/research |
| [Anthropic](https://www.anthropic.com/research) | Consultada | 3 | 21 | Sem erro nas páginas consultadas. |
| [Microsoft Research](https://www.microsoft.com/research) | Consultada | 0 | 49 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Adobe](https://business.adobe.com) | Consultada | 0 | 9 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Search Engine Journal](https://www.searchenginejournal.com) | Consultada | 0 | 33 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [BCG (Boston Consulting Group)](https://www.bcg.com/publications) | Consultada | 0 | 47 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Bain & Company](https://www.bain.com/insights/topics/artificial-intelligence/) | Com limitações | 1 | 67 | HTTP 404: https://www.bain.com/insights/topics/artificial-intelligence/ |
| [Deloitte Insights](https://www2.deloitte.com/insights/us/en.html) | Não acessível | 0 | 0 | O site excedeu o limite de redirecionamentos. · https://www2.deloitte.com/insights/us/en.html |
| [Accenture Research](https://www.accenture.com/us-en/insights/artificial-intelligence-summary-index) | Com limitações | 1 | 36 | Redirecionamento para newsroom.accenture.com; identidade editorial por confirmar. |
| [Gartner](https://www.gartner.com/en/documents) | Não acessível | 0 | 0 | HTTP 403: https://www.gartner.com/en/documents |
| [Forrester](https://www.forrester.com/research/artificial-intelligence/) | Não acessível | 0 | 0 | HTTP 404: https://www.forrester.com/research/artificial-intelligence/ |
| [Capgemini Research](https://www.capgemini.com/insights) | Consultada | 1 | 42 | Sem erro nas páginas consultadas. |
| [Google DeepMind](https://deepmind.google/research/publications/) | Consultada | 3 | 36 | Sem erro nas páginas consultadas. |
| [Meta AI Research](https://ai.meta.com/research) | Consultada | 1 | 8 | Sem erro nas páginas consultadas. |
| [Google AI Blog](https://ai.google/research) | Consultada | 5 | 3 | Sem erro nas páginas consultadas. |
| [Hugging Face Blog](https://huggingface.co/blog) | Consultada | 1 | 274 | Sem erro nas páginas consultadas. |
| [AI Now Institute](https://ainowinstitute.org) | Consultada | 1 | 16 | Sem erro nas páginas consultadas. |
| [Center for AI Safety](https://safe.ai) | Consultada | 1 | 12 | Sem erro nas páginas consultadas. |
| [Future of Life Institute](https://futureoflife.org) | Com limitações | 0 | 20 | Redirecionamento para newsletter.futureoflife.org; identidade editorial por confirmar. |
| [MIT Technology Review AI](https://www.technologyreview.com/ai) | Com limitações | 1 | 17 | HTTP 404: https://www.technologyreview.com/ai |
| [HubSpot Research](https://www.hubspot.com/resources/marketing/pdf) | Consultada | 2 | 13 | Sem erro nas páginas consultadas. |
| [Semrush](https://www.semrush.com/blog) | Consultada | 0 | 68 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Ahrefs](https://ahrefs.com/blog) | Consultada | 0 | 51 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Moz](https://moz.com/blog) | Consultada | 1 | 22 | Sem erro nas páginas consultadas. |
| [Content Marketing Institute](https://contentmarketinginstitute.com) | Consultada | 0 | 15 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Sprout Social](https://sproutsocial.com/insights) | Consultada | 0 | 92 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Hootsuite](https://www.hootsuite.com/research) | Com limitações | 1 | 6 | Redirecionamento para blog.hootsuite.com; identidade editorial por confirmar. |
| [We Are Social](https://wearesocial.com) | Consultada | 1 | 13 | Sem erro nas páginas consultadas. |
| [Statista](https://www.statista.com) | Consultada | 0 | 85 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [IMF (Fundo Monetário)](https://www.imf.org/en/Publications/WP) | Com limitações | 0 | 38 | HTTP 403: https://www.imf.org/en/publications/sprolls/technical-assistance-country-reports |
| [BIS (Bank for International Settlements)](https://www.bis.org/publ/work.htm) | Com limitações | 0 | 52 | HTTP 404: https://www.bis.org/publ/work.htm |
| [European Commission Digital](https://digital-strategy.ec.europa.eu) | Consultada | 3 | 16 | Sem erro nas páginas consultadas. |
| [Brookings Institution](https://www.brookings.edu/research) | Consultada | 1 | 40 | Sem erro nas páginas consultadas. |
| [CIGI (Centre for International Governance)](https://www.cigionline.org) | Não acessível | 0 | 0 | HTTP 403: https://www.cigionline.org |
| [WEF (World Economic Forum)](https://www.weforum.org/publications) | Consultada | 0 | 41 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [UNCTAD](https://unctad.org/publications) | Requer atenção | 0 | 0 | Não foi possível confirmar o robots.txt (HTTP 403). · https://unctad.org/publications |
| [AWS Research](https://aws.amazon.com/blogs/machine-learning) | Consultada | 1 | 45 | Sem erro nas páginas consultadas. |
| [Google Cloud Blog](https://cloud.google.com/blog) | Consultada | 0 | 59 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Azure AI Blog](https://azure.microsoft.com/blog) | Consultada | 0 | 108 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [NVIDIA Blog](https://blogs.nvidia.com) | Consultada | 0 | 87 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [a16z (Andreessen Horowitz)](https://a16z.com/content) | Consultada | 4 | 21 | Sem erro nas páginas consultadas. |
| [Sequoia Capital](https://www.sequoiacap.com/articles) | Com limitações | 0 | 8 | HTTP 404: https://www.sequoiacap.com/articles |
| [Y Combinator Blog](https://www.ycombinator.com/blog) | Consultada | 0 | 33 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Notion Blog](https://www.notion.so/blog) | Com limitações | 0 | 8 | Redirecionamento para www.notion.com; identidade editorial por confirmar. |
| [Atlassian Research](https://www.atlassian.com/blog) | Com limitações | 1 | 73 | Só são permitidos sites públicos por HTTPS, sem credenciais ou portas. · https://www.atlassian.com/blog/feed |
| [Slack Research](https://slack.com/blog) | Consultada | 0 | 61 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Microsoft Work Trend Index](https://www.microsoft.com/worklab) | Consultada | 5 | 10 | Sem erro nas páginas consultadas. |
| [Gallup Workplace](https://www.gallup.com/workplace) | Consultada | 10 | 26 | Sem erro nas páginas consultadas. |
| [LinkedIn Economic Graph](https://economicgraph.linkedin.com/research) | Consultada | 2 | 26 | Sem erro nas páginas consultadas. |
| [Banco de Portugal](https://www.bportugal.pt/publicacoes) | Não acessível | 0 | 0 | HTTP 403: https://www.bportugal.pt/publicacoes |
| [ACEPI](https://www.acepi.pt) | Consultada | 0 | 17 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [IDC Portugal](https://www.idc.com/pt) | Não acessível | 0 | 0 | HTTP 403: https://www.idc.com/pt |
| [Eurostat](https://ec.europa.eu/eurostat) | Consultada | 0 | 42 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [ENISA](https://www.enisa.europa.eu) | Consultada | 3 | 37 | Sem erro nas páginas consultadas. |
| [CB Insights](https://www.cbinsights.com) | Com limitações | 0 | 9 | O robots.txt devolveu uma página HTML; recolha suspensa nesta fonte. · https://www.cbinsights.com/feed/ |
| [The Information](https://www.theinformation.com) | Requer atenção | 0 | 0 | Não foi possível confirmar o robots.txt (HTTP 403). · https://www.theinformation.com |
| [Benedict Evans Newsletter](https://www.ben-evans.com) | Com limitações | 0 | 2 | HTTP 401: https://www.ben-evans.com/newsletter-archive |
| [Stratechery](https://stratechery.com) | Consultada | 1 | 16 | Sem erro nas páginas consultadas. |
| [TLDR Newsletter](https://tldr.tech) | Consultada | 0 | 9 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [The Rundown AI](https://www.therundown.ai) | Consultada | 1 | 23 | Sem erro nas páginas consultadas. |
| [Import AI](https://importai.substack.com) | Consultada | 0 | 22 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [arXiv CS.AI](https://arxiv.org/list/cs.AI/recent) | Com limitações | 98 | 32 | Redirecionamento para info.arxiv.org; identidade editorial por confirmar. |
| [SSRN AI Papers](https://papers.ssrn.com) | Não acessível | 0 | 0 | HTTP 403: https://papers.ssrn.com |
| [Adobe Digital Reports](https://business.adobe.com/resources/reports) | Consultada | 0 | 10 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Marktest](https://www.marktest.com) | Consultada | 0 | 66 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [GfK Portugal](https://www.gfk.com/pt) | Com limitações | 1 | 47 | Redirecionamento para nielseniq.com; identidade editorial por confirmar. |
| [Nielsen Portugal](https://www.nielsen.com/pt) | Consultada | 0 | 13 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [INE](https://www.ine.pt/xportal/xmain?xpgid=ine_publicacoes) | Requer atenção | 0 | 0 | Não foi possível consultar o robots.txt; tenta novamente mais tarde. · https://www.ine.pt/xportal/xmain?xpgid=ine_publicacoes |
| [PORDATA](https://www.pordata.pt) | Consultada | 0 | 0 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [GEE](https://www.gee.gov.pt/pt/lista-publicacoes) | Requer atenção | 0 | 0 | Não foi possível consultar o robots.txt; tenta novamente mais tarde. · https://www.gee.gov.pt/pt/lista-publicacoes |
| [CMVM](https://www.cmvm.pt) | Consultada | 0 | 0 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [ANACOM](https://www.anacom.pt/render.jsp?categoryId=337754) | Requer atenção | 0 | 0 | O robots.txt desta fonte não permite esta recolha. · https://www.anacom.pt/render.jsp?categoryId=337754 |
| [Portugal Digital](https://portugaldigital.gov.pt) | Requer atenção | 0 | 0 | O robots.txt devolveu uma página HTML; recolha suspensa nesta fonte. · https://portugaldigital.gov.pt |
| [Deloitte Portugal](https://www2.deloitte.com/pt/pt/pages/about-deloitte/topics/estudos-e-publicacoes.html) | Com limitações | 1 | 13 | HTTP 404: https://www2.deloitte.com/pt/pt/pages/about-deloitte/topics/estudos-e-publicacoes.html |
| [PwC Portugal](https://www.pwc.pt/pt/estudos.html) | Com limitações | 0 | 13 | HTTP 404: https://www.pwc.pt/pt/estudos.html |
| [EY Portugal](https://www.ey.com/pt_pt/insights) | Consultada | 8 | 64 | Sem erro nas páginas consultadas. |
| [KPMG Portugal](https://kpmg.com/pt/pt/home/insights.html) | Consultada | 0 | 28 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [IAPMEI](https://www.iapmei.pt) | Consultada | 8 | 23 | Sem erro nas páginas consultadas. |
| [AICEP](https://www.portugalglobal.pt) | Consultada | 0 | 11 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Turismo de Portugal](https://www.turismodeportugal.pt) | Consultada | 2 | 18 | Sem erro nas páginas consultadas. |
| [DECO Proteste](https://www.deco.proteste.pt) | Consultada | 0 | 45 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [ERC](https://www.erc.pt) | Requer atenção | 0 | 0 | O robots.txt devolveu uma página HTML; recolha suspensa nesta fonte. · https://www.erc.pt |
| [AdC](https://www.concorrencia.pt) | Consultada | 0 | 30 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Nova SBE](https://www.novasbe.unl.pt/en/research/knowledge-production) | Com limitações | 0 | 40 | HTTP 404: https://www.novasbe.unl.pt/en/faculty-research/research-unit/overview/%7B%7Bitem.Url%7D%7D |
| [Católica Lisbon](https://www.clsbe.lisboa.ucp.pt/research/knowledge-centers) | Consultada | 0 | 0 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [ISCTE](https://www.iscte-iul.pt) | Consultada | 0 | 29 | Nenhuma ligação PDF encontrada nas páginas consultadas. Isto não prova que o site não tenha PDFs. |
| [Fundação Francisco Manuel dos Santos](https://ffms.pt/pt-pt/estudos) | Consultada | 4 | 11 | Sem erro nas páginas consultadas. |
| [APDC](https://comunicacoes.apdc.pt) | Com limitações | 0 | 90 | HTTP 202: https://comunicacoes.apdc.pt/comunicacoes-255-antonio-gameiro-marques-europa-numa-encruzilhada-digital-e-agora/70890068 |
| [APAN](https://apan.pt/conhecimento/estudosquestionarios/) | Consultada | 2 | 24 | Sem erro nas páginas consultadas. |
| [AEP](https://www.aeportugal.pt/pt/publicacoes) | Consultada | 2 | 12 | Sem erro nas páginas consultadas. |
| [CIP](https://www.cip.org.pt) | Consultada | 16 | 8 | Sem erro nas páginas consultadas. |
| [AHRESP](https://www.ahresp.com) | Requer atenção | 0 | 0 | Não foi possível consultar o robots.txt; tenta novamente mais tarde. · https://www.ahresp.com |
| [APCCA](https://www.apcontactcenters.pt) | Consultada | 50 | 77 | Sem erro nas páginas consultadas. |
| SoCX | Requer atenção | 0 | 0 | Endereço interno, redigido ou inválido. Precisa de uma fonte pública correta. |
