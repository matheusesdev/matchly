-- Evita gravar o mesmo currículo a cada análise: o servidor reaproveita a linha com o mesmo hash.
alter table public.resumes add column if not exists content_hash text;

-- Mesmo cálculo do servidor: SHA-256 do texto com espaços normalizados. digest() vive no schema extensions.
update public.resumes
set content_hash = encode(extensions.digest(convert_to(trim(regexp_replace(raw_text, '\s+', ' ', 'g')), 'UTF8'), 'sha256'), 'hex')
where content_hash is null;

-- Índice não único de propósito: dados antigos podem ter duplicatas e requisições simultâneas não devem falhar.
create index if not exists resumes_user_hash_idx on public.resumes(user_id, content_hash);
