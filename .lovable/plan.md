# Corrigir «Preparar e continuar» e acrescentar publicação da crónica no envio

## Causa (confirmada no código)
O aviso «Preparar e publicar antes do envio?» é desenhado fora da janela de envio. Enquanto essa janela está aberta, tudo o que está fora dela fica bloqueado a cliques — por isso «Cancelar» e «Preparar e continuar» não fazem nada. Nenhum envio nem publicação chegou a ser pedido (não há registo porque o pedido nunca saiu).

## O que muda
1. **Aviso clicável**: o aviso passa para dentro da janela de envio; os dois botões passam a funcionar. O texto deixa de dizer sempre «o teste» — diz «a edição» num envio real.
2. **Botão «Publicar crónica no site»** na secção «Rever antes de enviar», no cartão da crónica, quando ainda não há artigo em FredericoCarvalho.pt. Usa a publicação já existente (a mesma do painel «Publicar → Destinos»); no fim mostra o endereço confirmado e o URL fica gravado automaticamente.
3. **Registo visível do envio**: ao carregar em «Enviar edição», a janela mostra passo a passo o que acontece — a publicar a crónica, a publicar a página web, a preparar cada lista, enviado/falhou — com hora e mensagem de erro concreta, em vez de ficar silenciosa.

Nada é enviado nem publicado durante a correção; só ao clicar o utilizador.

## Detalhes técnicos
- Fonte: `migration-reference/code/newsletter/src/features/newsletter/partilhado/EnvioNewsletter.tsx.txt` (mover o `alertdialog` para dentro de `DialogContent`, z-index acima do conteúdo; texto condicional `isReal`).
- Botão usa `publicarCronicaFn` (destinos.functions) via `useServerFn`, invalida `["revista-destinos", edicaoId]`; mesma confirmação do PainelDestinos.
- Registo: lista local derivada de `progresso` + eventos da fase `publicarConteudos` em `useEnvioNewsletter.ts.txt` (sem alterar o servidor).
- Regenerar com `python3 scripts/port-newsletter.py`; `tsgo`, testes, `verificar-grafo-edge.py`; validar clique no aviso com Playwright sem confirmar envio.
