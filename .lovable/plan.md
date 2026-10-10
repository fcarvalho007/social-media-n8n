# Colar notícias: cada link passa a ser uma notícia

## O que acontece hoje
O texto é dividido por mensagem. Quando uma mensagem tem mais de um link, só o primeiro é usado e os outros perdem-se.

No texto que colaste há 2 mensagens e 3 links:
- **Spotify e Joe Rogan:** traz o artigo da Reuters e o comunicado oficial da Spotify. O comunicado perdia-se.
- **Variety:** um link.

Por isso apareciam só 2 notícias.

## O que vou mudar (a regra que indicaste)
1. **Cada link diferente é uma notícia.** Uma mensagem com 2 links dá 2 notícias, cada uma com o seu link e o texto da mensagem como contexto.
2. As duas notícias saídas da mesma mensagem ficam marcadas em «Por rever» como **«mesma mensagem»**. Assim vês logo quando são a mesma história e rejeitas uma, se quiseres.
3. Mantém-se tudo o resto:
   - links repetidos (na colagem ou já existentes na base) continuam assinalados como repetidos;
   - links que não são notícias continuam a ser ignorados: imagens, links de partilha do WhatsApp e endereços sem caminho, como só o domínio.
4. **Custo:** cada link extra é uma chamada adicional à mesma IA de texto, registada na página Custos. Neste exemplo, 3 chamadas em vez de 2.

## Testes
- O texto da Spotify e da Variety dá 3 notícias.
- O texto anterior (YouTube, X e WhatsApp) dá 4, porque o post do YouTube inclui também o link do fórum de ajuda da Google.
- Um link repetido na mesma mensagem conta só uma vez.

## Detalhes técnicos
- Fonte vendorizada `processar-noticias.server.ts.txt`: depois de `separarBlocos`, expandir cada bloco com N URLs distintos (normalizados, sem domínio nu nem imagem) em N blocos com o mesmo texto e uma indicação «Notícia para o link: <url>». `extrairComIA` recebe esse URL como alvo e o resultado guarda `urlEfectivo` fixo.
- Diagnóstico: guardar `grupo` (ordem do bloco original); a revisão mostra «mesma mensagem». A interface vendorizada só mostra a etiqueta.
- `LIMITE_BLOCOS` aplica-se depois da expansão.
- Regenerar com `port-newsletter.py`, verificar o grafo edge, publicar nl-api e manter o teste em `src/test/`.
