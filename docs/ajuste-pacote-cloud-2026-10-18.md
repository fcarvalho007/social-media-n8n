# Ajuste de tamanho para o Lovable Cloud

A instalação inicial recusou cada função com8,1MB, acima dos cerca de4,5MB aceites pelo alojamento. As migrações e o bucket privado já tinham sido instalados; as funções não.

A correção remove dos dois pacotes o asset estático PDFium de4,65MB e a respetiva declaração static_files. O motor continua versionado em2.15.1: é carregado do pacote oficial no jsDelivr, com URL fixa, HTTPS sem redirecionamento, limite de6MB/20segundos e verificação SHA-256 antes da inicialização. O carregamento ocorre no servidor; nenhum PDF é enviado ao CDN. O parser guarda o módulo em memória durante a vida da instância. Não muda credenciais, autorização, formato de documentos ou automações.

SHA-256 esperado:5e4cd023c3dad4a895b3571ca573d3fc51bac6de48360d95283134385b954eaa. O script de build mantém esta assinatura derivada da versão npm instalada. Licenças preservadas. O ensaio local Deno descarregou o binário real, verificou a assinatura e extraiu uma página de um PDF real sem transmitir o documento. Testes do carregador, PDFium e adaptador HTTP aprovados; Deno check das duas funções aprovado. O sucesso do novo deploy ainda é verificado separadamente no Cloud.

As adaptações Cloud anteriores estão preservadas na branch da entrega: migrações0062/0063 compatíveis com o alojamento, sem reaplicar0060/0061; as regras de leitura/escrita e o cron inativo mantêm-se. A ligação da interface ao novo backend só é ativada depois de ambos os deploys passarem.
