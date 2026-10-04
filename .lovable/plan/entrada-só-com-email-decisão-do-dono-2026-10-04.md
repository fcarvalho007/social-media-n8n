# Entrada só com email (decisão do dono)

Entrar escrevendo apenas um de dois emails: fredericodigital@gmail.com ou comunicacao@fredericocarvalho.pt. Sem palavra-passe, sem código, sem link. Decisão do dono, que aceita o risco: quem souber um destes emails entra com os mesmos acessos.

## O que muda para ti
- Ecrã de entrada: um campo de email e o botão "Entrar". Entras logo.
- Qualquer outro email: "Este email não tem acesso." Não é criada nenhuma conta.
- A sessão fica aberta neste dispositivo até carregares em "Sair".

## Proteções que ficam (sem passos extra para ti)
- Só as duas contas que já existem podem entrar. A lista fica no servidor, não na página.
- Limite de tentativas por endereço e por email, para travar quem tente adivinhar emails em massa.
- Cada entrada fica registada (data, email, navegador) e aparece em Ligações como "Últimas entradas", para poderes ver acessos estranhos.
- Não mexo em papéis nem palavras-passe e não crio contas.

## Detalhes técnicos
- Nova função `entrar-email` (verify_jwt=false): normaliza o email, confere a lista de dois emails no servidor e confirma que a conta existe em auth.users; aplica o limite (tabela `auth_entradas`, service role apenas, com GRANT e RLS sem acesso de clientes); emite sessão com generateLink(magiclink) + verifyOtp no servidor, sem enviar email; devolve só a sessão ao cliente.
- `Auth.tsx` / `AuthContext`: troca o pedido de código por chamada à função e `setSession`.
- `auth_entradas` apenas leitura para admin, na página Ligações.
- Atualizar AGENTS.md (substituir a regra da entrada) e a memória "login-proof-of-possession" para refletir a decisão do dono.
- Testes: email permitido entra, email desconhecido recusado (sem revelar detalhes), limite de tentativas ativo, nenhum email enviado.
