# Roadmap — Estúdio de conteúdos / Newsletter

- [x] entrada com código OTP por email (prova de posse); nunca emitir sessão só por email conhecido autorizado (sem código, sem magic link, sem password fixa, sem criar contas)
- [x] Reposição de password só para administradores e fora da entrada
- [x] Tabelas nl_, importador admin, endereço estável de imagens
- [x] Motor original da newsletter no servidor (adaptado às tabelas nl_)
- [x] Pré-visualização real do email (só leitura)
- [ ] Importação real com sessão iniciada (precisa do utilizador)
- [x] Ecrãs originais da newsletter montados em /newsletter/* (editor, Revista, arquivo, curadoria, fontes/emails, ferramentas, custos, definições, briefs, edição web)
- [ ] Testar fluxos de curadoria/edição com conta admin ou editor (a conta de teste injetada não tem papel)
- [ ] Envio E-goi/WordPress: ligar só após aprovação explícita e com segredos no servidor (EGOI_API_KEY, WORDPRESS_*, FREDERICO_WP_*, DEEPSEEK_API_KEY)
- [x] Revisão 265257033: (1) mapa explícito das operações nl-api (leitura/editor/admin/externa) com confirmação verificada no servidor
- [x] (2) dispararLista não marca "enviada" só por aceitação; reconciliação antes de fechar edição/gerar carrossel
- [x] (3) Gerador sem @ts-nocheck; tipos explícitos nas operações críticas (NlCall sem any)
- [x] (4) Formulário de password com SDK que suporta current_password sem casts
- [x] (5) "/" passa a ser o Estúdio; painel social em rota própria
- [x] (6) Esquema da newsletter reproduzível num checkout limpo (DDL aplicado reunido em migrações)

- [ ] Simulação autenticada com pacote de teste e importação real (bloqueado: humano muda passwords antigas; conta de teste sem papel)

## Autonomia pública (newsletter)
- [x] Páginas públicas /edicoes, /edicoes/:numero, /brief/:slug, /subscricao (só conteúdo enviado; subscrição só com token assinado)
- [x] nl-publico (leituras publicadas, sitemap, unsubscribe por token) e nl-hooks (8 hooks; automatismos inativos)
- [x] Página admin de ligações (só presença de chaves)
- [ ] Chaves externas: NL_EGOI_WEBHOOK_CHAVE, CloudMailin, E-goi, NL_EGOI_TAG_TOKEN/NL_EGOI_CAMPO_TOKEN_ID — aguarda humano
- [ ] Sincronização de tokens na E-goi: validar formato contra documentação oficial antes de usar; sem checkpoint durável
- [ ] Importação real — aguarda invalidação das passwords antigas e simulação admin com pacote fictício
- [x] Worker automático do carrossel (confirmação E-goi + jobs), hora a hora, sem envios/publicações
- [x] Evidência de envio protegida contra sessões de cliente; associação de marca só admin; projeto DIGITALSPRINT associado
- [x] Importador atribui as edições à identidade DIGITALSPRINT

- [x] Lote de refinamento (contexto de projeto, entrada, carrosséis, artigos, editor, ligações/migração) — anexo de 04/10

## R1 — prova isolada do editor gráfico
- [x] DocumentoGrafico v1, cinco fixtures sintéticas e editor protegido em /estudio/editor-prova
- [x] Edição, histórico, JSON, recuperação local e comparação protegida navegador/servidor
- [x] Composição desktop, telemóvel e largura intermédia com propriedades contextuais

## R2 — persistência do motor
- [x] Tabelas mc_* (fontes, trabalhos/etapas, propostas e versões, documentos A/B e versões, chamadas IA, orçamentos, exportações, ligações sociais)
- [x] Funções com versão esperada, aprovação invalidada por alteração, reserva/lease e teto de chamadas
- [ ] Ligar o editor e o processador às novas funções (R3)

- [x] R3: Carrosséis no Estúdio (texto colado, fila no servidor, retoma de 5 em 5 min, editor ligado com versões)
- [ ] R4+: fontes link/PDF, IA real com orçamento > 0, exportação e rascunho social (R6)
