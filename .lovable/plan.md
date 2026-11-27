# Ocultar o menu lateral para alargar a área de trabalho

## O que se passa hoje
- Já existe um botão para ocultar o menu, no canto superior esquerdo da barra de topo do Hub.
- No ecrã da Newsletter (e noutros ecrãs com barra própria), a barra azul do editor fica por cima dessa barra de topo, por isso o botão não se vê — foi o que aconteceu na captura.
- A escolha não é lembrada: ao recarregar, o menu volta a abrir.

## O que muda
1. **Botão «Ocultar menu» dentro do próprio menu**, junto ao título «Hub de conteúdo», sempre visível em computador.
2. **Botão para voltar a mostrar**: com o menu oculto, fica uma pequena pega fixa na margem esquerda do ecrã («Mostrar menu»), por cima de qualquer barra de editor, para nunca ficar preso sem menu.
3. **Atalho de teclado** Ctrl/Cmd+B, indicado na dica do botão.
4. **Escolha lembrada** entre visitas e recarregamentos, neste computador.
5. Com o menu oculto, a área de trabalho usa toda a largura (o limite de largura máxima do conteúdo alarga também).
6. Telemóvel fica igual: o menu já abre e fecha por cima do conteúdo.

## Detalhes técnicos
- `src/components/AppSidebar.tsx`: botão `PanelLeftClose` no `SidebarHeader` (`toggleSidebar`), `aria-label="Ocultar menu"`, só em desktop.
- `src/components/MainLayout.tsx`: `SidebarProvider` controlado (`open`/`onOpenChange`) com estado inicial lido de `localStorage` (`hub:menu-aberto`; preferência de interface, não dados), fallback `innerWidth >= 1024`; botão flutuante `fixed left-0 top-1/2 z-50` quando fechado em desktop e não em `editorIsolado`; `max-w-[90rem]` removido quando o menu está fechado.
- Confirmar que o atalho Ctrl+B do componente de menu não colide com o negrito dos editores de texto (newsletter/artigos); se colidir, ignorar o atalho quando o foco está num campo editável.
- Teste em `src/test/` para a preferência lembrada (fechar → remontar → continua fechado).
- Validar em 1280 px e 375 px no ecrã da Newsletter.
