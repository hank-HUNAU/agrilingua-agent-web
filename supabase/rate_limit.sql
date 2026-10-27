create table if not exists public.chat_rate_limits (
  bucket text primary key,
  request_count integer not null default 0,
  reset_at timestamptz not null
);

alter table public.chat_rate_limits enable row level security;
revoke all on table public.chat_rate_limits from anon, authenticated;

create or replace function public.consume_chat_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  current_reset timestamptz;
begin
  insert into public.chat_rate_limits (bucket, request_count, reset_at)
  values (p_bucket, 0, now() + make_interval(secs => p_window_seconds))
  on conflict (bucket) do nothing;

  select request_count, reset_at
    into current_count, current_reset
    from public.chat_rate_limits
   where bucket = p_bucket
   for update;

  if current_reset <= now() then
    update public.chat_rate_limits
       set request_count = 1,
           reset_at = now() + make_interval(secs => p_window_seconds)
     where bucket = p_bucket;
    return true;
  end if;

  if current_count >= p_limit then
    return false;
  end if;

  update public.chat_rate_limits
     set request_count = request_count + 1
   where bucket = p_bucket;

  return true;
end;
$$;

revoke all on function public.consume_chat_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_chat_rate_limit(text, integer, integer) to service_role;

