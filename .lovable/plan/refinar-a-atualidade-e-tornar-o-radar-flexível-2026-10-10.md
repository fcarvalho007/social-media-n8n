# Refinar a Atualidade e tornar o Radar flexível

## Resultado esperado

- **Destaques** mantém entre 2 e 3 notícias.
- **Novidades da semana** mantém o mínimo editorial atual, mas deixa de ter máximo: pode ter 2, 5 ou 30 notícias durante a composição e cresce conforme necessário.
- Ao colocar uma segunda notícia da mesma categoria em **Novidades da semana**, surge um aviso visível e não bloqueante no lado esquerdo. A notícia entra na mesma.
- Cada notícia de **Novidades da semana** terá uma ação simples para a retirar dessa secção; continua na Atualidade e passa para **Só site**.
- Na Atualidade, todas as notícias continuam visíveis após serem classificadas. O cartão terá um fundo claramente diferente para **Destaque**, **Novidades da semana**, **Só site** e **Por organizar**, além do respetivo texto/ícone.
- Os títulos passam a **Destaques** e **Novidades da semana** em todas as superfícies da Revista.
- A passagem para todas as notícias ganha a direção escolhida: **faixa azul forte**, número de notícias em grande e botão branco, sem amarelo.

## Alterações

1. **Radar sem limite máximo**
   - Retirar o bloqueio de cinco notícias na seleção, movimentação, contadores, resumo e validação de envio.
   - Manter o mínimo editorial como aviso de composição, sem impedir que a lista tenha qualquer quantidade acima desse mínimo.
   - Fazer a área de ordem crescer naturalmente, sem ranhuras vazias nem contador do tipo `5/5`.

2. **Aviso de categoria repetida**
   - Contar as categorias das notícias em Novidades da semana.
   - Mostrar um aviso persistente e não bloqueante quando uma categoria tiver duas ou mais notícias, identificando a categoria e a quantidade.
   - Atualizar o aviso imediatamente ao classificar, retirar ou mudar a categoria de uma notícia.

3. **Retirar de Novidades da semana**
   - Acrescentar uma ação direta em cada entrada da lista de ordem.
   - Ao usar a ação, remover apenas o papel de Novidades da semana e marcar a notícia como **Só site**; não a apaga da edição nem da curadoria.
   - Atualizar cartões, contadores, ordem e pré-visualização sem exigir nova leitura manual.

4. **Atualidade mais legível**
   - Reforçar os fundos dos cartões com cores semanticamente distintas por estado, mantendo etiqueta e ícone para não depender apenas da cor.
   - Preservar a notícia na sua categoria quando passa a Destaque ou Novidades da semana.
   - Manter a ação existente de remover completamente da newsletter separada da nova ação de retirar apenas de Novidades da semana.

5. **Rótulos consistentes**
   - Alterar a fonte única de rótulos para `Destaques` e `Novidades da semana`.
   - Propagar os nomes pelo editor, pré-visualização, email, página pública, navegação e mensagens de validação.

6. **Faixa azul para todas as notícias**
   - Redesenhar o fecho de Novidades da semana como uma faixa azul de largura total.
   - Dar protagonismo ao total de notícias e usar um botão branco contrastante para abrir a edição completa.
   - Aplicar a mesma hierarquia no email/pré-visualização e na versão web compatível, respeitando os tokens visuais existentes.

## Validação

- Classificar duas notícias da mesma categoria e confirmar que ambas entram e o aviso aparece.
- Retirar uma entrada de Novidades da semana e confirmar que continua na Atualidade como Só site.
- Confirmar listas com 2, 5 e 30 entradas, sem bloqueio superior e com ordem editável.
- Confirmar que Destaques continua limitado a 3.
- Confirmar fundos distintos e legíveis em computador e a 375 px.
- Confirmar os novos títulos e a faixa azul no editor, pré-visualização, email e página pública.
- Atualizar os testes das regras editoriais e acrescentar testes para categorias repetidas, transição para Só site e Radar sem máximo.
- Regenerar a newsletter a partir da fonte vendorizada, verificar o grafo das funções e executar os testes afetados.

## Âmbito técnico

As alterações serão feitas apenas na fonte vendorizada da newsletter e depois regeneradas. Não exigem migração, não alteram permissões, autenticação, segredos, custos, envio automático nem apagam notícias.
