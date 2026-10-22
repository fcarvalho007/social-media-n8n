# Tradução sem bloqueio, escolhas múltiplas e instruções mais ricas para a IA

## 1. O erro da tradução (causa confirmada)
- Esta notícia foi traduzida às 12:47, ainda com a verificação antiga. Essa verificação recusou a tradução por causa da forma dos números («2,000» contra «2 000»). Ficou registada como «inválida».
- Agora, com a verificação já corrigida, cada clique em «Traduzir» tem a repetição desligada e o servidor recusa logo (código 429). O ecrã chegou a mostrar a mensagem certa, mas também o aviso vermelho «Error».
- Esse aviso aparece sempre que o servidor responde com erro, mesmo que o ecrã o trate bem.

Correções:
1. **Guardar a tradução recusada.** Quando uma tradução for recusada, o texto fica guardado (só para consulta, nunca é usado como fonte). Antes de pedir outra, o servidor volta a verificar a tradução guardada com a verificação atual, sem custo. Se agora passar, é aceite, sem novo pedido.
2. **No caso desta notícia** (a tradução recusada não foi guardada), o ecrã mostra «Repetir uma vez (1 pedido)» em vez de um beco sem saída. Isto respeita o máximo de 2 tentativas por notícia.
3. **Mensagens separadas:** «limite diário de pedidos atingido» é diferente de «tradução já repetida». Ao lado de cada mensagem aparece só a ação que faz sentido.
4. **Nenhuma recusa esperada volta a gerar o aviso vermelho.** Todas passam a chegar ao ecrã como resposta normal: a recusa da verificação, o limite, o pedido já repetido, o resultado desconhecido e a IA desligada.
5. **Verificação do aviso vermelho:** confirmo com um pedido que é recusado antes de qualquer custo. Também confirmo que a instalação anterior está ativa no servidor, porque a mensagem do ecrã pode ter vindo da versão anterior.

## 2. Escolher um ou dois itens
- **Tom:** até 2 (por exemplo, Crítico e provocador + Pedagógico).
- **Intenção editorial:** até 2 (por exemplo, Leitura de dados + Guia prático).
- **Público:** já permite vários; mantém-se assim, com a indicação «até 3».
- **Comportamento:** ao escolher um terceiro item, o mais antigo sai, com uma nota curta: «Máximo 2».
- **Etiquetas mais claras:** cada etiqueta mostra a descrição numa segunda linha discreta (hoje o texto aparece colado: «Crítico e provocador: Questiona e toma posição…»).
- **Resumo antes de gerar:** uma linha curta, por exemplo «Crítico + pedagógico · para gestores e PME · leitura de dados».
- Os carrosséis antigos, com uma só escolha, continuam a abrir sem alterações.

## 3. Instruções para a DeepSeek: reinterpretar o texto à luz das escolhas
Hoje as escolhas seguem como linhas soltas. O tom é cortado a 80 caracteres, por isso a descrição chega truncada.

Proposta: um bloco «Direção editorial» feito no servidor, sem IA, que diz à DeepSeek:
- **Desafio:** o objetivo (Informar, Explicar, A minha leitura, Divulgar) e a tua leitura ou ângulo, se os indicares.
- **Para quem:** os públicos e o que cada um precisa de levar (por exemplo, os gestores precisam da decisão e do impacto, e as PME da aplicação com poucos recursos).
- **Como soa:** os tons e como combiná-los quando são dois (por exemplo, crítico na tese e pedagógico na explicação), com regras claras para tensões entre tons.
- **Para que serve:** as regras de cada intenção. Quando são duas, uma é a principal (a primeira escolhida) e a outra é secundária.
- **Instrução central:** relê a fonte à luz desta direção. Escolhe os factos que mais servem este público e este desafio, ordena-os segundo a estrutura (Editorial ou PAS) e escreve no tom pedido.
- **Mantém-se:** só factos da fonte, com §, sem números nem citações inventados.
- A mesma direção chega às duas versões (Editorial e PAS), por isso a comparação continua justa.

## Verificação
- Testes:
  - a tradução recusada é guardada e verificada outra vez sem custo;
  - o limite diário e o pedido já repetido chegam ao ecrã como resposta normal (sem erro);
  - a escolha fica limitada a 2 itens;
  - os carrosséis antigos com uma só escolha continuam a abrir;
  - o bloco de direção tem os tons, públicos e intenções completos e indica a intenção principal.
- Capturas do ecrã em computador e a 375 px, sem pedidos pagos.

## Detalhes técnicos
- Migração: coluna `resultado_recusado jsonb` em `mc_traducoes`. Em `mc_reservar_traducao`, a primeira tentativa inválida devolve um código distinto, para o cliente oferecer a repetição; o limite diário passa a usar outro código (P0005).
- `traducao.server.ts`:
  - na recusa, grava `resultado_recusado`;
  - antes de reservar, volta a verificar `resultado_recusado` com `validarTraducao`; se passar, marca como `valida`.
- `mc-motor`: todas as recusas de reserva passam a 200 `{recusada, motivo, codigo, pode_repetir}`.
- `briefing.ts`:
  - `tons[]` e `intencoes[]` (máx. 2), com `normalizarBriefing` compatível com `intencao` antigo;
  - `textoTom` sem corte a 80 caracteres;
  - nova `blocoDirecaoEditorial(...)`, usada em `proposta.ts` para as duas versões.
- UI: `CarrosselNovo.tsx` (`Chips` com `max={2}`) e `PainelIdioma.tsx` (ações por código).
- Exige instalar `mc-motor` e correr `verificar-grafo-edge.py`. Ao aprovar, autorizas a migração e essa instalação.
