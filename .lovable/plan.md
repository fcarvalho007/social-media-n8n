# Corrigir a autenticação no fredericocarvalho.pt

## O que aconteceu
A app já encontra os três dados guardados (o aviso «não integrada» desapareceu). Agora é o próprio site que responde «Nome de utilizador desconhecido». Ou seja, o valor guardado como utilizador não corresponde a nenhuma conta do WordPress. As causas mais prováveis:
- o utilizador e a palavra-passe ficaram trocados (o valor do utilizador é a chave e vice-versa);
- o utilizador tem espaços, aspas ou uma linha a mais;
- foi guardado o nome visível em vez do nome de login (ou do email da conta).

## O que vou fazer
1. **Diagnóstico seguro, sem publicar nada**: verificar, sem mostrar os valores, se o utilizador parece uma palavra-passe de aplicação (blocos de 4 caracteres) e se a chave parece um nome; e tentar só a leitura «quem sou eu» do site (não cria nem altera artigos).
2. **Correção automática dos casos óbvios**: limpar espaços/aspas à volta e, se os dois valores estiverem claramente trocados, usá-los pela ordem certa.
3. **Mensagem clara em português** quando o site recusar, a dizer o que rever (nome de login ou email da conta e palavra-passe de aplicação do WordPress), em vez do HTML cru do site.
4. Se os valores estiverem mesmo errados, abro-te o formulário seguro para voltares a inserir o utilizador (nome de login ou email) e a palavra-passe de aplicação.

## Detalhes técnicos
- `lerConfig` em `revista/frederico-wordpress.server.ts` e o envio em `envio.server.ts`: `trim`, remoção de aspas e detecção de troca (padrão `xxxx xxxx xxxx xxxx xxxx xxxx`).
- Diagnóstico via `verificarAutenticacao` (`GET /wp-json/wp/v2/users/me`), só leitura.
- Mensagem de erro sem tags HTML.
- Teste para limpeza/troca; regenerar, `verificar-grafo-edge.py`, publicar `nl-api`.
