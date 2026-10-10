# Refinar o Painel e juntar as duas bibliotecas de conteúdos

## Resultado
- No **Painel**, cada cartão de «Conteúdo a tratar» passa a ter uma ação de eliminar.
- Antes de eliminar, aparece sempre uma confirmação que identifica o tipo de conteúdo.
- Em **Conteúdos visuais**, passam a existir dois separadores persistentes no topo:
  - **Meus conteúdos** — a biblioteca atual de carrosséis, posts e stories criados no Estúdio;
  - **Carrosséis da crónica** — os conteúdos derivados das edições enviadas da newsletter.
- Os dois separadores mantêm as ações próprias de cada origem, evitando misturar trabalhos diferentes como se fossem iguais.

## Eliminação no Painel
1. Acrescentar um botão de caixote discreto a cada miniatura, sem interferir com o clique que abre o conteúdo.
2. Permitir eliminar tudo o que hoje aparece nesse bloco:
   - rascunhos;
   - posts e carrosséis por aprovar;
   - stories por aprovar;
   - publicações agendadas.
3. Mostrar uma confirmação específica antes de apagar. Nos agendados, explicar que o agendamento também deixa de existir.
4. Depois da eliminação, atualizar imediatamente a grelha, as contagens e a memória do calendário, sem deixar cartões fantasma.
5. Se a conta não tiver permissão de edição, manter o conteúdo e mostrar uma mensagem clara.

## Separadores de conteúdos visuais
1. Criar uma navegação comum, compacta e acessível, visível nas duas páginas.
2. Manter **Meus conteúdos** como a grelha visual existente, com estados, seleção e eliminação em lote.
3. Manter **Carrosséis da crónica** ligada às edições da newsletter, com os seus estados e ações «Preparar», «Abrir» e «Retomar».
4. Refinar o cabeçalho da crónica para seguir a mesma largura, hierarquia e ritmo visual da biblioteca principal, sem fingir que suporta ações que não existem nessa origem.
5. Atualizar os atalhos do Painel para que «Conteúdos visuais» seja a entrada única; a troca entre origens passa a acontecer nos separadores.

## Segurança e dados
- Não criar tabelas, não alterar permissões e não apagar conteúdos da newsletter nem trabalhos criativos da biblioteca.
- As eliminações do Painel reutilizam as permissões atuais: apenas administradores e editores conseguem concluir a ação.
- Não tocar em autenticação, quotas, custos, IA ou publicação.

## Verificação
- Testes pequenos para cada tipo eliminável: rascunho, post/carrossel, story e agendado.
- Confirmar que cancelar a janela não elimina nada e que uma recusa de permissão não retira o cartão do ecrã.
- Confirmar que os separadores abrem as duas páginas certas e assinalam corretamente a vista atual.
- Validar no browser em computador e a 375 px: botões acessíveis, texto sem sobreposição, grelha e contagens atualizadas.
- Confirmar tipos, testes relevantes e estado final da aplicação.

## Detalhes técnicos
- `PendingThumbnail` recebe uma ação opcional de eliminação e impede a propagação do clique do botão para a abertura do cartão.
- `ConteudoBloco` gere a confirmação e usa um serviço único para eliminar da origem correta (`posts_drafts`, `posts` ou `stories`), verificando que uma linha foi realmente eliminada; para posts agendados, limpa também o trabalho de agendamento associado.
- `usePendingContent` passa a disponibilizar uma atualização explícita para reconciliar cartões e contagens após a ação.
- Um pequeno componente comum de separadores é reutilizado em `Carrosseis` e `ConteudosSociais`; não se fundem os dois modelos de dados.
