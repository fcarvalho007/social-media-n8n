# Curadoria: só notícias recentes e limpeza da edição #320

## O que encontrei
- A edição #320 tem **51 notícias aprovadas**. Pela data da fonte (ou, quando não há, pela data de entrada), **35 são de 11/11/2026 ou anteriores**; a mais antiga é de 16/10/2026. Ficam **16** de 12/11 em diante.
- A fila já tenta processar das mais recentes para as mais antigas, e só os últimos 7 dias. Mas a recolha continua a pôr na fila notícias antigas dos feeds (há 23 antigas à espera), e as aprovadas em lotes anteriores entraram na edição sem filtro de data.

## 1. Regra de datas (código)
- **Recolha:** não põe na fila notícias com mais de 7 dias, contados a partir de hoje (hora de Lisboa). Notícias sem data usam a data de recolha.
- **Processar:** sempre de hoje para trás; nunca processa nada fora dos 7 dias, mesmo com «Continuar».
- **Mensagem do lote:** passa a dizer o intervalo de datas processado (ex.: «20 notícias de 26/11 a 20/11»).
- **Aprovar para a edição:** uma notícia com mais de 7 dias pede confirmação antes de entrar na newsletter.
- Teste automático para cada regra (corte de 7 dias, ordem mais recente primeiro).

## 2. Limpeza da edição #320 (dados)
- Retirar da edição #320 as **35 notícias de 11/11 ou anteriores** (como o botão «Retirar da newsletter»). As de outras edições, incluindo a #314 já enviada, não são tocadas.
- As 23 notícias antigas que estão à espera na fila são descartadas, para não voltarem a aparecer.
- Antes de apagar, mostro a lista exata (título e data) e só avanço depois desta aprovação.

## Detalhes técnicos
- `fila-curadoria.server.ts.txt` (fonte inerte): corte `publicado_em >= agora-7d` também no enfileiramento; resposta do lote com `de`/`ate`. Regenerar com `scripts/port-newsletter.py` e correr `verificar-grafo-edge.py`.
- `FilaEntrada.tsx.txt`: mostrar o intervalo de datas.
- Limpeza: DELETE das cópias em `nl_noticias` (edição 320, data da origem < 12/11/2026 Lisboa) + ocultar na edição; UPDATE `nl_curadoria_fila` para `descartado` nos `em_fila` antigos.
- A correção do código só vale no site depois de instalar as funções do servidor; peço autorização nessa altura.
