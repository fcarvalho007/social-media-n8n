# Menu persistente, trabalhos iniciados e eliminação em lote

## Objetivo
Tornar o menu superior sempre acessível durante o scroll, mostrar na área «Criar» tudo o que foi iniciado e não concluído, e permitir eliminar um ou vários carrosséis.

## Alterações visíveis

### 1. Menu superior durante o scroll
- Reproduzir o comportamento nas páginas com conteúdo longo e ajustar o cabeçalho global para permanecer no topo durante todo o scroll.
- Manter a largura, hierarquia e comportamento atuais em desktop e telemóvel, sem tapar conteúdo nem criar saltos.
- Preservar a barra própria do compositor, que funciona como experiência isolada.

### 2. Área «Criar» com trabalho em curso
- Manter as opções atuais de criação no início da página.
- Acrescentar uma secção visível «Iniciados» com todos os rascunhos do projeto selecionado:
  - publicações sociais guardadas como rascunho;
  - carrosséis cujo trabalho ainda não esteja concluído.
- Em cada item, mostrar tipo, título ou excerto, marca/projeto, estado e última atualização.
- Permitir retomar o trabalho no ponto certo ou selecioná-lo para eliminação.
- Incluir pesquisa, seleção individual, «Selecionar todos» e estados vazios claros.

### 3. Seleção e eliminação em `/estudio/carrosseis`
- Adicionar modo de seleção aos cartões, com seleção individual, seleção de todos os resultados visíveis e barra de ações em lote.
- Disponibilizar eliminação individual e múltipla, sempre precedida por confirmação explícita com a quantidade e os títulos afetados.
- Remover imediatamente da lista apenas depois de o servidor confirmar a operação; em falha, manter os itens selecionados e explicar o erro.

## Eliminação definitiva e integridade
- Criar uma operação protegida no servidor para eliminar carrosséis e os respetivos documentos, versões, propostas, composições, exportações e ligações dependentes pela ordem segura.
- Autorizar a ação apenas a utilizadores com permissão de escrita no projeto e validar todos os identificadores recebidos.
- Manter os registos financeiros e de utilização de IA, que são contabilísticos e append-only, desligando-os do carrossel eliminado sem apagar custos já ocorridos.
- Não eliminar automaticamente imagens da biblioteca nem ficheiros que possam estar reutilizados noutros conteúdos.
- Para rascunhos sociais, reutilizar a eliminação definitiva já existente e aplicar a mesma confirmação em lote.

## Detalhes técnicos
- A página «Criar» passará a reunir as duas fontes reais já existentes: `posts_drafts` e trabalhos `mc_trabalhos` não concluídos, respeitando o filtro de projeto.
- A base atual permite eliminar rascunhos sociais, mas os carrosséis têm apenas leitura direta e várias relações protegidas; por isso, a eliminação será encapsulada numa função transacional com autorização no servidor.
- A relação dos registos de custo com o trabalho passará a aceitar a remoção da referência, sem alterar o valor, fornecedor, data ou origem do custo.
- A listagem e os contadores serão atualizados depois de cada operação, sem depender de estado local antigo.

## Validação
- Testar cabeçalho com scroll em desktop e a 375 px.
- Testar lista vazia, pesquisa, retoma, seleção parcial, seleção total, cancelar confirmação, eliminar um e eliminar vários.
- Confirmar que um utilizador sem permissão de escrita não consegue eliminar por chamada direta.
- Confirmar que custos históricos e imagens partilhadas permanecem intactos.
- Executar os testes relevantes, validação do servidor, compilação e fluxo visual no navegador.
