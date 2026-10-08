# Concluir o design das peças (pendentes)

Fecha os quatro pontos que ficaram abertos no plano anterior. Não toca em newsletter, curadoria, roteiros nem publicação. Não faz pedidos de IA pagos e não publica.

## 1. Didático «Cartões» como cartões reais
- Quando a página tem unidades separáveis (lista, passos, parágrafos curtos), cada unidade passa a ser um cartão próprio, com fundo, margem e número.
- Quando não há unidades separáveis, a composição é recusada com o aviso «Esta página não tem passos separáveis» e a página fica como estava.
- Nunca reduz a letra nem corta texto; se os cartões não couberem, aparece o aviso «texto não cabe».

## 2. Zonas de leitura próprias para stories (1080×1920)
- As cinco direções passam a usar margens e zonas seguras de story (topo e base livres para a interface da rede social).
- Carrosséis e posts mantêm-se exatamente iguais.

## 3. Comparação antes/depois no painel «Direção visual»
- Ao escolher uma direção, tipografia ou paleta, o painel mostra a página atual e a versão proposta lado a lado.
- Aplicar, Desfazer e Cancelar mantêm-se.

## 4. Alcance por página e por elemento
- Novas opções de alcance: «Todo o carrossel», «Esta página» e «Elemento selecionado» (este último só para tipografia e paleta).
- As restantes páginas e elementos ficam intocados.

## 5. Validação
- Testes automáticos: cartões só com unidades separáveis; story respeita zonas seguras; alcance por página e por elemento não altera o resto; documentos antigos abrem iguais.
- Capturas do compositor em desktop e a 375 px com sessão de pré-visualização. Se a sessão continuar sem acesso ao projeto, a validação fica com uma peça de teste local e a limitação é indicada.

## Fora de âmbito
- DM Serif Display mantém só o peso normal (decisão já tomada).
- GIPHY, os três testes antigos e as permissões dos roteiros não são mexidos neste plano.

## Detalhes técnicos
- `motor/modelos.ts`: composição `didatico-cartoes` com deteção de unidades (`sequencia`/parágrafos) e recusa explícita.
- `motor/composicoes.ts`: zonas seguras por formato (`formatoPagina` 1080×1920), aplicadas pelas direções.
- `PainelDirecaoVisual.tsx`: pré-visualização antes/depois numa cópia em memória; alcance `documento | pagina | elemento` passado a `aplicarEstilo`/recolorir por `papelCor`.
- Gravação pelo fluxo de versões existente; deploy de `mc-motor` após `check:edge`.
