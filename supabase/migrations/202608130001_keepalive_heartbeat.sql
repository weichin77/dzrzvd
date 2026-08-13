create table app_private.keepalive_heartbeat (
  source text primary key
    check (source in ('supabase-health', 'shopee-sync')),
  project_ref text not null
    check (length(trim(project_ref)) > 0),
  last_succeeded_at timestamptz not null default now(),
  run_count integer not null default 0
    check (run_count >= 0)
);

revoke all on table app_private.keepalive_heartbeat
  from public, anon, authenticated;
