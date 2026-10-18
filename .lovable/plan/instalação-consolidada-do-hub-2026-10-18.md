# Instalação consolidada do Hub

## Versão confirmada
- HEAD: `d84d472b1b6b75f53c5dec2f47839c4b6a58d2dd`.
- Árvore: `485bb57067b98e35c1697647deacb3ed923eb9f3`; sem alterações locais na verificação inicial.
- A branch interna do ambiente é `edit/edt-5606df6d-46a5-4227-981d-9f9bcbfe93c3`; o conteúdo corresponde exatamente à entrega autorizada.

## Resultados da auditoria inicial
- Os efeitos das migrações 0060 e 0061 já existem na base de dados: tipos/estados, adiamento, divulgação e respetiva versão. Não reaplicar.
- As tabelas `hub_*`, o bucket `hub-documentos` e a função de instalação do worker ainda não existem.
- `pg_cron`, `pg_net`, `mc_pode_ler` e `mc_pode_escrever` existem. A leitura exige propriedade do projeto; a escrita exige também o papel autorizado.
- Os dois ficheiros PDFium incluídos têm o hash esperado e a versão 2.15.1.
- `DEEPSEEK_API_KEY` e as credenciais WordPress legadas estão presentes; `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `HUB_ORIGENS` e `HUB_WORDPRESS_PUBLICAR` não constam dos secrets configurados. Nenhum valor foi lido.

## Compatibilidade obrigatória antes da instalação
A migração 0062 fornecida não pode ser aplicada literalmente pelas regras do Cloud: contém criação de bucket por SQL, uma referência direta a `auth.users` numa tabela de aplicação e concessões de acesso colocadas depois da ativação de RLS. A 0063 também coloca a concessão depois de RLS.

Aplicar apenas as adaptações mínimas de instalação, sem reconstruir funcionalidades:
1. Criar o bucket privado pela ferramenta de Storage, com limite de 50 MB, retirando apenas o `INSERT storage.buckets` da migração; conservar a verificação de privacidade e a política de leitura.
2. Manter `criado_por` como UUID obrigatório, sem referência direta à tabela gerida de autenticação.
3. Colocar os GRANTs imediatamente após cada CREATE TABLE, antes de RLS, preservando exatamente os destinatários e permissões pretendidos: clientes apenas SELECT nas tabelas autorizadas; leases, artefactos e configuração apenas service role.
4. Aplicar 0062 e depois 0063 através da ferramenta de migrações. Identificar todas as adaptações no relatório.

## Instalação e configuração
- Publicar apenas `hub-editorial` e `hub-editorial-worker`, usando os runtimes, WASM e licenças já incluídos; não regenerar nem alterar o motor.
- Definir `HUB_ORIGENS` com as duas origens autorizadas e `HUB_WORDPRESS_PUBLICAR=0`, sem alterar credenciais existentes.
- Configurar a ligação pública `VITE_HUB_BACKEND_URL` sem editar o `.env` gerido. Se o Cloud não disponibilizar uma configuração de build suportada, usar um ficheiro de configuração de produção separado contendo exclusivamente a URL pública e indicar essa alteração.
- Instalar a configuração do worker pela função existente, com token apenas no servidor. Confirmar `ativo=false`, cron inativo e ausência de projetos ativos/jobs criados. Não iniciar o worker.
- Não importar PDFs/capas nesta ronda e não criar um projeto fictício.

## Verificações
- Confirmar versões instaladas de PDFium/fast-png; sincronizar pelo lockfile apenas se necessário, sem atualizar versões.
- Executar os testes existentes pertinentes de autenticação, adaptação Web, persistência, PDFium, documentos e operação, sem fornecedores externos.
- Consultar os resultados automáticos de compilação/verificação do ambiente; não executar manualmente os builds/typechecks do projeto nem autofix global.
- Verificar as funções instaladas por pedidos anónimos seguros: recusa 401/403 e nenhum documento exposto. Auditar grants/RLS, bucket privado e cron/configuração inativos por leitura.
- Verificar a ligação pela interface autenticada, se houver sessão disponível, sem criar documentos, jobs, conteúdo ou chamadas pagas. Relatar qualquer percurso não verificado.
- Consultar a revisão de segurança antes da publicação; não reparar dívida histórica fora desta instalação.

## Publicação e importação privada
- A publicação da interface fica a cargo de Frederico no navegador, conforme a instrução final do documento. Não publicar a aplicação nesta execução.
- O backup autenticado existente guarda/verifica um manifesto no mesmo alojamento; não é uma importação nem uma cópia independente dos binários.
- O operador de restauro incluído exige uma credencial service-role, indisponível para exportação no Lovable Cloud. Não prometer que esse operador funciona no computador do proprietário nem sugerir exportar a chave.
- Confirmar a via privada suportada antes da importação separada dos 305 MB; se não existir uma via já implementada sem exportar a chave, reportar esse bloqueio, sem desenvolver um importador nesta ronda.

## Entrega
Relatório curto com versão inicial/final, dependências, migrações e adaptações, resultado de cada deploy, configuração sem secrets, verificações efetuadas, cron desligado, publicação pendente no navegador e limitações reais de importação/restauro. Sem emails, IA paga, pesquisa paga, Instagram ou WordPress.