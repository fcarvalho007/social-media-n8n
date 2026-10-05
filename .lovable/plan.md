# Corrigir o ecrã «Criar SM»

## Diagnóstico (confirmado no código)
Na ronda anterior só foi atualizado o ecrã que aparece depois de escolher «Assistido por IA». O primeiro ecrã de «Criar SM» (escolha entre Manual e Assistido por IA) ficou como estava. O cartão «Assistido por IA» ainda mostra os botões antigos: Carrossel (Forms), Stories (Forms) e Post (Forms). Por isso continua a aparecer a versão antiga. Foi uma falha de cumprimento, não um erro do sistema.

## O que muda
- No cartão «Assistido por IA» do primeiro ecrã:
  - a ação principal passa a ser «Criar carrossel», que abre o motor novo;
  - ficam como ações secundárias «Meus carrosséis» e «Carrosséis da crónica»;
  - Stories e Post individual assistidos aparecem como «Em construção», sem abrir nada;
  - o texto do cartão deixa de prometer funções que ainda não existem (por exemplo, «Carrossel, Stories ou Post individual»).
- Os botões Forms saem deste cartão. O Carrossel (Forms) continua disponível só na secção «Versão anterior · n8n», que aparece aberta por baixo.
- O cartão Manual e o «Definir como predefinição» não mudam.
- Nenhuma alteração a dados, rotas, permissões ou integrações.

## Verificação
- Tipos e montagem do projeto.
- No browser, a 1280 px e a 393 px: abrir «Criar SM» pelo menu, confirmar que já não há botões Forms no cartão IA e que «Criar carrossel» abre o motor novo.
- Confirmar que a secção «Versão anterior · n8n» continua acessível e mantém o link original.

## Detalhes técnicos
- `src/components/ModeSelector.tsx`: substituir os três botões Forms por links para `/estudio/carrosseis/novo`, `/estudio/carrosseis` e `/estudio/redes-sociais`, mantendo `handleModeSelection('ia')`.
- `src/pages/Pending.tsx`: mostrar `ActionButtons` (que já contém a secção legada aberta) por baixo do seletor, para o n8n ficar visível também no primeiro ecrã.
