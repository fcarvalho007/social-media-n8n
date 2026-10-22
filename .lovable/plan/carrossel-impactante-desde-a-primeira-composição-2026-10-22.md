# Carrossel impactante desde a primeira composição

## Diagnóstico (a confirmar na ronda 0)

Ao aprovar o texto, a composição inicial coloca título e texto em posições fixas, com o mesmo arranjo em todos os slides. As composições, estilos, ícones, imagens Pexels/Unsplash e o «ritmo visual» existem, mas só se aplicam depois, à mão, no passo Design. Por isso o resultado parece texto colado sem critério visual.

## O que o documento pede e o que falta

| Prática do documento | Hoje | Proposta |
|---|---|---|
| Capa = gancho, título Black enorme dentro do quadrado central 1080×1080 | Título normal, posição fixa | Capa própria com zona segura da grelha |
| Slide 2 tão forte como a capa (o Instagram volta a mostrá-lo) | Slide comum | Slide 2 tratado como «segundo gancho» |
| Ritmo 8–10, quebra a meio (curva em U) | Ritmo só por botão | Ritmo aplicado logo na composição |
| Dados isolados em fundo escuro, alto contraste | Manual | Slide com número detetado → destaque de dado |
| Ícones, setas, espaço negativo, menos texto | Ícones existem, não são usados automaticamente | Ícone por função do slide + seta de continuidade |
| Imagens adaptadas ao tema de cada slide | Pesquisa manual | Sugestão automática de fotografia gratuita por slide (Pexels/Unsplash), aplicada como proposta |
| Zonas seguras: 135 px topo/base na capa, 100 px na base, 40 px laterais | Não verificado | Guias visíveis no editor + verificação |
| Alerta de carga cognitiva (texto excessivo, mais de 4 pontos) | Só «não cabe» | Aviso por slide com sugestão de dividir |
| ZIP com texto alternativo por slide + PDF LinkedIn | Exportação existe | Texto alternativo por slide (fase posterior) |

## Rondas

**Ronda 0 — Auditoria visual (sem custos)**
Abrir o carrossel atual, captar os slides, confirmar exatamente o que a composição inicial faz e medir contra a tabela acima. Relatório com capturas.

**Ronda 1 — Composição inicial com critério (gratuita, sem IA)**
- Ao enviar para a composição, cada slide recebe automaticamente uma composição pelo seu papel: capa, segundo gancho, dado-chave, passo/lista, citação, quebra a meio, fecho com chamada à ação.
- Estilo escolhido aplicado logo (não só cores: grelha, filetes, formas, peso Black no título).
- Ícone vetorial por função do slide, barra de progresso e seta «desliza» nos slides intermédios.
- Zonas seguras respeitadas; nada é cortado nem encolhido — se não couber, fica a composição simples com aviso.
- O texto aprovado nunca muda.

**Ronda 2 — Imagens adaptadas a cada slide (gratuitas)**
- Palavras-chave por slide extraídas do próprio texto (sem IA); pesquisa Pexels/Unsplash.
- Proposta de uma imagem por slide onde faz sentido (capa, quebra, fecho), com composição que protege a leitura (gradiente, recorte, meia página).
- Mostrada como proposta para aceitar/trocar/recusar; créditos do autor mantidos. Imagens com IA paga continuam só por pedido explícito.

**Ronda 3 — Refinamento e controlo**
- Guias de zona segura no editor (quadrado central, base, margens).
- Alerta de carga cognitiva por slide com ação «dividir em dois slides».
- Continuidade entre slides (forma que atravessa a fronteira) opcional.
- Texto alternativo por slide na exportação.

**Ronda 4 — Validação**
Mesmo artigo nos seis estilos, desktop e 375 px, PNG/PDF de teste sem publicar; relatório com evidência.

## Skills

Vou procurar e instalar skills de design/carrosséis apenas se acrescentarem regras úteis ao motor; nenhuma substitui as regras acima, que passam a viver no código e nos testes.

## Detalhes técnicos

- Ponto de entrada: a função que cria as páginas a partir dos slides aprovados passa a chamar `comporPagina` com um plano derivado de `planoRitmo` + papel do slide + estilo ativo (`motor/estilos.ts`, `motor/composicoes.ts`), com fallback ao layout atual quando `cabe=false`.
- Novas composições `gancho2` e `dado_chave`; zonas seguras como constantes partilhadas, verificadas no `transbordo` e desenhadas como guias só no editor (não exportadas).
- Imagens: novo passo opcional que usa os adaptadores Pexels/Unsplash já existentes no servidor; resultado gravado como proposta (não aplicado) no documento versionado; preview = editor = exportação.
- Testes: capa com texto dentro do quadrado central, slide 2 distinto da sequência, quebra a meio, ícone por papel, recusa sem corte, texto e ordem inalterados, documentos antigos abrem iguais.
- Restrições: trabalho local em branch separado; sem deploy/publicação nem pedidos pagos sem nova autorização; sem alterar carrosséis existentes (só novos ou por ação explícita «Recompor»).

## Riscos

- Imagens de bancos gratuitos podem não acertar no tema; por isso ficam como proposta.
- Mais composições automáticas aumentam a variedade de casos a testar; a ronda 4 cobre os seis estilos.
