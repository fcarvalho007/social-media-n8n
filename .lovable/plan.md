# Curadoria: notícias atuais, processamento claro e página mais compacta

## O que os dados mostram
- A fila já é processada da mais recente para a mais antiga.
- O problema é outro: **a notícia mais recente na fila é de 30/09**. Desde 04/10 não entrou nada novo (509 itens à espera, todos entre 19/09 e 30/09). Por isso as 30 "mais recentes" tinham 9–20 dias.
- Ou seja, a recolha das fontes parou de alimentar a fila. A causa ainda não está confirmada.

## O que vou fazer

1. **Diagnosticar porque a recolha parou** (só leitura primeiro): agendamento da recolha, modo manual, registos da última execução e erros das fontes. Corrigir a causa; se for uma alteração a agendamentos, peço autorização antes.
2. **Recolher antes de processar:** ao carregar em «Processar 30», o sistema vai primeiro buscar novidades às fontes ativas e só depois escolhe as 30 mais recentes.
3. **Não processar notícias antigas sem aviso:** itens com mais de 7 dias ficam fora do lote por defeito; aparece «X notícias antigas na fila» com opção de as limpar (a limpeza já existente, com confirmação).
4. **Progresso claro:** barra com fases — «A recolher novidades…», «A interpretar 12 de 30…», «Concluído: 27 notícias novas, 3 falhadas». Botões bloqueados durante o processo.
5. **No fim, ir para «Por rever»:** a página muda automaticamente para Notícias › Por rever, com as novas no topo.
6. **Retirar o separador «Fila de entrada»:** passa a um bloco compacto dentro de «Notícias» (contagem + «Processar 10/20/30/50»). Modo de recolha e ligações ficam em «Fontes e limites».
7. **Cabeçalho compacto:** uma linha — «Curadoria · 26 de 26 fontes ativas» + botão «Gerir fontes». O texto explicativo sai (fica como dica no botão).

## Validação
- Testes: ordem do lote (mais recente primeiro), exclusão de itens >7 dias, troca para «Por rever» no fim.
- Ecrã com sessão iniciada em computador e a 375 px. Processar um lote usa IA (DeepSeek, custo baixo): só o faço se autorizar.

## Detalhes técnicos
- Fonte vendorizada: `fila-curadoria.server.ts.txt` (`processarLote`: chamar a recolha antes, filtro `publicado_em >= now()-7d`, devolver contagens), `FilaEntrada.tsx.txt` (fases/progresso, callback `onConcluido`); regenerar com `port-newsletter.py`.
- `src/pages/Curadoria.tsx`: remover separador `fila`, embutir FilaEntrada em Notícias, mover `ModoRecolha` para Fontes, `onConcluido` define estado «pendente» em `CuradoriaNoticias` e invalida a consulta.
- Sem migrações previstas; `verificar-grafo-edge.py`, tsgo e vitest.
