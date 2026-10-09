# Corrigir o fluxo Curar → Compor da newsletter

## Resultado esperado

- Em «Curar», tanto **Aprovar** como **Retirar desta edição** fazem o cartão desaparecer imediatamente, mas com resultados diferentes:
  - **Aprovar** associa a notícia à edição e coloca-a numa fila visível para organizar em «Compor».
  - **Retirar desta edição** apenas a esconde desta edição; não a aprova, rejeita nem apaga da curadoria comum.
- Os botões «Aprovar», «Editar» e «Rejeitar» terão a mesma largura e altura.

## Alteração

1. Corrigir a atualização após «Aprovar» para retirar o cartão da fila sem esperar por uma nova leitura e atualizar, em conjunto, os dados de «Curar» e «Compor».
2. Em «Compor» → «A Atualidade», acrescentar uma fila clara **Por organizar** com todas as notícias aprovadas para a edição que ainda não foram classificadas.
3. Em cada notícia por organizar, permitir escolher **Destaque**, **Radar** ou **Só site**. A escolha remove-a da fila; «Só site» mantém-na na edição web sem a colocar no email.
4. Manter visíveis os grupos existentes de Destaques, Radar e Só site e preservar os limites atuais, sem classificação automática.
5. Uniformizar as três ações dos cartões em «Curar», incluindo em ecrãs estreitos.

## Diagnóstico confirmado

As duas notícias aprovadas hoje estão corretamente associadas à edição atual e guardadas como aprovadas. Não aparecem como conteúdo organizado porque ainda não têm uma linha em Destaques ou Radar; o ecrã atual conta-as como «Só site», mas não apresenta uma fila explícita que permita organizá-las. Não há erro recente no navegador relacionado com esta ação.

## Validação

- Aprovar uma notícia e confirmar que desaparece de «Curar» e surge em «Por organizar».
- Retirar outra notícia e confirmar que desaparece apenas desta edição e não surge em «Compor».
- Classificar uma notícia como Destaque, Radar e Só site e confirmar que a fila e os contadores mudam imediatamente.
- Confirmar que os três botões têm dimensões iguais em computador e a 375 px.
- Acrescentar testes focados para estes dois destinos diferentes e executar os testes da newsletter afetados.

## Âmbito técnico

Alterações previstas no estado partilhado dos pendentes, no editor Revista e nos testes correspondentes. Não exige migração nem altera regras de acesso, dados já aprovados, envio ou publicação.
