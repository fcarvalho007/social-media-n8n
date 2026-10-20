# Falha ao publicar (20/10/2026) — causa e correções

## Causa confirmada (só leitura)
1. **Conta sem papel editorial.** As 3 tentativas de hoje foram feitas com a segunda conta autorizada, que não tem papel atribuído (nem admin nem editor). Desde a instalação de 18/10, o serviço de publicação exige papel editorial antes de qualquer envio e recusa o pedido («Sem permissão editorial»). A última publicação bem-sucedida é de 16/10, antes dessa regra.
2. **O ecrã esconde o motivo.** Ao receber a recusa, o ecrã tenta ler a resposta como texto, mas ela chega noutro formato; isso rebenta e aparece «Algo correu mal mas não conseguimos identificar o quê».

Nada saiu para Instagram/LinkedIn: zero reservas de publicação, zero tentativas registadas. Sem risco de duplicado.

## Correções propostas
1. **Atribuir o papel «editor» à segunda conta** (precisa da tua autorização explícita, porque mexe em permissões). Alternativa: publicar só com a conta principal, que é admin.
2. **Mostrar o erro real no ecrã**: ler corretamente a resposta de recusa em `usePublishWithProgress.ts` (e no fluxo equivalente do Review), para que apareça «Sem permissão editorial» ou o motivo concreto, guardado também no registo da publicação.
3. **Repor a publicação de 21:01 presa em «a publicar»** para «falhada», com autorização, para não ficar pendente no calendário.
4. **Observação:** as publicações de hoje ficaram sem marca/projeto associado; verifico porque a escolha do Estúdio não chegou, sem alterar registos antigos.
5. Teste automático: recusa 403 mostra a mensagem do servidor; depois, nova tentativa feita por ti.

## Fora de âmbito
Sem alterar segredos, quotas, cron, nem as proteções de duplicados.
