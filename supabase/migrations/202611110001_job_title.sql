-- Cargo da vaga informado pela IA (e conferido contra o texto da vaga) para titular o histórico.
alter table public.analyses add column if not exists job_title text;
