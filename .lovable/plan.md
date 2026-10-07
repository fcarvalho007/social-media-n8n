# Sexta composição gerada com IA

## Objetivo

Acrescentar ao modal **Escolher nova composição** um sexto cartão, claramente distinto das cinco propostas gratuitas: **Gerar duas versões com IA**.

Ao ativá-lo, o sistema usa todo o texto atualmente visível nas camadas do slide e prepara duas alternativas para comparação:

1. **Composição editável** — imagem Seedream integrada no slide, com texto, fontes, caixas e elementos ainda editáveis.
2. **Imagem final IA** — interpretação visual mais livre do slide inteiro, apresentada como imagem única para avaliação.

Nenhuma versão altera o documento até se clicar em **Aplicar esta versão**.

## Experiência no modal

- Manter as cinco composições atuais gratuitas e instantâneas.
- Acrescentar um sexto cartão de entrada, sem geração automática, com indicação **IA · pago**.
- Ao clicar, abrir no próprio modal uma confirmação com:
  - modelo fixo **Kie.ai · Seedream 5 Flash**;
  - duas gerações de imagem;
  - custo estimado unitário e total antes do pedido — atualmente `2 × 0,0162 US$ = 0,0324 US$`;
  - formato herdado do documento: 3:4 para post/carrossel e 9:16 para story;
  - uma das três políticas de texto:
    - **Só hierarquia** — mantém todas as palavras;
    - **Encurtar sem inventar** — condensa sem mudar factos ou números;
    - **Reescrever livremente** — reformula, assinalando claramente o maior risco editorial.
- Quando se escolher “Encurtar” ou “Reescrever”, mostrar também que existe um pedido adicional de texto à DeepSeek; como o custo monetário não é fiável no sistema atual, apresentá-lo como **1 pedido adicional**, sem inventar um valor.
- Depois da confirmação, mostrar progresso separado para cada proposta e permitir fechar/reabrir o modal sem perder as tarefas.
- Quando os resultados chegarem, substituir o cartão inicial por duas miniaturas comparáveis: **Editável** e **Imagem final IA**.
- Permitir ampliar cada resultado, voltar ao original, escolher uma das cinco propostas gratuitas ou aplicar uma das duas propostas IA.
- Em falha parcial, conservar o resultado concluído e permitir repetir apenas a geração que falhou por nova ação explícita.

## Construção das duas propostas

### 1. Composição editável

- Extrair o texto efetivamente visível com o mesmo resolvedor usado pelo canvas, incluindo texto escrito diretamente nas camadas.
- Usar a direção visual ativa como contrato: paleta, par tipográfico, papel visual, variante, efeitos e formato.
- Gerar com Seedream apenas a imagem de apoio, sem texto incorporado.
- Reorganizar as camadas através do compositor canónico, mantendo-as editáveis e usando apenas as fontes já disponíveis no projeto.
- Na opção “Só hierarquia”, preservar o texto palavra por palavra.
- Nas outras duas políticas, pedir uma proposta textual à DeepSeek e mostrar as diferenças antes de permitir aplicar.
- Recusar a proposta se o texto não couber; nunca reduzir automaticamente a fonte.

### 2. Imagem final IA

- Enviar ao Seedream um pedido próprio para interpretar o slide completo, incluindo conteúdo, hierarquia, direção visual, paleta e indicação dos tipos de letra usados.
- Não prometer reprodução tipográfica exata: esta versão é uma imagem única e será marcada como **texto não editável · rever ortografia**.
- Preservar a imagem original gerada como asset do projeto e pré-visualizá-la sem a inserir automaticamente no documento.
- Ao aplicar, criar uma única camada de imagem de página inteira; a versão anterior continua disponível em desfazer/histórico.

## Segurança, custos e persistência

- Reutilizar a reserva existente por tarefa, o limite diário por projeto, o polling retomável e a regra de nunca repetir um resultado incerto.
- Exigir confirmação explícita no servidor; o sexto cartão nunca inicia pedidos apenas por abrir ou selecionar.
- Criar duas reservas Seedream independentes para que um sucesso parcial não se perca.
- Registar também o custo estimado das tarefas Kie concluídas no mapa central de custos, com conversão pela taxa oficial já usada pelo sistema e origem marcada como **estimada**.
- Guardar nas propostas o modelo, prompt, política textual, IDs das tarefas/assets e estado; não depender apenas de estado local do navegador.
- Não alterar as cinco propostas gratuitas, outras páginas, direção visual global, histórico ou documento até à aplicação explícita.

## Alterações técnicas

- **Modal e estado:** ampliar `PainelRedesenhar` para o sexto cartão, confirmação, progresso, comparação e recuperação das tarefas.
- **Serviço:** criar uma operação específica de geração de proposta IA, em vez de reutilizar diretamente a ação genérica que hoje insere imagens no slide assim que terminam.
- **Servidor:** validar projeto, formato, política textual e confirmação; criar as duas tarefas Seedream e devolver estados independentes.
- **Documento:** representar os dois resultados como candidatos temporários; aplicar pelo mesmo caminho versionado e reversível das composições atuais.
- **Prompts:** separar o prompt “imagem de apoio sem texto” do prompt “slide final com texto”, ambos derivados da direção visual e do texto resolvido das camadas.
- **Texto:** usar DeepSeek direto apenas nas duas políticas que permitem alteração, respeitando os limites já existentes por ação/trabalho/dia.

## Validação

- Testar que abrir o modal e clicar no sexto cartão não gera nem cobra nada.
- Testar custo mostrado e confirmação obrigatória para duas tarefas Seedream.
- Testar as três políticas de texto, incluindo preservação integral em “Só hierarquia”.
- Testar recuperação após fechar/reabrir, sucesso parcial, falha, saldo insuficiente e limite diário.
- Confirmar que nenhuma proposta é aplicada automaticamente e que desfazer recupera a página anterior.
- Comparar visualmente original, cinco composições gratuitas e os dois resultados IA em desktop e 375 px.
- Executar typecheck, testes do compositor, verificação do grafo Edge e validação real sem iniciar geração paga durante os testes.

## Fora deste trabalho

- Não publicar o frontend.
- Não alterar chaves, contas, crons ou credenciais.
- Não gerar imagens pagas durante a implementação/validação sem uma ação explícita do proprietário na interface.
