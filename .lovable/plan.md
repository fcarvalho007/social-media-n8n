# Aprovação única das notícias da newsletter

## Objetivo
Fazer de «Aprovar» em **Curar** a única decisão de aprovação: a notícia sai imediatamente dessa fila e entra em **Compor** já aprovada, sem uma segunda aprovação.

## Alterações
1. **Curar**
   - Manter «Aprovar» como decisão definitiva para a edição aberta.
   - Depois do sucesso, retirar imediatamente o cartão da fila e atualizar as contagens.
   - Usar confirmação clara: «Aprovada e adicionada à edição».

2. **Compor**
   - Mostrar as notícias aprovadas diretamente numa área «Aprovadas por organizar».
   - Não apresentar nenhuma ação ou linguagem que sugira uma segunda aprovação.
   - Permitir apenas definir o destino editorial: **Destaque**, **Radar** ou **Só site**.
   - Dar destaque a **Remover da newsletter**, com confirmação explícita.

3. **Remoção sem perda da curadoria**
   - «Remover da newsletter» retira a notícia apenas da edição atual e do ecrã Compor.
   - A notícia continua aprovada na curadoria geral e pode ser usada noutra edição.
   - Não alterar decisões globais, histórico ou outras edições.

4. **Consistência visual e estados**
   - Manter os botões editoriais com dimensões iguais.
   - Atualizar imediatamente a lista, os contadores e a pré-visualização após organizar ou remover.
   - Mostrar erro claro e conservar o cartão se a operação falhar.

## Validação
- Testar que aprovar em Curar faz a notícia desaparecer e surgir em Compor.
- Testar que não existe segunda aprovação em Compor.
- Testar que remover afeta apenas a edição atual.
- Validar o fluxo real com sessão iniciada em computador e a 375 px.

## Detalhes técnicos
- Alterar a origem vendorizada da newsletter e regenerar os ecrãs, sem editar os ficheiros gerados diretamente.
- Reutilizar a relação existente entre notícia e edição; não é prevista migração da base de dados.
- Preservar RLS, autenticação, envio e publicação.
