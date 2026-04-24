# Plano — Prompt 1: Fundações do módulo “Story com Link Sticker”

## Respostas às perguntas antes de avançar

1. **Provider de email atual:** o projeto já tem `RESEND_API_KEY` configurada e já existe uma função que usa Resend para emails de falha de publicação. Vou usar **Resend** para o canal email end-to-end desta fase, sem pedir nova chave.
2. **Push notifications existentes:** existe apenas o sistema interno de notificações na app (`notifications` + `useNotifications` com realtime/toasts). Não encontrei infraestrutura Web Push/VAPID existente. Vou deixar Push visível como “em breve/não configurado” ou desativado nesta fundação, sem implementar Web Push agora.
3. **WhatsApp:** para este prompt não implementarei WhatsApp end-to-end. Como resposta técnica: eu recomendaria **WhatsApp Cloud API** para produção se o objetivo for custo baixo e controlo direto; **Twilio** é mais rápido de integrar, mas tem custo por mensagem. Como o prompt exige pelo menos email funcional, WhatsApp fica preparado na preferência mas não validável até decisão posterior.
4. **Tabelas equivalentes:** já existe `stories`, mas é para aprovação/publicação de stories simples e não cobre link sticker, lembrete, confirmação manual, métricas manuais nem deep link. Também existe `notifications`, mas não guarda preferências de canal. Vou criar tabelas novas e isoladas.

## Nota de segurança e ajuste ao SQL proposto

Vou adaptar ligeiramente o SQL para seguir as regras do projeto:

- Evitar `check (... now())` ou validações temporais em constraints.
- Usar trigger `updated_at` em vez de depender do frontend.
- Em RLS de `user_notification_preferences`, usar `USING` e `WITH CHECK` para `INSERT/UPDATE`, para impedir trocar `user_id` para outro utilizador.
- Criar token de confirmação como hash guardado na base de dados, não token em texto claro. O link público usará token assinado/aleatório e a função backend validará sem expor permissões diretas na tabela.

## 1. Base de dados

Criar migração com:

### `story_link_publications`

Campos do prompt, mais estes ajustes:

- `confirmation_token_hash text` para confirmação por link sem login.
- `confirmation_token_expires_at timestamptz` para limitar validade.
- `reminder_channel text` opcional para guardar o canal usado no envio.
- `last_error text` opcional para debug de envio.
- `updated_at` atualizado por trigger.

RLS:

```sql
alter table public.story_link_publications enable row level security;

create policy "Users can view their own story link publications"
on public.story_link_publications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own story link publications"
on public.story_link_publications
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own story link publications"
on public.story_link_publications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own story link publications"
on public.story_link_publications
for delete
to authenticated
using (auth.uid() = user_id);
```

### `user_notification_preferences`

Criar se não existir com os campos do prompt e RLS robusta:

```sql
alter table public.user_notification_preferences enable row level security;

create policy "Users can view their own notification preferences"
on public.user_notification_preferences
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own notification preferences"
on public.user_notification_preferences
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own notification preferences"
on public.user_notification_preferences
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own notification preferences"
on public.user_notification_preferences
for delete
to authenticated
using (auth.uid() = user_id);
```

### Funções auxiliares

- `update_story_link_publications_updated_at()`
- `update_user_notification_preferences_updated_at()`
- Função RPC segura para marcar story como `published`, `skipped` ou reagendar, validando token quando usado via link público.

## 2. Novo formato em `/manual-create`

Adicionar formato novo em Instagram:

- tipo: `instagram_story_link`
- label: `Story com Link`
- descrição: `Story manual com link sticker`
- ícone distintivo com Lucide (`Link`, `Badge`, ou composição visual no card), sem emoji solto para manter a iconografia consistente.

Impactos:

- Atualizar `PostFormat` e `NETWORK_POST_FORMATS`.
- Atualizar labels de preview/publicação onde necessário.
- Garantir que só aparece em Instagram e não quebra os formatos existentes.
- UI apenas nesta fase, como pedido: seleção visível e persistível em drafts, mas sem fluxo completo de criação/publicação.

## 3. Validações base para o novo formato

Embora o fluxo completo fique para o Prompt 2, vou adicionar validações mínimas para não deixar o formato incoerente:

- `maxMedia = 1`, `minMedia = 1`.
- Aceitar imagem ou vídeo.
- Validar rácio 9:16 com os validadores de média existentes, quando possível.
- Bloquear “publicação automática/agora” para este formato e orientar para “lembrete”.

Como o prompt diz que a URL e textos específicos só entram no fluxo posterior, nesta fase a validação de `link_url` ficará preparada no backend/tabela, mas a UI completa do campo só será criada no Prompt 2.

## 4. Opções por rede: fundação visual

Em `NetworkOptionsCard`, adicionar indicação contextual quando o formato `instagram_story_link` estiver selecionado:

