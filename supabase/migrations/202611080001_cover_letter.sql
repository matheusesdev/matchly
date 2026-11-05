-- Carta de apresentação gerada por análise + verificação de origem das frases.
alter table public.analyses add column if not exists cover_letter text;
alter table public.analyses add column if not exists cover_letter_evidence jsonb not null default '[]'::jsonb;

-- Novo tipo de uso para a cota diária.
alter table public.usage_events drop constraint if exists usage_events_kind_check;
alter table public.usage_events add constraint usage_events_kind_check check (kind in ('analyze', 'optimize', 'cover_letter'));
