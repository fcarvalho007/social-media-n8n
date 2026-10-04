# Roadmap — Estúdio de conteúdos / Newsletter

- [x] Entrada por código de email (sem password fixa, sem criar contas)
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
