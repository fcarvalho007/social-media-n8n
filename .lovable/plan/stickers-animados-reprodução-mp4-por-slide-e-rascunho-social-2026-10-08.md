# Stickers animados: reprodução, MP4 por slide e rascunho social

## Objetivo

Concluir os três itens abertos do roadmap, em cadeia:

1. Reprodução de stickers no compositor, com a duração do slide editável (já existe, mantém-se).
2. Exportação de MP4 por slide animado — gravado no navegador (decisão do dono), sem serviços pagos.
3. Rascunho social a receber PNG e MP4: story como MP4, post como MP4, carrossel misto (vídeo na posição do slide animado).

## Estado atual confirmado no código

- Usar um sticker GIPHY já guarda o par imutável capa + MP4 (`mc_assets` + `mc_animacoes`, content-hashed) e a camada guarda `animacao_id` e `duracao_ms` (0,5–60 s, já editável no editor).
- O editor desenha a capa estática (Konva); não reproduz o MP4. `ler_assets` devolve `animacao_id`/`duracao_ms`, mas não o URL do MP4.
- Exportação no servidor gera PNG por página (+ PDF/ZIP); `mc_exportacoes` só tem `png|pdf|zip`.
- `preparar_social` cria o rascunho só com PNGs (e PDF no carrossel); `linhaRascunho` monta `media_items` apenas com `type: "image"`.
- O criador social (ManualCreate) já trata ficheiros de vídeo e a recuperação de rascunho já converte URLs em ficheiros, incluindo `video/`.

## Trabalho

### 1. Reprodução de stickers no compositor

- `ler_assets` (mc-motor) passa também a devolver `animacao_url` (URL público do MP4 da animação) além de `animacao_id`/`duracao_ms`.
- `PaginaCanvas`: camada de imagem com `animacao_id` reproduz o `<video>` (autoplay, mudo, loop) desenhado no Konva; posição, tamanho, zona de story e efeitos mantêm-se exatamente como estão.
- Ao arrastar/selecionar/editar a camada, usa a capa estática (edição precisa); botão/estado de reprodução para ver o slide animado.
- Miniaturas e VistaSequencia continuam a usar a capa (leveza).

### 2. Gravação de MP4 por slide animado (no navegador)

- Módulo novo (ex.: `src/features/editor-grafico/gravacao.ts`): renderiza o slide num canvas fora do ecrã à resolução nativa, reproduz os vídeos das camadas animadas durante `duracao_ms` e grava com `MediaRecorder` (`video/mp4` no Chrome; fallback `webm` com aviso). Sem áudio.
- Acionado em «Preparar publicação» (RevisaoExportacao), depois de a exportação PNG/PDF estar concluída: grava só as páginas com camada animada, uma a uma, com progresso visível e cancelamento.
- Upload por nova ação do mc-motor (`carregar_video_animacao`): valida MP4 real (magic bytes), tamanho e duração aproximada; guarda no caminho versionado do documento e cria linha em `mc_exportacoes` com formato `mp4` e número da página.
- `caminhoFicheiro` passa a aceitar `.mp4` (mesma regra de caminhos versionados, nunca sobrescrever).
- Idempotente: retries voltam a gravar apenas os MP4 em falta (regra existente: cada asset em falta tenta uma vez).
- Se um MP4 falhar, o rascunho segue com o PNG dessa página e mostra aviso; a publicação nunca fica bloqueada pelo vídeo.

### 3. Rascunho social com PNG e MP4

- `preparar_social` junta os MP4s de `mc_exportacoes` dessa versão; `linhaRascunho` recebe `mp4s` e monta `media_items` com `{ url, type: "video", ... }`:
  - Story e post: o MP4 substitui o PNG do slide animado (PNG fica como capa/thumbnail).
  - Carrossel: item de vídeo na posição do slide, restantes imagens mantêm-se; mantém-se o teto de 20 itens.
- `media_urls` inclui os MP4s pela ordem dos slides; a recuperação já converte URLs em ficheiros de vídeo.
- Vídeo só nas redes Instagram (`instagram_stories`/`instagram_image`/`instagram_carousel`); o LinkedIn mantém PNG/PDF como está.
- Proveniência mantém `origem.carrossel_motor` e o crédito «Powered by GIPHY».

## Testes (junto dos existentes)

- `linhaRascunho` com MP4s: story = 1 vídeo; post = 1 vídeo; carrossel = vídeo na posição certa, imagens nas restantes, máx. 20 itens.
- `caminhoFicheiro` aceita `.mp4` e rejeita caminhos não versionados.
- Validação do upload de vídeo (magic bytes, tamanho) recusa ficheiros falsos.
- Fallback: sem MP4, o rascunho sai só com PNG (sem erro).

## Riscos e limitações

- `MediaRecorder` grava em tempo real: um slide de 60 s demora ~60 s a gravar — o progresso e o cancelamento são obrigatórios.
- MP4 nativo só em navegadores Chromium; noutros, sai WebM (aviso ao utilizador).
- Vídeo sem áudio.
- Validação no ecrã continua dependente de sessão de pré-visualização (limitação conhecida).
