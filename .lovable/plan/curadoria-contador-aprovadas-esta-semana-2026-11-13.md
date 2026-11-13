# Curadoria: contador «Aprovadas esta semana»

## O que vai ver
No topo da Curadoria, uma faixa compacta com:
- **Aprovadas esta semana: N** (de segunda-feira até agora, hora de Lisboa).
- Por baixo, em pequeno: **ainda por enviar na newsletter** e **já enviadas**, para saber quantas sobram para a próxima edição.
- Repartição por categoria (ex.: «IA 5 · Marketing 3 · Redes 2»).
- Clicar na faixa abre o separador «Aprovadas» filtrado aos últimos 7 dias.

Atualiza sozinha quando aprova ou rejeita uma notícia. Não gasta IA nem altera notícias.

## Detalhes técnicos
- A data usada é a de decisão (`editorial_revisto_em`), já gravada quando se aprova; não a data da notícia.
- Nova função de leitura só para equipa `nl_curadoria_resumo_semana()` em `drizzle/migrations/0073_curadoria_resumo_semana.sql`: semana a começar segunda 00:00 Europe/Lisbon; devolve `total`, `por_enviar`, `enviadas`, `por_categoria`. `SECURITY DEFINER`, verifica `nl_is_staff()`, `GRANT EXECUTE` só a `authenticated`.
- `src/services/curadoria.ts`: `resumoSemanaCuradoria()`.
- Novo `src/features/curadoria/ResumoSemana.tsx`, colocado em `CuradoriaNoticias.tsx` (escondido em modo «escolher para edição»); invalida a consulta após `decidir`.
- Teste `src/test/curadoria-resumo-semana.test.ts`: início da semana em Lisboa (incluindo mudança de hora) e soma por_enviar + enviadas = total.

## Atenção
A migração precisa de ser aplicada na base de dados partilhada para o número aparecer; até lá, a faixa fica escondida sem erro. Fica no ramo local até pedir integração.
