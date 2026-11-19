# Vídeo 4:5 para a feed (Instagram e LinkedIn)

## O que confirmei
- **Instagram:** a API já não tem um «vídeo de feed» separado. Um vídeo único é sempre publicado como Reel. Com a opção «partilhar na feed» ligada, que é o valor por omissão, aparece também na grelha do perfil e na feed. Um 4:5 é aceite e mostra-se em 4:5 na feed.
- **LinkedIn:** «Post com Legenda» já envia vídeo para a feed. O 4:5 é aceite.
- **O que está errado no Estúdio:**
  - O Reel obriga a 9:16. Com um 4:5 aparece o aviso «fora do rácio 9:16 — será cortado».
  - O rácio ideal do Reel só admite 9:16.
  - A partilha na feed não é enviada de forma explícita.
  - Não há nenhum cartão para «vídeo na feed». O «Vídeo curto» também escolhe YouTube Shorts e TikTok, que exigem 9:16.

## O que muda
1. **Novo cartão «Vídeo na feed»**, com o texto «4:5 ou 1:1 · Instagram e LinkedIn». Escolhe:
   - Instagram → «Vídeo na feed»;
   - LinkedIn → «Post com Legenda».
   Não escolhe Shorts, TikTok nem Stories.
2. **Instagram passa a ter a opção «Vídeo na feed»** ao lado de «Reel». Por baixo, é enviado como Reel com a partilha na feed explicitamente ligada.
   - Aceita rácios entre 4:5 e 1:1, sem cortes.
   - Rejeita imagens.
   - Aceita no máximo 90 s.
3. **«Reel» continua 9:16**, mas o aviso passa a ser correto. Em vez de dizer que vai cortar, diz que um vídeo 4:5 deve usar «Vídeo na feed». O Estúdio não corta o vídeo; quem decide o enquadramento é o Instagram.
4. **LinkedIn:** a descrição passa a «Texto, imagens ou vídeo».
   - Aceita 1 vídeo, até 10 min.
   - Não deixa misturar vídeo com imagens.
   - O 4:5 é aceite sem aviso.
5. **Antes de publicar,** o resumo mostra «Instagram: vídeo na feed (também nos Reels)».

## Detalhes técnicos
- `src/types/social.ts`: novo formato `instagram_feed_video`, com `requiresVideo`, 1 média e `maxDuration` 90. A descrição de `linkedin_post` também muda.
- `mediaValidation.ts` e `mediaAspectValidator.ts`: `instagram_feed_video` aceita de 0,8 a 1,0 com tolerância e não entra em `VERTICAL_FORMATS`. O texto do aviso do Reel é corrigido.
- Novo preset em `VisualPresets.tsx`, no cartão de formatos.
- Mapas das funções do servidor (`publish-to-getlate`, `notify-publication-failure`, `submit-to-n8n`, a chave de reserva social e as métricas): `instagram_feed_video` passa a ser tratado como `contentType: 'reels'` com `shareToFeed: true`. O Reel normal também envia `shareToFeed: true`.
- Testes novos:
  - o payload de `instagram_feed_video` leva `reels` e `shareToFeed: true`;
  - o 4:5 não gera aviso neste formato;
  - o 4:5 gera o aviso correto no Reel.
- `verificar-grafo-edge.py` depois das alterações.
- **Por decidir:** a função de publicação precisa de ser instalada no servidor para isto funcionar no envio real. Fica no ramo local até autorização. Não faço nenhuma publicação de teste real.
