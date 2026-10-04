# Entrada só com email (sem código, sem magic link)

Decisão do utilizador: a entrada deixa de pedir código ou ligação por email. Basta escrever o email autorizado e entrar. Respeitar a decisão, mantendo a segurança possível: só emails da lista autorizada e só contas que já existem — nunca cria utilizadores, nunca usa password fixa no bundle.

## Como vai funcionar

1. O utilizador escreve o email na página de entrada e carrega em «Entrar».
2. Uma função de servidor nova (`entrar-email`) verifica, no servidor:
   - o email está na lista autorizada (os 2 emails atuais);
   - a conta já existe no sistema de autenticação.
3. Se passar, o servidor gera uma sessão real através da API de administração (`generateLink` + verificação interna) e devolve os tokens à página. Nenhum email é enviado.
4. A página guarda a sessão (`setSession`) e entra diretamente.

## Alterações

- **Nova função de servidor `entrar-email`** (verify_jwt = false no config.toml, com autenticação própria):
  - valida email contra a lista autorizada e a existência da conta;
  - limite de tentativas por email/IP (ex.: 5 por 10 min) para travar força bruta, já que deixa de haver código;
  - resposta genérica («Este email não tem acesso») sem revelar se a conta existe;
  - erros técnicos só nos registos do servidor.
- **`src/contexts/AuthContext.tsx`**: substituir `requestEmailCode`/`verifyEmailCode` por `entrarComEmail(email)` que chama a função e faz `setSession` com os tokens devolvidos.
- **`src/pages/Auth.tsx`**: um só passo — campo de email + botão «Entrar»; remover o ecrã de código.
- **Roadmap**: atualizar o item de entrada.

## O que NÃO muda

- Não se criam contas, não se alteram passwords, papéis nem credenciais.
- Nenhuma password fixa no código do cliente nem do servidor.
- Sessões existentes preservadas; a página de segurança da conta (alteração de password self-service) fica igual.

## Testes

- Sem sessão: email autorizado entra; email fora da lista é recusado com mensagem genérica; conta inexistente é recusada.
- Função responde 400/401 a pedidos sem email ou não autorizados.
- typecheck + testes existentes (51) sem erros.
