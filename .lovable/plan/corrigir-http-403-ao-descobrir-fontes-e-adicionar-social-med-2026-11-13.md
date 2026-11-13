# Corrigir «HTTP 403» ao descobrir fontes e adicionar Social Media Today e Marketing Dive

## Causa (confirmada)
Os dois sites bloqueiam a página inicial a robôs (403). A descoberta desiste logo nesse momento, sem experimentar os endereços habituais de feed. Os feeds existem e respondem bem: `/feeds/news/` em ambos (testado agora, resposta 200).

## O que muda
1. Quando a página inicial recusa o acesso (403/401/429/falha), a descoberta continua e experimenta os caminhos comuns de feed no mesmo site, em vez de mostrar «HTTP 403».
2. Junta `/feeds/news/` e `/feeds/` à lista de caminhos comuns.
3. A descoberta passa a usar um identificador de navegador normal (como já fazem a leitura de artigos e a verificação de links), reduzindo bloqueios.
4. Se mesmo assim nada for encontrado, a mensagem passa a ser clara: «O site recusou o acesso. Cole diretamente o endereço do feed RSS, se o conhecer.»
5. Depois da correção, adiciono as duas fontes como RSS, ativas, com os feeds:
   - Social Media Today — https://www.socialmediatoday.com/feeds/news/
   - Marketing Dive — https://www.marketingdive.com/feeds/news/
   (só cria duas fontes novas; não apaga nem altera as existentes)

## Detalhes técnicos
- Editar apenas a fonte inerte `migration-reference/code/newsletter/src/lib/curadoria.functions.ts.txt` (`fetchTextoDescoberta`, `CAMINHOS_COMUNS_FEED`, ramo `!inicial.ok` em `descobrirFeed`) e regenerar com `python3 scripts/port-newsletter.py`; correr `scripts/verificar-grafo-edge.py`.
- Pequeno teste: com a página inicial a devolver 403 e `/feeds/news/` válido, `descobrirFeed` devolve esse candidato.
- Inserir as duas fontes em `nl_fontes_curadoria` seguindo o formato das fontes RSS existentes (lido antes de inserir).
- Fica no ramo local; a descoberta corrigida só chega ao site publicado quando pedir a integração.
