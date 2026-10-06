# Plano: compositor mais previsível e próximo do Canva

## Objetivo
Fazer com que o painel direito controle visualmente o slide ativo de forma imediata e clara: papel visual, imagem, modo, posição do texto, overlay e fundo devem alterar o canvas de forma visível, sem mensagens que dizem que mudou quando nada mudou.

## O que vou corrigir

1. **Papel visual com efeito visível**
   - Ao trocar o papel visual, recompor o slide ativo e mostrar a nova composição no canvas.
   - Se a alteração não puder mudar o slide por falta de imagem, texto sem espaço ou ajuste manual bloqueador, mostrar uma mensagem clara no próprio painel em vez de apenas um aviso discreto.
   - Manter a regra de não reduzir fonte automaticamente.

2. **Modo, posição do texto e overlay**
   - Garantir que cada escolha no painel direito atualiza a página real e não apenas o estado guardado.
   - Quando existir uma imagem no slide, aplicar o modo escolhido à imagem correta.
   - Quando não existir imagem, desativar apenas os controlos que dependem de imagem e explicar o que falta.
   - Fazer com que “posição do texto” mexa mesmo nas caixas de texto quando o modo permite.

3. **Imagem com IA útil para inserir**
   - O botão “Gerar IA” passa a abrir a área de imagens com um prompt editável já preenchido para o slide atual.
   - Depois da imagem gerada, a imagem deve ser inserida no slide no modo escolhido: fundo, imagem ou logótipo.
   - Antes do pedido pago, manter a confirmação com custo estimado.
   - Se a geração falhar, manter o slide como está e mostrar erro legível, sem repetir automaticamente.

4. **Redesenhar sempre com 5 opções**
   - Ajustar o gerador de propostas para tentar mais combinações até conseguir 5 opções seguras.
   - Se alguma proposta com imagem não couber, substituir por uma alternativa tipográfica ou disruptiva em vez de reduzir para 2.
   - Manter 2 opções disruptivas/diferenciadas quando o slide permitir.
   - Se for impossível criar 5 sem cortar conteúdo, mostrar uma razão específica, não uma falha genérica.

5. **Fundo do slide no painel direito**
   - Mover o controlo de fundo para a secção “Página” da sidebar direita.
   - Manter “Aplicar a todos” junto do fundo, para ficar no mesmo contexto.
   - Deixar a barra superior/contextual mais focada nos elementos selecionados.

6. **Usabilidade mais parecida com Canva**
   - Organizar a sidebar direita por blocos claros: Página, Imagem, Texto/Elemento e Camadas.
   - Mostrar o estado atual de cada bloco com pequenos resumos visuais.
   - Quando uma ação depende de selecionar uma imagem ou de aplicar uma direção visual, indicar isso no painel, não apenas por toast.
   - Evitar que botões pareçam funcionar quando não há efeito visível.

## Verificações
- Testar no carrossel aberto no compositor:
  - slide 1: mudar papel visual;
  - mudar modo, posição do texto e overlay;
  - gerar imagem IA com prompt editável até ao ponto de confirmação de custo;
  - redesenhar e confirmar 5 propostas;
  - mudar fundo pela sidebar direita.
- Validar desktop e largura móvel de 375 px.
- Correr os testes do compositor e a verificação de TypeScript.

## Notas técnicas
- A composição deve continuar a usar uma única fonte de verdade: o documento versionado com `visualSystem`, `pages/pageRole` e `visualComposition`.
- Não vou criar outro renderer por origem de imagem: Biblioteca, Fotos, Upload e IA continuam a alimentar o mesmo canvas/exportação.
- Não vou fazer pedidos pagos durante os testes sem confirmação explícita.
