# Curadoria: equilibrar fontes e emails ao processar a fila

## O que encontrei (consultas só de leitura)
- Na última corrida (11/11) entraram 57 notícias: **Search Engine Journal 14**, TNW 11, TechCrunch 8, Horizon AI 7, Tek 5, 8020AI 4, e só 4 notícias vindas de outros emails (EMARKETER, MarketingCharts, NYT). Antes, a Search Engine Land tinha entrado 8 vezes seguidas.
- O tecto configurado é **2 por fonte**, mas só é respeitado no momento de *recolher* para a fila. Quando se carrega em processar, a fila é tratada **só pela data mais recente**, sem olhar para a fonte. Uma fonte que publica muito numa manhã ocupa o lote inteiro.
- Os emails estão a ser rastreados: há itens à espera na fila de EMARKETER (cerca de 25), 8020AI, Horizon, Snacks, NYT, Poonam Soni e MarketingCharts. Ficam para trás porque as fontes RSS têm datas mais recentes.
- Há 76 emails recebidos desde 30/10 em estado «em fila». A maioria está classificada como «outro». Ainda não confirmei se isto está certo ou se estão parados.

## O que proponho
1. **Processar a fila com variedade:** em vez de pegar nas N notícias mais recentes, ler uma janela maior da fila. Depois escolher à vez, uma de cada fonte, até 2 por fonte e 3 por categoria. Usa os mesmos tectos que já existem no ecrã de configuração. Uma fonte só passa do tecto se não houver material de outras.
2. **Garantir lugar para os emails:** reservar pelo menos um terço do lote para itens vindos de emails, quando existirem.
3. **Agrupar remetentes da mesma casa:** os vários remetentes da EMARKETER e da Insider Intelligence contam como uma só fonte, pelo domínio. Assim não ocupam 6 lugares.
4. **Mostrar a distribuição:** no resumo de cada corrida, mostrar quantas notícias entraram por fonte e quantas vieram de emails.
5. **Verificar os 76 emails «em fila»:** confirmar se a classificação «outro» os exclui de propósito ou se estão parados. Só o relato; não reprocesso nada sem pedido.

## Detalhes técnicos
- Editar a fonte inerte `migration-reference/.../lib/fila-curadoria.server.ts.txt` (`processarLote`). Ler até 300 itens `em_fila` e aplicar `seleccionarDiverso` (edge-shared) com `lerTectos()`. A chave de fonte é `fonte_id`, ou o domínio do remetente nos emails. Junta-se uma quota mínima de emails.
- Regenerar com `scripts/port-newsletter.py` e correr `scripts/verificar-grafo-edge.py`.
- Teste novo: um lote com 14 itens de uma fonte e 6 de emails dá no máximo 2 por fonte e pelo menos 1/3 de emails.
- Sem custos de IA novos e sem mudanças na base de dados. A instalação no servidor só acontece com pedido explícito, conforme a regra do ramo local.
