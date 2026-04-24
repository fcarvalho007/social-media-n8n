## Plano — Prompt 2: Fluxo completo de Story com Link

### Observações antes de implementar
- O Prompt 1 está parcialmente concluído: existem tabela, preferências, funções, formato `instagram_story_link`, campos iniciais e página de confirmação.
- Ainda faltam peças centrais do Prompt 2: preview especial com sticker, UI de agendamento adaptada, launcher real de publicação manual, confirmação integrada ao ecrã do pacote, QR code com URL correto e micro-interações.
- O pedido de “vídeo de 30 segundos em iPhone real” não pode ser cumprido diretamente por mim aqui: não tenho acesso físico a um iPhone/Android real nem consigo gravar vídeo de dispositivo externo. Posso deixar o fluxo pronto e fornecer uma checklist objetiva para validação em dispositivos reais; se partilhares o vídeo ou feedback, ajusto o que for necessário.
- Há ficheiros bloqueados no projeto. Não vou editar `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env` nem definições de projeto em `supabase/config.toml`.

### 1. Refinar “Story com Link” em `/manual-create`
- Manter o formato selecionável, mas tornar o modo visualmente inequívoco quando `instagram_story_link` está ativo.
- No bloco “Opções por rede”, esconder opções irrelevantes para Instagram Story com Link:
  - primeiro comentário;
  - colaboradores;
  - tags de fotografia;
  - tabs de variante de formato que não se aplicam.
- Reorganizar o grupo “Conteúdo do Link Sticker” com copy pt-PT, estados de erro e contadores:
  - URL obrigatório;
  - texto do sticker opcional, máximo 30 caracteres;
  - texto sobreposto opcional, máximo 100 caracteres;
  - texto auxiliar: se estiver vazio, usa o domínio do URL.
- Corrigir os limites atuais que ficaram desalinhados: sticker está a 48 e overlay a 90; passar para 30 e 100.

### 2. Validações específicas
- Atualizar validações de `instagram_story_link` para:
  - exigir 1 ficheiro de média;
  - aceitar imagem ou vídeo;
  - validar URL com `http/https`;
  - avisar, sem bloquear, quando a média não for 9:16;
  - limitar sticker a 30 caracteres;
  - limitar overlay a 100 caracteres.
- Rever a regra atual que obriga “Story com Link” a estar isolada. O Prompt 2 permite cross-network; por isso vou alterar para permitir outros formatos em paralelo, garantindo que apenas o Instagram Story com Link sai pelo fluxo manual.

### 3. Preview dedicado com mockup de Story
- Expandir `InstagramStoryPreview` para suportar modo “Story com Link”:
  - imagem/vídeo como fundo;
  - texto sobreposto no mockup;
  - sticker de link com ícone e texto/domínio;
  - legenda “Simulação aproximada. O resultado final depende do teu Instagram.”
- Atualizar `previewRenderer` para renderizar este preview quando o formato for `instagram_story_link`.
- Manter visual compacto e mobile-first, usando tokens/classes existentes em vez de hardcodes novos.

### 4. Agendamento adaptado
- Adaptar `Step3ScheduleCard` quando `instagram_story_link` estiver selecionado:
  - título/copy “Quando queres publicar?”;
  - opção “Agora, vou publicar já”;
  - opção “Agendar lembrete para”;
  - mostrar canal atual “Email” e link/atalho para alterar em `/settings/notifications`;
  - mostrar antecedência configurada, quando disponível.
- Clarificar que o agendamento é do lembrete, não de publicação automática.
- Manter Lisboa como fuso horário.

### 5. Fluxo de preparação e redirecionamento
- Ajustar `usePublishOrchestrator` para o novo comportamento:
  - criar registo `story_link_publications` com `status = ready`;
  - se for “Agora”, redirecionar imediatamente para o Story Launcher;
  - se for agendado, agendar lembrete e redirecionar para `/stories` ou, se a página ainda não existir, para uma rota segura temporária com feedback claro.
- Alterar o comportamento atual que limpa tudo sem levar o utilizador ao ecrã de publicação manual.
- Manter cross-network: formatos automáticos continuam pelo fluxo normal; `instagram_story_link` gera pacote manual em paralelo.

### 6. Criar o Story Launcher
- Criar rota dedicada, por exemplo `/stories/launch/:id`, protegida por sessão quando aberto pela app.
- Também suportar entrada por token a partir de email, reaproveitando a confirmação segura já existente quando aplicável.
- UI mobile full-screen:
  - preview 9:16;
  - link visível;
  - tentativa automática de copiar link;
  - passos: descarregar média, abrir Instagram, colar link sticker;
  - botões “Já publiquei” e “Pular desta vez”.
- UI desktop:
  - preview;
  - QR code que abre o launcher no telemóvel;
  - botões “Descarregar média” e “Copiar link”;
  - sem botão de deep link para Instagram no desktop.

### 7. Comportamento dos botões e micro-interações
- “Copiar link” com Clipboard API, feedback “Copiado” por 2 segundos e fallback se o browser bloquear.
- Tentativa de copiar ao abrir o ecrã, sem assumir sucesso.
- “Descarregar média” com `<a download>` e feedback.
- “Abrir no Instagram”:
  - iOS: tentar `instagram://story-camera`, fallback `instagram://app`;
  - Android: intent para `com.instagram.android`;
  - desktop: QR code em vez de deep link.
- Haptic feedback em mobile com `navigator.vibrate`, sempre com fallback silencioso.
- Estado visual dos passos: ativo, concluído e destaque final em “Já publiquei”.

### 8. Confirmação e skip
- “Já publiquei” atualiza `status = published`, `published_at` e `published_by_device`.
- Depois de publicar, pedir feedback simples “Correu bem?” com Sim/Não, sem bloquear o fluxo.
- “Pular desta vez” abre confirmação antes de marcar `status = skipped`.
- Preservar a página `/stories/confirm` para links de email, mas evoluir a experiência para abrir o launcher quando houver pacote completo.

### 9. Backend e email
- Rever `generate_story_deeplink` para devolver URLs úteis ao launcher, não apenas `/manual-create?storyMedia=...`.
- Rever `send_story_reminder` para incluir botão “Abrir pacote no telemóvel” apontando para o Story Launcher e manter “Já publiquei” como ação secundária.
- Se houver alterações em funções backend, será necessário redeploy das funções alteradas.
- Verificar se falta cron ativo para enviar lembretes; se continuar ausente, criar/ativar o agendamento operacional de envio de lembretes.

### 10. Qualidade e validação
- Executar build.
- Verificar UI mobile a 375px e desktop.
- Testar por ferramentas disponíveis:
  - seleção do formato;
  - campos e validações;
  - preview;
  - criação do pacote;
  - launcher com QR/copy/download;
  - confirmação de estado.
- Entregar uma checklist curta para teste real em iPhone e Android, porque deep links para Instagram só ficam validados com dispositivos reais.

### Checklist de entrega
- [ ] Campos específicos completos e validados.
- [ ] Opções irrelevantes escondidas em Story com Link.
- [ ] Preview dedicado com overlay e link sticker.
- [ ] Agendamento adaptado para lembrete.
- [ ] Story Launcher mobile e desktop.
- [ ] QR code aponta para o launcher correto.
- [ ] Copy/download/deep link com feedback e haptics.
- [ ] “Já publiquei” e “Pular” atualizam estado.
- [ ] Cross-network preservado.
- [ ] Funções backend ajustadas e redeploy quando necessário.
- [ ] Build e revisão visual concluídos.
- [ ] Checklist para validação real em iPhone/Android entregue.