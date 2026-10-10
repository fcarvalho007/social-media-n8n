# Colar notícias: deixar de descartar notícias verdadeiras

## O que aconteceu
O texto colado foi separado corretamente em 3 notícias. Todas tinham link e nenhuma era repetida. Duas entraram em «Por rever». A terceira («WhatsApp is testing a new Contacts tab…») foi descartada por ter sido tomada por uma página institucional.

**Causa confirmada:** o filtro de lixo procura palavras como «contactos», «subscrição», «login», «feedback», «sponsor», «copyright», «careers» ou «learn more» em qualquer parte do título. Basta uma notícia falar destes temas para ser apagada, mesmo sendo uma notícia real. Testei com o título desta notícia e o filtro respondeu «página institucional».

O mesmo filtro é usado nos emails recebidos, nos RSS e no texto colado. Por isso, outras notícias podem ter sido perdidas da mesma forma.

## O que vou mudar
1. Um título só é tratado como página institucional quando é **o próprio rótulo**, com poucas palavras: «Contactos», «Política de privacidade», «Sobre nós», «Gerir subscrição», «Ler mais», «Login».
2. Um título de notícia com frase completa passa sempre, mesmo que mencione esses temas. Por exemplo: «WhatsApp testa separador de Contactos», «Netflix sobe preço da subscrição», «Google muda o login das contas».
3. Os restantes filtros ficam como estão: títulos vazios, títulos de uma ou duas palavras, links de rastreio e nomes de sites.
4. A notícia do WhatsApp não é recuperada automaticamente. Basta voltares a colar o texto: as duas que já entraram aparecem como repetidas e a terceira passa a ser detectada.

## Testes
- O teu bloco de 3 notícias dá 3 notícias.
- «WhatsApp is testing a new Contacts tab», «Netflix sobe preço da subscrição» e «Google muda login» passam.
- «Contactos», «Política de privacidade», «Termos de serviço», «Gerir preferências de email», «Ler mais» e «Sobre nós» continuam a ser descartados.

## Detalhes técnicos
- A alteração é feita na fonte `migration-reference/code/newsletter/supabase/functions/_shared/ruido-titulo.ts.txt`. Depois corre-se `scripts/port-newsletter.py` e `verificar-grafo-edge.py`, e publicam-se de novo as funções que usam o filtro (nl-api, nl-hooks e o processamento da curadoria).
- `RUIDO_TITULO` deixa de procurar em qualquer parte do título. Passa a aplicar-se quando o título tem no máximo cerca de 6 palavras ou quando começa pelo rótulo e é curto. Frases de rodapé inequívocas («this email was sent», «view in browser», «all rights reserved») continuam a ser procuradas em qualquer parte.
- Fica um teste em `src/test/` que usa o filtro gerado.
