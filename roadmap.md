# Roadmap

## Instalação autorizada campanhas e isolamento 18/10/2026
- [x] Confirmar HEAD e árvore autorizados
- [x] Auditar dependências e aplicar pré-requisitos e DDL 0064/0065 em falta (0064–0066 Cloud)
- [x] Instalar duas funções Hub e dez funções sociais autorizadas
- [x] Verificar HTTP, isolamento real com rollback e leituras sociais sem publicação
- [x] Verificar entradas autenticadas: bloqueadas na pré-visualização sem variável de produção; sem campanha sintética
- [x] Executar 115 testes, 51 repetidos e grafo Edge de 255 ficheiros; consultar segurança e cron/worker
- [ ] Desativar send-scheduled-posts em Cloud → Jobs — bloqueado: UPDATE cron.job recusado por ambas as ferramentas (42501); endpoint retirado instalado, sem invocação

## Instalação consolidada Hub 18/10/2026
- [x] Confirmar commit/árvore e auditar compatibilidade Cloud
- [x] Aplicar 0062/0063 compatíveis, bucket privado e cron desligado
- [x] Publicar as duas funções Hub da correção 958ccf05, sem regenerar código
- [x] Validar HTTP real: API anónima 401, worker anónimo 401, origem estranha 403
- [x] URL pública já configurada em .env.production e preservada; operacao/estado autenticado 200 em 18/10/2026
- [x] Instalar configuração privada do worker desligado; auditar RLS/bucket/cron privado/inativo e zero jobs
- [x] Executar 26 testes isolados; auditar RLS, bucket privado, cron inativo e ausência de jobs
- [x] Relatar publicação manual e limitação de importação privada

## Complemento obrigatório 319 — verificação final
- [x] Confirmar três Briefs anónimos com noindex/nofollow e proteção dos restantes
- [x] Verificar HTML/texto/site/preview backup, fontes, formação e leituras literais; leitura direta LearnDash devolve 403, sem nova escrita
- [x] Verificar desktop/375px, navegação por teclado, Security e testes; 41 testes e grafo de 243 ficheiros aprovados
- [x] Confirmar ausência de envios e preservação de campanha970, crónica99178 e backup5264; reportar URLs e limitações

## Briefs em Compor e publicação de teste 319
- [x] Integrar gerar/rever/aprovar/abrir apenas os três destaques; preservar leituras prontas sem custos
- [x] Garantir destaques aprovados → Brief e restantes notícias → fonte em HTML/texto/web/backup
- [x] Propagar noindex/nofollow da edição pública de teste e proteger todos os rascunhos
- [x] Atualizar publicação web/snapshot público 319 pelo motor sem alterar campanha histórica/E-goi
- [x] Atualizar somente backup existente 5264 com os links; preservar crónica 99178
- [x] Testar acesso anónimo, Compor e renderizadores; nenhum email/campanha nova

## Briefs dos três destaques da edição 319
- [x] Confirmar conteúdos aprovados, fontes e destinos de formação
- [x] Apresentar plano para ativação e publicação limitada aos três Briefs existentes
- [x] Implementar ligações, acesso público seguro e formação após análise
- [x] Preencher e publicar somente os três Briefs, preservando leituras literalmente
- [x] Testar percurso público e ausência de exposição de rascunhos; verificar condições dos renderizadores sem enviar emails

- [x] Instalar PR #2 (commit a5a5f214): migração 0040, funções Edge e validações sem efeitos externos
- [x] Refinar o ecrã «Criar» com percursos Manual/IA, formatos reais e n8n discreto
- [x] Formatação parcial de texto com paridade no compositor e exportação
- [x] Simplificar a área Imagens e retirar Logótipo do seletor
- [x] Pesquisa e inserção de stickers GIPHY pelo servidor
- [x] Reprodução de stickers e duração editável no slide
- [x] Exportação MP4 por slide animado
- [x] Passagem de PNG/MP4 para o rascunho social
- [ ] Validar visualmente num documento real em desktop e 375 px — bloqueado por sessão de pré-visualização sem acesso ao projeto
- [x] Ajustar caixas de texto, edição imediata e seleção múltipla por área
- [x] Separar Giphy com GIFs, stickers e Clips (capa + animação)
- [x] Expor opções reais de imagem IA, quantidade, custo e modo profissional
- [x] Acrescentar duas direções IA editáveis, sem texto gerado na imagem, com custo explícito e aprovação

## Design das peças (plano aprovado 08/10/2026)
- [x] Etapa 1a: tipografia independente (Montserrat+Inter por defeito), 5 famílias de paleta, painel com Tipografia
- [x] Etapa 1b: funções de cor por elemento (papelCor) em vez de troca por hexadecimal; preferência por projeto no backend
- [x] Etapa 2: cinco direções (Impacto novo) e dez composições próprias; Minimalista/Contraste em "Estilos anteriores"
- [x] Etapa 3: ponto focal, ritmo pela narrativa, vista da sequência
- [x] Etapa 4: painel completo (alcance, comparação capa+interior+fecho, lista de páginas recompostas)
- [x] Decisão do dono: DM Serif só tem peso normal
- [x] Didático «Cartões» reais, zonas de leitura de story, comparação antes/depois e alcance por página/elemento
- [ ] Validação no ecrã com sessão iniciada (desktop e 375 px)

- [x] Redesenhar: imagens IA visíveis em slides de dados, recuperação ao reabrir e galeria de imagens já geradas do carrossel
- [x] Retirar visualmente notícias candidatas apenas da edição atual, com reposição sem afetar a curadoria comum
- [x] Corrigir Curar → Compor com fila «Por organizar» e ações de aprovação com dimensões iguais
- [x] Tornar «Aprovar» definitivo e «Remover da newsletter» específico da edição, preservando a curadoria
- [x] Permitir eliminar conteúdos no Painel e alternar entre conteúdos próprios e carrosséis da crónica
- [x] Adicionar título, subtítulo e nota editorial formatados a «Esta semana recomendo»
- [x] Refinar os Destaques numerados: categoria alinhada ao título e ritmo compacto no email e web
- [x] Impedir que uma imagem antiga inacessível da crónica provoque erro 500 e ecrã em branco
- [x] Corrigir o recorte de imagens da crónica e automatizar o URL após publicação

## Carrossel impactante (plano 22/10)
- [x] Ronda 1 (parcial): capa na zona segura com título Black, ícone por função, barra de progresso, seta de deslizar, avisos de carga (função)
- [ ] Ronda 0: auditoria visual com capturas do carrossel real
- [ ] Ronda 1: mostrar avisos de carga no ecrã; composição «segundo gancho» própria no slide 2
- [ ] Ronda 2: imagens gratuitas sugeridas por slide (proposta)
- [ ] Ronda 3: guias de zona segura no editor, dividir slide, texto alternativo por slide
- [ ] Ronda 4: validação nos seis estilos, desktop e 375 px
- [x] Capa: 3 propostas (Manifesto, Choque de dado, Fotografia imersiva) no passo Design
- [ ] Capa: validação visual desktop/375 px; «Trocar fotografia» com pesquisa gratuita diretamente na capa
- [x] Aviso de carga + «Dividir em dois slides» na Narrativa; segundo gancho no slide 2; «Zonas seguras» no editor; capas no painel Direção visual
- [ ] Ronda 2: fotografia gratuita sugerida por slide (aceitar/trocar) e «Trocar fotografia» na capa
- [ ] Ronda 4: validação dos seis estilos e exportação PNG/PDF de teste
