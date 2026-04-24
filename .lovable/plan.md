## Auditoria do último prompt

Ficou parcialmente feito.

Concluído:
- Tabelas `story_link_publications` e `user_notification_preferences` existem com RLS, índices, triggers de `updated_at` e confirmação por token.
- O formato `instagram_story_link` foi adicionado aos tipos e aparece como “Story com Link”.
- As funções `generate_story_deeplink`, `schedule_story_reminder` e `send_story_reminder` existem.
- Há validação base para 1 ficheiro, imagem/vídeo e rácio 9:16.
- O segredo de email já existe, por isso não é necessário pedir credenciais.

Pendente / incompleto:
- Falta página `/settings/notifications`.
- Falta integrar a página nas rotas e, opcionalmente, no acesso de navegação/definições.
- Falta UI em `/manual-create` para “URL do link”, “Texto do sticker” e “Texto sobreposto”. Os campos existem no tipo, mas não aparecem ao utilizador.
- Falta impedir que “Story com Link” siga pelo fluxo normal de publicação Getlate; deve criar uma preparação/lembrete, não publicar diretamente.
- Falta criar o registo em `story_link_publications` a partir de `/manual-create` e chamar o agendamento do lembrete.
- Falta QR code no desktop. A dependência `qrcode.react` ainda não está instalada.
- Falta página/link de confirmação `/stories/confirm` para “Já publiquei”, “Não publiquei” e “Mais tarde”. Embora fosse descrita no prompt, ainda não há rota; sem isto o botão do email aponta para uma página inexistente.
- Falta documentação no README.
- O envio de lembretes existe, mas ainda precisa de teste/deploy end-to-end e de um mecanismo de chamada agendada/cron verificado.

## Plano de conclusão

### 1. Fechar a experiência de notificações
- Criar `src/pages/NotificationSettings.tsx` em pt-PT.
- Carregar e guardar preferências do utilizador em `user_notification_preferences`.
- Permitir configurar:
  - canal preferido, com Email ativo;
  - WhatsApp, Telegram e Push visíveis mas desativados/“em breve” nesta fase;
  - minutos antes do lembrete;
  - horas de silêncio;
  - dias da semana;
  - botão “Enviar email de teste”.
- Integrar rota `/settings/notifications` no `App.tsx`.

### 2. Completar os campos de “Story com Link” em `/manual-create`
- Quando o formato `instagram_story_link` estiver selecionado, mostrar um bloco específico em “Opções por rede”:
  - URL do link obrigatório;
  - texto do sticker opcional;
  - texto sobreposto opcional.
- Derivar o texto do sticker a partir do domínio quando o campo estiver vazio.
- Manter o visual compacto e consistente com os refinamentos recentes do módulo.

### 3. Regras de validação específicas
- Validar URL obrigatória e válida para `instagram_story_link`.
- Manter 1 único ficheiro e 9:16 obrigatório.
- Acrescentar uma mensagem clara de que este formato é semi-automático e usa lembrete, não publicação direta no Instagram.
- Ajustar agendamento: quando for “Story com Link”, o agendamento passa a significar “agendar lembrete”.

### 4. Fluxo de criação da Story com Link
- No clique principal de publicação/agendamento, se a seleção for apenas `instagram_story_link`:
  - carregar a média para storage como já acontece noutros fluxos;
  - criar registo em `story_link_publications` com `media_url`, `media_type`, `link_url`, `sticker_text`, `overlay_text`, `caption` e `user_id`;
  - chamar `schedule_story_reminder` com a data/hora escolhida ou preferência default;
  - mostrar confirmação ao utilizador: “Story preparada e lembrete agendado”.
- Evitar enviar `instagram_story_link` para `publish-to-getlate`.
- Se o utilizador misturar Story com Link com outros formatos, manter fora deste ciclo ou bloquear com mensagem clara para evitar comportamento ambíguo.

### 5. Confirmação manual
- Criar página `/stories/confirm` acessível pelo link do lembrete.
- Ler `id` e `token` da URL.
- Permitir ações:
  - “Publiquei”;
  - “Não publiquei”;
  - “Lembrar daqui a 1 hora”.
- Chamar a função segura da base de dados via RPC para atualizar o estado sem expor permissões indevidas.

### 6. QR code desktop e deep link
- Instalar `qrcode.react`.
- Criar um pequeno componente reutilizável para mostrar QR code/deep link na experiência de confirmação/teste desktop.
- Usar `generate_story_deeplink` para devolver instruções e fallback apropriado.

### 7. Backend e deploy
- Rever as três funções backend para:
  - validar inputs de forma mais explícita;
  - manter CORS em todas as respostas;
  - evitar placeholders visíveis em emails de teste quando possível;
  - garantir texto pt-PT.
- Fazer deploy das funções alteradas.
- Verificar se existe agendamento/cron para `send_story_reminder`; se não existir, criar/ativar a chamada periódica adequada.

### 8. Documentação e QA
- Atualizar README com as variáveis/segredos usados pelo módulo e estado dos canais:
  - Email ativo;
  - WhatsApp, Telegram e Push reservados para fases futuras.
- Executar type-check/build.
- Testar fluxo mínimo:
  - abrir `/manual-create`;
  - selecionar Story com Link;
  - preencher URL;
  - criar lembrete;
  - enviar email de teste em `/settings/notifications`;
  - abrir `/stories/confirm` com token válido.

## Ficheiros previstos

- `src/App.tsx`
- `src/pages/NotificationSettings.tsx`
- `src/pages/StoryConfirm.tsx`
- `src/components/manual-post/steps/NetworkOptionsCard.tsx`
- `src/hooks/manual-create/usePublishOrchestrator.ts`
- `src/lib/validation/validators/formatValidator.ts`
- `src/lib/validation/validators/scheduleValidator.ts`
- `src/types/networkOptions.ts`
- `src/types/social.ts` apenas se for necessário ajustar labels/microcopy
- `supabase/functions/generate_story_deeplink/index.ts`
- `supabase/functions/schedule_story_reminder/index.ts`
- `supabase/functions/send_story_reminder/index.ts`
- `README.md`
- `package.json` / lockfile para `qrcode.react`

Nota: `src/integrations/supabase/types.ts` está em `LOCKED_FILES.md` e não será editado manualmente.

## Checkpoint

☐ Página `/settings/notifications` criada e funcional
☐ Campos de Story com Link adicionados em `/manual-create`
☐ Story com Link bloqueada no fluxo Getlate e tratada como lembrete semi-automático
☐ Registo em `story_link_publications` criado a partir do formulário
☐ Email de teste funcional
☐ Página `/stories/confirm` criada
☐ QR code desktop adicionado
☐ Funções backend revistas e publicadas
☐ README atualizado
☐ Build/type-check executado