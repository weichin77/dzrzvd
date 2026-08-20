insert into app_private.shopee_shop (
  shop_id,
  market,
  shop_name,
  authorization_status
)
values (16630682, 'TW', 'kuSport', 'active')
on conflict (shop_id) do nothing;

create table app_private.excel_import (
  id uuid primary key default gen_random_uuid(),
  uploaded_by uuid not null references app_private.app_admin(user_id),
  source_filename text not null check (length(trim(source_filename)) > 0),
  status text not null check (status in ('succeeded', 'failed')),
  row_count integer not null default 0 check (row_count >= 0),
  included_count integer not null default 0 check (included_count >= 0),
  excluded_count integer not null default 0 check (excluded_count >= 0),
  category_count integer not null default 0 check (category_count >= 0),
  missing_translation_segments text[] not null default '{}',
  storage_path text,
  error_message text,
  created_at timestamptz not null default now(),
  check (
    (status = 'succeeded' and error_message is null) or
    (status = 'failed' and error_message is not null)
  )
);

create index excel_import_created_idx
  on app_private.excel_import(created_at desc);

revoke all on table app_private.excel_import
  from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-uploads',
  'catalog-uploads',
  false,
  10485760,
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ]::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
