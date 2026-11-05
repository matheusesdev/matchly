-- Métricas agregadas do Matchly. Só leitura; não expõe conteúdo de currículo, vaga ou e-mail.
-- Execute com:  npm run metrics   (usa a CLI do Supabase já logada e vinculada ao projeto)

-- 1) Volume por dia e tipo (últimos 14 dias)
select date_trunc('day', created_at)::date as dia, kind as tipo,
       count(*) as chamadas,
       count(*) filter (where outcome = 'ok') as ok,
       count(distinct user_id) as usuarios
from public.ai_runs
where created_at > now() - interval '14 days'
group by 1, 2
order by 1 desc, 2;

-- 2) Resultado das chamadas por tipo (últimos 7 dias): onde está falhando
select kind as tipo, outcome as resultado, count(*) as total,
       round(100.0 * count(*) / sum(count(*)) over (partition by kind), 1) as pct_do_tipo
from public.ai_runs
where created_at > now() - interval '7 days'
group by 1, 2
order by 1, 3 desc;

-- 3) Qualidade da verificação de origem (otimização e carta) nos últimos 7 dias
--    fidelidade = afirmações com origem comprovada / afirmações; abaixo de 0.6 o app regenera uma vez
select kind as tipo,
       count(*) as execucoes_ok,
       round(avg(fidelity_ratio), 3) as fidelidade_media,
       round((percentile_cont(0.1) within group (order by fidelity_ratio))::numeric, 3) as fidelidade_p10,
       round((percentile_cont(0.5) within group (order by fidelity_ratio))::numeric, 3) as fidelidade_mediana,
       count(*) filter (where fidelity_ratio < 0.6) as abaixo_de_60pct,
       round(avg(attempts), 2) as tentativas_medias
from public.ai_runs
where outcome = 'ok' and kind in ('optimize', 'cover_letter') and fidelity_ratio is not null
  and created_at > now() - interval '7 days'
group by 1;

-- 4) Latência (ms) das chamadas bem-sucedidas, últimos 7 dias
select kind as tipo,
       round((percentile_cont(0.5) within group (order by duration_ms))::numeric) as p50_ms,
       round((percentile_cont(0.95) within group (order by duration_ms))::numeric) as p95_ms,
       max(duration_ms) as max_ms
from public.ai_runs
where outcome = 'ok' and created_at > now() - interval '7 days'
group by 1;

-- 5) Pessoas ativas e consumo de cota (últimos 7 dias)
select count(distinct user_id) as usuarios_ativos,
       count(*) filter (where outcome = 'quota_exceeded') as bloqueios_por_cota,
       count(*) filter (where outcome = 'error') as erros,
       count(*) filter (where outcome = 'invalid_input') as arquivos_ou_textos_invalidos
from public.ai_runs
where created_at > now() - interval '7 days';

-- 6) Falhas por causa (últimos 7 dias): gemini_429/503 = limite ou indisponibilidade da IA; *_bad_json_max_tokens = resposta cortada;
--    invalid_ai_output = a IA devolveu algo fora do formato; db_* = erro do banco
select kind as tipo, error_code as causa, count(*) as total, max(to_char(created_at, 'DD/MM HH24:MI')) as ultima_vez
from public.ai_runs
where outcome = 'error' and created_at > now() - interval '7 days'
group by 1, 2
order by 3 desc;
