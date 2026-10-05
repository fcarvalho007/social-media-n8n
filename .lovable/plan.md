# Repor o conteúdo do painel antigo no «Painel»

## O que aconteceu
O painel antigo não foi apagado: continua em `/redes-sociais`. Mas saiu do menu quando o «Painel» (`/`) passou a ser o Estúdio. Hoje só se chega lá pelo cartão «Atividade social». Esse painel antigo tem:
- pré-visualização dos conteúdos por aprovar (miniaturas, com link para Aprovar);
- custos do mês (carrosséis, imagens IA e artigos, em euros);
- os próximos agendamentos;
- o resumo dos projetos.

## O que proponho
1. **Mostrar 3 layouts antes de mexer no código.** Faço três propostas visuais para o novo «Painel», com o tema claro e verde dos carrosséis. As três juntam o conteúdo antigo ao que o Estúdio já mostra: «Para quem?», «Continuar onde ficaste» e «O que queres fazer?».
   - A. **Centro de comando:** cartões de resumo no topo (por aprovar, agendados, custo do mês, projetos), uma faixa de miniaturas por aprovar e, por baixo, as colunas dos agendamentos e dos projetos.
   - B. **Editorial em duas colunas:** à esquerda as pré-visualizações e o «Continuar onde ficaste»; à direita uma coluna estreita com os custos, os agendamentos e os projetos.
   - C. **Por secções compactas:** blocos em largura total, por esta ordem: atalhos, pré-visualização, agendamentos, custos e projetos. É o mais simples de ler no telemóvel.
2. Escolhes um layout e eu aplico-o no `/`. O título continua a ser «Painel».
3. O `/redes-sociais` continua a funcionar e passa a levar ao novo Painel. Assim nenhuma ligação antiga deixa de funcionar.

## O que não muda
- Os dados e os cálculos de custo continuam iguais: aproveito os que já existem e não há nenhuma tabela nova.
- O filtro «Para quem?» passa a aplicar-se também às pré-visualizações e aos projetos, quando esses dados o permitirem. Se não permitirem, aparece a indicação «todos os projetos».
- Não toco na autenticação, nas quotas, na publicação nem na IA paga.

## Validação
- Testar no computador e num telemóvel de 375 px.
- Confirmar que não há erros de tipos.
- Confirmar que os links das miniaturas, dos agendamentos e dos projetos abrem as páginas certas.

## Detalhes técnicos
- `src/pages/Estudio.tsx` passa a reutilizar `useProjects`, `usePendingContent`, `useScheduledCounts`, `useCostTracking` e `PendingThumbnail`, que hoje são usados em `Dashboard.tsx`.
- Retiro as cores fixas do painel antigo (âmbar, verde e azul) e uso as cores do tema.
- Em `App.tsx`, `/redes-sociais` passa a redirecionar para `/`. `Dashboard.tsx` fica sem uso e não é apagado nesta ronda.
