# Corrigir «Usar notícia» na criação de conteúdo

## Diagnóstico confirmado

O pedido não está a falhar: reproduzi o clique com sessão real e a leitura da notícia respondeu com sucesso. A notícia fica selecionada no estado do ecrã.

O problema é visual e de fluxo:
- a confirmação «Fonte escolhida» é renderizada apenas depois da lista completa de notícias, ficando fora da área visível;
- o botão mantém o texto «Usar notícia», sem indicar qual cartão foi escolhido;
- «Seguir para Narrativa» parece disponível antes da escolha, mas ao clicar não avança enquanto não existir uma fonte válida, sem explicar o motivo.

## Alteração

1. Mostrar imediatamente no cartão escolhido o estado «Notícia selecionada» e impedir cliques repetidos durante a leitura.
2. Depois da seleção, substituir a lista pela confirmação da fonte escolhida, com ações claras para continuar ou escolher outra notícia.
3. Só disponibilizar «Seguir para Narrativa» quando existir uma notícia válida; se ainda faltar uma escolha, apresentar essa indicação junto ao controlo.
4. Manter intactos o conteúdo, a proveniência e o funcionamento da curadoria; não gerar IA, criar conteúdo, publicar ou alterar dados nesta correção.

## Validação

- Testar o clique real numa notícia aprovada e confirmar a mudança visível imediata.
- Confirmar que «Escolher outra notícia» regressa à lista sem perder filtros desnecessariamente.
- Confirmar que o avanço para Narrativa só ocorre com a fonte carregada.
- Cobrir sucesso e erro de leitura com testes do fluxo e validar o ecrã atual em desktop.

## Ficheiros previstos

- `src/features/curadoria/CuradoriaNoticias.tsx`
- `src/pages/CarrosselNovo.tsx`
- testes focados da curadoria e criação de formatos
