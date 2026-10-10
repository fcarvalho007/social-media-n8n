# Numeração cinematográfica dos destaques

## Objetivo
Cada um dos 3 destaques da newsletter passa a ter um número grande (1, 2, 3) em azul, com fonte serifada, e o título do destaque passa a serifado — conforme a direção visual escolhida (número cheio azul + título serifado, com espaçamento generoso).

## O que muda

### 1. Email (pré-visualização e envio)
Ficheiro-fonte: `migration-reference/code/newsletter/src/lib/newsletter-engine/revista/render-email.server.ts.txt`
- Cada destaque passa a uma grelha de duas colunas: à esquerda o número (1, 2, 3) em serifa, ~64px, azul; à direita a categoria, o título e o resumo.
- O título do destaque passa de sem serifa para a fonte serifada já usada na newsletter (a mesma do título da crónica).
- Espaçamento entre destaques ligeiramente aumentado.

### 2. Versão web da edição
Ficheiro-fonte: `migration-reference/code/newsletter/src/lib/newsletter-engine/revista/render-web.server.ts.txt`
- Mesma composição: número serifado grande em azul à esquerda, título serifado à direita, com o mesmo afastamento.

### 3. Regeneração e validação
- Executar `python3 scripts/port-newsletter.py` para regenerar os outputs (preview e envio ficam idênticos).
- Executar `scripts/verificar-grafo-edge.py`.
- Deploy das funções `nl-api` e `nl-hooks`.
- Verificação visual na pré-visualização da newsletter.

## Notas técnicas
- Só se editam as fontes `.txt` vendorizadas; os outputs são regenerados pelo script.
- O número usa a fonte serifada já existente nos tokens da newsletter (sem fontes novas, compatível com clientes de email).
- Não altera conteúdo, ordem nem regras editoriais — apenas a apresentação dos destaques.
