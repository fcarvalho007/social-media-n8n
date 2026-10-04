# Entrar só com o email em dispositivos de confiança

Dar sessão a quem apenas escreve um email conhecido continua fora de questão. Qualquer pessoa entraria como administrador, com acesso aos subscritores e aos envios. Este plano é o mais próximo possível do que pediste: no dia a dia escreves só o email, sem palavra-passe, sem link e sem código.

## Como funciona
- **Primeira vez em cada computador ou telemóvel:** escreve-se o email e o código que chega por email, uma única vez. A seguir, o dispositivo fica marcado como "de confiança".
- **Daí em diante, nesse dispositivo:** escreve-se só o email e carrega-se em "Entrar". Não há código, link nem palavra-passe.
- **Dispositivo novo ou dados apagados no navegador:** volta a pedir o código uma vez.
- **Limites:** só as contas autorizadas que já existem podem entrar, e não há registo aberto.
- **Na página "Ligações" (administrador):** aparece a lista "Dispositivos de confiança", com data e um botão "Retirar confiança".
- **Validade:** cada dispositivo fica de confiança durante 180 dias e depois pede o código outra vez.

## Detalhes técnicos
- Tabela `auth_dispositivos` (apenas o hash do segredo do dispositivo, user_id, criado/usado/expira, revogado), com escrita só pelo service role.
- Função `entrar-dispositivo` (verify_jwt=false): recebe email + segredo do dispositivo e valida o hash, a conta existente e a validade; emite sessão no servidor e responde sempre de forma genérica. Tem limite de tentativas por IP e por email.
- Depois de uma entrada por código, a função `confiar-dispositivo` (exige sessão) gera um segredo de 32 bytes e grava-o no armazenamento local do dispositivo. Os tokens nunca vão para registos.
- AGENTS.md: entrar só com o email num dispositivo de confiança já validado por código; nunca abrir sessão só com o email.
- Testes: segredo errado, expirado, revogado, conta inexistente, limite de tentativas e respostas genéricas.
