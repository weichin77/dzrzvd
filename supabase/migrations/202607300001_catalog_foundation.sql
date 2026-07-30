create extension if not exists pgcrypto with schema extensions;

create schema if not exists catalog;
create schema if not exists app_private;

revoke all on schema catalog from public, anon, authenticated;
revoke all on schema app_private from public, anon, authenticated;

create table app_private.shopee_shop (
  id uuid primary key default gen_random_uuid(),
  shop_id bigint not null unique,
  market text not null default 'TW',
  shop_name text,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  token_version integer not null default 0 check (token_version >= 0),
  authorized_at timestamptz,
  authorization_expires_at timestamptz,
  shop_status text check (shop_status is null or shop_status in ('NORMAL', 'BANNED', 'FROZEN')),
  last_token_refresh_at timestamptz,
  last_sync_at timestamptz,
  authorization_status text not null default 'active'
    check (authorization_status in ('active', 'expired', 'revoked', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table catalog.shopee_category (
  category_id bigint primary key,
  parent_category_id bigint references catalog.shopee_category(category_id),
  original_name text not null,
  display_name text not null,
  has_children boolean not null default false,
  breadcrumb text[] not null default '{}',
  depth smallint not null default 0 check (depth >= 0),
  source_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shopee_category_parent_idx
  on catalog.shopee_category(parent_category_id);

create table catalog.category_presentation (
  category_id bigint primary key
    references catalog.shopee_category(category_id) on delete cascade,
  slug text not null unique,
  custom_label text,
  description text,
  hero_image_url text,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table catalog.shopee_product (
  item_id bigint primary key,
  shop_id bigint not null references app_private.shopee_shop(shop_id),
  category_id bigint references catalog.shopee_category(category_id),
  name text not null,
  item_sku text,
  brand_id bigint,
  brand_name text,
  currency char(3) not null default 'TWD',
  original_price numeric(14, 2),
  current_price numeric(14, 2),
  price_min numeric(14, 2),
  price_max numeric(14, 2),
  available_stock integer,
  status text not null,
  image_urls text[] not null default '{}',
  canonical_url text not null check (canonical_url like 'https://%'),
  is_dzrzvd boolean not null default false,
  match_method text,
  match_evidence text,
  classification_version text not null,
  source_update_time timestamptz,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  inactive_at timestamptz,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shopee_product_shop_idx
  on catalog.shopee_product(shop_id);
create index shopee_product_category_idx
  on catalog.shopee_product(category_id);
create index shopee_product_public_idx
  on catalog.shopee_product(is_dzrzvd, status, inactive_at, available_stock);
create index shopee_product_last_seen_idx
  on catalog.shopee_product(last_seen_at);

create table app_private.sync_run (
  id uuid primary key,
  shop_id bigint not null references app_private.shopee_shop(shop_id),
  trigger text not null check (trigger in ('cron', 'manual', 'bootstrap')),
  mode text not null default 'full' check (mode in ('full', 'dry_run')),
  status text not null
    check (status in ('running', 'succeeded', 'failed', 'skipped_locked', 'dry_run')),
  started_at timestamptz not null,
  finished_at timestamptz,
  discovered_count integer not null default 0,
  enriched_count integer not null default 0,
  included_count integer not null default 0,
  excluded_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  inactivated_count integer not null default 0,
  warning_count integer not null default 0,
  endpoint_request_count integer not null default 0,
  safe_error_summary text,
  deployment_id text
);

create index sync_run_shop_started_idx
  on app_private.sync_run(shop_id, started_at desc);
create index sync_run_status_idx
  on app_private.sync_run(status);

create table app_private.sync_request (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null
    references app_private.sync_run(id) on delete cascade,
  endpoint text not null,
  shopee_request_id text,
  status text not null,
  duration_ms integer not null check (duration_ms >= 0),
  safe_error_code text,
  created_at timestamptz not null default now()
);

create index sync_request_run_idx
  on app_private.sync_request(sync_run_id);

create table app_private.app_admin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'operator' check (role = 'operator'),
  active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table app_private.product_filter_override (
  item_id bigint primary key
    references catalog.shopee_product(item_id) on delete cascade,
  decision text not null check (decision in ('include', 'exclude')),
  reason text not null check (length(trim(reason)) >= 3),
  created_by uuid not null references app_private.app_admin(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_filter_override_decision_idx
  on app_private.product_filter_override(decision);

create table app_private.sync_lock (
  shop_id bigint primary key
    references app_private.shopee_shop(shop_id) on delete cascade,
  owner_run_id uuid not null
    references app_private.sync_run(id) on delete cascade,
  acquired_at timestamptz not null,
  heartbeat_at timestamptz not null,
  locked_until timestamptz not null
);

create index sync_lock_expiry_idx on app_private.sync_lock(locked_until);

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger shopee_shop_set_updated_at
before update on app_private.shopee_shop
for each row execute function app_private.set_updated_at();

create trigger shopee_category_set_updated_at
before update on catalog.shopee_category
for each row execute function app_private.set_updated_at();

create trigger category_presentation_set_updated_at
before update on catalog.category_presentation
for each row execute function app_private.set_updated_at();

create trigger shopee_product_set_updated_at
before update on catalog.shopee_product
for each row execute function app_private.set_updated_at();

create trigger app_admin_set_updated_at
before update on app_private.app_admin
for each row execute function app_private.set_updated_at();

create trigger product_filter_override_set_updated_at
before update on app_private.product_filter_override
for each row execute function app_private.set_updated_at();

revoke all on all tables in schema catalog from public, anon, authenticated;
revoke all on all tables in schema app_private from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;

alter default privileges in schema catalog
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema app_private
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema app_private
  revoke all on functions from public, anon, authenticated;
