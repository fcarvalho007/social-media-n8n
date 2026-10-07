# Título editável e GIPHY a funcionar

## 1. Mudar o título do carrossel com um clique

- No cabeçalho do carrossel (ex.: «IA influencia menos compras do que muitos mark…»), clicar no título transforma-o num campo de texto.
- Enter ou clicar fora guarda; Esc cancela. Título vazio não é aceite; máximo 300 caracteres.
- Mostra «A guardar…» discreto e, em caso de erro, repõe o título anterior com aviso.
- O novo nome aparece também na lista em /estudio/carrosseis e em /pending.
- Só quem pode editar o projeto consegue renomear; os outros veem o título sem edição.
- Não altera slides, conteúdo, versões nem a fonte original.

## 2. GIPHY sem resultados — causa provável e correção

Causa provável, encontrada no código mas ainda não confirmada com uma pesquisa real: o servidor só aceita imagens vindas de `media.giphy.com` e `i.giphy.com`. Hoje a GIPHY devolve os ficheiros a partir de `media0.giphy.com` a `media4.giphy.com`, por isso todos os resultados são descartados e a lista chega vazia. Como o ecrã vazio é igual ao estado inicial («Escreve pelo menos duas letras…»), parece que nada acontece.

Correção:
- Aceitar todos os subdomínios oficiais da GIPHY (`media*.giphy.com`, `i.giphy.com`), sempre só por https e sem seguir redirecionamentos para fora.
- Distinguir no painel «Sem resultados para "love"» de «ainda não pesquisaste», e mostrar erros da GIPHY (chave recusada, Clips não autorizados) em vez de silêncio.
- Primeiro passo da implementação: uma pesquisa real gratuita («love», GIFs e Stickers) para confirmar a causa antes de mexer.

## Detalhes técnicos

- `mc-motor`: nova ação `renomear_trabalho` (verifica `mc_pode_escrever`, valida UUID e título 1–300, atualiza só `brief.titulo` com o service role). Os clientes continuam sem escrita direta em `mc_trabalhos`.
- `src/services/motor.ts`: `renomearTrabalho`; `Cabecalho` em `Estudio.tsx` recebe `onRenomear` opcional; invalidar a cache da lista após guardar.
- `giphy.server.ts`: `urlGiphy` passa a aceitar `/^(media\d?|i)\.giphy\.com$/`; `PesquisaGiphy.tsx`: estado `pesquisado` para a mensagem «sem resultados».
- Testes: validação de hostnames GIPHY e renomear (vazio, demasiado longo, sem permissão). Deploy de `mc-motor`; typecheck e verificação do grafo Edge.
