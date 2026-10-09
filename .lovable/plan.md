# Receber emails do CloudMailin sem utilizador/palavra-passe no endereço

## Problema
O servidor só aceita emails que tragam o utilizador e a palavra-passe do CloudMailin. Como o CloudMailin não aceita esses dados no endereço, os emails chegam sem eles e são recusados. Ainda não chegou nenhum pedido ao servidor.

## O que muda
1. O servidor passa a aceitar também uma chave secreta no fim do endereço (`...email-newsletter?chave=...`). A chave é gerada num formulário seguro, com botão «Copiar», e nunca aparece no chat.
2. O utilizador e a palavra-passe continuam a funcionar. Sem chave e sem palavra-passe, o email continua a ser recusado.
3. Passos para si: copiar a chave do formulário, juntá-la ao endereço no CloudMailin e guardar.
4. Verificação: enviar um email de teste e confirmar que aparece em Curadoria › Emails com a data de hoje.

## Pormenores técnicos
- `email-newsletter.ts` (fonte vendorizada): `verificarBasicAuth` OU comparação em tempo constante do parâmetro `chave` com o segredo novo `CLOUDMAILIN_URL_TOKEN`; regenerar com o port, `verificar-grafo-edge.py`, deploy de nl-hooks.
- Teste: pedido sem credenciais → 401; chave errada → 401; chave certa → aceite.
