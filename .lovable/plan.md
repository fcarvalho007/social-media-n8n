# Auditoria do motor de carrosséis: código vs execução real

Ronda só de leitura. Legenda de evidência:
- **Código** — lido no código, sem execução observada.
- **Teste** — coberto por testes automáticos (simulações, sem serviços reais).
- **Execução** — observado nos dados ou registos reais do backend.

## 1. A produção continua com o navegador fechado?

**Em parte.** Depende da etapa.

| Etapa | Onde corre | Continua sem navegador? |
|---|---|---|
| Confirmar entrega na E-goi | Servidor (processo automático de hora a hora, ao minuto 7) | Sim — Execução: tarefa ativa no backend; o trabalho 318 passou a "confirmado" sem ação no navegador |
| Gerar proposta com IA | Servidor (mesmo processo) | Sim no código; **não observado em execução** — o trabalho 318 continua "pendente", 0 tentativas (a corrida das 16:07 coincidiu com a falha da autenticação; a próxima é às 17:07 UTC) |
| Gerar PNG/PDF | **Navegador** (desenho em canvas) | **Não** — fechar o separador interrompe |
| Enviar para rascunho social | **Navegador** (carregamento dos ficheiros + pedido) | **Não** — fica por enviar; pode repetir-se depois sem duplicar |
| "Processar fila agora" | Pedido do navegador ao servidor | O servidor termina o lote mesmo que o separador feche; se não terminar, a reserva expira em 10 min e é retomada |

## 2. Retomar uma etapa falhada sem repetir custos nem duplicar

| Situação | Comportamento | Evidência |
|---|---|---|
| Carrossel já existe | Marca concluído **sem chamar a IA** | Código (`c.carrossel` → concluído); estado real do 318: versão 1 + rascunho já existem |
| Processo interrompido a meio | Reserva expira, retomada com senha nova; o antigo não grava | Teste + execução SQL anterior (funções de reserva) |
| Duas gravações em simultâneo | Só uma vence (versão esperada) | Teste + execução SQL anterior |
| Sem chave/saldo IA | Fica "a aguardar credencial", sem repetir | Teste (1 chamada, não repetida) |
| Resposta inválida da IA | Máximo 2 chamadas por tentativa, todas registadas | Teste; Execução: 8 chamadas registadas na edição 318, 1 falhada |
| **IA respondeu bem, mas a gravação falhou** (perda de reserva, erro na base de dados, falha de rede) | **A proposta paga perde-se e a próxima tentativa volta a pagar** | Código: a proposta só existe em memória até à gravação final |
| Tentativas automáticas | Até `max_tentativas` (cada uma até 2 chamadas pagas) antes de "Erro" | Código |
| Envio social repetido | Um único rascunho por conteúdo+versão | Código + teste (reserva + índice único) |
| PNG/PDF repetidos | Reenvio cria novos ficheiros no armazenamento (sem novo rascunho) | Código; não testado em execução |

## 3. n8n

Não há JSON do fluxo n8n no projeto nem nos ficheiros carregados. **Não consigo avaliar que partes reaproveitar.** Há uma ligação n8n disponível nesta conta; se indicares o nome do fluxo, posso consultá-lo só para leitura numa próxima ronda (ou colar o JSON).

## 4. Tabela final

| Capacidade | Evidência | Estado | Lacuna | Ação recomendada |
|---|---|---|---|---|
| Confirmação E-goi em segundo plano | Execução + teste | Verificada em execução | — | Nenhuma |
| Geração IA em segundo plano | Código + teste | Implementada, **não observada em execução** | 318 ainda não processado pelo servidor | Observar a corrida das 17:07 UTC ou um "Processar fila agora" |
| Não regenerar se já existe carrossel | Código + dados reais | Implementada | Execução final do 318 por ver | Mesma observação |
| Recuperação de processo interrompido | Teste + SQL real | Verificada | — | Nenhuma |
| Não pagar duas vezes a mesma proposta | Código | **Parcial** | Proposta não guardada antes da gravação final | Guardar a resposta válida da IA (por trabalho + hash da fonte) antes da gravação; retoma reutiliza-a |
| Limite de custo por trabalho | Código | Parcial | Até `max_tentativas` × 2 chamadas | Teto explícito de chamadas pagas por trabalho; depois só retoma manual |
| Registo de custos | Execução (8 linhas) | Verificada | — | Nenhuma |
| Exportação PNG/PDF | Código + teste parcial (canvas não corre nos testes) | Implementada, só no navegador | Para ao fechar; repetida gera ficheiros novos | Aceitar ou mover para o servidor numa fase futura |
| Envio único para rascunho social | Código + teste | Implementada | Depende do navegador | Retoma manual já possível; manter |
| Progresso visível por etapas | Código | Parcial | Só estado, sem etapas/percentagem | Etapas no trabalho (fonte, IA, gravação, ficheiros, envio) |
| Texto colado / link / PDF como fonte | Código | Ausente / parcial (link) | Ver plano do motor | Seguir sequência do plano do motor |
| Reaproveitar n8n | — | Não avaliável | Sem JSON | Fornecer JSON ou nome do fluxo |

## Próximo passo proposto (se aprovares)
Só verificação, sem alterar nada: após as 17:07 UTC, ler o estado do trabalho 318 e o registo de chamadas IA para confirmar que concluiu **sem nova chamada paga**. As correções da tabela (guardar proposta antes da gravação, teto de custo, etapas) ficam para uma ronda de implementação própria.
