# Início: «Continuar onde ficaste» como lista de rascunhos + editar «Para quem?»

## 1. «Continuar onde ficaste» passa a mostrar os trabalhos por acabar
Hoje mostra só três linhas de resumo (Newsletter, Rascunhos sociais, Artigos). Passa a mostrar até 6 itens concretos, os mais recentes primeiro, do projeto escolhido em «Para quem?»:
- rascunhos de publicações sociais, carrosséis por acabar, artigos em rascunho e a edição da newsletter aberta;
- cada item é um cartão compacto: ícone do tipo, título (ou início do texto), etapa onde ficou (ex.: «Narrativa», «Composição», «Rascunho»), data da última alteração (DD/MM/AAAA) e miniatura quando existir;
- dois botões por item: **Retomar** (abre exatamente onde ficou) e **Apagar** (ícone de caixote, com confirmação «Apagar este rascunho? Não é possível desfazer.»);
- a edição da newsletter só tem **Retomar** — nunca se apaga a partir daqui;
- rodapé com «Ver todos os rascunhos (N)» quando houver mais de 6;
- estado vazio: «Não há nada por acabar. Começa pela Curadoria.» com botão.

Apagar usa as mesmas regras de dono já existentes (só se apaga o que é teu); um rascunho social já publicado ou agendado não aparece aqui.

## 2. «Para quem?» passa a ser editável
Ao lado da lista, um botão **Gerir marcas** (ícone de lápis) abre a página de projetos já existente, onde se cria, muda o nome, o logótipo ou se arquiva uma marca. Dentro da lista, a última opção passa a ser «+ Nova marca…». Não há nova página nem mudança na base de dados.

## Detalhes técnicos
- `src/services/estudio.ts`: nova `listarPorConcluir(projetoId, limite)` que lê social drafts, carrosséis (mc_*) e artigos com o RLS atual; `apagarRascunho(tipo, id)` reutiliza os serviços de eliminação existentes (sem RPC nova). Carrosséis (mc_*) apagam-se apenas se já houver RPC de eliminação; caso contrário só «Retomar» e fica anotado.
- `src/pages/Estudio.tsx`: novo componente `ContinuarOndeFicaste` com AlertDialog de confirmação e atualização otimista + toast com erro.
- Teste: newsletter não tem ação Apagar; apagar pede confirmação antes de chamar o serviço.
- Validar a 1280px e 375px.
