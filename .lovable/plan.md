# Colar notícias na Curadoria do menu principal

## O que existe
Na newsletter, o botão «Adicionar notícias» abre uma janela com dois separadores:
- **Colar texto:** cola-se um bloco de texto, a IA identifica as notícias (até 3 blocos ao mesmo tempo), mostra-as para rever, avisa sobre duplicados e confirma.
- **Manual:** título, descrição, link e categoria.

Esta janela nunca foi colocada na Curadoria do menu principal.

## O que vou fazer
1. Em Curadoria › Notícias, acrescentar o botão **«Colar notícias»** junto à fila de entrada.
2. O botão abre exactamente a mesma janela da newsletter, sem alterar o seu funcionamento.
3. As notícias confirmadas entram em **«Por rever»**. Quando as aprovas, entram na edição em curso (como ficou ontem).
4. O separador «Manual» usa a edição em rascunho mais recente. Se não houver nenhuma, mostra uma mensagem clara em vez de falhar.
5. No fim, a lista é actualizada para mostrar logo as novas notícias.
6. Teste: o botão aparece em Curadoria e abre a janela com «Colar texto».

## Custos
Colar texto usa a mesma IA de texto que já existe na newsletter, com o custo registado na página Custos. Não há geração de imagens nem custos novos.

## Detalhes técnicos
- `src/pages/Curadoria.tsx`: estado `colarAberto`; monta `AdicionarNoticias` (de `@/newsletter/features/newsletter/partilhado/modais/AdicionarNoticias`) com `edicaoId` = rascunho de maior `numero` (lido pela camada de dados existente da newsletter), `isAdmin`, `nomeExibicao`, `notify` via toast; `onFechar` invalida as consultas e incrementa `versaoLista`.
- Sem alterações à fonte vendorizada nem ao gerador.
