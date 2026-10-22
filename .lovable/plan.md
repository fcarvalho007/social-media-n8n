# Narrativa: mais slides, 10 por defeito, artigo completo e voltar atrás

## b) Porque só saíram 3 slides (causa confirmada)
O último carrossel (22/10, 11:56) foi criado a partir da Curadoria com uma fonte de apenas **248 caracteres**: só o título e o resumo da notícia, não o artigo. Com tão pouco texto, o sistema limita o máximo ao número de parágrafos + 2, ou seja 3 slides. O ecrã já dizia «Só título/resumo», mas de forma discreta, e deixou avançar.

Correção:
- Ao escolher uma notícia na Curadoria só com resumo, o sistema tenta ler o artigo completo a partir do link original (a leitura de link que já existe, sem custo de IA) e usa esse texto como fonte.
- Se não conseguir ler o artigo, aparece um aviso claro antes de avançar: «Só existe o resumo (248 caracteres) — vai dar no máximo 3 slides». As opções são «Colar o texto do artigo» ou «Continuar assim».

## c) 10 slides por defeito
- Na Fonte, o número de slides passa a vir sempre em **10**, com uma escolha rápida entre **10** e **8**. Outro número fica em «Personalizar».
- Se a fonte for curta demais para 10, o ecrã diz isso e mostra quantos slides cabem. Não reduz em silêncio.

## a) Acrescentar slides na Narrativa
Novo botão «+ Acrescentar slides» na lista de slides, com duas formas:
- **Slide em branco**: gratuito e imediato.
- **Gerar a partir do artigo** (pede confirmação antes, porque usa IA): escolhes quantos (1 a 4) e onde entram (no fim, antes do fecho ou a seguir ao atual). O sistema volta a ler o artigo completo e os slides atuais, e propõe só ideias e factos ainda não usados, citando os parágrafos (§). Também propõe uma sugestão de imagem para cada novo slide.
- Os slides novos aparecem como proposta para aceitar ou recusar, um a um, como já acontece com as alternativas. Nada muda sem aceitares. O máximo continua a ser 20.

## Voltar à escolha da estrutura e da forma de abordar o texto
Hoje, depois de escolher Editorial ou PAS, não há forma de voltar atrás.
- Novo botão «Mudar estrutura» na Narrativa, que reabre a comparação Editorial / PAS (e as outras). A escolha anterior e as edições ficam guardadas como versão, e é possível voltar a elas.
- «Rever abordagem» reabre o ângulo, o tom, o público e o apelo à ação usados na geração. Para os aplicar é preciso gerar de novo, com confirmação, e o resultado aparece como proposta comparável. O texto atual não é substituído.

## Verificação
- Testes: 10 por defeito e opção 8; aviso quando a fonte é curta; notícia só com resumo leva à leitura do artigo; «Acrescentar slides» mantém a ordem igual em A, B e narrativa, respeita o máximo de 20 e permite desfazer; mudar de estrutura conserva a versão anterior.
- Sem pedidos de IA nos testes (fornecedor simulado). Verificação visual em desktop e 375 px.

## Detalhes técnicos
- `CarrosselNovo.tsx`: `porQuantidade` / `nSlides` com predefinição 10 e escolha rápida 10/8; aviso quando `av.slidesMax < nSlides`; na curadoria com `nivel === "resumo"`, chamar a leitura de link existente (`lerPagina`) com `curada.url` e substituir `texto`.
- `_shared/motor/proposta.ts`: `LIMITES_FONTE` mantém-se; só muda a predefinição no cliente.
- Novo tipo de pedido no motor, `escopo.modo = "acrescentar"` (filho oculto, como as alternativas por slide): prompt com a fonte completa, a lista de slides atuais e os § já usados; `validarRespostaModelo` aceita N novos slides com ids novos; a fusão é feita só ao aceitar, pela `fundirSelecao`. A IA passa só pelo DeepSeek direto, com o custo registado em `custos_registos`.
- `PainelEstruturas.tsx`: permitir limpar ou repor `escolhaInicial` («Mudar estrutura») por uma nova versão; nunca apagar a versão anterior.
- Edge: redeploy do `mc-motor` e `verificar-grafo-edge.py`. Sem migrações nem alterações de permissões. Conforme a instrução de 19/10, tudo fica numa branch local até pedires a integração.
