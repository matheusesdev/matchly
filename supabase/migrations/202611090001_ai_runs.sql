-- Registro técnico de cada chamada de IA, para acompanhar uso, falhas e qualidade da verificação de origem.
-- Não guarda conteúdo de currículo, vaga nem e-mail: só tipo, resultado, tentativas, fidelidade e duração.
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('analyze', 'optimize', 'cover_letter')),
  outcome text not null check (outcome in ('ok', 'quota_exceeded', 'invalid_input', 'unsupported_numbers', 'error')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  verified integer check (verified >= 0),
  total integer check (total >= 0),
  fidelity_ratio numeric(4, 3) check (fidelity_ratio between 0 and 1),
  duration_ms integer not null check (duration_ms >= 0),
  created_at timestamptz not null default now()
);

create index ai_runs_created_idx on public.ai_runs(created_at desc);
create index ai_runs_kind_outcome_idx on public.ai_runs(kind, outcome, created_at desc);
alter table public.ai_runs enable row level security;
-- O usuário vê (e exporta) os próprios registros, mas não os altera nem apaga; as métricas agregadas são lidas pelo dono via SQL.
create policy "users select own ai runs" on public.ai_runs for select using (auth.uid() = user_id);
create policy "users insert own ai runs" on public.ai_runs for insert with check (auth.uid() = user_id);
