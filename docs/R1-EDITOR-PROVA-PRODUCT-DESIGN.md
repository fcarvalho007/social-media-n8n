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

## Limitações da R1

- Persistência definitiva, colaboração, aprovação e publicação não fazem parte desta ronda.
- A recuperação local não substitui armazenamento durável no servidor.
- PNG não preserva camadas editáveis.
- Diferenças legítimas entre rasterizadores continuam possíveis e são apresentadas separadamente de provável perda de conteúdo.