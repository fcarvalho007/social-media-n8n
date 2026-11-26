# Corrigir «Ver aprovadas» na Curadoria

## Causa (confirmada)
O botão funciona, mas força o período «Últimos 7 dias». As 43 notícias da edição #320 foram aprovadas há mais de 7 dias (a faixa mostra «0 aprovadas esta semana»), por isso a lista fica vazia: «Não há notícias neste filtro». Parece que nada acontece.

## O que muda
- «Ver aprovadas» passa a abrir as aprovadas com o período «Todos», sem pesquisa nem tema, na página 1.
- A página desce até à lista, para se ver logo o resultado.
- As que estão na próxima edição continuam marcadas com «Na edição #320» e «Retirar da newsletter».

## Detalhes técnicos
- `src/features/curadoria/CuradoriaNoticias.tsx`, linha do `cabecalho?.(...)`: `mudarFiltros({ estado: "aprovada", dias: "todos", query: "", categoria: "todas", pagina: 0 })` e `scrollIntoView` na secção da lista (ref).
- Atualizar/adicionar teste em `src/test/curadoria-ui.test.tsx`: clicar «Ver aprovadas» define período «todos» e estado «aprovada».
- Verificar com Playwright que a lista mostra as aprovadas da #320.
