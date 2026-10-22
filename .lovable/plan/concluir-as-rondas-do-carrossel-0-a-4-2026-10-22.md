# Concluir as rondas do carrossel (0 a 4)

Tudo local, sem integração, publicação nem pedidos pagos. O texto aprovado nunca muda sem ação explícita.

## Ronda 0 — Revisão do carrossel atual (só leitura)
- Abrir o carrossel aberto no preview com a sessão de teste, captar capa + todos os slides em computador e 375 px.
- Relatório curto: o que respeita/viola as práticas do documento (zona segura, ritmo, densidade, contraste, imagens).

## Ronda 1 — Fecho
- **Aviso de carga no ecrã:** no editor e no Design, um aviso discreto por slide quando há mais de 420 caracteres ou mais de 4 pontos numa lista, com o botão «Dividir em dois slides» (ronda 3).
- **Segundo gancho no slide 2:** composição própria aplicada na primeira composição — título grande com peso forte, faixa de destaque lateral e ícone alvo; se não couber, fica a composição atual com aviso.

## Ronda 2 — Fotografia gratuita sugerida por slide
- Botão «Sugerir fotografias» no Design: termos tirados do tema visual/título de cada slide (sem IA), pesquisa nos bancos gratuitos já ligados.
- Grelha por slide com a sugestão e alternativas: «Aceitar», «Trocar», «Recusar». Nada é aplicado sem aceitar; créditos do autor guardados.
- Na capa fotográfica: botão «Trocar fotografia» com a mesma pesquisa.
- Slides com imagem usam a composição de imagem já existente (gradiente/meia página) para proteger a leitura.

## Ronda 3 — Refinamento no editor
- **Guias de zona segura** (interruptor «Mostrar zonas seguras»): quadrado da grelha 1080×1080, faixa inferior dos pontos de navegação e margens laterais de 40 px. Só no ecrã, nunca na exportação.
- **Dividir em dois slides:** divide o texto pelo parágrafo/ponto mais próximo do meio; o novo slide herda título com «(cont.)» editável; ordem mantida nas duas variantes; desfazer disponível.
- **Texto alternativo por slide:** campo por slide na revisão da exportação, pré-preenchido com título + primeira frase; incluído no ZIP (ficheiro de texto) e enviado ao Instagram quando suportado.

## Ronda 4 — Validação
- Mesmo carrossel nos seis estilos e nas três capas; capturas em computador e 375 px; exportação PNG/PDF de teste sem publicar.
- Relatório final com o que ficou por fazer.

## Detalhes técnicos
- `motor/enriquecer.ts`: composição `gancho2` para índice 1; `avisosCarga` exposto em `PassoDesign` e no painel do editor.
- `motor/dividir.ts` (puro): divisão de slide + reindexação de refs/páginas A/B; testes de ordem, texto preservado e desfazer.
- Fotografias: reutilizar `pexels.server.ts`/`unsplash.server.ts` via a função de servidor existente; proposta guardada no documento versionado como pendente.
- Guias: camada só de desenho em `PaginaCanvas` (prop `guias`), excluída do renderizador de exportação.
- Texto alternativo: campo `alt` por página no documento (aditivo, opcional), lido pela exportação.
- Testes por regra; build e grafo do servidor verificados; Playwright para capturas.

## Riscos
- A ronda 2 precisa da função de servidor das fotografias instalada; se a versão instalada não suportar pesquisa por slide, a sugestão fica pronta mas só funciona após integração.
- O envio do texto alternativo ao Instagram depende do fornecedor de publicação; se não suportar, fica só no ZIP.
