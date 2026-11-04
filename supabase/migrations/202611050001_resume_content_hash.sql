-- Evita gravar o mesmo currículo a cada análise: o servidor reaproveita a linha com o mesmo hash.
alter table public.resumes add column content_hash text;

update public.resumes
set content_hash = encode(digest(raw_text, 'sha256'), 'hex')
where content_hash is null;

-- Índice não único de propósito: dados antigos podem ter duplicatas e requisições simultâneas não devem falhar.
create index resumes_user_hash_idx on public.resumes(user_id, content_hash);
