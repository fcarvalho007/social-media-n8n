# Melhorias do compositor: ordem, imagens e redesenho

## Objetivo
Tornar as ações principais do compositor diretas e previsíveis: reorganizar slides por arrasto, substituir a imagem selecionada e escolher sempre entre cinco composições realmente diferentes.

## Alterações

### 1. Reordenar slides por drag and drop
- Tornar as miniaturas dos slides arrastáveis, tanto na faixa horizontal como na vista compacta.
- Mostrar pega de arrasto, estado visual durante o movimento e posição de destino.
- Ao largar, mover o slide completo — conteúdo, composição e ajustes — mantendo a mesma ordem nas variantes A e B e na narrativa do documento.
- Manter as setas atuais como alternativa acessível e permitir desfazer/refazer a alteração.
- Evitar que um clique para selecionar um slide seja confundido com um arrasto.

### 2. Substituir uma imagem a partir do próprio slide
- Ao clicar numa imagem no canvas, selecioná-la e mostrar uma ação clara «Substituir imagem» na barra contextual e no painel da camada.
- A ação abre as fontes já existentes: Biblioteca, Fotos (Pexels + Unsplash), Carregar e IA.
- A nova imagem substitui apenas o asset da camada selecionada; preserva posição, tamanho, recorte, foco, modo, overlay, efeitos, estilo, variante e paleta.
- Na opção IA, manter a descrição editável e a confirmação explícita do custo antes do pedido.
- Não adicionar uma segunda imagem quando a intenção é substituir a selecionada.

### 3. Redesenhar com cinco propostas garantidas
- Gerar e mostrar imediatamente cinco propostas ao abrir «Redesenhar», sem o ecrã introdutório e sem o botão redundante «Gerar 5 propostas».
- Produzir sempre cinco composições visualmente distintas e válidas: três coerentes com a direção atual e duas assinaladas como «Disruptiva».
- As duas propostas disruptivas podem alterar de forma mais marcada hierarquia, grelha, escala, alinhamento e relação entre texto e imagem, mas nunca o conteúdo, o papel do slide ou a direção visual global.
- Se uma receita não couber ou ficar demasiado semelhante a outra, experimentar automaticamente outra composição segura até completar as cinco; nunca apresentar apenas três por causa da filtragem de duplicados.
- Continuar sem gerar imagens nem fazer pedidos pagos nesta janela. Depois de aplicar uma composição, a imagem é escolhida no painel Imagem.

### 4. Corrigir e simplificar a janela «Redesenhar»
- Alterar o título para «Escolher nova composição».
- Usar a descrição: «Escolhe uma de cinco formas de apresentar este slide. O conteúdo mantém-se e não é feito qualquer pedido pago.»
- Mostrar pré-visualizações maiores e uma ficha curta por proposta: tipo de composição, posição do texto, uso de imagem e selo «Disruptiva» nas duas propostas correspondentes.
- Manter «Ver original», «Aplicar esta versão», «Gerar outras 5» e «Cancelar» apenas quando forem úteis no respetivo estado.
- Remover da abertura os textos longos sobre opções avançadas, imagens e ausência de custo; a informação essencial fica junto das ações.

## Verificação
- Testar que arrastar um slide altera a ordem da narrativa e das duas variantes sem perder conteúdo ou ajustes, e que desfazer/refazer funciona.
- Testar substituição por cada fonte e confirmar que só muda a imagem selecionada.
- Testar slides com e sem imagem e com diferentes papéis, confirmando sempre cinco propostas únicas, das quais duas disruptivas.
- Confirmar que nenhuma proposta altera textos, números ou papel e que abrir «Redesenhar» não faz pedidos pagos.
- Validar no ecrã em desktop e a 375 px, incluindo arrasto por toque, seleção de imagem e legibilidade da janela.
- Executar os testes do compositor e a verificação completa da aplicação.

## Detalhes técnicos
- Reutilizar o sistema de ordenação por arrasto já instalado no projeto, sem nova dependência.
- Fazer a reordenação pelo identificador lógico do slide para manter `conteudo.slides` e as páginas de A/B sincronizados.
- Acrescentar uma operação específica de substituição de asset à história do editor, em vez de reutilizar a operação que adiciona uma nova camada.
- Reforçar o motor determinístico de redesenho com um conjunto maior de receitas e fallback validado por assinatura geométrica e encaixe de texto.
