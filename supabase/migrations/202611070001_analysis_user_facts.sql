-- Fatos informados pelo candidato para cobrir gaps da vaga: [{ area, answer }].
alter table public.analyses add column if not exists user_facts jsonb not null default '[]'::jsonb;
