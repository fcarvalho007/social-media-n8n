# Entrada sem código: email e palavra-passe

Não vamos repor a entrada só com o email. Quem conhecesse o email teria acesso total, incluindo os acessos de administrador. Em alternativa, escreve-se o email e uma palavra-passe, sem código e sem link.

## O que muda
- O ecrã de entrada passa a ter "Email" e "Palavra-passe", com o botão "Entrar".
- Só entram as contas que já existem. Não é possível criar contas novas a partir deste ecrã.
- Cada conta autorizada define a sua palavra-passe uma única vez, pela ligação "Definir palavra-passe". Essa ligação chega por email e só é usada nessa primeira vez.
- A sessão fica aberta no dispositivo, por isso raramente é preciso voltar a entrar.
- A entrada por código fica disponível só como alternativa, na ligação "Entrar com código".
- Nenhuma palavra-passe fica guardada na aplicação, e não se alteram palavras-passe sem a tua ação.

## Detalhes técnicos
- `/auth`: `signInWithPassword`; o OTP fica como alternativa (`shouldCreateUser:false`).
- Página `/reset-password` (pública) com `updateUser({ password })`; `resetPasswordForEmail` com redirectTo `/reset-password`.
- Garantir que o email auth está ativo; ativar a proteção HIBP.
- Atualizar a regra no AGENTS.md: email+palavra-passe ou OTP, nunca só email.
