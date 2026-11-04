-- Origem de cada afirmação do currículo otimizado: [{ line, quote, verified }].
alter table public.analyses add column if not exists evidence jsonb not null default '[]'::jsonb;
