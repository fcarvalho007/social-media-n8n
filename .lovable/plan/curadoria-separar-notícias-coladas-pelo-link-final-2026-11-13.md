# Curadoria: separar notícias coladas pelo link final

## Resposta
No texto colado há **3 notícias** (Espanha/TikTok, WhatsApp, eBay/Meta). Cada uma começa no título e termina no link.

## Causa confirmada (teste local, sem IA)
- Com linhas vazias entre parágrafos, o sistema encontra 3 notícias.
- Se o texto chegar só com mudanças de linha simples (comum ao copiar de emails, Notion, LinkedIn ou WhatsApp), encontra **1 notícia**: junta tudo num bloco e fica só com o primeiro link. As outras duas perdem-se sem aviso.
- Além disso, um link que já exista na base de dados é marcado «Duplicada» e não aparece na revisão. Isso também reduz o total.

## O que muda
1. **O link fecha a notícia.** Cada linha com um link termina uma notícia, e a linha seguinte começa outra. Isto funciona com ou sem linhas vazias.
2. **Vários links num bloco** dão origem a várias notícias, em vez de se perderem.
3. **Cabeçalhos soltos** sem conteúdo (como «Comunicados») não passam a título.
4. **Contagem visível:** a revisão mostra «Detetadas X · Novas Y · Duplicadas Z · Sem link W», para se perceber logo onde ficaram as outras.
5. Mantêm-se como estão: o modo WhatsApp exportado, o limite de 20 por colagem e a verificação de duplicados.

## Detalhes técnicos
- Alterar `separarBlocos` apenas na origem inerte `migration-reference/code/newsletter/src/lib/processar-noticias.server.ts.txt`. Depois regenerar com `scripts/port-newsletter.py` e correr `scripts/verificar-grafo-edge.py`.
- Segmentação genérica: percorrer linha a linha e fechar o bloco depois de uma linha com URL. Mantêm-se a fusão do rótulo de pré-visualização e a agregação de contexto sem URL. Os títulos de secção curtos e isolados no início são descartados.
- Acrescentar um resumo de contagens no modal `AdicionarNoticias.tsx.txt`, a partir do `diagnostico` que já existe.
- Testes em `src/test/curadoria-colar.test.tsx`: este exemplo dá 3 blocos com e sem linhas vazias, 2 links num só bloco dão 2 blocos e «Comunicados» não fica como título.
- Fica só no ramo local. Não se instala no servidor nem se gasta IA.