- Bloco informativo em Instagram: “Este formato prepara o Story e agenda um lembrete; a publicação final é feita manualmente no Instagram.”
- Não adicionar ainda os campos definitivos de URL/sticker/overlay se forem parte do fluxo de criação do Prompt 2.

## 5. Edge Functions

Criar três funções:

### `generate-story-deeplink`

- Valida JWT em código.
- Input: `media_url`, `platform` (`ios`, `android`, `web`).
- Output: deep link/fallback/instruções.
- Para web: devolve URL a usar no QR code; não tenta usar deep link impossível em desktop.
- Sem dependências novas obrigatórias.

### `schedule-story-reminder`

- Valida JWT em código.
- Recebe `story_id` e data pretendida.
- Lê preferências do utilizador.
- Ajusta horário para Lisboa, quiet hours e dias permitidos.
- Atualiza `reminder_scheduled_at` e `status = 'ready'`.
- Não cria ainda um cron project-specific em migração; deixo preparado para `send-story-reminder` processar itens `ready` vencidos.

### `send-story-reminder`

- Função backend que procura stories `ready` com `reminder_scheduled_at <= now()`.
- Nesta fase implementa **email** end-to-end com Resend.
- Envia template HTML com:
  - preview da média,
  - link a copiar,
  - instruções curtas,
  - botão “Abrir no telemóvel” / “Já publiquei”.
- Atualiza `reminder_sent_at`, `status = 'reminder_sent'`.
- Canais WhatsApp/Telegram/Push ficam explicitamente como não configurados, sem falhar o email.

## 6. Página `/settings/notifications`

Criar página protegida com UI compacta e pt-PT:

- Canal preferido: Email ativo; WhatsApp/Telegram/Push visíveis mas marcados como “não configurado nesta fase” ou desativados.
- Campos condicionais:
  - WhatsApp: número internacional, desativado até integração futura.
  - Telegram: chat id/bot, desativado até integração futura.
- Minutos antes do lembrete: slider ou select 5–60.
- Horas de silêncio: início/fim.
- Dias da semana: checkboxes.
- Botão “Enviar email de teste”.

Adicionar rota em `App.tsx`. Se fizer sentido, adicionar entrada discreta no menu/sidebar ou usar acesso direto por URL, sem poluir a navegação principal.

## 7. Email de teste

Para cumprir “email 100% funcional end-to-end” nesta fundação:

- Criar endpoint/função ou modo em `send-story-reminder` para teste autenticado.
- A página chama a função e envia email para o email do utilizador autenticado.
- Mostrar toast de sucesso/erro em pt-PT.

## 8. QR code desktop

O package `qrcode.react` não existe atualmente. Como a regra do workspace diz para não adicionar dependências sem aprovação explícita, vou evitar nova dependência neste prompt.

Alternativa sem dependência nova:

- Criar componente `QRCodeSvg` simples local, suficiente para teste? Isto pode ser arriscado se implementado de raiz.
- Melhor: gerar um “QR de teste” via endpoint backend que devolve uma URL para mobile e, na UI, mostrar link copiável nesta fase.

Para cumprir literalmente “QR code de teste”, preciso de autorização para adicionar `qrcode.react` ou `qrcode`.

Proposta: **não adiciono dependência nesta execução sem a tua confirmação**. Implemento o fallback com link copiável e deixo o QR como ponto dependente de aprovação. Se aprovares também a dependência, adiciono `qrcode.react` e uso no teste desktop.

## 9. README

Atualizar documentação com:

- Novo formato “Story com Link”.
- Variáveis/segredos esperados.
- Estado dos canais:
  - Email: funcional via Resend existente.
  - WhatsApp/Telegram/Push: preparados para fases seguintes.
- Limitação oficial do Instagram: publicação final do link sticker é manual.

## Ficheiros previstos

- `supabase/migrations/...story_link_publications.sql`
- `supabase/functions/generate-story-deeplink/index.ts`
- `supabase/functions/schedule-story-reminder/index.ts`
- `supabase/functions/send-story-reminder/index.ts`
- `src/types/social.ts`
- `src/types/networkOptions.ts`
- `src/lib/formatValidation.ts`
- `src/lib/validation/validators/...` se necessário para 9:16/lembrete
- `src/components/manual-post/NetworkFormatSelector.tsx`
- `src/components/manual-post/steps/NetworkOptionsCard.tsx`
- `src/pages/NotificationSettings.tsx`
- `src/App.tsx`
- `README.md`

## Checkpoint de aprovação

☐ Aprovar criação das tabelas e RLS propostas.
☐ Confirmar que o canal email deve usar Resend existente.
☐ Confirmar se posso adicionar `qrcode.react` para cumprir o QR code de teste.
☐ Confirmar se WhatsApp/Telegram/Push ficam apenas preparados/desativados nesta fase.
☐ Após aprovação, implemento e valido build/type-check.