# Redesenho editorial e duas propostas IA fiéis

## Diagnóstico confirmado

- As cinco versões gratuitas percorrem receitas visuais fixas e rodam pela ronda; o papel do slide e a estrutura do texto quase não influenciam a seleção. Por isso podem ser diferentes sem serem editorialmente adequadas.
- As razões mostradas em cada cartão são descrições genéricas da receita, não decisões justificadas pelo conteúdo daquele slide.
- No pedido observado foram realmente criadas e concluídas duas tarefas IA: a editável terminou primeiro e a segunda cerca de nove segundos depois. O cartão mostra apenas resultados concluídos, sem reservar visualmente os dois lugares nem explicar qual ainda está a gerar, criando a impressão de que só existe uma proposta.
- A numeração inexistente foi introduzida pelo próprio pedido enviado à IA: cada bloco de texto era prefixado com `1.`, `2.`, etc. A imagem final recebeu instruções para reproduzir esse texto e desenhou esses números.

## Resultado pretendido

Transformar «Redesenhar» numa escolha editorial intencional: cada alternativa deve responder ao papel, densidade e hierarquia reais do slide, mantendo exatamente o texto, a tipografia, a paleta e a legibilidade.

A opção paga passa a gerar **duas versões editáveis**. A IA cria apenas duas imagens de apoio diferentes, sem texto; o Estúdio compõe por cima o texto original, sem inventar palavras, números ou factos.

## 1. Cinco composições gratuitas com lógica editorial

- Classificar o slide antes de escolher receitas: papel visual, presença e dimensão de título/corpo, densidade, frases/listas, imagem disponível e espaço negativo necessário.
- Atribuir adequação editorial a cada receita e ordenar as propostas por essa adequação; «Gerar outras 5» varia apenas entre alternativas adequadas, em vez de rodar cegamente a lista.
- Definir famílias de decisão por papel:
  - conceito/argumento: hierarquia tipográfica, contraste entre tese e prova, ou imagem conceptual discreta;
  - história/caso: fotografia com relação clara entre assunto e texto;
  - dados/comparação/ações: tipografia, grelha, cartões ou destaques; nunca fotografia decorativa;
  - conclusão/transição: síntese, espaço negativo e um foco principal;
  - capa: uma mensagem dominante, sem tratar texto corrido como título.
- Tratar título e corpo como funções editoriais distintas. O maior texto livre deixa de ser automaticamente considerado um bom título quando a página não tem referências editoriais.
- Gerar a explicação de cada cartão a partir da decisão real, por exemplo: «Corpo curto em três afirmações; mantém leitura sequencial e dá destaque à tese», em vez de frases genéricas.
- Manter as garantias atuais: texto integral, sem corte, sem redução abaixo do mínimo, tipografia e paleta preservadas, propostas repetidas rejeitadas e nenhuma aplicação automática.

## 2. Duas propostas IA, ambas editáveis e distintas

- Substituir «editável + imagem final» por dois candidatos editáveis: **Direção A** e **Direção B**.
- Decidir previamente duas composições realmente diferentes e adequadas ao slide — por exemplo, imagem lateral com texto dominante e fundo total com zona de leitura protegida — sem alterar a direção visual global.
- Enviar à IA apenas pedidos de imagem de apoio, sempre com proibição explícita de texto, letras, números, marcas, interfaces e gráficos legíveis.
- Usar o mesmo texto original nas duas composições através do renderer do Estúdio. A IA nunca recebe autorização para reescrever ou desenhar o texto.
- Guardar em cada tarefa o tipo da direção e recuperar as duas pelo contexto do slide, incluindo ao fechar e reabrir a janela.
- Reservar desde o início dois cartões independentes com estados visíveis: «A gerar», «Disponível», «Falhou» ou «Resultado desconhecido». Uma proposta concluída não faz desaparecer a outra ainda pendente.
- Só declarar «duas propostas prontas» quando ambas estiverem concluídas. Em falha parcial, conservar a concluída e permitir repetir apenas a direção em falta mediante nova confirmação e novo custo explícito.
- Retirar definitivamente os prefixos `1.`, `2.` e qualquer outro conteúdo acrescentado aos pedidos.

## 3. Apresentação e comparação

- Manter o original visível em tamanho útil e organizar as cinco opções gratuitas com hierarquia mais clara.
- Dar às duas opções IA o mesmo espaço de comparação, com nome da direção, estado e miniatura próprios; não as comprimir dentro de um único cartão ambíguo.
- Ao selecionar uma proposta, mostrar em grande a composição completa — imagem mais texto fiel — antes de permitir aplicar.
- Assinalar claramente que ambas continuam editáveis e que nada altera o documento antes de «Aplicar esta versão».

## 4. Validação

- Testes por papel e densidade: as primeiras propostas devem ser adequadas ao conteúdo, além de distintas.
- Testes com texto livre: preservar palavra por palavra, identificar título/corpo de forma segura e não transformar frases arbitrárias em manchetes.
- Testes IA: exatamente duas direções editáveis; prompts sem numeração nem texto para desenhar; ambas usam integralmente o texto original no renderer.
- Testes de estados assíncronos: primeira concluída/segunda pendente, ordem de conclusão invertida, falha parcial, resultado desconhecido, fechar e reabrir.
- Comparação visual no slide real da captura, em desktop e 375 px, sem iniciar novas gerações pagas durante os testes automáticos.
- Executar testes do motor, verificação de tipos e grafo das funções; atualizar e validar `mc-motor` após as alterações.

## Limites

- Não alterar narrativa, texto do documento, direção visual global, histórico, credenciais, limites, permissões ou publicação.
- Não iniciar gerações pagas para validar. A confirmação final com imagens reais fica para uma ação explícita no ecrã.
