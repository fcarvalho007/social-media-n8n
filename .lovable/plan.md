# Concluir «Vídeo na feed» e garantir o funcionamento

## O que fica feito
1. **LinkedIn não mistura vídeo com imagens.** Um post do LinkedIn aceita imagens até 9 ou um único vídeo (até 10 min). Se houver vídeo e imagens juntos, ou mais de um vídeo, aparece um erro claro: «O LinkedIn aceita um vídeo ou até 9 imagens, não ambos.»
2. **Instagram «Vídeo na feed» só com um vídeo:** imagens dão erro, «Este formato só aceita um vídeo».
3. **Resumo antes de publicar:** em «Opções por rede», o Instagram passa a mostrar «vídeo na feed · também nos Reels», em vez de nada ou de «reel».
4. **Trocar o vídeo:** confirmar que «Editar» na secção «Média» deixa substituir o vídeo. Se não deixar, corrijo-o.
5. **Testes automáticos novos:**
   - um vídeo 4:5 passa sem avisos;
   - um vídeo 9:16 avisa e sugere «Reel»;
   - uma imagem dá erro;
   - um vídeo com mais de 90 s dá erro;
   - no LinkedIn, vídeo com imagens dá erro;
   - o pedido enviado leva «reels» com a partilha na feed ligada.
6. **Simulação completa no ecrã, sem publicar:**
   - repetir o percurso com o vídeo 4:5 e a legenda;
   - testar os três casos de erro no próprio ecrã;
   - carregar em «Publicar Agora» com o envio bloqueado no navegador, para ler o pedido que iria sair. Tem de levar o Instagram como vídeo na feed, o LinkedIn com o vídeo e a legenda completa em ambos. Nada chega às redes. Se o processo criar um registo de tentativa antes de enviar, paro aí e não o faço.

## Fica para a sua autorização
- Instalar a função de publicação no servidor. Sem isso, uma publicação real ainda segue a versão antiga e não liga a partilha na feed de forma explícita (o Instagram liga-a por omissão).

## Detalhes técnicos
- `src/lib/formatValidation.ts`: regras para `linkedin_post` (vídeo e imagem juntos, ou mais de um vídeo) e para `instagram_feed_video` (só vídeo).
- `NetworkOptionsCard.tsx`: token de resumo para `instagram_feed_video`.
- Testes em `src/test/video-feed-instagram.test.ts`, com `validateFormat` e `mediaAspectValidator` (mock de `getVideoRatio`/metadados). O payload do servidor é verificado por leitura do código.
- Playwright: `page.route` aborta `publish-to-getlate`, `submit-to-n8n` e qualquer escrita em `publication_attempts`/`posts`. Antes de clicar, confirmo pelo código que nada escreve na base de dados antes da chamada.
