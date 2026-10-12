# Corrigir os três testes antigos que falham

## O que se verificou
- **Endereços nos emails (problema real):** o formato clássico da newsletter (versão HTML, versão texto e o cabeçalho de cancelamento com um clique) ainda tem escritos à mão os links da app antiga (newsletter-digital-sprint) para gerir/cancelar a subscrição e para a foto do autor. A newsletter atual («revista») já usa o endereço público configurado.
- **Fontes da Curadoria (teste desatualizado):** o ecrã mostra «1 de 1 fontes ativas»; o teste procura o mesmo texto com ponto final. O comportamento está correto.
- **Classificação de erros da IA:** quando falta a chave da DeepSeek, a resposta devia ser «erro antes do pedido», mas sai «desconhecido». A causa ainda não está confirmada; o primeiro passo é confirmá-la.

## O que muda
1. Formato clássico: os links de gerir/cancelar subscrição e de cancelar com um clique passam a vir do mesmo endereço público que a newsletter atual já usa. A foto do autor passa a usar a mesma imagem da newsletter atual. Nada é enviado nem publicado.
2. Teste da Curadoria: passa a procurar o texto atual, sem o ponto final.
3. IA: confirmar porque é que a chave em falta não é detetada antes do pedido e corrigir no código, para que uma chave em falta dê sempre uma mensagem clara e nunca chegue a fazer o pedido.

## Detalhes técnicos
- Editar apenas as fontes `.txt` em `migration-reference/code/newsletter/src/lib/newsletter-engine/` (`gerar-html-newsletter.server.ts.txt`, `gerar-texto-newsletter.server.ts.txt`, `egoi.server.ts.txt`) e as regras de substituição em `scripts/port-newsletter.py` que reinjetam esses hosts (linhas ~373–377); reutilizar o helper de links já usado por `revista/render-email.server.ts`.
- `src/test/curadoria-fontes.test.tsx`: ajustar o texto esperado.
- `supabase/functions/_shared/motor/gateway.server.ts`: investigar `chaveDeepSeek()` (valor por omissão do parâmetro `chave`) e garantir que chave vazia devolve `erro_antes_pedido`; se a fonte for gerada, editar a origem.
- Regenerar, correr `scripts/verificar-grafo-edge.py`, a suite completa e `tsgo`; publicar apenas as funções afetadas (`nl-newsletter`, `nl-api` se aplicável).
