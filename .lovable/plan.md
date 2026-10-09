# Custos da newsletter só na página Custos, sem pedidos de IA por contar

## O que verifiquei
- A página **Custos** principal já junta o registo de IA da newsletter com o do Estúdio (carrosséis, imagens). Tudo o que a newsletter regista aparece lá.
- Nos últimos 14 dias a newsletter registou 298 pedidos de IA (DeepSeek), cerca de 0,14 USD. Todos têm custo calculado e nenhum ficou como «desconhecido».
- **Mas há pedidos que não ficam registados.** Ao processar emails (na chegada e ao reprocessar), dois tipos de pedido à IA descartam a contagem:
  - a leitura de ferramentas;
  - a leitura de blocos de ligações.
  Esses custos perdem-se. A extração principal dos emails também tem de ser confirmada: devolve a contagem, mas não encontrei onde ela é guardada.
- **Os emails processados hoje ficaram registados como «curadoria_fila»**, sem distinção de «email». A página Custos não os separa.
- Fora da IA de texto, a newsletter não gera imagens pagas (só serve imagens guardadas), por isso não há outros custos escondidos.

## O que vou fazer
1. **Contar todos os pedidos de IA dos emails:** a leitura de ferramentas, os blocos de ligações e a extração principal passam a ficar registados com tokens e custo, tanto na chegada como ao reprocessar.
2. **Origem certa:** os pedidos feitos a partir de emails ficam como «email», separados da «curadoria_fila» (RSS).
3. **Proteção automática:** um teste percorre o código da newsletter e falha se algum pedido à IA não tiver registo de custo. Um pedido novo sem contagem não passa despercebido.
4. **Página Custos:** os nomes técnicos das ações da newsletter passam a texto legível, por exemplo «Curadoria (RSS)», «Emails», «Sugerir assunto», «Carrossel da crónica» e «Confirmar repetição». Há também um filtro «Newsletter».
5. **Retirar «Custos de processamento» da newsletter:** a entrada sai do menu da newsletter e o endereço antigo abre a página Custos já filtrada por Newsletter.

## Validação
- Testes: nenhum pedido à IA fica sem registo; os emails ficam com a origem «email»; o endereço antigo abre Custos.
- Comparo os totais da newsletter na página Custos com o registo da base de dados: têm de coincidir ao cêntimo.
- Ecrã com sessão iniciada, em computador e a 375 px. Não vou fazer nenhum pedido pago.

## Limitação
- O que ficou por registar no passado não pode ser recuperado. A correção só vale daqui para a frente. O valor perdido é pequeno, cerca de cêntimos.

## Detalhes técnicos
- Fonte vendorizada: `reprocessar-email.server.ts.txt` e `hooks/email-newsletter.ts.txt`. O `chamarBruto` / `chamarDeepSeekBruto` passa a inserir `nl_ia_uso` com `r.usage` (origem `email`). A extração principal tem de fazer o mesmo, se o pipeline não o fizer. `fila-curadoria.server.ts.txt` passa a origem `email` aos emails.
- Teste estático sobre `supabase/functions/_shared/nl-app`: cada chamada a `chamarDeepSeek` ou `chamarIaExtrator` tem de estar num ficheiro ou função que regista `nl_ia_uso`.
- `src/pages/Custos.tsx` e `features/custos/agregar.ts`: mapa de rótulos e filtro por origem `nl:`. Redirect de `/newsletter/custos` para `/custos?origem=newsletter`. Retirar a ligação do menu da newsletter através do gerador.
- Regenerar com `port-newsletter.py`, correr `verificar-grafo-edge.py` e publicar `nl-api` e `nl-hooks`.
