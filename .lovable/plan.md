# Comparação Editorial e PAS na Narrativa

## Resultado

- Ao concluir a Narrativa no modo assistido por IA, criar sempre duas versões: Editorial e PAS.
- Tratar as duas versões como uma única ação do utilizador, sem segundo clique de confirmação.
- Abrir uma comparação clara antes da Composição; escolher uma versão continua a ser uma decisão explícita.
- Aumentar ligeiramente o tamanho do título, descrições e cartões para melhorar leitura e hierarquia.

## Fluxo

1. **Fonte** mantém a validação atual e avança para Narrativa sem gerar conteúdo.
2. **Narrativa** mostra Editorial e PAS desde o início, explica resumidamente a diferença e mantém os controlos de objetivo, tom, público e extensão.
3. O botão final indica claramente que serão geradas **2 versões com IA** e executa logo o pedido, sem um segundo botão de confirmação.
4. O sistema só inicia se houver capacidade para as duas versões; se não houver, nenhuma fica criada.
5. A comparação apresenta estado independente de Editorial e PAS, conteúdo e diferenças, com escolha explícita da versão a levar para Composição.
6. Se uma versão falhar, a outra não é aplicada automaticamente; o ecrã explica a falha e oferece repetição controlada.

## Segurança e custos

- Cada versão conta como uma ação paga independente; a interface mostra “2 pedidos”, sem prometer um custo em euros que o fornecedor não confirme.
- A operação reserva capacidade para ambas de forma transacional, respeitando os limites por trabalho e por dia.
- Reutilizações não voltam a consumir pedidos; resultados desconhecidos não são repetidos automaticamente.
- A confirmação separada da tradução de fontes estrangeiras mantém-se, porque é outra ação paga.
- Preservar fontes, histórico, versões, autoria e composição existentes; sem alterações destrutivas.

## Detalhes técnicos

- Adicionar uma RPC transacional para criar/reutilizar o par Editorial/PAS e reservar a capacidade diária das duas chamadas antes de colocar os trabalhos na fila.
- Adaptar `mc-motor` e o serviço do cliente para iniciarem o par numa só operação validada no servidor.
- Reutilizar o modelo atual de propostas ocultas e a fusão já existente, preservando IDs dos slides quando uma proposta é escolhida.
- Atualizar a Narrativa e o painel de estruturas para distinguirem o par inicial das propostas adicionais.
- Corrigir textos atuais que ainda dizem “1 pedido” ou pedem uma segunda confirmação.
- Registar a decisão estrutural no `AGENTS.md`.

## Validação

- Migração e RPC: criação atómica, reutilização, limite insuficiente, acesso sem permissão e concorrência.
- Interface: Editorial/PAS visíveis, botão único, estados de espera/erro/repetição e escolha antes da Composição.
- Testes existentes do motor, typecheck, build e verificação do grafo Edge.
- Validação real na prévia sem publicar nem enviar conteúdo para redes sociais.
