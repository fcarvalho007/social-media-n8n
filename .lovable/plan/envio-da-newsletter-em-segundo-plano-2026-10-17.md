# Envio da newsletter em segundo plano

## Situação de hoje (edição 319, verificada na base de dados)
- Newsletter & Lead Magnet (2927): enviada, confirmada pela E-goi às 10:07 (Lisboa).
- Formandos (3508): campanha criada mas ficou em rascunho na E-goi — não foi enviada.
- A edição não foi fechada e o bloqueio de envio continua ativo desde as 08:50.
- Causa provável (por confirmar no passo 1): hoje o envio é conduzido pela página aberta — prepara, envia lista a lista com pausa e fecha. Se a página fecha ou falha a meio, as listas seguintes ficam por enviar.

## O que proponho
1. Diagnóstico só de leitura: registos das funções de hoje para confirmar porque parou antes dos Formandos.
2. Envio em segundo plano: o botão «Enviar» só regista a ordem (edição + listas). O trabalho automático do servidor, que já corre periodicamente, prepara e envia lista a lista, sem depender da página aberta.
3. A página pode ser fechada; ao voltar, mostra o progresso real por lista (por enviar, aceite, confirmada, falhou) e permite «Repetir lista» só nas falhadas.
4. Garantias mantidas: nunca reenviar uma lista já aceite/enviada; só «sent» da E-goi conta como entregue; a edição só fecha depois da confirmação; listas de teste continuam separadas.
5. Formandos da 319: não envio nada sozinho. Depois da correção, o envio fica à tua decisão com um clique em «Repetir lista».

## Detalhes técnicos
- Fonte inerte em migration-reference (envio.functions/envio.server + EnvioNewsletter) regenerada com o gerador; nova ação `enfileirarEnvio` que grava pedido em nl_edicoes (reutiliza agendamento_* com estado «a_executar» imediato) e o worker/nl-hooks `enviar-agendados` executa `dispararEgoi` com claim idempotente.
- Libertar o bloqueio preso apenas pelo mecanismo existente (finalizarEnvio com adiarFecho), sem forjar datas.
- Testes: pedido duplicado não cria segundo envio; lista aceite não é repetida; fecho só após «sent".
- Deploy de nl-api, nl-hooks, nl-worker-conteudos; verificação do grafo; sem emails nos testes.
