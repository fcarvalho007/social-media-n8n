# Curadoria: notícias recentes primeiro e processamento parado desde 13/11

## O que a base de dados mostra
- A lista já está ordenada da mais recente para a mais antiga (por data de entrada na Curadoria).
- A notícia mais recente da Curadoria é de 13/11/2026, 16:48. Desde então, nenhum item da fila foi processado.
- Há 175 itens à espera na fila, 42 deles dos últimos 7 dias (o mais recente é de hoje, 26/11).
- O trinco da fila está livre. Logo, o «Recolher e processar 20» recolhe, mas não transforma nada em notícia.
- Causa provável (por confirmar): o site publicado ainda usa a versão antiga do processamento, que é cortada por tempo. A correção de 13/11 está só no ramo local.

## Passos
1. Confirmar a causa nos registos do servidor (só leitura) da última tentativa de hoje.
2. Ordenar a lista «Por rever» pela data de publicação da notícia original, das mais recentes para as mais antigas. Se essa data faltar, usar a data de entrada. Aplica-se também a «Aprovadas» e «Rejeitadas».
3. Mostrar a data de publicação da fonte no cartão, para não se confundir com a data de entrada.
4. Pedir a sua autorização para instalar no servidor a correção do processamento por tempo. Sem isto, as notícias novas não aparecem.
5. Depois de instalar, processar um lote de 10 para confirmar que chegam notícias de 26/11. Para isso, é preciso a sua autorização, porque usa a IA, que é paga.

## Detalhes técnicos
- Nova migração que substitui `nl_curadoria_listar`, com `ORDER BY coalesce(publicado_em, created_at) DESC, id`, se `nl_noticias` tiver data de publicação. Se não tiver, a migração passa essa data da fila para a notícia ao processar, em `fila-curadoria.server.ts.txt`, e o código é regenerado com `port-newsletter.py`.
- Atualizar `src/test/curadoria-sql.test.ts` para garantir a ordem.
- Correr `verificar-grafo-edge.py`.
- A instalação no servidor e o lote de teste só avançam com autorização explícita, porque violam a regra de trabalhar só no ramo local.
