# Novo carrossel: menu visível, novo passo «Fonte» e imagens de apoio

## 1. Menu do topo (erro confirmado)
Quem esconde o menu da plataforma em «Novo carrossel» é uma regra antiga: trata `/estudio/carrosseis/novo` como se fosse o editor isolado de um carrossel. Passa a esconder o menu só no editor de um carrossel já existente e no editor de prova. No passo «Fonte» o menu ☰ e o caminho «Criar SM › Criar carrossel» voltam a aparecer, e a barra de passos fica por baixo.

## 2. Novo desenho do passo «Fonte» (direção escolhida: «Iconosquare modern workspace»)
- O fundo, as superfícies e os textos seguem as cores do tema claro dos carrosséis; o verde #3E5B46 substitui o roxo da proposta. Títulos em Montserrat, texto em Inter.
- Barra de passos centrada: os números ficam por cima dos rótulos e o passo ativo fica a verde.
- Linha de título com «Que conteúdo vamos transformar?» e uma frase curta à esquerda. À direita fica «Marca / projeto», com a explicação longa dentro de um «?».
- Grelha de duas colunas no computador e de uma coluna no telemóvel:
  - **Esquerda:** um cartão com os separadores Texto / Link / PDF no topo e a área de texto maior. No rodapé do cartão aparecem o estado do rascunho e o número de palavras.
  - **Direita:** o cartão «Imagens de apoio» e o botão principal «Seguir para Narrativa».
- Mantém-se tudo o que hoje funciona: leitura de link e PDF, confirmação de leitura parcial, avisos, recuperação do rascunho, idioma, alvo de 44 px e o fluxo dos passos seguintes.

## 3. Imagens de apoio (gráficos, tabelas)
- Carregar até 6 imagens (PNG/JPG/WebP, até 10 MB cada), guardadas no armazenamento que o motor já usa.
- Cada imagem tem:
  - um campo «O que mostra esta imagem?», onde se escreve ou cola o que o gráfico ou a tabela mostra;
  - a opção «Usar num slide», que a deixa disponível no Design, como as imagens da biblioteca;
  - um botão para remover.
- O texto de cada imagem entra no contexto como fonte própria, com uma referência § «Imagem N». A IA pode citar esses números como factos da fonte, tal como faz com o texto colado.
- **«Interpretar com IA · 1 pedido pago»**, opcional e por imagem:
  - pede confirmação antes de gastar;
  - cria uma reserva por clique e não repete o pedido sozinha se o resultado for desconhecido;
  - o resultado entra no campo de descrição como proposta editável e nunca é aplicado sem a tua revisão.

## Recomendação Kie.ai
- O Seedream (incluindo o Seedream 5 Flash) gera e edita imagens, mas não as lê nem interpreta. Não serve para isto.
- Na Kie.ai, o modelo mais barato que aceita imagem como entrada é o **Gemini 3 Flash** (chat compatível com OpenAI, multimodal) ([docs](https://docs.kie.ai/market/gemini/gemini-3-flash)). Usa a mesma chave Kie que já existe, por isso não é preciso nenhum segredo novo.
- Antes de ativar, confirmo o preço por milhão de tokens na [tabela da Kie](https://kie.ai/pricing) e mostro o custo estimado por imagem junto ao botão.
- Primeiro teste real: um só pedido pago, e só depois da tua autorização explícita. O resto da verificação é feito com um simulador.

## Fora do âmbito
Passos Narrativa a Publicação, autenticação, quotas, outros segredos, publicação automática e documentos reais.

## Verificação
- Tipos, montagem do projeto e testes relevantes.
- Testes novos:
  - as imagens de apoio entram na fonte com § e respeitam os limites;
  - «Usar num slide» não altera o texto;
  - a interpretação nunca se repete sozinha.
- No browser, a 1280 px e a 393 px: o menu do topo visível em «Novo carrossel», o novo desenho alinhado, o carregamento e a descrição das imagens, e a passagem para a Narrativa sem perder nada.
- Sem chamadas pagas sem a tua autorização.

## Detalhes técnicos
- `MainLayout.tsx`: a regra do editor isolado passa a excluir `novo`.
- `CarrosselNovo.tsx`: novo layout. O cartão de imagens passa para um componente novo, `ImagensApoio.tsx`, em `src/features/motor/`.
- O carregamento reutiliza o serviço existente do bucket `motor-assets` (origem 'apoio'). A fonte (`brief`) ganha `imagens_apoio[]` com `{asset_id, descricao, usar_slide}` e o servidor (`mc-motor`) valida e compõe essas imagens como secções §.
- A interpretação é uma nova operação `interpretar_imagem` no `mc-motor`, que chama a Kie com o Gemini 3 Flash e uma reserva no estilo de `mc_kie_tarefas` (pedido único, sem repetir). Se for preciso uma coluna ou tabela nova para a reserva, faço uma alteração apenas aditiva à base de dados.
