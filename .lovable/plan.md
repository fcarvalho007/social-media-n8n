# Publicação ainda falha — revisão de 21/10/2026

## Estado atual (só leitura)
- **Resolvido:** a segunda conta já tem papel de administração; a publicação de 21:01 já não está presa em «a publicar»; o ecrã passa a mostrar o motivo real quando o servidor recusa (teste aprovado).
- **Não resolvido:** a tentativa de hoje às 09:30 (Lisboa) falhou outra vez com «Erro inesperado no processamento» nas duas redes.
- Continua a não haver reservas de publicação nem registos do serviço de publicação. Ou seja, o pedido **nem chega ao servidor**: a falha acontece no navegador antes do envio. A causa de ontem (permissão) era real, mas há uma segunda falha à frente dela.
- Esta mensagem aparece quando o ecrã apanha uma exceção sua, e o detalhe técnico (`originalError`) não fica guardado em lado nenhum. Por isso ainda não sei a causa exata.

## O que fica por fazer
1. **Guardar o detalhe técnico** da exceção no registo da publicação (sem dados sensíveis), para que a próxima falha diga exatamente onde parte.
2. **Encontrar a causa**: reproduzir o fluxo até ao instante anterior ao envio, sem chegar a publicar de verdade, e confirmar em que passo rebenta (preparação do PDF do LinkedIn, legenda por rede ou chamada ao serviço).
3. **Corrigir esse passo** e acrescentar um teste para o caso.
4. **Confirmar com uma nova tentativa tua**, no ecrã de pré-visualização (a versão publicada só recebe as correções quando fizeres Publish).
5. Pendente de ontem: a publicação de 21:01 ficou «aprovada» em vez de «falhada»; confirmar que não aparece como pendente no calendário.

## Atalho
Se abrires o «i» de um dos cartões vermelhos e me enviares o texto técnico, os passos 1 e 2 ficam dispensados.
