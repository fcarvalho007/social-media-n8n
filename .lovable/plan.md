# Corrigir a sincronização dos Destaques com Brief

## Problema identificado
O limite de três é verificado nas associações de Briefs. Estas podem não corresponder às escolhas atuais da edição. Além disso, o editor sincroniza o Brief antes de terminar a gravação da escolha e oculta a falha dessa sincronização. O servidor apresenta o bloqueio como erro interno 500.

## Correção proposta
- Manter o limite de três Destaques, sem substituir notícias automaticamente.
- Fazer a sincronização apenas depois de a escolha editorial ficar guardada.
- Reconciliar as associações com as escolhas atuais, preservando os textos dos Briefs e as edições históricas; uma associação antiga não deve ocupar um lugar atual.
- Apresentar um aviso claro e recuperável quando os três lugares estiverem realmente ocupados, sem transformar este bloqueio editorial num erro interno nem ocultar falhas reais.

## Validação
- Testar três lugares ocupados, troca de Destaque por Novidade, associação desatualizada, repetição da mesma escolha e falha de gravação.
- Regenerar a newsletter pelas fontes inertes e verificar o grafo das funções.
- Verificar o ecrã em computador e a 375 px, sem gerar conteúdo com IA nem alterar notícias reais.

## Limites desta intervenção
A implementação e os testes ficam locais. Não apagar dados, alterar conteúdos, enviar newsletters ou instalar funções no servidor. A instalação e qualquer reparação de associações existentes exigem autorização própria.

## Detalhes técnicos
Editar apenas as fontes `.txt` da newsletter e regenerar com o gerador existente. Usar as escolhas em `revista_itens` como referência para a reconciliação de `brief_edicoes`, mantendo os Briefs e versões intactos. Tratar o limite como resultado editorial esperado no percurso específico de sincronização, sem alterar autenticação ou permissões do gateway.