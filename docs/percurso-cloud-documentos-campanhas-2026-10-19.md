# Percurso Cloud: Documentos → campanhas → compositor

Validação em 19 de outubro de 2026, na pré-visualização Cloud real, com a conta existente e o projeto DIGITALSPRINT. Ficheiro sintético de duas páginas, sem dados pessoais, identificado como teste. Nenhum envio ou publicação externa autorizado por este ensaio.

## Documento privado

- Projeto: `72115463-2412-4874-9281-260b7ffe5179`.
- Documento: `57fcf058-f678-4456-8102-e1b109b6c06b`.
- Upload feito pelo seletor da interface; original privado guardado.
- O projeto estava pausado; foi retomado pela interface. O worker já tinha configuração completa, mas estava desligado, assim como o cron. Ambos ativados após verificar que só havia as duas tarefas PDF e nenhuma tarefa paga ou de publicação.
- As duas tarefas existentes terminaram à primeira tentativa: texto de duas páginas e capa da primeira página. A interface apresentou ambos.
- Título alterado para «TESTE CLOUD · Percurso editorial · 19 outubro 2026»; marcado como Lido; página recarregada e documento reaberto noutro separador, conservando título, leitura, texto e capa.
- Original descarregado pela interface. SHA-256 do upload e da descarga: `dfe767e606201ab70e7f1d18761127de20368c9f159d64d4c2180d82183e0b3d`.
- Pesquisa «Guardar» mostrou apenas a página 2.
- Segundo upload do mesmo ficheiro conservou um documento no acervo.

## Campanha e correção descoberta no ensaio

- Selecionadas as duas páginas, campanha criada pela interface para `fredericocarvalho.pt`: `d021d75f-2ad0-40be-aef0-32a84e67268b`, «TESTE CLOUD · Campanha editorial · 19 outubro».
- Cinco propostas criadas sem IA paga, com revisão humana e sem agendamento. Título e texto do Story alterados e guardados.
- O ensaio encontrou uma falha real: o endpoint de composição tentava ler `hub_editorial_artefactos` através do cliente autenticado, embora a tabela seja deliberadamente exclusiva do servidor.
- Correção: conservar leitura do estado pela sessão do utilizador/RLS e ler no servidor apenas o artefacto referenciado na peça autorizada, filtrado por projeto, tipo e chave. Não alterar grants/RLS nem aceitar um identificador de artefacto do navegador.
- Correção Cloud separada do bloco Byword local: commit `f3c49a11be3af9bfddaf02bd9358d573d278a7ac` na branch `codex/hub-campanhas-descobertas`. Fontes e dois runtimes produzidos por `build:edge-hub` a partir da versão Cloud existente.
- Teste de regressão com clientes de utilizador e serviço separados: artefactos não acessíveis ao cliente autenticado, composição legítima legível, outro projeto/campanha recusados, identificador alternativo do navegador ignorado.
- Ambas as funções instaladas pelo Lovable a partir do commit referido. Composição autenticada HTTP 200; sem sessão 401; origem alheia 403.
- Story: composição criada pela interface; título visual alterado para «Primeiro a fonte. Depois a decisão.»; guardada, saída do editor, reabertura e recarregamento integral. A versão guardada reapareceu, sem recuperação local, com o botão de gravação desativado e o estado «Composição guardada na campanha».
- Carrossel: texto de trabalho editado e guardado; composição de quatro páginas criada; título visual alterado para «IA na formação: começa pelo critério» e guardado. Saída para a lista, recarregamento integral, abertura da campanha e reabertura da composição: título persistiu. Fecho verificado na página 4: «Subscreve a newsletter» e `podes.entrar.pt/news`, sem retrato.
- A campanha reapareceu na lista Cloud com cinco peças, na revisão 7. Os textos de trabalho e os títulos visuais mantêm-se separados.

## Verificação local da correção

- 53 testes aprovados: motor e adaptador Cloud de campanhas, formulários, compositor e persistência SQL.
- `typecheck:backend` aprovado nas versões Cloud e Byword local.
- `build:edge-hub` executado nas duas versões, sem editar os runtimes gerados.
- `check:hub-cloud` aprovado sem node_modules local: API e worker anónimos 401, origem alheia 403, três leituras autenticadas 200, zero pedidos externos reais.

## Controlos preservados

- Credencial do worker existente, sem alteração ou exposição.
- Recolha periódica desligada; outros projetos pausados.
- SEO automático, WordPress e publicações sociais desligados. Nenhum pedido a fornecedores pagos.
- Nesta primeira ronda não foi importado o acervo legado nem publicada a interface pública. Correção do inventário anteriormente indicado: são 28 binários únicos recuperáveis; a importação posterior está documentada em `importacao-pdftracker-acervo-2026-10-18.md`.
- PDFs privados sem referência HTTPS continuam sem confirmação editorial/publicação: criar rascunhos não equivale a aprovar fontes. Este ensaio não altera essa regra.

## Evidência e custos

- Captura do documento reaberto: `../evidencias-hub-2026-10-19/cloud-documento-reaberto.png` no diretório exterior ao repositório.
- Capturas do Story e carrossel reabertos no mesmo diretório: `cloud-story-reaberto.png` e `cloud-carrossel-reaberto.png`.
- Saldo inicial Lovable: 3664,52 créditos do plano e 2 créditos diários. Após ativação do worker: 3664,02 e 0 diários. Após instalação da correção: 3662,42 e 0 diários. Diferença observada nesta ronda: **4,10 créditos** (2 diários + 2,10 do plano), equivalente a **1,23 €** à taxa de 0,30 €/crédito definida pelo proprietário. A parcela debitada ao saldo do plano equivale a 0,63 €; os outros 0,60 € são a valorização dos créditos diários. Medição pelo saldo do workspace, não uma fatura individual do prompt.
- Consumo de fornecedores de conteúdo/SEO neste ensaio: zero. Infraestrutura Cloud é contabilizada separadamente pelo fornecedor.
