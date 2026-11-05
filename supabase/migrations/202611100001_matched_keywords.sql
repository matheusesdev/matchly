-- Palavras-chave da vaga que o currículo já contém (termos curtos, verificados no servidor).
alter table public.analyses add column if not exists matched_keywords jsonb not null default '[]'::jsonb;
