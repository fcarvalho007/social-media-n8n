## Objetivo
Corrigir os dois problemas no `/manual-create`:
1. O TikTok não pode continuar bloqueado quando a legenda específica dessa rede já está dentro do limite.
2. Ao alternar entre legenda unificada e separada, o texto não pode ser cortado visualmente nem a caixa pode encolher de forma a esconder conteúdo.

## O que vou alterar
1. Ajustar a validação para usar a legenda efetiva por rede
- Rever `formatValidator.ts` para deixar de revalidar comprimento de legenda com base na legenda global quando existem `networkCaptions`.
- Garantir que o bloqueio de publicação depende da legenda efetiva da rede ativa/selecionada e não de texto residual da legenda unificada.
- Manter `captionValidator.ts` como fonte principal para limites por rede, evitando falso positivo no TikTok.

2. Corrigir a preservação visual e funcional do editor de legendas
- Atualizar `NetworkCaptionEditor.tsx` para recalcular a altura da `textarea` sempre que:
  - se ativa o modo “Separadas”;
  - se muda de aba/rede;
  - o valor inicial é copiado da legenda unificada;
  - se volta do modo separado para unificado.
- Garantir que o valor completo continua presente no estado, sem truncamento automático durante edição.
- Garantir que o campo mantém uma altura mínima estável e cresce para mostrar todo o conteúdo disponível, mesmo com `TabsContent` montado mas oculto.

3. Reforçar cobertura de testes
- Adicionar/ajustar testes para validar:
  - TikTok deixa de emitir erro quando `networkCaptions.tiktok` está <= 300, mesmo com legenda global longa;
  - alternar para “Separadas” copia o texto completo sem perda;
  - mudar entre redes não volta a mostrar uma caixa com altura insuficiente para o conteúdo;
  - regressar a “Unificada” não destrói as legendas específicas já editadas.

## Ficheiros prováveis
- `src/lib/validation/validators/formatValidator.ts`
- `src/lib/validation/validators/formatValidator.test.ts`
- `src/components/manual-post/NetworkCaptionEditor.tsx`
- `src/components/manual-post/NetworkCaptionEditor.test.tsx`
- Possivelmente `src/pages/ManualCreate.tsx` se for preciso estabilizar o toggle/estado

## Resultado esperado
- O erro do TikTok desaparece assim que a legenda específica dessa rede respeita os 300 caracteres.
- O botão de avançar/publicar deixa de ficar bloqueado por um falso erro.
- Ao fazer switch para legendas separadas, o texto completo continua visível e editável.
- A caixa de texto não encolhe nem dá a sensação de que parte da legenda foi apagada.

## Detalhes técnicos
- O problema atual parece resultar de duas fontes:
  - `formatValidator` ainda usa `ctx.caption` para `validateAllFormats(...)`, o que pode reintroduzir validação legada baseada na legenda global.
  - `NetworkCaptionEditor` só faz auto-resize no `onChange`; quando a aba muda ou o conteúdo é copiado programaticamente, a altura não é recalculada.
- A correção seguirá a regra já registada em memória: truncamento apenas no envio, nunca durante edição.

## Checkpoint
- ☐ TikTok deixa de bloquear quando a legenda separada está válida
- ☐ Alternar para “Separadas” não corta nem esconde texto
- ☐ A caixa de texto mantém altura suficiente após switch entre redes
- ☐ Legendas específicas continuam preservadas sem truncamento destrutivo