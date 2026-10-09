# Notícias aprovadas na edição e podcast actualizado

## O que encontrei
- **Aprovação:** ao aprovar em Curar, a notícia fica só marcada como «aprovada» (vai para a página global), mas **não entra na edição em curso**. Hoje há 26 notícias aprovadas fora de qualquer edição; só 6 entraram, e por acção manual em Compor.
- Há **duas edições em rascunho** (n.º 317 e n.º 319). Vou usar a mais recente (319) como «nova edição».
- **Podcast:** o feed está a ser lido e os episódios e416 e e417 já estão guardados. O problema é que o feed traz datas erradas (e416 = 07/09, e417 = 08/09), por isso a lista ordenada por data continua a mostrar o e415 (02/10) no topo.

## O que vou fazer
1. **Aprovar = entrar na edição.** Ao aprovar em Curar, a notícia é logo adicionada à edição em rascunho mais recente, com destino «notícia» por omissão. Em Compor mantém-se tudo como está: definir radar / destaque / notícia, reordenar e retirar (retirar só a tira desta edição; continua aprovada na página global).
2. Se não houver edição em rascunho, a aprovação continua a funcionar e fica só na página global (sem erro).
3. **Recuperar as 26 já aprovadas** de hoje para a edição 319 (aditivo, nada apagado; as já presentes não duplicam).
4. **Podcast:** ordenar os episódios pelo número do episódio (eNNN) e, sem número, pela data de entrada. Assim o e417 aparece primeiro. Sem IA, sem recolha automática.
5. Testes: aprovar adiciona à edição mais recente sem duplicar; retirar não desaprova; ordenação do podcast põe e417 antes de e415.

## Detalhes técnicos
- Migração: `nl_curadoria_decidir` passa a chamar `nl_curadoria_para_edicao` para o rascunho com maior `numero` quando `_estado='aprovada'` (ignora silenciosamente se não houver rascunho); backfill idempotente das aprovadas de 09/10 sem cópia na edição 319.
- Ordenação do podcast na fonte vendorizada (`migration-reference/...`), regenerada com `scripts/port-newsletter.py` e verificada com `verificar-grafo-edge.py`.

## A confirmar
- A edição 317 também está em rascunho — deve ser fechada/ignorada? Assumo que a 319 é a actual.
