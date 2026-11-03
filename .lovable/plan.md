# Otimizar a base de dados (aviso «Database limit reached»)

## O que encontrei (medido, só leitura)
- O aviso foi de **leitura/escrita em disco (IO)**: às 03:47 de hoje o orçamento de IO desceu para 36%. Disco ocupado só a 10%, memória 69%, ligações baixas. Não é falta de espaço.
- Base de dados: 480 MB, dos quais **~400 MB são histórico de tarefas automáticas** (340 MB de registo de execuções + 63 MB de respostas HTTP guardadas). Os dados reais da aplicação são pequenos (<30 MB).
- O maior consumidor é a tarefa **hub-editorial-worker, que corre a cada minuto** (1 440 vezes/dia), mesmo sem trabalho. Cada execução grava registo, faz um pedido HTTP (9 311 chamadas, 183 s acumulados) e lê estado/pausa (~44 600 + ~21 700 leituras).
- Consultas lentas:
  - Registo de auditoria da newsletter: 308 ms em média para ~4 000 linhas (sem índice por data) — 267 s acumulados.
  - Documentos do Hub: até 6 s por pedido; 44 501 leituras completas da tabela (falta índice por projeto) e devolvem o conteúdo inteiro (`dados`).
  - Registo de custos: até 3,4 s.

## Correções propostas (por impacto)
1. **Limpar histórico das tarefas automáticas** (gratuito, sem tocar em dados da aplicação): apagar registos de execução e respostas HTTP com mais de 3 dias e agendar limpeza diária. Liberta ~400 MB e reduz IO.
2. **Reduzir a frequência do hub-editorial-worker** de 1 min para 5 min, e fazer o worker sair logo quando não há trabalho (sem ler estado/documentos). Corta ~80% das execuções. Compromisso: trabalhos do Hub podem demorar até 5 min a arrancar.
3. **Índices**: `nl_audit_log(criado_em desc)`, `hub_documentos(project_id, criado_em desc)` e `hub_documentos(project_id, id)`.
4. **Listas leves**: a lista de documentos do Hub deixa de pedir o campo `dados` completo; carrega-o só ao abrir um documento.
5. Verificar `custos_registos()` com EXPLAIN e indexar se necessário.

## Verificação
- Antes/depois: tamanho da base, `slow_queries`, `db_health` após 24 h.
- Testes existentes do Hub e newsletter + grafo Edge.

## Decisões pendentes
- Confirmar 5 min para o Hub (ou 2 min).
- Apagar histórico de tarefas apaga apenas registos técnicos, não conteúdo — confirmar.

## Detalhes técnicos
- Migração: `delete from cron.job_run_details where end_time < now()-interval '3 days'`; `delete from net._http_response where created < now()-interval '1 day'`; novo `cron.schedule('limpar-historico-cron','30 3 * * *', ...)`; `cron.alter_job` do worker para `*/5 * * * *`.
- Worker (`hub-editorial-worker/runtime.js`): verificação barata de fila vazia antes de ler `hub_editorial_estados`/`hub_operacao`.
- Sem custos de IA; sem deploys até aprovação (deploy do worker só com pedido explícito).
