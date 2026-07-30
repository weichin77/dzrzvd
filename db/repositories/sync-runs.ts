import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { syncRun } from "@/db/schema";

export type SyncRunSummary = typeof syncRun.$inferSelect;

export async function createSyncRun(input: {
  id: string;
  shopId: bigint;
  trigger: "cron" | "manual" | "bootstrap";
  mode: "full" | "dry_run";
  startedAt: Date;
}): Promise<void> {
  await getDb().insert(syncRun).values({
    id: input.id,
    shopId: input.shopId,
    trigger: input.trigger,
    mode: input.mode,
    status: "running",
    startedAt: input.startedAt,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
  });
}

export async function finishSyncRun(
  id: string,
  values: Partial<typeof syncRun.$inferInsert>,
): Promise<void> {
  await getDb()
    .update(syncRun)
    .set({ ...values, finishedAt: values.finishedAt ?? new Date() })
    .where(eq(syncRun.id, id));
}

export async function getLatestSyncRun(): Promise<SyncRunSummary | null> {
  const rows = await getDb()
    .select()
    .from(syncRun)
    .orderBy(desc(syncRun.startedAt))
    .limit(1);

  return rows[0] ?? null;
}
