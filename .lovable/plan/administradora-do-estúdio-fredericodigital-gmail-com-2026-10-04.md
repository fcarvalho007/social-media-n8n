# Administradora do Estúdio: fredericodigital@gmail.com

## O que muda
- A conta fredericodigital@gmail.com, que já existe (há exatamente uma), passa a ser administradora.
- Com isso, essa conta passa a ver Ligações, Migração e a secção "Configuração" do Estúdio.
- Nada mais muda: não se cria nenhuma conta, não se altera nenhuma palavra-passe e não se mexe noutros papéis nem noutras contas.
- No fim, confirmo apenas com sim ou não se a conta ficou administradora.

## Estado do resto do lote
- O filtro de rascunhos por conta e projeto, a marca no editor e a hierarquia da página inicial já estão implementados.
- 85 testes passam.
- Não há trabalho em falta nesse lote.

## Limite que se mantém
Não vou ativar a entrada só com o email. Sem prova de posse, qualquer visitante que conheça um email autorizado ganharia acesso de administrador aos dados dos subscritores e aos envios. A entrada continua a ser por código. Não implemento alternativas com palavra-passe, código ou link mágico enquanto não as pedires.

## Detalhes técnicos
- Uma única inserção idempotente em user_roles (`role='admin'`) para o id dessa conta, com `on conflict (user_id, role) do nothing`.
- Verificação de leitura: devolve só um boolean.
