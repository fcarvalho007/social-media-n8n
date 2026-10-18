# Publicação e isolamento

As reservas sociais são gravadas antes de qualquer pedido externo. A chave enviada ao fornecedor deriva da reserva do servidor, nunca da chave escolhida pelo navegador. A mesma publicação/destino fica protegida permanentemente; cópias com o mesmo conteúdo são bloqueadas durante 24 horas. Recusas do fornecedor nunca são contornadas com caracteres invisíveis. Uma resposta perdida fica por reconciliar, sem reenvio automático nem transporte alternativo.

O Getlate é o único responsável pela execução dos agendamentos aceites por esse fornecedor. `send-scheduled-posts` é uma rota retirada (410): o cron antigo podia voltar a enviar pelo n8n o que já estava agendado no Getlate. Os workers da newsletter, do Hub e o cron de recolha são independentes.

`publish-proxy`, `publish-to-getlate`, `submit-to-n8n`, `callback`, sincronização e importações verificam a sessão e o papel editorial. A publicação exige um registo próprio persistido. O webhook `incoming` exige o segredo de servidor existente e autoria explícita; um email declarado no corpo não autentica ninguém. `callback` apenas regista recusas. Uma aceitação de webhook não é prova de publicação.

As migrações 0064/0065 mantêm o histórico e acrescentam políticas restritivas. O papel global de equipa deixa de conceder acesso automático às publicações, rascunhos, artigos e analítica de outra conta. Dados com projeto também exigem titularidade desse projeto. Registos antigos sem projeto permanecem sem projeto e só aparecem na consulta a todos os projetos da respetiva conta. Não são copiados nem atribuídos automaticamente. Artigos usam `art_rascunhos`, não `mc_artigos`.

O compositor continua a ler os documentos guardados em `nl_conteudos.divulgacao.composicoes`. O worker só promove campanhas reais confirmadas por E-goi como `sent`; a lista interna não satisfaz essa condição. A verificação pode demorar até ao ciclo horário. Story e carrossel ficam por rever, sem publicação ou agendamento social automático, preservando as composições manuais.

## Instalação e verificação

1. Aplicar 0064 e 0065, pela ordem, numa ligação de migração. Instalar as dez funções sociais alteradas e os dois bundles Hub gerados. Não ativar crons, WordPress nem fornecedores pagos durante a validação.
2. Executar `scripts/auditar-isolamento-producao.sql` com a ligação de migração. O script cria fixtures transacionais, testa os três utilizadores existentes sob RLS e termina com `ROLLBACK`. Não cria contas, credenciais ou acesso persistente. Uma ligação apenas de catálogo pode recusar `SET ROLE`; nesse caso a matriz não está comprovada e deve ser reportada como bloqueada.
3. `GET sync-getlate-posts` é leitura pura e limitada a cinco resultados publicados. `POST` com `read_only:true` faz a mesma verificação. A sincronização efetiva exige POST e sessão editorial; nunca usa a primeira conta como fallback. As imagens importadas só são descarregadas de CDN Instagram/Facebook por HTTPS, sem redirecionamentos e até 10 MB.
4. Verificar a cadeia campanha real → job → documentos editáveis e abrir ambos os formatos no compositor. Não enviar outra campanha para produzir uma prova.
5. Testes locais: `npm test`, `npm run typecheck`, `npm run typecheck:backend`, `npm run build` e Deno check dos endpoints alterados. O teste Poppler exige `HUB_POPPLER_DIR` quando os binários não estão no PATH.

## Limites

O fornecedor social continua a usar a configuração de uma única workspace Getlate. Contas sociais independentes por cliente/projeto exigem mapeamento explícito de credenciais e destinos; esta ronda não cria nem amplia credenciais. RLS não transforma ficheiros de marketing deliberadamente públicos em ficheiros privados. Os documentos do acervo usam o bucket privado próprio.

A prevenção de duplicados não é um mecanismo de republicação deliberada. Resultados incertos exigem confirmação no fornecedor antes de preparar outro envio. Os testes reais desta ronda não devem publicar conteúdo, enviar newsletters nem acionar webhooks de publicação. O piloto pago e o bloco de expansão WordPress permanecem separados.
