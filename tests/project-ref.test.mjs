import assert from "node:assert/strict";
import test from "node:test";

import { resolveSupabaseProjectRef } from "../lib/supabase/project-ref.ts";

const projectRef = "itbmungetqisdwjhdnil";

test("resolves and cross-checks a Supabase transaction-pooler project ref", () => {
  assert.equal(
    resolveSupabaseProjectRef({
      databaseUrl:
        `postgresql://postgres.${projectRef}:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      expectedProjectRef: projectRef,
      publicUrls: [`https://${projectRef}.supabase.co`],
    }),
    projectRef,
  );
});

test("resolves a Supabase direct-connection project ref", () => {
  assert.equal(
    resolveSupabaseProjectRef({
      databaseUrl:
        `postgresql://postgres:secret@db.${projectRef}.supabase.co:5432/postgres`,
      expectedProjectRef: projectRef,
    }),
    projectRef,
  );
});

test("rejects database and public URLs for different Supabase projects", () => {
  assert.throws(
    () => resolveSupabaseProjectRef({
      databaseUrl:
        `postgresql://postgres.${projectRef}:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      expectedProjectRef: projectRef,
      publicUrls: ["https://aaaaaaaaaaaaaaaaaaaa.supabase.co"],
    }),
    /targets a different project/,
  );
});

test("rejects a database URL that cannot identify a Supabase project", () => {
  assert.throws(
    () => resolveSupabaseProjectRef({
      databaseUrl: "postgresql://postgres:secret@example.com:5432/postgres",
      expectedProjectRef: projectRef,
    }),
    /does not identify a Supabase project ref/,
  );
});

test("does not trust a project-shaped username on a non-Supabase host", () => {
  assert.throws(
    () => resolveSupabaseProjectRef({
      databaseUrl:
        `postgresql://postgres.${projectRef}:secret@example.com:5432/postgres`,
      expectedProjectRef: projectRef,
      publicUrls: [`https://${projectRef}.supabase.co`],
    }),
    /does not identify a Supabase project ref/,
  );
});

test("rejects a database URL for a consistently different project", () => {
  const otherRef = "aaaaaaaaaaaaaaaaaaaa";

  assert.throws(
    () => resolveSupabaseProjectRef({
      databaseUrl:
        `postgresql://postgres.${otherRef}:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      expectedProjectRef: projectRef,
      publicUrls: [`https://${otherRef}.supabase.co`],
    }),
    /POSTGRES_URL targets a different Supabase project/,
  );
});

test("validates every configured public Supabase URL", () => {
  assert.throws(
    () => resolveSupabaseProjectRef({
      databaseUrl:
        `postgresql://postgres.${projectRef}:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      expectedProjectRef: projectRef,
      publicUrls: [
        `https://${projectRef}.supabase.co`,
        "https://aaaaaaaaaaaaaaaaaaaa.supabase.co",
      ],
    }),
    /public Supabase URL targets a different project/,
  );
});
