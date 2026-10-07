# Fonte e Narrativa: comparação Editorial/PAS

## Objetivo
Simplificar a passagem da Fonte para a Narrativa e fazer com que cada criação assistida por IA prepare sempre duas estruturas comparáveis: **Editorial** e **PAS**.

## Alterações propostas

1. **Eliminar a segunda confirmação da geração**
   - Manter a escolha explícita entre «Sem IA» e «Assistido por IA».
   - No modo assistido, o botão final da Narrativa inicia diretamente a criação, sem o passo intermédio «Gerar com IA» → «Confirmar».
   - Atualizar o texto do botão para indicar claramente o resultado: criar e comparar Editorial + PAS.
   - A confirmação específica da tradução mantém-se separada, porque é uma ação diferente e pode acontecer ainda na preparação da fonte.

2. **Gerar sempre Editorial e PAS**
   - Ao concluir a Narrativa em modo assistido, criar dois trabalhos relacionados sobre a mesma fonte congelada, briefing, perfil do autor, número de slides e formato.
   - Cada estrutura usa o respetivo conjunto de regras: Editorial e PAS.
   - Reservar e validar os dois pedidos no servidor como uma única operação lógica, evitando ficar apenas uma estrutura criada se a segunda não puder ser reservada.
   - Respeitar os limites atuais por ação, trabalho e dia; se não houver capacidade para os dois pedidos, não iniciar nenhum e explicar a razão.
   - Abrir o trabalho Editorial como base e associar a proposta PAS para comparação, sem duplicar o conteúdo na biblioteca principal.

3. **Mostrar as duas estruturas logo na Narrativa**
   - Apresentar Editorial e PAS como duas opções principais, lado a lado em ecrãs largos e empilhadas no telemóvel.
   - Mostrar estado por opção: na fila, a gerar, pronta ou com erro.
   - Quando ambas estiverem prontas, permitir comparar o carrossel inteiro e escolher slide a slide, usando o mecanismo atual que preserva os identificadores dos slides e a composição.
   - Manter as restantes estruturas atuais como opções secundárias para pedidos posteriores, sem as gerar automaticamente.

4. **Melhorar leitura e hierarquia visual**
   - Aumentar ligeiramente títulos, descrições, rótulos e texto dos cartões nas páginas Fonte e Narrativa.
   - Dar maior destaque ao título e à descrição de cada estrutura, com diferenças editoriais fáceis de perceber.
   - Refinar espaçamento e contraste sem aumentar desnecessariamente a altura da página e mantendo o tema claro do Estúdio.
   - Preservar alvos táteis de 44 px e validar desktop e 375 px.

5. **Estados de erro e recuperação**
   - Se um pedido falhar depois de iniciado, manter visível o resultado da outra estrutura e permitir repetir apenas a que falhou.
   - Não repetir automaticamente pedidos incertos e não esconder custos ou consumo já registado.
   - Manter fonte, escolhas da Narrativa e texto introduzido quando houver erro.

## Detalhes técnicos
- Alterar o fluxo em `CarrosselNovo` para remover `confirmarIa` e enviar uma criação comparativa.
- Acrescentar uma operação de servidor/RPC aditiva para criar o par Editorial/PAS de forma consistente, preservando as regras de escrita apenas por RPC e os registos append-only.
- Reutilizar `brief.framework`, `origem_trabalho`, `base_versao`, `listarCandidatos` e a fusão por slide já existentes.
- Adaptar `PainelEstruturas` para destacar o par automático e manter AIDA, Antes/Depois/Ponte e Direto ao valor como opções adicionais.
- Não alterar fornecedores, chaves, limites, crons, conteúdos existentes ou publicações.

## Validação
- Testar que um único clique final inicia exatamente Editorial e PAS.
- Testar reserva insuficiente: zero trabalhos criados.
- Testar reabertura/reutilização sem duplicação e estados parcial/erro.
- Testar que a comparação mantém fonte, número de slides, referências §, IDs e composição.
- Executar testes relevantes, verificação TypeScript e validação visual em desktop e 375 px.
