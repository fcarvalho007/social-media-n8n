# Imagens no compositor: Pexels + Unsplash juntos, redesenho sem IA, prompt sempre editável

## 1. Pesquisa de fotos (Pexels + Unsplash)
- No painel «Imagens» do compositor, novo separador **Fotos** (entre Biblioteca e Carregar): uma só caixa de pesquisa e uma só grelha com os resultados das duas plataformas, intercalados. Cada foto tem um selo pequeno «Pexels» ou «Unsplash» e o nome do autor.
- O botão «Pexels» do painel Imagem do slide passa a «Fotos» e abre esta mesma pesquisa, já preenchida com os termos sugeridos para o slide.
- Se uma das plataformas falhar ou não responder, aparecem só os resultados da outra, com uma nota curta. Nunca há uma repetição automática.
- Ao usar uma foto, ela é copiada para as imagens do projeto com o crédito do autor. No caso da Unsplash, o sistema avisa a Unsplash de que a foto foi descarregada, como as regras deles exigem. É gratuito.

## 2. Chave da Unsplash
- Guardar a Access Key que enviou como segredo do servidor, `UNSPLASH_ACCESS_KEY`. A Secret Key não é necessária para pesquisar, por isso não é guardada.
- Nota: a chave ficou visível na captura de ecrã. Se quiser, gere uma nova no painel da Unsplash e eu substituo-a.

## 3. Redesenhar sem IA
- A janela «Redesenhar» deixa de ter botões de imagem IA, tal como pediu. Só serve para escolher a composição.
- Depois de aplicar uma composição, escolhe a imagem no painel Imagem do slide: Biblioteca, Fotos (Pexels/Unsplash), Carregar, Gerar com IA ou Sem imagem.

## 4. Imagem IA com prompt
- Isto já existe: «Gerar IA» abre uma descrição sugerida que pode editar livremente. O custo aparece antes de confirmar.
- Fica agora garantido em todos os pontos de entrada: o prompt aparece sempre editável antes de qualquer pedido pago, e o prompt usado fica guardado no slide para poder ser reutilizado.

## Testes
- Os resultados das duas plataformas juntam-se e intercalam-se, mesmo quando uma falha.
- O endereço da Unsplash é validado e a descarga é registada.
- A janela «Redesenhar» não mostra nenhum botão de IA.
- 1 pesquisa real gratuita na Unsplash para confirmar a chave.

## Detalhes técnicos
- `_shared/motor/unsplash.ts` + `unsplash.server.ts`: pesquisa (`/search/photos`, orientação portrait), validação de origem `images.unsplash.com`, `download_location` chamado ao usar.
- `mc-motor`: ações `fotos_pesquisar` (Pexels + Unsplash em paralelo, `Promise.allSettled`) e `unsplash_usar`; `mc_assets.origem` ganha `unsplash` (migração aditiva, se a coluna tiver restrição).
- `src/features/motor/PesquisaFotos.tsx` substitui `PesquisaPexels` em `PainelInserir` e `SeletorImagens`.
- `PainelRedesenhar.tsx`: retirar botões e estado da IA (Regenerar, «Imagem IA», aplicarSemIA deixa de ser necessário).
- `PainelImagemSlide.tsx`: o prompt editado grava `comp.visual_prompt`.
