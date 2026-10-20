# Falha ao publicar (20/10/2026) — diagnóstico e correção

## O que se verificou (só leitura)
- 3 tentativas hoje (20:30, 20:37 e 21:01 Lisboa), sempre Instagram carrossel + LinkedIn PDF.
- As duas primeiras ficaram «falhada» com «Erro inesperado no processamento» nas duas redes; a de 21:01 ficou presa em «a publicar».
- Nenhum pedido chegou ao serviço de publicação: sem reservas de publicação, sem tentativas registadas (a última é de 16/10, com sucesso) e sem registos das funções de publicação.
- Esta mensagem é gerada pelo próprio ecrã quando ocorre uma exceção no navegador, no passo entre a preparação dos ficheiros e o envio (`usePublishWithProgress.ts`, linhas 741–890). Logo, nada foi publicado e não há risco de duplicado.
- A causa exata não está confirmada: o erro original só aparece no detalhe (ícone «i») do cartão e não ficou nos registos.

## Plano
1. Reproduzir no navegador com sessão e um rascunho QA, interrompendo antes de qualquer envio real, para obter o erro original (`originalError`).
2. Corrigir a causa no passo identificado (provavelmente após a alteração de 19/10 ao fluxo por projeto), sem tocar nas proteções de duplicados.
3. Guardar o erro original no registo da publicação, para que a próxima falha não fique «por classificar».
4. Repor a publicação presa em «a publicar» para «falhada», só com a tua autorização.
5. Teste automático para o caso, e nova tentativa de publicação feita por ti.

## Pedido rápido
Se abrires o «i» de um dos cartões e me enviares o texto técnico, o passo 1 fica dispensado.
