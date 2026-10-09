# «Correr agora»: confirmar que funciona e mostrar o resultado certo

## O que verifiquei
- O clique das 15:27 foi feito antes de a correção ficar ativa no servidor (15:29). A versão antiga tentava chamar um endereço que não existe nesta app, por isso dava erro.
- Repeti agora «Correr agora» com a sua sessão, duas vezes: correu sem erro em 5–8 segundos, leu 13 fontes e 81 candidatos.
- Entraram **72 notícias novas na fila**, a mais recente de hoje às 15:31.
- Mas a resposta diz «0 inseridas», porque em modo manual as notícias vão para a fila e não contam como «inseridas». Isso é enganador.

## O que vou fazer
1. A mensagem de «Correr agora» passa a dizer quantas notícias entraram na fila, por exemplo «72 novas na fila de entrada», em vez de «0 inseridas».
2. O mesmo número aparece no progresso de «Recolher e processar»: «Recolhidas 72 novidades · a interpretar 12 de 30».
3. Um teste para a contagem: as novas na fila contam como recolhidas.

## Detalhes técnicos
- `chamarHookRss` (fonte vendorizada `curadoria.functions.ts.txt`, via SERVER_FIXES no port): contar `nl_curadoria_fila` antes/depois da corrida e devolver `na_fila`; ajustar o texto em Fontes e em FilaEntrada; regenerar, verificar o grafo edge e publicar nl-api.
