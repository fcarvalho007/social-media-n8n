# Campanhas: percurso, peças escolhidas e ideias por campo

Ronda local de 19 de outubro de 2026. Branch `codex/hub-campanhas-percurso-ia-local-2026-10-19`.

## Problema e comportamento final

O formulário apresentava uma falha geral depois de avançar com um contributo demasiado curto. O plano obrigava visualmente às cinco peças e os botões «Trabalhar» não explicavam a diferença entre preparar uma orientação, produzir conteúdo e rever a versão final.

- A direção apresenta o mínimo de caracteres junto ao campo, identifica os campos incompletos, conserva o texto e foca o primeiro campo a resolver. «Não sei» não avança como se fosse uma direção editorial válida.
- Cada campo editorial tem «Ideias com IA». A ajuda permite instruções adicionais, orçamento e três alternativas. Escolher uma proposta é uma ação explícita; não altera automaticamente a fonte, o artigo ou outros campos.
- O plano permite escolher Artigo, Newsletter, Story, Carrossel e Continuidade. É obrigatório manter pelo menos uma peça. A navegação, a contagem e o progresso só incluem as escolhidas.
- Retirar uma peça preserva texto, composição e revisão. Reativá-la recupera o trabalho. As campanhas antigas, sem seleção explícita, mantêm as cinco peças.
- A vista geral apresenta tarefas concretas e estados reais. Verificar a descoberta é uma tarefa própria, com excerto, origem, limites e confirmação registada. A confirmação não escreve o artigo nem aprova as suas fontes finais.
- A ação do artigo distingue orientações iniciais de texto final. Cria um único rascunho gratuito e abre o passo efetivamente pendente: palavra-chave, fontes, estrutura, redação ou revisão. A aprovação é lida da versão do artigo, não inferida da existência da ligação.
- As peças visuais mantêm o compositor existente. Texto longo e excesso de slides são identificados antes da preparação inicial, sem truncagem. O fecho de subscrição e a ausência de retrato mantêm-se.
- A seleção e as peças usam controlo de versão. Alterações noutro separador conservam o formulário local e exigem reabrir a versão guardada antes de substituir.

## DeepSeek, orçamento e recuperação

Usa o cliente DeepSeek direto já existente; não utiliza o Lovable AI Gateway nem instala dependências. A estimativa usa a tabela de preços existente no Hub, entrada conservadora sem cache e até 2 200 tokens de saída. A interface mostra USD, EUR indicativo, data do câmbio e os bloqueios antes de autorizar.

Novas operações: `campanha-ideias-orcamento`, `campanha-ideias-executar`, `campanha-ideias-recuperar` e `campanha-formatos`. O motor regista a operação `campanha_ideias`, campo, peça, custo recebido, tokens e reserva no histórico de custos; o CSV inclui estes dados.

A reserva é persistida antes da chamada. O mesmo orçamento executa um único pedido. Falhas de formato conservam o custo e o campo original. Custo desconhecido mantém a reserva e bloqueia nova geração para o mesmo campo. O navegador pode recuperar o mesmo pedido, sem o executar novamente. Um orçamento confirmado pelo servidor como não executado pode ser descartado sem custo.

As ideias respeitam voz, público e oferta do site. Instruções dentro das fontes são tratadas como material não fiável. O resultado é validado como três alternativas distintas, com limites do campo e sem HTML. Alterações entretanto escritas bloqueiam a aplicação de sugestões sobre uma versão diferente.

O adaptador Cloud preserva as permissões de escrita, consulta a recuperação pelo utilizador e projeto e relê as fontes de campanhas novas. A execução verifica a pausa dos serviços externos antes da reserva. Os dois runtimes Edge foram regenerados, sem instalação ou publicação.

## Verificação

- Suite completa: **1 254 testes aprovados, 2 testes opcionais ignorados**, 198 ficheiros aprovados e um ficheiro opcional ignorado.
- Inclui 27 novos testes: seleção, compatibilidade, preservação, versões concorrentes, orçamento, consentimento, reserva, idempotência, custo desconhecido, recuperação, formato, aplicação explícita, isolamento do adaptador Cloud e limites da composição.
- TypeScript da interface e do backend aprovados; ESLint dos ficheiros envolvidos sem erros ou avisos; `git diff --check` aprovado.
- Build de produção aprovado. Mantêm-se os avisos existentes sobre chunks grandes, Browserslist e classes de duração ambíguas; não foi realizado um saneamento global de lint nesta ronda.
- `check:hub-cloud` aprovado em ambiente de teste: acessos anónimos 401, origem estranha 403, leituras autenticadas 200 e zero pedidos externos reais.
- Teste no navegador com uma campanha claramente identificada como **TESTE LOCAL**, apenas com Artigo, Newsletter e Story: criação, fonte interna confirmada, rascunho de artigo ligado, texto do Story editado e guardado, composição criada, fundo editado e guardado no compositor, reabertura e persistência após retirar e reativar o Story.
- Larguras de 1 280 e 390 px revistas. Na largura móvel, o documento manteve 390 px, sem transbordo horizontal. A substituição temporária do viewport foi reposta. Sem erros de consola observados na verificação final.

Evidências locais: `../evidencias-hub-2026-10-19/` no diretório pai do checkout. A campanha de validação local é `768902f9-2237-4131-a8f4-733f0d338bfa`; a campanha existente `dd583ff9-888b-425d-9ac9-d81ba38ddf9a` foi apenas observada e ficou aberta para revisão.

## Custos e pendências de integração

**Créditos Lovable: 0. Custo Lovable desta ronda: 0,00 €. Pedidos pagos reais: 0.** A consulta de orçamento no navegador foi gratuita; a pré-visualização indicou falta de `DEEPSEEK_API_KEY` e serviços pagos pausados. O contrato de geração e a contabilidade foram testados com respostas simuladas. Falta comprovar uma geração real quando existir chave no servidor e orçamento autorizado.

Nada foi enviado para o GitHub remoto, importado, instalado ou publicado no Lovable. Uma futura integração precisa de incluir os dois runtimes Edge, validar a ligação da interface Cloud e repetir os percursos com conta/projeto reais antes de publicar, quando o proprietário o pedir.

Limitação anterior preservada: uma descoberta sem URL HTTPS mantém a fonte completa na campanha, mas prepara o artigo sem referências externas inventadas. A passagem automática de páginas de um PDF privado para referências verificadas do artigo ainda precisa de um adaptador próprio do acervo; confirmar a descoberta não elimina esse controlo. A interface explica a necessidade de acrescentar referências antes da redação paga.
