create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  polar_subscription_id text not null unique,
  polar_customer_id text not null,
  status text not null check (status in ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'revoked')),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  error_code text check (error_code in (
    'not_transactions', 'mapping_failed', 'too_many_invalid_rows', 'file_unreadable',
    'file_encrypted', 'llm_unavailable', 'timeout', 'too_many_rows',
    'unsupported_encoding', 'unsupported_currency', 'storage_upload_failed'
  )),
  failed_upload_id uuid,
  summary jsonb,
  detections jsonb,
  insights jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  original_filename text not null,
  storage_path text not null,
  file_hash text not null,
  row_count integer check (row_count >= 0),
  column_mapping jsonb
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null,
  amount bigint not null check (amount > 0),
  direction text not null check (direction in ('debit', 'credit')),
  merchant text not null,
  description text,
  category text not null check (category in (
    'food', 'cafe', 'groceries', 'transport', 'shopping', 'subscription',
    'utilities', 'housing', 'health', 'education', 'entertainment', 'travel',
    'transfer', 'income', 'other'
  )),
  is_recurring boolean not null default false,
  anomaly_type text check (anomaly_type in ('duplicate', 'spike'))
);

-- 분석을 삭제해도 성공 사용량은 유지한다. auth.users 삭제에만 cascade한다.
create table public.analysis_usage (
  analysis_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_month date not null,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions(user_id, occurred_on);
create index uploads_user_hash_idx on public.uploads(user_id, file_hash);
create index analysis_usage_user_month_idx on public.analysis_usage(user_id, usage_month);
create unique index analyses_one_processing_per_user_idx on public.analyses(user_id) where status = 'processing';

alter table public.subscriptions enable row level security;
alter table public.analyses enable row level security;
alter table public.uploads enable row level security;
alter table public.transactions enable row level security;
alter table public.analysis_usage enable row level security;
revoke all on all tables in schema public from public, anon, authenticated;
grant all on public.subscriptions, public.analyses, public.uploads, public.transactions, public.analysis_usage to service_role;

create function public.complete_analysis(
  p_user_id uuid,
  p_analysis_id uuid,
  p_transactions jsonb,
  p_summary jsonb,
  p_detections jsonb
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  analysis_started_at timestamptz;
begin
  update public.analyses
  set status = 'completed', summary = p_summary, detections = p_detections, completed_at = now()
  where id = p_analysis_id and user_id = p_user_id and status = 'processing'
  returning created_at into analysis_started_at;

  if not found then
    return false;
  end if;

  insert into public.transactions (
    analysis_id, user_id, occurred_on, amount, direction, merchant,
    description, category, is_recurring, anomaly_type
  )
  select p_analysis_id, p_user_id, tx.occurred_on, tx.amount, tx.direction, tx.merchant,
    tx.description, tx.category, tx.is_recurring, tx.anomaly_type
  from jsonb_to_recordset(p_transactions) as tx(
    occurred_on date, amount bigint, direction text, merchant text,
    description text, category text, is_recurring boolean, anomaly_type text
  );

  insert into public.analysis_usage (analysis_id, user_id, usage_month)
  values (p_analysis_id, p_user_id, date_trunc('month', analysis_started_at at time zone 'UTC')::date);
  return true;
end;
$$;

revoke execute on function public.complete_analysis(uuid, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.complete_analysis(uuid, uuid, jsonb, jsonb, jsonb) to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('csv-uploads', 'csv-uploads', false, 1048576);
-- storage.objects에는 클라이언트 정책을 만들지 않는다.
