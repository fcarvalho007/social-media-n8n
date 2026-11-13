# Curadoria: corrigir «Processar» e ver/retirar as aprovadas

## 1. Erro ao processar notícias

**Causa encontrada:** às 14:51 a recolha correu bem e entraram 12 itens na fila. Às 14:52 o lote de 20 começou, tratou o primeiro email e o servidor foi interrompido a meio, por exceder o tempo máximo de um pedido. Cada notícia lê o artigo original e chama a IA, uma a uma. Prova: o trinco da fila ainda está preso desde as 14:51 e só 1 item mudou de estado. Enquanto o trinco não expira (10 min), novas tentativas ficam bloqueadas.

**Correção:**
- **Orçamento de tempo:** o lote deixa de começar notícias novas ao fim de cerca de 100 s e devolve um resultado parcial («Processadas 8 de 20 · faltam 12»), em vez de ser cortado.
- **Limite por notícia:** cada leitura de artigo e cada chamada de IA tem um máximo de 30 s. Se passar, a notícia é marcada como «falhada — tempo esgotado» e pode ser retomada.
- **Continuação automática:** se ficarem itens por fazer, o ecrã oferece «Continuar com as X restantes». Não repete itens já tratados e só gasta IA quando carrega no botão.
- **Trinco:** passa a durar no máximo 3 minutos. O ecrã mostra «Outro processamento está a decorrer» em vez do erro técnico.
- **Mensagem de erro:** deixa de aparecer «Edge Function returned a non-2xx status code». Passa a dizer o que aconteceu, por exemplo «O servidor demorou demasiado; X notícias ficaram tratadas. Tente continuar.»

## 2. Ver as aprovadas em cartões e poder retirar

- Na faixa do topo da Curadoria, novo botão **«Ver aprovadas»**, que abre as aprovadas em cartões. Usa a vista que já existe, filtrada a esta semana.
- Em cada cartão aprovado ficam duas ações claras:
  - **«Retirar da newsletter»:** tira a notícia da edição #320, mas ela continua aprovada para outros conteúdos. Inclui «Desfazer».
  - **«Rejeitar»:** já existe e passa a pedir confirmação quando a notícia está na edição.
- Cada cartão mostra se está «Na edição #320» ou «Por organizar».

## Detalhes técnicos
- Código gerado da newsletter: editar só as fontes `.txt` (`fila-curadoria.server.ts.txt`, `fila-curadoria.functions.ts.txt`, `FilaEntrada.tsx.txt`), regenerar com `scripts/port-newsletter.py` e correr `scripts/verificar-grafo-edge.py`.
- `processarLote`: prazo `ORCAMENTO_MS ≈ 100 000` verificado antes de cada item; `Promise.race` com 30 s por item; devolve `parcial: true` e `restantes`. Reduzir `LOCK_MAX_MS` para 3 min.
- Libertar o trinco preso agora: expira sozinho (10 min) antes de o código novo estar ativo; não é preciso mexer em dados.
- Retirar da newsletter reutiliza as funções `ocultarNaEdicao`/`reporNaEdicao`, que já existem; não há alterações à base de dados.
- Testes: prazo esgotado devolve resultado parcial sem tocar nos itens restantes; mensagem de erro amigável; cartão aprovado mostra «Retirar da newsletter».
- **Para o erro deixar de acontecer, é preciso instalar a função do servidor (`nl-api`).** Fica no ramo local até autorizar esse passo.
