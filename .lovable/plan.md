# «Aprovar e preparar rascunho social»: deixar de parar no último slide

## Resposta direta

O destino está certo e é conhecido: o rascunho vai para o sistema de envio para redes sociais que já existe (Criar). O erro acontece **antes** disso, quando o servidor faz os PNG dos slides. Como não há animações, só se iriam enviar PNG (e o PDF do LinkedIn), sem MP4.

## Diagnóstico (confirmado nos dados)

- A preparação deste carrossel (versão 578, 10 slides) fez os slides 1 a 9 e parou no **slide 10**. Já tentou 8 vezes.
- O slide 10 tem uma fotografia do Unsplash (1600×2400) e 22 formas. O servidor fica sem tempo de processamento a desenhar essa página e é interrompido («CPU Time exceeded» nos registos). Como é interrompido à força, não regista o erro: a tarefa fica eternamente «a processar» e o ecrã mostra «A preparação parou de avançar».
- A tentativa anterior (versão 577) ficou presa da mesma forma, no slide 3.
- O erro «nomePagina» da última vez já estava corrigido. Este é um problema diferente: o limite de processamento do servidor com fotografias grandes.

## O que muda

1. **Os PNG passam a ser feitos no navegador**, com o mesmo desenho do compositor que já faz «Descarregar PNG/PDF», e são enviados para o servidor. O navegador não tem este limite de processamento, por isso fotografias grandes deixam de bloquear.
2. **O servidor continua a controlar o envio:** confirma que cada ficheiro é um PNG válido com as dimensões certas (1080×1350, ou 1080×1920 nas stories), guarda-o para esta versão exata sem nunca o substituir, e só cria o rascunho com **todos** os slides presentes. Os slides 1 a 9 já feitos são aproveitados.
3. **O PDF do LinkedIn** é feito no navegador a partir dos mesmos PNG e enviado da mesma forma (só nos carrosséis).
4. **Tarefas presas deixam de ficar presas:** depois de 3 interrupções seguidas no mesmo slide, a tarefa do servidor fica marcada como falhada com uma mensagem clara, e não «a processar» para sempre.
5. Progresso real no ecrã: «A preparar slide 7 de 10», depois «A enviar ficheiros», depois abre o rascunho em Criar. Continua a ser preciso aprovar, e mantêm-se os bloqueios atuais («Imagem por escolher», texto cortado).

## O que não muda

- Nada é publicado: fica um rascunho.
- Sem geração paga, nada apagado. As tarefas presas antigas ficam marcadas como falhadas, sem apagar ficheiros.
- MP4: só se gravam e enviam quando o slide tem animação, como já acontece.

## Validação

- Testes: rejeitar ficheiros que não sejam PNG ou com dimensões erradas; rascunho só com todos os slides; tarefa marcada como falhada depois de 3 interrupções.
- Verificação de tipos e das funções do servidor; voltar a publicar o motor.
- No ecrã, com este carrossel: preparar o rascunho e confirmar que chega a Criar com 10 PNG e o PDF.

## Detalhes técnicos

- Nova ação `mc-motor` `carregar_ficheiro_social` (multipart, como `carregar_video_animacao`): `mc_pode_escrever`, magic bytes PNG/PDF, leitura do IHDR para largura/altura = `docV.largura/altura`, limite de tamanho, `caminhoFicheiro` + `mc_registar_exportacao` (idempotente por hash; 409 se o hash for diferente para a mesma página/versão), e depois `mc_concluir_exportacao` com o manifesto quando estiverem todas as páginas + PDF.
- Cliente `RevisaoExportacao.tsx`: reutiliza o renderer do browser já usado nos downloads pessoais (sem marca d'água, sem marcador «Imagem por escolher»), envia só as páginas em falta em `estado_exportacao`, e depois chama `preparar_social`.
- Servidor `processarExportacoes`: deixa de ser o caminho do rascunho social; mantém-se para retomar trabalhos antigos. `mc_reservar_exportacoes`: migração aditiva que marca `erro` quando `tentativas >= limite` sem progresso (classe `tempo`).
- Atualizar a regra de exportação no `AGENTS.md`: ficheiros sociais desenhados no browser com o núcleo partilhado, validados e guardados pelo servidor por versão congelada (motivo: limite de CPU nas funções do servidor).
