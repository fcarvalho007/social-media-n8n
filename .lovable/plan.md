# Retirar notícias da escolha de uma edição

## Objetivo

Permitir retirar visualmente uma notícia da lista aberta dentro da newsletter, sem apagar a notícia nem alterar a decisão editorial comum.

## Comportamento

- Cada cartão passa a ter uma ação discreta «Retirar desta edição».
- Ao retirar, o cartão desaparece imediatamente e a contagem da lista é atualizada.
- A ocultação fica guardada para essa edição, por isso mantém-se ao atualizar ou voltar mais tarde.
- A notícia continua aprovada na curadoria, disponível para formatos sociais e volta a aparecer noutras edições.
- Uma confirmação breve permite «Desfazer» a última remoção acidental.
- «Usar nesta edição» e «Já nesta edição» mantêm o funcionamento atual; retirar da lista não remove conteúdo que já tenha sido incluído na edição.

## Implementação técnica

- Criar uma associação aditiva entre edição e notícia de origem ocultada, com permissões limitadas à equipa autenticada e acesso do serviço.
- Acrescentar operações protegidas para ocultar e repor uma notícia apenas na edição indicada.
- Fazer a listagem da curadoria aceitar a edição atual e excluir essas associações antes da paginação, para a contagem e as páginas permanecerem corretas.
- Integrar as ações no seletor partilhado, sem alterar a vista normal da curadoria nem os fluxos de carrosséis, posts ou stories.

## Validação

- Confirmar que retirar uma notícia a faz desaparecer apenas na edição atual.
- Confirmar persistência após recarregar e reaparecimento noutra edição.
- Confirmar que «Desfazer» repõe o cartão e a contagem.
- Confirmar que uma notícia já incluída não é removida da edição.
- Testar sucesso, falha e paginação/contagem, e validar o seletor em computador e a 375 px.
