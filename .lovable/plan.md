# Instalação autorizada do Hub e funções sociais

## Versão confirmada
HEAD `411e9daf62121fee4d9cb4ccd4dc9c40dd22b434` e árvore `d5d9457e23628180b9e92dd4a5b610018bc189b5`, sem alterações locais. O ambiente usa uma branch interna Lovable; a seleção da branch GitHub não é comprovada pelo nome dessa branch.

## Instalação
1. Conferir dependências, catálogo e migrações existentes, sem atualizar versões nem regenerar os bundles.
2. Adicionar primeiro as três colunas de projeto em falta. Aplicar 0064 e 0065 apenas onde faltam, com as adaptações Cloud indispensáveis: UUID de autoria sem referência à tabela gerida e grants antes de RLS. Conservar históricos e todas as verificações de acesso.
3. Instalar as duas funções Hub e as dez funções sociais indicadas, sem alterar outras funções.
4. Verificar HTTP real anónimo/autenticado, origem recusada, percurso/pesquisa e GET social limitado. Tentar a matriz de isolamento em transação com rollback; reportar recusa de SET ROLE como bloqueio.
5. Verificar as cinco entradas na pré-visualização autenticada. Só criar rascunho sintético se houver contexto de teste inequivocamente separado; caso contrário, limitar a leitura.
6. Executar testes pertinentes e consultar compilação/segurança. Reportar cada instalação efetivamente concluída, versão e pendências.

## Limites
Sem publicação da interface, serviços pagos, envios, importações, alteração de credenciais ou composições reais. Worker Hub, cron de publicação e WordPress continuam desligados. Configuração de produção existente preservada.

## Detalhes técnicos
As migrações originais existem mas ainda não estão refletidas no catálogo. A alteração do cron incluída em 0064 será tratada pela ferramenta apropriada se a ferramenta de migração recusar a alteração de estado. Nenhum fallback por SQL de cliente. Não executar builds/typechecks manuais: consultar os resultados automáticos. Não editar bundles ou ficheiros geridos.