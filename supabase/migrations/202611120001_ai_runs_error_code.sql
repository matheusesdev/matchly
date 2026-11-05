-- Causa resumida de cada falha (ex.: gemini_503, gemini_timeout, invalid_ai_output, db_42501). Sem dados pessoais.
alter table public.ai_runs add column if not exists error_code text;
