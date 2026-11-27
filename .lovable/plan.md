# Curadoria: o processamento gasta o lote em newsletters bloqueadas pelo limite diário

## O que se passou (confirmado na base de dados)
- Os feeds RSS funcionam: há 76 notícias RSS dos últimos 7 dias à espera na fila, as mais recentes de hoje (27/11).
- As newsletters por email também chegam: há 9 recentes na fila.
- No último lote, o sistema tratou 9 newsletters. A IA leu-as e encontrou 48 notícias, mas **todas foram cortadas pelo limite diário de notícias vindas de email** (15 por dia; já tinham entrado 19 nas últimas 24 h). Por isso deu «0 notícias novas».
- Mesmo assim, essas 9 newsletters ficaram marcadas como «processadas». As notícias perderam-se e a IA foi paga para nada.
- O lote acabou o tempo nas newsletters e não chegou às notícias RSS («faltam 21»).
- A mensagem do resultado não explica nada disto.

## O que vou corrigir
1. **Verificar o limite antes de gastar IA:** com o limite diário de email atingido, as newsletters não são abertas. Ficam na fila para o dia seguinte, sem custo de IA.
2. **RSS primeiro quando o email está bloqueado:** o lote passa a usar as vagas nas notícias RSS mais recentes, de hoje para trás.
3. **Não perder newsletters cortadas:** se só parte das notícias de uma newsletter couber no limite, a newsletter fica marcada para ser retomada mais tarde, e não como concluída.
4. **Mensagem mais clara**, por exemplo: «0 notícias novas · 9 newsletters adiadas: limite diário de email atingido (19 de 15) · 21 por tratar».
5. **Recuperar as 9 newsletters de hoje** (com autorização): voltam à fila para serem lidas de novo amanhã. Isto volta a usar IA paga, com um custo pequeno.
6. Testes novos para as regras do limite: o email bloqueado não chama a IA, o RSS passa à frente e as notícias cortadas não se perdem.

## O que não muda
- O limite diário continua igual (25 no total, 15 por email), salvo indicação sua.
- Não aprovo, apago nem publico notícias.

## Instalação
- Faço tudo no ramo local, com testes e verificação do grafo Edge.
- Para instalar no servidor e correr um lote de teste de 10 (IA paga), peço a sua autorização à parte.

## Detalhes técnicos
- `fila-curadoria.server.ts.txt` `processarLote`: calcular `vagasDiarias(admin, tectos, "email")` no início do lote; com 0 vagas, excluir os candidatos `origem='email'` antes de `escolherLoteVariado`; acrescentar `adiadosEmail` e `motivoAdiamento` ao `ResultadoLote`.
- `reprocessar-email.server.ts.txt`: com `cortadas_por_tecto > 0`, deixar o email em `por_processar` e o item da fila em `em_fila` (como já acontece com `truncado_por_tempo`); o dedup por URL evita repetições.
- `FilaEntrada.tsx.txt`: mostrar os adiados e o motivo.
- Dados: UPDATE de 9 linhas de `nl_curadoria_fila` (email, processado_em 27/11 14:12–14:15, `cortadas_por_tecto>0`, sem `noticia_id`) → `em_fila`, e dos `nl_emails_recebidos` correspondentes → `por_processar`.
- Regenerar com `scripts/port-newsletter.py`; correr `verificar-grafo-edge.py` e os testes da Curadoria.
