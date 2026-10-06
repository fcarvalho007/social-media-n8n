# Seleção precisa no Compositor + polimento visual

## Problema
Ao clicar num elemento do canvas, a caixa de seleção (Transformer do Konva) é desenhada à volta da **moldura declarada da camada** (`c.w × c.h`), não à volta do conteúdo visível. Em camadas de texto, a moldura costuma ser maior que o texto composto, daí a caixa parecer "sempre maior" que o elemento.

## Solução

### 1. Caixa de seleção ajustada ao conteúdo
- Nova função `limitesConteudo(c, texto, medidor)` (em `desenho.ts` ou `nucleo.ts`) que devolve a caixa real do conteúdo:
  - **Texto**: usa `layoutTexto` (já existente) para obter a largura máxima das linhas e a altura real composta; respeita alinhamento (esq/centro/dir) para posicionar a caixa.
  - **Forma/ícone/imagem**: a caixa é a própria moldura (já ajustada).
- Em `PaginaCanvas.tsx`, o conteúdo passa a ser renderizado dentro de um sub-`Group` posicionado nesses limites, e o `Transformer` liga-se a esse sub-Group — a caixa abraça o conteúdo.
- Ao redimensionar pela caixa ajustada, o `onTransformEnd` converte a escala de volta para `x/y/w/h` da camada, mantendo o texto ancorado no sítio certo (o texto recentra-se dentro da moldura conforme o alinhamento, sem saltos).
- Arrastar continua a mover a camada inteira; o encaixe (guias) passa a usar os limites do conteúdo para alinhar pelo que se vê, não pela moldura invisível.

### 2. Polimento visual da seleção (elegância)
- Moldura mais fina (1,5px) com a cor de acento do sistema, cantos dos manipuladores arredondados e preenchimento branco com contorno de acento (estilo editor profissional, em vez de quadrados sólidos).
- Manipuladores ligeiramente menores no desktop (10px); mantidos grandes no toque.
- Realce suave ao passar o rato sobre uma camada (contorno tracejado subtil ou cursor `move`), para se perceber o que é clicável antes de selecionar.
- Guias de encaixe mantidas, com traço mais leve.

### 3. Verificação
- Teste no ecrã via browser: abrir o compositor, clicar num texto e confirmar que a caixa acompanha o texto; redimensionar e arrastar sem saltos; confirmar que a exportação PNG não muda (a seleção é só UI, nunca entra no documento).
- `tsgo` + suite de testes (337) antes de fechar.

## Fora de âmbito
- Sem alterações ao documento, ao renderer de exportação, a estilos/efeitos ou a IA.
- Sem custos, sem publicação, sem tocar em auth/segredos.

## Ficheiros
- `src/features/editor-grafico/PaginaCanvas.tsx` — sub-Group de conteúdo, Transformer ajustado, estilos da seleção.
- `src/features/editor-grafico/desenho.ts` (ou `nucleo.ts`) — `limitesConteudo`.
- `src/features/editor-grafico/operacoes.ts` — encaixe pelos limites do conteúdo (se necessário).
