# Curadoria: deixar claro que as notícias aprovadas já estão na newsletter

## O que verifiquei
As notícias aprovadas hoje (24) já estão na edição #320, que tem 43 notícias e nenhuma escondida. O problema é de clareza: a faixa atual mostra só «aprovadas esta semana», sem dizer onde estão.

## O que vai ver
A faixa no topo da Curadoria passa a ter duas partes:

```text
[ 43 na próxima newsletter · Edição #320 ]  [ Abrir edição → ]
  24 aprovadas hoje · 30 esta semana · IA 20 · Media 10 · Meta 7 ...
```

- **Número principal:** quantas notícias estão na próxima edição, com o número da edição. É a resposta a «quantas tenho para a newsletter».
- **Linha secundária:** aprovadas hoje e esta semana (hora de Lisboa) e repartição por categoria da edição.
- **«Abrir edição»** leva à edição na Newsletter; carregar no resto da faixa abre as «Aprovadas».
- Depois de aprovar, a mensagem passa a dizer «Aprovada e adicionada à edição #320 (44 notícias)», para confirmar logo onde ficou.
- Sem edição em rascunho, aparece «Sem edição aberta: as aprovadas ficam guardadas» em vez do número.
- Em telemóvel (375px) as duas partes ficam empilhadas.

## Detalhes técnicos
- Sem alterações à base de dados. A edição atual e as suas notícias vêm de `getEdicaoAtual` + `listarAprovadasDaEdicao`, que já existem na camada de dados da newsletter; «hoje» é calculado no cliente a partir da função semanal já ativa (acrescentar `hoje` exigiria nova migração, por isso conta-se a partir do início do dia de Lisboa sobre a lista da edição, `created_at` das cópias).
- `src/features/curadoria/ResumoSemana.tsx` reescrito; função pura `resumirEdicao(noticias, agora)` com teste em `src/test/curadoria-resumo-semana.test.ts` (conta hoje em Lisboa e por categoria).
- `CuradoriaNoticias.tsx`: invalidar também a consulta da edição após decidir; mensagem de sucesso com o número da edição.
- Validar com Playwright a 1280px e 375px.
