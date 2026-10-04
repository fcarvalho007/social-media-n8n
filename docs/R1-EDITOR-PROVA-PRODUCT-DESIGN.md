# R1 — Editor de carrosséis: nota PRODUCT/DESIGN

## Âmbito confirmado

Prova funcional isolada de um documento gráfico editável e do renderer partilhado. Usa apenas cinco fixtures sintéticas. Não integra IA, envios, migrações, dados reais nem módulos editoriais antigos.

## Decisões de produto

- Rota protegida: `/estudio/editor-prova`.
- Documento canónico `DocumentoGrafico v1`, com texto, formas, imagens, ordem, geometria, duas variantes e páginas.
- JSON é o formato editável de intercâmbio. PNG é uma exportação rasterizada, sem elementos editáveis.
- Recuperação automática fica apenas no navegador e é isolada por utilizador e documento.
- Um JSON inválido é recusado antes de substituir o documento aberto.
- A comparação com o servidor reutiliza a ação protegida `render_prova`; não cria endpoint público.

## Decisões de design

- O editor ocupa a superfície completa e não repete a navegação ou o cabeçalho da aplicação.
- Em desktop há três áreas claras: páginas, slide e propriedades.
- Até 1179 px, o slide é a área principal, as miniaturas passam para uma fila horizontal e as propriedades abrem num painel inferior contextual.
- O painel inferior sobrepõe-se temporariamente ao slide em vez de o comprimir.
- `ResizeObserver` calcula a área realmente disponível. “Ajustar” usa essa área e o zoom continua acessível com scroll.
- Pegas de transformação mantêm tamanho constante no ecrã, inclusive por toque.
- A altura segue `visualViewport` para as ações permanecerem visíveis com teclado virtual.

## Critério de equivalência

A prova mede separadamente diferenças globais de rasterização e provável perda de conteúdo. A segunda métrica ignora deslocamentos de um píxel com cor equivalente na vizinhança e mede também a pior zona local, para que uma letra ou contorno ausente não fique escondido numa média global.

## Confirmação da R1

- A composição foi confirmada uma vez em 1280×1800, 900×1000 e 375×812: um único cabeçalho do editor, sem navegação principal duplicada, e slide sempre visível.
- No navegador real foram confirmados seleção por toque simulado, edição com teclado, desfazer/refazer, exportação e reabertura de JSON, recuperação local e rejeição de JSON inválido sem substituir o documento aberto.
- O teste de componente em jsdom foi retirado: não representa canvas nem toque e bloqueava o runner. A cobertura correspondente passou para a integração no navegador real; a lógica continua coberta por testes determinísticos.
- As cinco fixtures e as variantes A/B foram renderizadas novamente pelo núcleo atual no navegador e pela função protegida. Todas ficaram abaixo dos limites de 1% global, 0,05% de perda provável e 2,5% na pior zona.
- A prova revelou e corrigiu uma aplicação dupla de opacidade na imagem da variante B da fixture de transparência; essa regressão ficou coberta por teste.

## Limitações da R1

- Persistência definitiva, colaboração, aprovação e publicação não fazem parte desta ronda.
- A recuperação local não substitui armazenamento durável no servidor.
- PNG não preserva camadas editáveis.
- Diferenças legítimas entre rasterizadores continuam possíveis e são apresentadas separadamente de provável perda de conteúdo.
- A passagem de toque usa a emulação real do navegador, não substitui validação num dispositivo físico.
- A R1 não promete equivalência vetorial: confirma equivalência raster dentro dos limites medidos.