# Newsletter: mostrar as notícias aprovadas que estão «por organizar»

## O que encontrei
As 43 notícias estão na edição #320, mas nenhuma tem lugar escolhido no formato Revista (destaque, «Novidades da semana» ou só no site). Ficam numa lista «Por organizar» dentro do bloco «A Atualidade». O resumo do bloco fechado só conta destaques, Novidades e só no site, por isso mostra «0 · 0 · 0» e parece que não há nada.

## O que muda
1. **Resumo do bloco «A Atualidade»:** quando há notícias por organizar, passa a dizer, por exemplo, «43 aprovadas por organizar · 0 de 2–3 destaques · 0 (mínimo 3) em Novidades». O selo passa de «Faltam 5» para «43 por organizar».
2. **Aviso no topo do editor:** junto a «Faltam 3 notícias em Novidades da semana», aparece «43 notícias aprovadas à espera de lugar», com «Organizar →». O botão abre o bloco e leva à lista.
3. **Bloco aberto sozinho:** se há notícias por organizar e ainda não há destaques nem Novidades, o bloco abre na primeira visita.
4. **Faixa da Curadoria:** passa a dizer «43 na edição #320 · 43 por organizar», para não parecer que já estão colocadas.

Não mexe em notícias nem na base de dados. Não usa IA. Fica no ramo local.

## Detalhes técnicos
- O editor da newsletter é código gerado: editar `migration-reference/code/newsletter/src/features/newsletter/revista/EditorRevista.tsx.txt` (resumo de `BlocoEdicao id="atualidade"`, `folds` inicial e aviso no topo com âncora para a lista «Por organizar»), regenerar com `python3 scripts/port-newsletter.py` e correr `scripts/verificar-grafo-edge.py`.
- Função pura `resumoAtualidade({destaques, radar, soSite, porOrganizar})` com teste (selo e linha com 43 por organizar; «Pronto» inalterado quando os mínimos estão cumpridos).
- Curadoria: `resumirEdicao` recebe também o número de itens já colocados na revista (`nl_revista_itens` da edição, leitura que já existe na camada de dados da newsletter) e calcula `porOrganizar`. Teste atualizado.
- Validar com Playwright em /newsletter e /curadoria (1280px e 375px).
