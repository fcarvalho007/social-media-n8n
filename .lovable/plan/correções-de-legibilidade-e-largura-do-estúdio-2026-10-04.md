# Correções de legibilidade e largura do Estúdio

## Objetivo
Corrigir o menu escuro para permanecer legível em todos os estados e libertar a Home do limite central de 896 px, sem alterar autenticação, dados, IA, exportação ou publicação.

## Alterações
- **Menu lateral**
  - Isolar hover e foco por item, eliminando o efeito herdado do grupo exterior.
  - Aplicar tokens de grafite, texto claro, secundário, hover e ativo com contraste acessível.
  - Manter nomes completos em 2 linhas, alvos mínimos de 44 px, foco visível, `aria-label` e `aria-current`.
  - Preservar scroll, rodapé, abrir/fechar e gaveta móvel sem margem residual.
  - Tornar Segurança e Sair igualmente legíveis.
- **Shell e Home**
  - Garantir `flex-1 min-w-0` na área útil, sem calcular a largura com `100vw` nem esconder erros de layout.
  - Remover `max-w-4xl` e centragem da Home; usar uma única margem interior responsiva de 16–40 px.
  - Alinhar título, projeto, continuidade, ações e configuração pela mesma régua esquerda.
  - Reorganizar os 5 atalhos e os 3 itens de continuidade com grelhas `auto-fit/minmax`, sem larguras fixas ou cortes.
  - Manter campos curtos e texto corrido com limites confortáveis; não alterar dimensões próprias de editores e carrosséis.

## Verificação
- Confirmar tipos e compilação.
- Inspecionar a aplicação real a 1440/1280, 900 e 375 px, quando a sessão disponível permitir.
- Validar menu em repouso, hover entrar/sair, foco por teclado e página ativa, nos estados expandido/recolhido e móvel.
- Medir cores calculadas, contraste, overflow e clipping; registar claramente qualquer validação autenticada que fique a cargo do utilizador.
