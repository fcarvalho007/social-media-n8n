# Tradução desta notícia: fechar o problema de vez

## O que aconteceu agora (verificado)
- No registo da base de dados, às 13:53:50 a nova regra funcionou como devia: identificou «tradução recusada antes, repetição possível».
- A mensagem que viste («Não foi possível reservar o pedido de tradução») vem da versão anterior do servidor. A nova estava a ser instalada nesse minuto e o ecrã ainda não tinha sido recarregado. Por isso não apareceu o botão «Repetir uma vez».
- Há outro risco real: esta fonte tem 40 parágrafos com muitos números (percentagens, datas, «oct2026», «GLP-1», «$23B»). Basta um parágrafo em que a IA escreva um número de outra forma para a tradução inteira ser recusada outra vez. Com o máximo de 2 tentativas, isso volta a bloquear tudo.

## O que vou fazer
1. **Reproduzir no ecrã real**, com a tua sessão, esta mesma notícia. Clicar em «Traduzir para PT-PT» e confirmar que aparece «Repetir uma vez (1 pedido)», sem o aviso vermelho. Este passo não tem custo, porque o pedido é recusado antes de chegar à IA.
2. **Tradução parcial em vez de recusa total.** Quando um parágrafo não passa na verificação de números ou endereços, fica no original em inglês e é assinalado; os restantes ficam em PT-PT.
   - A tradução só é recusada por inteiro se faltarem parágrafos ou se mais de um terço deles falhar.
   - O ecrã diz, por exemplo, «38 de 40 parágrafos em PT-PT; §1 e §12 ficaram no original (números não coincidiam)».
   - Os factos e números nunca ficam alterados.
3. **Reaproveitar sem custo.** Uma tradução já recusada, mas guardada, passa outra vez pela verificação parcial antes de qualquer pedido novo.
4. **Nunca mais o aviso vermelho nesta ação.** Qualquer resposta inesperada do servidor no passo da tradução vira uma mensagem dentro do ecrã, com «Avançar com o original». O código técnico fica só no registo do servidor.
5. **Mensagens certas.** O título do aviso passa a corresponder à causa: verificação, limite diário, já repetida ou IA desligada.
6. **Validação de ponta a ponta com 1 pedido pago:** carregar em «Repetir uma vez» nesta notícia e confirmar que a versão PT-PT fica pronta e é usada na Narrativa.
7. **Verificação visual** das novas escolhas (tom, público e intenção, até 2), em computador e a 375 px.

## Testes
- Tradução parcial:
  - um parágrafo com um número diferente fica no original;
  - mais de um terço a falhar recusa tudo;
  - um número alterado nunca entra.
- Nova verificação gratuita de uma tradução guardada.
- Uma resposta inesperada do servidor não abre o aviso vermelho.

## Decisão necessária
Ao aprovar, autorizas **1 pedido pago à DeepSeek** (a repetição da tradução desta notícia) para a validação do ponto 6. Também autorizas a instalação do servidor do motor. Sem este pedido, faço tudo o resto e deixo a repetição para ti.

## Detalhes técnicos
- `traducao.ts`:
  - `validarTraducao` devolve `{ ok, paragrafos, mantidos: number[] }`, ficando com o original nos parágrafos com números ou URLs diferentes;
  - recusa se o número de parágrafos for diferente, se algum parágrafo vier vazio ou se mais de um terço for mantido no original.
- `traducao.server.ts`:
  - grava `mantidos` e volta a validar `resultado_recusado`;
  - qualquer erro de reserva fora da tabela de códigos passa a `codigo: "erro_interno"` com `console.error` do SQLSTATE.
- `mc-motor`: só os erros de autenticação e de pedido inválido continuam sem resposta 200.
- `PainelIdioma.tsx`: título do aviso por `codigo`; nota com os parágrafos mantidos no original; a comparação mostra-os.
- Instalar `mc-motor` e correr `verificar-grafo-edge.py`.
- Teste com Playwright e a sessão injetada.
