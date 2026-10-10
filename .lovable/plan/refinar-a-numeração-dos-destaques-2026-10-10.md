# Refinar a numeração dos destaques

## Diagnóstico (a partir da captura)
- O número (64px) fica pequeno ao lado de um título serifado de 26px em 2-3 linhas.
- A coluna do número (76px + 24px de afastamento) cria um vazio grande entre número e texto.
- O número alinha pelo topo com a etiqueta da categoria, não com o título — quebra o ritmo visual.

## Refinamentos propostos

### Email (`render-email.server.ts.txt`)
- Número maior: de 64px para ~88px, linha 84px.
- Coluna mais estreita e afastamento menor: célula de ~64px com 14px de espaço à direita.
- Alinhamento: a etiqueta da categoria sai da coluna do texto e passa para cima do conjunto (largura total), para o número alinhar diretamente com a primeira linha do título.

### Web (`render-web.server.ts.txt`)
- Mesmas proporções: número ~88px, afastamento de 28px para ~18px, etiqueta por cima do conjunto, número alinhado com o título.

### Validação
- Regenerar com `scripts/port-newsletter.py`, correr `scripts/verificar-grafo-edge.py`, deploy de `nl-api`/`nl-hooks` e verificação visual na pré-visualização.

## Notas
- Só apresentação; conteúdo, ordem e regras editoriais intocados.
- Sem fontes novas — usa a serifa já existente nos tokens da newsletter.
