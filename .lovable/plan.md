# Ligar a publicação no fredericocarvalho.pt aos dados já guardados

## O que se verificou
- Os três dados estão guardados: `WORDPRESS_SITE_URL`, `wordpress_site_username` e `wordpress_site_key`.
- A publicação da crónica no site (a integração que deu o aviso) procura outros nomes: `FREDERICO_WP_URL`, `FREDERICO_WP_USER` e `FREDERICO_WP_APP_PASSWORD`. Esses nomes não existem, por isso aparece «não configurada». No módulo anterior usavam-se os nomes que guardaste; a migração trocou-os.
- O envio clássico também procura `WORDPRESS_APP_USER`/`WORDPRESS_APP_PASSWORD` sem aceitar os teus nomes em minúsculas (a troca automática de nomes não chega a esse ficheiro).

## O que muda
1. A publicação da crónica passa a usar os dados já guardados (`WORDPRESS_SITE_URL`, `wordpress_site_username`, `wordpress_site_key`) quando os nomes `FREDERICO_WP_*` não existem. Não é preciso voltar a guardar nada.
2. O envio clássico passa a aceitar os mesmos nomes.
3. O diagnóstico das ligações passa a mostrar a crónica como configurada quando estes dados existem.
4. Verificação sem publicar: confirmar no editor que o aviso desaparece e testar só a ligação (leitura do utilizador no site), sem criar nem publicar artigos.

## Detalhes técnicos
- Fonte: `migration-reference/code/newsletter/src/lib/newsletter-engine/revista/frederico-wordpress.server.ts.txt` (`lerConfig`): `FREDERICO_WP_URL || WORDPRESS_SITE_URL`, `FREDERICO_WP_USER || WORDPRESS_APP_USER || wordpress_site_username`, `FREDERICO_WP_APP_PASSWORD || WORDPRESS_APP_PASSWORD || wordpress_site_key`.
- `scripts/port-newsletter.py`: aplicar a substituição de aliases WordPress também aos ficheiros do motor partilhado (envio.server) e ao diagnóstico em `nl-hooks`.
- Teste: com só os nomes guardados definidos, `obterEstadoIntegracaoFrederico` devolve `configurada: true`; sem nenhum, `false`.
- Regenerar, `scripts/verificar-grafo-edge.py`, testes, `tsgo`; publicar `nl-api`, `nl-newsletter`, `nl-hooks`, `nl-worker-conteudos`.
