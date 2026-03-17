-- Notification settings per user
create table if not exists public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean not null default true,
  stagnation_alert_enabled boolean not null default true,
  stagnation_threshold_days integer not null default 180,
  price_change_enabled boolean not null default true,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_notification_settings_user_id on public.notification_settings(user_id);

-- updated_at trigger (reuse existing function)
drop trigger if exists set_updated_at on public.notification_settings;
create trigger set_updated_at
  before update on public.notification_settings
  for each row
  execute function public.handle_updated_at();

-- Auto-create notification settings on signup
create or replace function public.handle_new_user_notification_settings()
returns trigger as $$
begin
  insert into public.notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_notification_settings on auth.users;
create trigger on_auth_user_created_notification_settings
  after insert on auth.users
  for each row
  execute function public.handle_new_user_notification_settings();

-- RLS
alter table public.notification_settings enable row level security;

drop policy if exists "Users can view own notification settings" on public.notification_settings;
create policy "Users can view own notification settings"
  on public.notification_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own notification settings" on public.notification_settings;
create policy "Users can insert own notification settings"
  on public.notification_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification settings" on public.notification_settings;
create policy "Users can update own notification settings"
  on public.notification_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on public.notification_settings to authenticated;
grant all on public.notification_settings to service_role;

comment on table public.notification_settings is 'Per-user notification preferences (reminders/alerts)';
