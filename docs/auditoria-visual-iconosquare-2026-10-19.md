# Auditoria e consolidação visual do Hub

19 de outubro de 2026 · desenvolvimento e revisão locais.

Branch: `codex/hub-visual-azul-iconosquare-local-2026-10-19`.

## Direção e critérios

A referência é a linguagem visual das duas imagens fornecidas pelo proprietário e do [Iconosquare](https://www.iconosquare.com/): azul, superfícies claras, espaço para os conteúdos e informação organizada em módulos legíveis. O objetivo é facilitar o trabalho editorial de Frederico e da equipa, incluindo utilizadores sem conhecimentos técnicos. Não foram copiados logótipos, imagens comerciais ou métricas do produto de referência.

A implementação evolui o sistema existente. O azul da interface não substitui as cores dos artigos publicados, emails, Stories ou carrosséis. A referência foi aplicada à navegação, controlos e superfícies de trabalho. Não foram acrescentados gráficos decorativos nem números para preencher ecrãs sem dados.

## Auditoria e correções

| Prioridade | Constatação | Implementação |
| --- | --- | --- |
| Alta | Gradiente cinzento de fundo tornava listas e formulários visualmente mais pesados. | Fundo uniforme `#F4F7FB`, cartões brancos, bordas claras e sombras discretas. |
| Alta | A cor de ação e os cabeçalhos não acompanhavam a direção azul pedida. | Tokens de azul acessível; cabeçalho partilhado `CabecalhoPagina`; marca simples do Hub e seleção azul no menu. |
| Alta | Cantos, dimensões dos controlos e títulos variavam entre áreas. | Raio base de 12px; campos e botões padrão de 44px; hierarquia de títulos de página de 24–30px; títulos de cartões mais contidos. |
| Alta | O painel inicial destacava um cartão de custos muito grande e cartões aninhados, com informação de configuração a competir com o trabalho. | Continuidade em linhas legíveis; custos com escala mais equilibrada; escolha de projeto numa barra própria; associações de newsletter disponíveis por expansão no fim da página. |
| Alta | Artigos acumulava nove opções e duas linhas de navegação no computador. | Cinco áreas principais; Rascunhos livres, Integrações, Automação e Custos em «Mais opções», com identificação da página ativa e teclado preservados. |
| Alta | Resultados tinha uma segunda barra lateral com estilos escuros e texto branco, inadequados ao contexto claro. | Atalhos horizontais por secção na Visão Geral. Perfil só aparece quando essa secção existe. O observador acompanha a secção visível e respeita movimento reduzido. |
| Alta | Ao fechar a pesquisa transversal com Escape, o foco regressava ao BODY. | Captura e recuperação do botão ou campo de origem; o fecho após navegação não rouba o foco do novo destino. Confirmado no navegador e por dois testes. |
| Média | Curadoria e Documentos usavam separadores e filtros com tratamentos diferentes. | Navegação de área com sublinhado azul; filtros em superfícies brancas; seleção de biblioteca, grelha e lista com o mesmo azul e estados existentes. |
| Média | A Newsletter mantinha gradientes roxos, faixa de validação escura e pesquisa interna com paleta escura. | Banda de ação azul; validação clara; indicadores e pesquisa interna claros; controlos autenticados alinhados com o Hub. Origem inerte alterada e saídas regeneradas. |
| Média | Indicadores analíticos tinham animações decorativas, tipografia monoespaçada e cores de legenda diferentes das séries. | Números tabulares na tipografia da interface; remoção de rotação e deslocação ao passar o rato; cores das séries e respetivas legendas coerentes. |
| Média | Diálogos e controlos precisavam de uma superfície e contorno consistentes. | Diálogos brancos com margem lateral no telemóvel; contornos de campos mais visíveis; hover/foco azul; tabelas com cabeçalho claro e seleção identificada. |
| Média | Projetos e Rascunhos repetiam espaçamentos e cabeçalhos próprios. | Cabeçalho comum, filtros de projetos uniformes e remoção dos espaçamentos externos duplicados em Rascunhos. Calendário conserva a sua disposição, com título e atualização alinhados ao sistema. |

## Cobertura por área

| Área | Resultado desta ronda | Verificação |
| --- | --- | --- |
| Estrutura global | Menu, marca, cabeçalho, breadcrumbs, pesquisa e aviso de demonstração coerentes. | Navegador; abrir/fechar menu móvel; teclado e foco. |
| Início | Hierarquia, continuidade, custos e acessos a Campanhas e Documentos refinados. | Navegador no computador; dados locais identificados como exemplo. |
| Curadoria | Cabeçalho, separadores, filtros e cartões uniformizados. | Navegador; preservação dos controlos de aprovação, sem os executar. |
| Documentos/PDF Tracker | Capas preservadas; filtros agrupados; grelha/lista com o mesmo sistema. | Pesquisa sem resultados, limpar filtros, mudar vista e filtros móveis. Nenhuma importação nova executada. |
| Campanhas | Cabeçalho e superfícies alinhados; seleção de peças e estados anteriores preservados. | Lista no telemóvel; navegação pelo menu; testes do percurso existente. |
| Artigos, pesquisa, plano, séries, perfis e automação | Moldura e navegação partilhadas, com opções secundárias em menu. | Pesquisa SEO e Automação no navegador; menu e destino ativo testados; suite existente. |
| Newsletter | Cores dos controlos e pesquisa interna revistas, sem alterar templates de publicação. | Editor e diálogo interno observados; geração do cliente e grafo Edge verificados. Pré-visualização do email real indisponível na demonstração local. |
| Projetos | Cabeçalho e filtros uniformes; cartões existentes preservados. | Página e largura no navegador. |
| Rascunhos | Cabeçalho comum e dimensão de conteúdo consistente. | Página observada com o rascunho local existente. |
| Calendário | Tipografia e controlos de atualização coerentes. | Página observada; sem arrastar, alterar ou publicar agendamentos. |
| Custos | Cabeçalho e componentes comuns atualizados. | Build e testes existentes; nenhuma despesa externa criada. |
| Resultados | Barra contextual e apresentação de métricas revistas. | Estado de falha de leitura observado; navegação e movimento reduzido testados. Gráficos com dados reais continuam por validar. |
| Editores isolados e peças gráficas | Recebem os controlos partilhados, preservando a identidade dos documentos. | Testes existentes, incluindo renderização de fixtures de DocumentoGrafico. Não foi redesenhada a arte das peças. |

## Contraste, responsividade e teclado

- Azul principal `hsl(211 96% 43%)`: **5,18:1** com texto branco. O hover é mais escuro.
- Texto secundário `hsl(215 18% 40%)`: **6,12:1** sobre branco.
- Contorno de campo `hsl(214 20% 57%)`: **3,33:1** sobre branco. Hover e foco usam o azul completo; campo inválido conserva a cor semântica de erro.
- Medição de layout no navegador: **390px, 820px e 1280px**, sem transbordo horizontal do documento nos ecrãs verificados. A navegação interna pode deslocar-se horizontalmente dentro do seu próprio contentor.
- O menu móvel fecha após escolher o destino; a biblioteca conserva pesquisa, filtros e grelha/lista; o diálogo de pesquisa cabe no tablet e fecha com Escape.
- O foco regressa ao botão ou campo de origem ao fechar a pesquisa. A navegação dentro dos resultados respeita `prefers-reduced-motion`.
- Isto não constitui uma certificação integral WCAG. Componentes legados de ferramentas densas ainda têm variantes compactas e alguns modais especializados não foram auditados em todos os seus estados.

## Verificação técnica

- **1 261 testes aprovados, 2 testes opcionais ignorados**; 200 ficheiros de testes aprovados e um ficheiro opcional ignorado.
- Sete novos casos de comportamento: opções secundárias de Artigos, destino ativo, secção de Perfil disponível, salto e movimento reduzido, observador e recuperação de foco pelo botão e pelo campo.
- TypeScript aprovado; build de produção aprovado; `git diff --check` aprovado.
- Newsletter regenerada a partir de `migration-reference/code/newsletter/src/`. Grafo com **255 ficheiros alcançáveis** e verificação de tipos Deno aprovados. Não houve alteração de funções de servidor.
- ESLint comparado com a base da branch nos **42 ficheiros TypeScript envolvidos**: **zero erros ou avisos adicionais**. Permanecem 21 erros e 38 avisos anteriores nesses ficheiros, sobretudo código legado; a aplicação não é apresentada como globalmente limpa de lint.
- Mantêm-se avisos de build já existentes sobre bundles grandes e dados Browserslist antigos. Não foram instaladas dependências no projeto nem acrescentadas fontes, bibliotecas de animação ou novos pedidos permanentes ao backend.

## Evidências locais

As capturas pertencem à demonstração local, com os seus dados de exemplo identificados. Não comprovam publicação ou integração Cloud.

- [Início antes](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/inicio-antes.png>) e [Início depois](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/inicio-depois.png>).
- [Documentos no computador](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/documentos-depois.png>) e [no telemóvel](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/documentos-mobile.png>).
- [Curadoria](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/curadoria-depois.png>), [Automação](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/automacao-depois.png>) e [Campanhas no telemóvel](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/campanhas-mobile.png>).
- [Pesquisa transversal no tablet](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/pesquisa-tablet.png>).
- [Newsletter](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/newsletter-depois.png>) e [pesquisa interna clara](</Users/fcarvalho/Documents/ChatGPT/DIGITAL SPRINT/evidencias-hub-2026-10-19/visual-azul/newsletter-pesquisa-depois.png>).

## Limites e próximos pontos de validação

1. **Resultados com dados reais:** a demonstração local não conseguiu ler publicações e perfis. O erro permanece explícito; não foram criados indicadores ou gráficos fictícios. Validar a apresentação com a conta e o backend reais numa futura ronda autorizada.
2. **Email e WordPress:** a pré-visualização real da newsletter depende de `nl-api`, deliberadamente desligada neste modo local. Os controlos foram revistos, mas o HTML final não foi novamente produzido nem enviado nesta ronda.
3. **Modais especializados e variantes menos frequentes:** a base comum foi atualizada, mas não houve verificação manual exaustiva de cada modal, permissão, conta, estado de publicação ou tamanho de todas as áreas legadas.
4. **Dados e desempenho legados:** continuar a tratar a dívida de lint e os bundles grandes separadamente, com medição. Nos cartões de projetos, o nome do responsável pode ainda cair numa identificação técnica quando o perfil não está disponível; requer consolidar os dados de perfil, sem inventar nomes.

## Custos e publicação

**0 créditos Lovable · 0,00 € a 0,30 €/crédito. Nenhum pedido pago DataForSEO, DeepSeek ou de geração de imagem.** As consultas ao site de referência e à documentação oficial foram de leitura. A CLI shadcn foi consultada com cache temporária; o manifesto e os ficheiros de dependências do projeto não foram alterados.

Todo o desenvolvimento fica na branch local. Não houve push, importação, deploy ou publicação no Lovable. A alteração visual deve ser aprovada na pré-visualização antes de uma futura integração autorizada.
