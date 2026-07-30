import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("configures spaced daily Supabase and Shopee jobs in Singapore", async () => {
  const config = JSON.parse(await source("vercel.json"));
  assert.deepEqual(config.regions, ["sin1"]);
  assert.deepEqual(config.crons, [
    { path: "/api/cron/supabase-health", schedule: "17 6 * * *" },
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

test("application typography stays within a three-to-one size range", async () => {
  const files = [
    "app/globals.css",
    "app/products/catalog.module.css",
    "app/admin/login/login.module.css",
    "app/admin/shopee-catalog/admin.module.css",
  ];
  const stylesheets = await Promise.all(files.map(source));
  const combined = stylesheets.join("\n");
  const globalStyles = stylesheets[0];
  const tokens = new Map();

  for (const match of globalStyles.matchAll(
    /--(font-[\w-]+):\s*([\d.]+)(px|rem)\s*;/g,
  )) {
    const [, name, rawValue, unit] = match;
    const pixels = Number(rawValue) * (unit === "rem" ? 16 : 1);
    tokens.set(name, pixels);
  }

  assert.deepEqual(
    Object.fromEntries(tokens),
    {
      "font-xs": 14,
      "font-sm": 16,
      "font-body": 18,
      "font-lg": 22,
      "font-xl": 28,
      "font-2xl": 34,
      "font-display": 42,
    },
  );

  const measuredSizes = [...tokens.values()];

  for (const match of combined.matchAll(/font-size\s*:\s*([^;]+);/g)) {
    const declaration = match[1].trim();

    if (declaration.includes("vw")) {
      assert.match(declaration, /^clamp\(/);
    }

    for (const reference of declaration.matchAll(/var\(--(font-[\w-]+)\)/g)) {
      assert.ok(tokens.has(reference[1]), `Unknown type token: ${reference[1]}`);
    }

    for (const size of declaration.matchAll(/([\d.]+)(px|rem)/g)) {
      const pixels = Number(size[1]) * (size[2] === "rem" ? 16 : 1);
      measuredSizes.push(pixels);
    }
  }

  const smallest = Math.min(...measuredSizes);
  const largest = Math.max(...measuredSizes);

  assert.equal(smallest, 14);
  assert.equal(largest, 42);
  assert.ok(largest / smallest <= 3);
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

test("Supabase health cron authenticates before querying Postgres", async () => {
  const cron = await source("app/api/cron/supabase-health/route.ts");
  const authCheck = cron.indexOf(
    'request.headers.get("authorization") !== expectedAuthorization',
  );
  const healthQuery = cron.indexOf("select 1 as health_check");
  assert.ok(authCheck >= 0);
  assert.ok(healthQuery > authCheck);
  assert.match(cron, /Cache-Control.*no-store/s);
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
