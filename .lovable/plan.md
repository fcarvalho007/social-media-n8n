# Rascunhos por projeto, editor social e página inicial do Estúdio

A forma de entrar não muda. Uma sessão nova continua a precisar de código por email ou de palavra-passe. Nunca se abre sessão só por se conhecer o email. A sessão já aberta mantém-se. O agente não cria sessões, papéis nem credenciais.

## 1. Rascunhos sociais filtrados pelo projeto escolhido
- Na lista "Rascunhos", e quando se chega a partir de "Continuar", aparecem só os rascunhos do utilizador atual no projeto escolhido. Assim, o número do resumo corresponde ao que se abre.
- Em "Todos os projetos" aparecem todos os rascunhos do utilizador, incluindo os antigos sem projeto. Num projeto concreto, os rascunhos sem projeto não aparecem.
- Ao mudar de projeto ou de conta, a seleção (marcados para apagar) e os filtros abertos são limpos.
- Se falhar a leitura, aparece a mensagem "Não foi possível carregar os rascunhos" com o botão "Tentar de novo", em vez de uma lista vazia.
- Enquanto o projeto ainda está a carregar, a lista espera e não mostra os rascunhos de todas as marcas.
- O resumo "Continuar onde ficaste" usa exatamente o mesmo filtro (utilizador + projeto).

## 2. Marca no editor social
- No topo do editor aparece uma linha curta: "Este rascunho fica em: **<projeto>**" (ou "sem projeto").
- Num rascunho novo, acrescenta-se "(projeto escolhido no Estúdio)".
- Num rascunho existente, acrescenta-se "(projeto original do rascunho, não muda ao guardar)".
- Num rascunho de outra pessoa, aparece também "Autor: outro membro da equipa · a autoria mantém-se".
- A recuperação local passa a usar sempre utilizador + projeto + rascunho. Um rascunho recuperado nunca aparece noutro projeto nem noutra conta.

## 3. Página inicial do Estúdio com hierarquia
- Em "O que queres fazer?" ficam 4 ações principais em destaque, numa só linha em computador e em duas colunas no telemóvel: Newsletter, Carrosséis da crónica, Publicação livre e Artigos.
- Ligações e Migração passam para uma secção discreta "Configuração", em lista simples com ícone, nome e estado curto. Esta secção só aparece a administradores.
- O resultado é uma página com menos cartões iguais e mais espaço para o trabalho do dia a dia.

## 4. Testes
- Filtro por utilizador e projeto, incluindo o caso "Todos" com os antigos sem projeto.
- Mudança de projeto limpa a seleção.
- Erro de leitura mostra a mensagem com "Tentar de novo", nunca uma lista vazia.
- Rótulo da marca no editor, nos casos de rascunho novo, rascunho existente e rascunho de outro autor.
- Chave de recuperação isolada por projeto e por utilizador.
- Typecheck e verificação visual do Estúdio em computador e num telemóvel de 375px.
- Repetir os 78 testes anteriores.

## Ponto a confirmar
Até agora, a equipa toda via os rascunhos uns dos outros. Com este pedido, a lista e o "Continuar" passam a mostrar só os rascunhos do próprio utilizador. A permissão da base de dados mantém-se, por isso nada se perde: só muda o que a lista mostra.

## Detalhes técnicos
- `useDrafts(projetoId, userId)`: queryKey `['drafts', userId, projetoId ?? 'todos']`; `.eq('user_id', userId)`; `.eq('project_id', id)` quando há projeto; `enabled` só com o ProjetoContext `pronto`; expõe `error`/`refetch`.
- Drafts.tsx: `useEffect` limpa `selectedIds` ao mudar a chave; mostra um Alert com "Tentar de novo".
- `resumoContinuidade`: acrescenta `.eq('user_id', uid)` e mantém o filtro de projeto.
- Editor: componente `MarcaDoRascunho` lê o `project_id` congelado (planearGravacao) ou o projeto do contexto; `chaveRecuperacao` revista em todos os pontos de chamada.
- Estudio.tsx: separar `ACOES` em `PRODUCAO` e `CONFIGURACAO`.
- Sem migrações; as RLS ficam inalteradas.
