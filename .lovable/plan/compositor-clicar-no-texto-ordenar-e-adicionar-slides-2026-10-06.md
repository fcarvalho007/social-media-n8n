# Compositor: clicar no texto, ordenar e adicionar slides

## 1. Clicar no texto sem efeito (bug a confirmar primeiro)
A causa ainda não está confirmada. O compositor só aceita cliques nos elementos quando não há uma direção visual por aplicar e quando não está em pré-visualização. Se o slide abrir com uma direção «(por aplicar)», todos os cliques são ignorados sem qualquer aviso. Esta é a suspeita principal.

Passos:
- Reproduzir no ecrã com o carrossel aberto: um clique, um duplo clique e um clique num texto acabado de inserir. Registar o que bloqueia.
- Corrigir conforme o que se encontrar:
  - Se a causa for a direção por aplicar: mostrar uma faixa clara «Direção visual por aplicar — Aplicar / Cancelar para editar». Um clique no slide nesse estado mostra a mesma indicação, em vez de não fazer nada.
  - Se a causa for o clique propriamente dito: com um clique, o texto fica selecionado e aparece a barra do texto. Um segundo clique no texto já selecionado (ou um duplo clique, ou Enter) abre a edição no próprio slide.
- A caixa de edição fica alinhada com o texto visível, não com a moldura maior.

## 2. Ordenar slides
- O arrasto pelas miniaturas já existe. A pega passa a ficar sempre visível, e a miniatura toda passa a poder ser arrastada (basta segurar e mover; um clique simples continua a abrir o slide).
- Durante o arrasto aparece uma linha de destino; ao largar, a mensagem «Slide movido para a posição N» inclui «Desfazer».

## 3. Adicionar slides
- No fim das miniaturas, um botão «+ Novo slide» com três opções:
  - **Em branco**: só com o fundo da direção visual;
  - **Texto**: título e texto, já compostos com o estilo atual;
  - **Duplicar atual**.
- O novo slide entra logo a seguir ao atual, fica selecionado e é criado nas variantes A e B e na narrativa, mantendo a ordem igual nas três.
- Máximo de 20 slides, como hoje. Nenhum pedido pago. Pode ser desfeito.

## Verificação
- Antes e depois da correção, no ecrã: clicar e editar um texto num slide existente e num texto acabado de inserir.
- Arrastar slides com o rato e com toque (375 px).
- Adicionar cada tipo de slide; desfazer e refazer.
- Confirmar que a exportação mostra a mesma ordem.
- Correr os testes do compositor e a verificação do código.

## Detalhes técnicos
- `EditorGrafico.tsx`: hoje `interativo={!preview && !rascunho}` e `edicaoInline` exige `!rascunho`. Acrescentar a faixa de estado, o fluxo de clique → selecionado → edição, o botão «+ Novo slide» e a mensagem com «Desfazer».
- `PaginaCanvas.tsx`: tratar o clique num texto já selecionado como pedido de edição; posicionar a área de edição pelos `limitesConteudo`.
- `estado.ts`: nova ação `inserirPagina { indice, modelo: "branco" | "texto" }`, que cria o slide lógico em `conteudo.slides` e uma página em cada variante, compostas pelo sistema visual atual.
- `MiniaturaOrdenavel.tsx`: ativar o arrasto em toda a miniatura (distância de 8 px; atraso no toque) e mostrar o indicador de destino.
- Testes novos para `inserirPagina` (sincronia entre A, B e narrativa; limite de 20; desfazer).
