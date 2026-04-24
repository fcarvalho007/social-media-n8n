create table if not exists public.story_link_publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  post_id uuid references public.posts(id) on delete set null,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  link_url text not null,
  sticker_text text,
  overlay_text text,
  caption text,
  reminder_scheduled_at timestamptz,
  reminder_sent_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'ready', 'reminder_sent', 'published', 'skipped', 'expired')),
  published_at timestamptz,
  published_by_device text check (published_by_device is null or published_by_device in ('ios', 'android', 'web')),
  manual_views integer,
  manual_link_clicks integer,
  manual_metrics_captured_at timestamptz,
  reminder_channel text check (reminder_channel is null or reminder_channel in ('email', 'whatsapp', 'telegram', 'push')),
  confirmation_token_hash text,
  confirmation_token_expires_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_story_link_user on public.story_link_publications(user_id);
create index if not exists idx_story_link_reminder on public.story_link_publications(reminder_scheduled_at) where status = 'ready';
create index if not exists idx_story_link_confirmation on public.story_link_publications(id, confirmation_token_hash) where confirmation_token_hash is not null;

alter table public.story_link_publications enable row level security;

drop policy if exists "Users can view their own story link publications" on public.story_link_publications;
drop policy if exists "Users can insert their own story link publications" on public.story_link_publications;
drop policy if exists "Users can update their own story link publications" on public.story_link_publications;
drop policy if exists "Users can delete their own story link publications" on public.story_link_publications;

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

create table if not exists public.user_notification_preferences (
  user_id uuid primary key,
  reminder_channel text not null default 'email' check (reminder_channel in ('email', 'whatsapp', 'telegram', 'push')),
  reminder_whatsapp_number text,
  reminder_telegram_chat_id text,
  reminder_minutes_before integer not null default 15 check (reminder_minutes_before between 5 and 60),
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  reminder_weekdays integer[] not null default array[1,2,3,4,5,6,7],
  email_tested_at timestamptz,
  whatsapp_tested_at timestamptz,
  telegram_tested_at timestamptz,
  push_tested_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_notification_preferences enable row level security;

drop policy if exists "Users can view their own notification preferences" on public.user_notification_preferences;
drop policy if exists "Users can insert their own notification preferences" on public.user_notification_preferences;
drop policy if exists "Users can update their own notification preferences" on public.user_notification_preferences;
drop policy if exists "Users can delete their own notification preferences" on public.user_notification_preferences;

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

create or replace function public.update_story_link_publications_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_story_link_publications_updated_at on public.story_link_publications;
create trigger update_story_link_publications_updated_at
before update on public.story_link_publications
for each row
execute function public.update_story_link_publications_updated_at();

create or replace function public.update_user_notification_preferences_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_user_notification_preferences_updated_at on public.user_notification_preferences;
create trigger update_user_notification_preferences_updated_at
before update on public.user_notification_preferences
for each row
execute function public.update_user_notification_preferences_updated_at();

create or replace function public.confirm_story_link_publication(
  _story_id uuid,
  _token text,
  _action text,
  _device text default 'web'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_found boolean;
begin
  if _action not in ('published', 'skipped', 'later') then
    raise exception 'Ação inválida';
  end if;

  if _token is null or length(_token) < 24 then
    return false;
  end if;

  v_hash := encode(digest(_token, 'sha256'), 'hex');

  select exists (
    select 1
    from public.story_link_publications
    where id = _story_id
      and confirmation_token_hash = v_hash
      and (confirmation_token_expires_at is null or confirmation_token_expires_at > now())
      and status in ('ready', 'reminder_sent')
  ) into v_found;

  if not v_found then
    return false;
  end if;

  if _action = 'later' then
    update public.story_link_publications
    set reminder_scheduled_at = now() + interval '1 hour',
        status = 'ready',
        last_error = null
    where id = _story_id;
  elsif _action = 'published' then
    update public.story_link_publications
    set status = 'published',
        published_at = now(),
        published_by_device = case when _device in ('ios', 'android', 'web') then _device else 'web' end,
        last_error = null
    where id = _story_id;
  else
    update public.story_link_publications
    set status = 'skipped',
        last_error = null
    where id = _story_id;
  end if;

  return true;
end;
$$;

grant execute on function public.confirm_story_link_publication(uuid, text, text, text) to anon, authenticated;