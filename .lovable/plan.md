# Respostas e próximo passo de otimização

## 1. Para que serve o hub-editorial-worker
É o "trabalhador" do Hub de campanhas. Acorda periodicamente e executa trabalhos da fila: preparar documentos (PDF), recolher documentos, gerar artigos/textos/imagens, publicar no WordPress e nas redes sociais, ciclos de SEO e cópias de segurança.
**Facto medido:** o último trabalho real foi a 19/10/2026. Desde então, acordou ~20 000 vezes sem nada para fazer (agora a cada 5 min, antes a cada minuto). Há ainda 3 trabalhos em estado «incerto» parados desde 19/10.

## 2. O que consome mais recursos (medido)
1. Tarefas automáticas a acordar sem trabalho (Hub) — maior fonte de escrita/IO e do registo técnico de 340 MB (já limpo).
2. Lista de documentos do Hub — até 6 s por pedido, porque traz o conteúdo inteiro de cada documento.
3. Registo de auditoria da newsletter — 267 s acumulados (índice já criado).
4. Registo de custos — até 3,4 s.
5. Muitas gravações pequenas na edição de crónicas (uma por campo, centenas de vezes).
Memória a 69%, disco a 10%, ligações baixas: a instância atual chega, não é preciso aumentar.

## 3. Apagar o histórico de x em x tempo — para que serve
Serve só para diagnóstico («a tarefa correu? deu erro?»). Não tem conteúdo nem valor de negócio. **Já está automatizado:** limpeza diária às 03:30, guarda 3 dias de execuções e 1 dia de respostas HTTP. Proponho manter.

## 4. O que pressiona mais e o que propomos
O servidor da aplicação publicada (lovable.dev) só serve ficheiros; a pressão real está na base de dados e nas funções do backend. Propostas:

- **A. Hub só acorda quando há trabalho** (maior ganho): a rotina de 5 em 5 min passa a verificar primeiro se existe algum trabalho pendente ou com hora marcada vencida; se não houver, não chama o servidor. Corta ~100% das chamadas ociosas. Antes de aplicar, confirmo que as tarefas periódicas do Hub (agenda de documentos, SEO) criam trabalhos na fila — se não criarem, ficam incluídas na verificação.
- **B. Resolver os 3 trabalhos «incerto»** de 19/10 (mostrar-lhe e decidir: repetir ou fechar). Não apago nada sem ordem.
- **C. Gravação agrupada nas crónicas da newsletter**: juntar título/conteúdo/leituras num único pedido com espera curta, em vez de um por campo (fonte inerte + regenerar).
- **D. Lista leve de documentos do Hub**: pedir só id/título/datas na lista e o conteúdo ao abrir. Como é código gerado, altera-se na fonte e regenera-se.
- **E. Rever o registo de custos** com EXPLAIN e índice se fizer falta.
- **F. Reduzir `mc-motor-retoma` (5 em 5 min)** para o mesmo modelo de A, se não houver trabalhos pendentes.

Nada disto gasta créditos de IA.

## Detalhes técnicos
- A/F: alterar `hub_worker_acordar()` para `IF NOT EXISTS (SELECT 1 FROM hub_jobs WHERE estado IN ('fila','em_curso') AND (proximo_em IS NULL OR proximo_em <= now()) OR (estado='em_curso' AND lease_ate < now())) THEN RETURN;` mais as condições da agenda; idem para a retoma do motor.
- C/D: editar fontes `.txt` em migration-reference, correr `port-newsletter.py` e `verificar-grafo-edge.py`; deploy só com pedido explícito.
- Medir antes/depois com `slow_queries` e `db_health` após 24 h.

## Decisão pendente
Que propostas aplicar (recomendo A, B, D primeiro).
