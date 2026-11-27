# Envio da newsletter pela Brevo, em alternativa ao E-goi

## Objetivo
No momento de enviar uma edição, o sistema pergunta «Enviar por E-goi ou por Brevo?». Se for escolhida a Brevo, os subscritores do E-goi são copiados para a Brevo antes do envio, e só são incluídos os contactos com consentimento válido.

## O que o utilizador vê
1. Na janela de envio aparece uma nova escolha, «Serviço de envio», com duas opções: E-goi (predefinido) e Brevo. A Brevo só fica disponível depois de ligada.
2. Com a Brevo escolhida, aparece um resumo do tipo «N contactos copiados do E-goi, M excluídos (sem consentimento ou cancelados)», e é preciso confirmar antes de enviar.
3. O estado do envio segue as mesmas regras do E-goi: rascunho → aceite → enviada. Só conta como entregue quando a Brevo confirma.
4. Em Definições, um cartão «Brevo» mostra o estado da ligação, a lista de destino e a data da última sincronização.

## Passos (por ordem)
1. Ligar a Brevo através da ligação segura. A chave API é introduzida no cartão de ligação, nunca no chat.
2. Verificar o remetente e o domínio de envio na Brevo. Sem este passo, a Brevo recusa o envio.
3. Sincronização E-goi → Brevo: ler os subscritores ativos com consentimento das listas reais e criar ou atualizar os contactos numa lista Brevo própria. Os cancelamentos também passam para a Brevo.
4. Envio pela Brevo: criar a campanha com o mesmo HTML já gerado pelo motor da newsletter, enviá-la e reconciliar o estado. O fecho da edição e os carrosséis só arrancam depois de a Brevo confirmar o envio.
5. Cancelamentos feitos na Brevo: recebidos por webhook e refletidos no E-goi e na base de dados, para os consentimentos se manterem coerentes.
6. Testes: escolha do serviço, exclusão de contactos sem consentimento e regra «só conta como enviada após confirmação». Começa com um envio de teste para um único email.

## Detalhes técnicos
- Ligação Brevo através do conector (gateway). As chamadas à Brevo ficam só no servidor, em funções nl-*, e nunca no browser.
- Novo módulo partilhado `brevo.server.ts`, vendorizado: editar as fontes `.txt` em migration-reference e regenerar com `port-newsletter.py`. Fica com a mesma interface do `egoi.server.ts` (criar campanha, enviar, consultar estado).
- `nl_egoi_campanhas` passa a ter a coluna `fornecedor` ('egoi' | 'brevo'), por migração, ou é criada uma tabela paralela `nl_campanhas_envio`. A escolha é registada em `snapshot_envio`. A escrita continua reservada ao serviço (trigger + RLS).
- A reconciliação passa a sondar o estado da campanha na Brevo e a normalizar «sent» para «enviada».
- Webhook Brevo em nl-hooks, com verificação de segredo próprio.
- Depois das alterações Edge, correr `verificar-grafo-edge.py`.
- Conforme a instrução do proprietário: tudo no ramo local, sem deploy nem envio real até haver autorização explícita.

## Riscos
- Consentimento RGPD: só são copiados contactos com opt-in registado.
- Reputação: um domínio novo na Brevo convém ser aquecido com um primeiro envio pequeno.
- Plano gratuito da Brevo: limite diário de 300 emails. Confirmar o plano antes do primeiro envio real.
