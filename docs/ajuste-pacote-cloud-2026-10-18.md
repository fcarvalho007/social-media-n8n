# Ajuste de tamanho para o Lovable Cloud

A instalação inicial recusou cada função com8,1MB, acima dos cerca de4,5MB aceites pelo alojamento. As migrações e o bucket privado já tinham sido instalados; as funções não.

A correção remove dos dois pacotes o asset estático PDFium de4,65MB e a respetiva declaração static_files. O motor continua versionado em2.15.1: é carregado do pacote oficial no jsDelivr, com URL fixa, HTTPS sem redirecionamento, limite de6MB/20segundos e verificação SHA-256 antes da inicialização. O carregamento ocorre no servidor; nenhum PDF é enviado ao CDN. O parser guarda o módulo em memória durante a vida da instância. Não muda credenciais, autorização, formato de documentos ou automações.

SHA-256 esperado:5e4cd023c3dad4a895b3571ca573d3fc51bac6de48360d95283134385b954eaa. O script de build mantém esta assinatura derivada da versão npm instalada. Licenças preservadas. O ensaio local Deno descarregou o binário real, verificou a assinatura e extraiu uma página de um PDF real sem transmitir o documento. Testes do carregador, PDFium e adaptador HTTP aprovados; Deno check das duas funções aprovado. O sucesso do novo deploy ainda é verificado separadamente no Cloud.

As adaptações Cloud anteriores estão preservadas na branch da entrega: migrações0062/0063 compatíveis com o alojamento, sem reaplicar0060/0061; as regras de leitura/escrita e o cron inativo mantêm-se. A ligação da interface ao novo backend só é ativada depois de ambos os deploys passarem.

## Arranque ESM e auditoria

O segundo deploy passou, mas o alojamento devolveu500 antes da autorização: o `createRequire(import.meta.url)('jsdom')` dependia da resolução Node do checkout. O parser passou a usar importação ESM, resolvida pelo mapa npm já versionado nas funções. Nenhuma regra de extração foi alterada.

`npm run check:hub-cloud` copia o runtime e o mapa para uma pasta temporária fora do projeto. Deno importa-os sem `node_modules` local, sem rede e sem credenciais reais: API anónima401, worker anónimo401 e origem estranha403. Este ensaio passou; o sucesso do arranque no Cloud deve ser confirmado depois de instalar a versão corrigida.

A auditoria npm motivou as atualizações jsPDF4.2.1 e Swiper12.1.2. Vitest mantém a mesma versão e passa a dependência de desenvolvimento: só é importado pelos testes. Não se executou uma atualização geral de versões maiores. A auditoria completa ainda contém dívida de dependências antigas; os alertas críticos restantes identificados pertencem à cadeia de testes Vitest/tinypool. Não equivale a declarar a aplicação sem vulnerabilidades.

Após a correção:1004 testes aprovados e1 ignorado preexistente, tipos da aplicação e do backend aprovados, build Vite aprovado. O build ainda avisa de alguns bundles acima de500kB; permanece trabalho futuro de divisão de módulos. A execução paga dos fornecedores, a migração dos37PDFs e a ativação do agendamento são verificações independentes, não comprovadas por estes testes.

O teste autenticado no Cloud revelou depois `Buffer is not defined`. O backend e os motores passam a importar explicitamente `Buffer`, `process` e os temporizadores Node onde os usam; o Deno não fornece todos estes globais implicitamente, e os timers Web não têm `unref()`. O ensaio isolado foi ampliado: autenticação e repositório sintéticos, sem rede real, percorrem o router e confirmam200 nas leituras SEO, operação e acervo. Os resultados401/403 continuam cobertos. Isto não simula a aprovação do alojamento: o teste real autenticado deve passar antes da ligação pública.

O Lovable confirmou depois os dois deploys e HTTP200 autenticado em `/operacao/estado`; a configuração pública da origem ficou em `.env.production`, com o `.env` gerido intacto. Foram ainda corrigidos três conflitos de tipagem ArrayBuffer/Buffer, com9testes e compilação automática aprovados. Worker/cron e publicação WordPress mantiveram-se desligados.

A verificação do site público detetou a rota da biblioteca ainda condicionada ao modo local. `DOCUMENTOS_DISPONIVEL` passa a controlar rotas, menu e passagem de fontes para artigos/carrosséis quando existe backend Cloud; `DOCUMENTOS_LOCAL` continua a impedir o armazenamento/proxy local em produção. Teste de regressão cobre a navegação Cloud com modo local desligado. Os pacotes das funções foram regenerados também com a correção de tipos do adaptador HTTP. A confirmação final no site público é registada no recibo da entrega, separadamente da preparação local.
