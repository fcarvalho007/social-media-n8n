# Hub Editorial Bridge · 1.0.0

Ponte mínima para o publicador privado do Hub enviar título SEO, descrição e focus keyword com o artigo. O WordPress exige a sessão REST autenticada e a capacidade normal de editar o artigo. Não cria contas, chaves ou permissões.

## Instalação futura, após autorização

1. Testar primeiro num WordPress de staging, com cópia de segurança e credencial de aplicação já autorizada.
2. Instalar a pasta `hub-editorial-bridge` como plugin e ativar. Esta ronda apenas entrega o código e o ZIP; não instalou o plugin em nenhum site.
3. Consultar autenticado `GET /wp-json/hub-editorial/v1/capabilities`. A resposta deve ter `versao: 1` e `metadados: true`.
4. No artigo do Hub, rever imagem/alt, título e descrição. Só ativar «Aplicar estes metadados no WordPress» após verificar a ponte no destino.
5. Criar um rascunho, confirmar `hub_editorial` e `featured_media` na resposta e verificar manualmente o painel e o HTML do WordPress antes de um piloto público.

Contrato do campo `hub_editorial` em `POST /wp-json/wp/v2/posts`:

```json
{"titulo":"Título de pesquisa","descricao":"Descrição útil","palavra":"focus keyword","schema":"Article"}
```

`schema` admite `Article`, `BlogPosting` ou `nenhum`. O campo é exposto apenas no contexto autenticado `edit`. Os valores são limitados, validados e tratados como texto.

## SEO suportado

- Rank Math: escreve e confere `rank_math_title`, `rank_math_description` e `rank_math_focus_keyword`.
- Yoast: escreve e confere `_yoast_wpseo_title`, `_yoast_wpseo_metadesc` e `_yoast_wpseo_focuskw`.
- Sem plugin SEO reconhecido: título e descrição no frontend e Article/BlogPosting JSON-LD com datas/URL reais do post. `nenhum` desativa o grafo preparado pela ponte.
- Com Rank Math/Yoast, o plugin conserva o controlo do schema, evitando uma segunda emissão pela ponte. A escolha do Hub não reconfigura o schema desses plugins.
- AIOSEO, SEOPress e The SEO Framework são detetados para não emitir metadados duplicados pela ponte; ainda não têm adaptador de gravação. A capacidade SEO não é anunciada para um destino apenas com esses plugins. Outros plugins devem ser auditados no piloto antes de ativar o envio de metadados.

A focus keyword serve o editor/plugin; não é criada uma tag `meta keywords`, nem prometida uma pontuação de SEO ou posição no Google.

## Estado de validação

O contrato do Hub, as reservas e as confirmações foram ensaiados com transporte WordPress simulado. Esta máquina não tem PHP/WordPress instalado para executar o plugin: a análise PHP e os testes reais de Rank Math/Yoast continuam pendentes no staging. O Hub não confunde esse ensaio com uma instalação ou publicação real.

Referências: [campos adicionais na REST API](https://developer.wordpress.org/rest-api/extending-the-rest-api/modifying-responses/), [artigos](https://developer.wordpress.org/rest-api/reference/posts/) e [multimédia](https://developer.wordpress.org/rest-api/reference/media/).
