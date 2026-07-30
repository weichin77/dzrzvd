import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("configures the once-daily Taipei sync and Singapore function region", async () => {
  const config = JSON.parse(await source("vercel.json"));
  assert.deepEqual(config.regions, ["sin1"]);
  assert.deepEqual(config.crons, [
    { path: "/api/cron/shopee-sync", schedule: "0 18 * * *" },
  ]);
});

test("keeps Supabase application schemas unavailable to browser roles", async () => {
  const migration = await source(
    "supabase/migrations/202607300001_catalog_foundation.sql",
  );
  assert.match(migration, /create schema if not exists catalog/i);
  assert.match(migration, /create schema if not exists app_private/i);
  assert.match(
    migration,
    /revoke all on schema catalog from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /revoke all on schema app_private from public, anon, authenticated/i,
  );
  assert.match(migration, /create table app_private\.app_admin/i);
  assert.match(migration, /create table app_private\.sync_lock/i);
});

test("uses a serverless row lease rather than session advisory locks", async () => {
  const implementation = await source("db/repositories/sync-locks.ts");
  assert.match(implementation, /locked_until/);
  assert.match(implementation, /owner_run_id/);
  assert.match(implementation, /heartbeat_at/);
  assert.match(implementation, /on conflict \(shop_id\) do update/i);
  assert.doesNotMatch(implementation, /advisory/i);
});

test("product cards visibly contain only image and shortened title", async () => {
  const [card, styles] = await Promise.all([
    source("app/components/catalog/ProductCard.tsx"),
    source("app/products/catalog.module.css"),
  ]);
  assert.match(card, /<Image/);
  assert.match(card, /productTitle/);
  assert.doesNotMatch(card, /price|stock|sku|badge/i);
  assert.match(styles, /grid-template-columns:\s*repeat\(4/);
  assert.match(styles, /grid-template-columns:\s*repeat\(2/);
  assert.match(styles, /-webkit-line-clamp:\s*2/);
});

test("cron rejects unauthorized requests before synchronization", async () => {
  const cron = await source("app/api/cron/shopee-sync/route.ts");
  const authCheck = cron.indexOf(
    'request.headers.get("authorization") !== expectedAuthorization',
  );
  const syncCall = cron.indexOf("await runShopeeSync");
  assert.ok(authCheck >= 0);
  assert.ok(syncCall > authCheck);
});

test("environment template contains names and placeholders, not secret values", async () => {
  const template = await source(".env.example");
  for (const name of [
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "SUPABASE_SECRET_KEY",
    "SHOPEE_PARTNER_KEY",
    "SHOPEE_TOKEN_ENCRYPTION_KEY",
    "CRON_SECRET",
  ]) {
    assert.match(template, new RegExp(`^${name}=$`, "m"));
  }
  assert.match(template, /^SUPABASE_PROJECT_ENV=nonproduction$/m);
});
