# Fecho dos pedidos da Narrativa: o que falta e refinamentos

## Estado atual
- Feito: 10 slides por defeito, com a opção de 8; aviso quando a fonte é curta; leitura do artigo completo quando a notícia da curadoria só tem resumo; «+ Acrescentar slide» (com título e texto, ou em branco); «Mudar estrutura».
- Por fazer, conforme o pedido original:
  1. Gerar slides novos a partir do artigo, com IA, incluindo uma sugestão de imagem.
  2. Voltar de PAS para Editorial recupera também o texto Editorial (hoje só muda a escolha registada).
  3. «Rever abordagem»: ângulo, tom, público e apelo final.
- Refinamentos encontrados:
  4. Os slides acrescentados na Narrativa não mostram o papel nem a evidência (§) e não podem ser apagados ali.
  5. O aviso de «só existe o resumo» aparece duas vezes na mesma condição. Deve ficar uma única mensagem.
  6. Ainda não houve verificação no ecrã (desktop e 375 px).

## Correções propostas
1. **Gerar a partir do artigo** (com confirmação e custo apresentado antes): escolhes 1 a 4 slides e a posição. O servidor envia o artigo completo, os slides atuais e os parágrafos já usados. Recebe apenas factos novos com §, mais uma sugestão de imagem por slide. Os slides chegam como proposta para aceitar um a um.
2. **Editorial depois de PAS:** ao escolher Editorial, repor o conteúdo da versão Editorial original como nova versão. Nada é apagado.
3. **Rever abordagem:** um painel recolhido na Narrativa com ângulo, tom, público e apelo final. Para aplicar, gera uma nova proposta comparável, com confirmação. O texto atual não é substituído.
4. **Slides acrescentados:** etiqueta «Novo», botão «Remover slide» com desfazer, e um aviso de que não há evidência § enquanto o texto for teu.
5. Juntar os avisos de resumo num só.
6. Verificação no ecrã em desktop e 375 px, sem pedidos pagos (fornecedor simulado).

## Detalhes técnicos
- Motor: novo `escopo.modo = "acrescentar"` como pedido filho oculto. Usa o DeepSeek direto, regista o custo em `custos_registos` e entra só depois de aceite, pela `fundirSelecao`, adaptada a ids novos. Exige o redeploy do `mc-motor` e o `verificar-grafo-edge.py`. Pela instrução de 19/10, a instalação fica pendente até autorização explícita.
- `PainelEstruturas.tsx`: ao escolher Editorial, usar a proposta original do trabalho de origem.
- `CarrosselTrabalho.tsx`: remover slide pelo `apagarSlide` existente; etiqueta para slides sem `prop`.
- Testes: aceitação de slides acrescentados (ordem em A, B e narrativa, limite de 20), reposição do Editorial e a regra dos 10 e 8 já coberta.

## Decisão necessária
Os pontos 1 e 3 exigem instalar o motor no servidor. Ao aprovar este plano, autorizas essa instalação. Sem aprovação, faço apenas os pontos 2, 4, 5 e 6.
