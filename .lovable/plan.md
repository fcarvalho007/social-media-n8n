# Resumo do episódio a partir da página do podcast

## Diagnóstico (confirmado)
- O RSS do Marketing por Idiotas chega sem descrição nos episódios recentes (descrição vazia nos últimos episódios), por isso o resumo IA recusa e mostra «O RSS não tem descrição deste episódio».
- Cada episódio já tem guardado o endereço da sua página em marketingporidiotas.pt, onde está o texto do episódio.

## O que muda
1. Quando o RSS não traz descrição, o sistema lê a página do episódio no site do podcast, extrai o texto principal (sem menus, rodapé ou scripts) e guarda-o como descrição desse episódio.
2. A IA (DeepSeek, como hoje) resume esse texto nas mesmas 2 linhas (máx. 200 caracteres). O resumo continua a ser gerado uma única vez por episódio; «Gerar novamente» só a pedido.
3. Se a página não responder ou não tiver texto útil, aparece uma mensagem clara: «Não foi possível ler a página do episódio. Escreve o resumo à mão.»
4. Mensagem de aviso deixa de mandar «Actualizar do RSS» quando o problema é o RSS vazio.

## Limites e custos
- Leitura da página: gratuita (pedido directo ao site, sem serviços pagos).
- Apenas são lidos endereços do domínio marketingporidiotas.pt; outros são recusados.
- Custo IA igual ao actual (registado em custos, origem «resumo_podcast»).
- Não altera publicações, envios nem dados de outros episódios.

## Detalhes técnicos
- Fonte: `migration-reference/code/newsletter/src/lib/newsletter-ia.functions.ts.txt` (`resumirEpisodioPodcast`): se `descricao` < 20 caracteres e `url` válido no domínio permitido, `fetch` com timeout de 10 s e limite de tamanho, extracção de texto do `<article>`/`<main>` (fallback `og:description`), normalização de espaços, corte a 3500 caracteres; actualiza `nl_episodios_podcast.descricao` e prossegue para o resumo.
- Helper puro de extracção num ficheiro próprio, com teste unitário (HTML de exemplo → texto; domínio não permitido → recusado).
- Regenerar com `python3 scripts/port-newsletter.py`, correr `scripts/verificar-grafo-edge.py`, testes e `tsgo`; publicar a função afectada; validar no editor com o episódio e417s01.
