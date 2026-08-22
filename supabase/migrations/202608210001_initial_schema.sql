create extension if not exists pgcrypto;

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null,
  raw_text text not null,
  created_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_text text not null,
  match_score integer check (match_score between 0 and 100),
  missing_keywords jsonb not null default '[]'::jsonb,
  gaps jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  optimized_resume_text text,
  changes_summary jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index analyses_user_created_idx on public.analyses(user_id, created_at desc);
create index resumes_user_created_idx on public.resumes(user_id, created_at desc);
alter table public.resumes enable row level security;
alter table public.analyses enable row level security;
create policy "users select own resumes" on public.resumes for select using (auth.uid() = user_id);
create policy "users insert own resumes" on public.resumes for insert with check (auth.uid() = user_id);
create policy "users delete own resumes" on public.resumes for delete using (auth.uid() = user_id);
create policy "users select own analyses" on public.analyses for select using (auth.uid() = user_id);
create policy "users insert own analyses" on public.analyses for insert with check (auth.uid() = user_id);
create policy "users update own analyses" on public.analyses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own analyses" on public.analyses for delete using (auth.uid() = user_id);
