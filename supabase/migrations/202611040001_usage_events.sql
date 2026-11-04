-- Registro de uso para aplicar cota diária por usuário (proteção de custo da IA).
create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('analyze', 'optimize')),
  created_at timestamptz not null default now()
);

create index usage_events_user_kind_created_idx on public.usage_events(user_id, kind, created_at desc);
alter table public.usage_events enable row level security;
-- Sem policy de update/delete: o usuário não consegue apagar o próprio consumo para burlar a cota.
create policy "users select own usage" on public.usage_events for select using (auth.uid() = user_id);
create policy "users insert own usage" on public.usage_events for insert with check (auth.uid() = user_id);
