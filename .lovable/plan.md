# Emails recebidos dentro da Curadoria, e voltar a recebê-los

## O que aconteceu
- **Desde 03/10 às 16:32 não chegou nenhum email novo.** O último foi «California AG formally probed OpenAI…», da 8020ai.
- O encaminhamento dos emails (CloudMailin) continua a enviá-los para a app antiga da newsletter. A nova entrada nesta app nunca recebeu nenhum pedido.
- Também faltam aqui as credenciais dessa ligação. Sem elas, a entrada recusaria os emails mesmo que chegassem.
- Os emails que já estão guardados entram na lista quando são processados. Hoje, às 15:13–15:14, 15 emails deram notícias de origem «email»: 4 estão por rever, 2 foram aprovadas e 9 rejeitadas. Portanto a ligação entre o processamento e a lista funciona; o que falta é a chegada dos emails.

## O que vou fazer
1. **Novo separador «Emails» na Curadoria**, ao lado de «Notícias» e «Fontes e limites», com a caixa de emails recebidos completa: filtros, pré-visualização, reprocessar e apagar. A página antiga dentro da newsletter passa a abrir este separador.
2. **Ao processar um email**, as notícias que saírem dele aparecem logo em Notícias › Por rever, com a origem «Email» visível no cartão. A lista atualiza sozinha.
3. **Aviso de chegada no separador:** «Último email recebido: 03/10, 16:32». Fica a vermelho se não chegar nada há mais de 2 dias, para isto não voltar a passar despercebido.
4. **Voltar a receber emails (precisa de si):**
   - Peço-lhe o utilizador e a palavra-passe da ligação CloudMailin. Vão ficar guardados de forma segura no servidor.
   - O separador mostra o novo endereço de destino, sem as credenciais.
   - Tem de colar esse endereço no CloudMailin, no lugar do endereço da app antiga.
   - Depois envio um email de teste e confirmo que chega à caixa.

## Validação
- Testes: o aviso de atraso (mais de 2 dias fica a vermelho) e as notícias de origem email aparecem em «Por rever».
- Ecrã com sessão iniciada, em computador e a 375 px. Não vou processar emails com IA sem a sua autorização.

## Detalhes técnicos
- `src/pages/Curadoria.tsx`: separador `emails` que monta a página `EmailsPage` existente (extraída como componente na fonte vendorizada `emails.tsx.txt`, sem `FilaEntrada` duplicada). A rota `/newsletter/emails` redireciona para `/curadoria?separador=emails`.
- Credenciais: secrets `CLOUDMAILIN_AUTH_USER` e `CLOUDMAILIN_AUTH_PASS`. O destino é `nl-hooks/email-newsletter` (o URL já vem de `definicoes.functions`).
- Os 71 registos antigos «outro», sem data de receção, ficam como estão. Nada é apagado.
