import "server-only";

import { getSql } from "@/db";
import { getDatabaseProjectRef } from "@/lib/config";

export type KeepaliveSource = "supabase-health" | "shopee-sync";

export type KeepaliveHeartbeat = {
  source: KeepaliveSource;
  projectRef: string;
  lastSucceededAt: Date;
  runCount: number;
};

type KeepaliveHeartbeatRow = {
  source: KeepaliveSource;
  project_ref: string;
  last_succeeded_at: Date;
  run_count: number;
};

export async function recordKeepaliveHeartbeat(
  source: KeepaliveSource,
): Promise<KeepaliveHeartbeat> {
  const projectRef = getDatabaseProjectRef();
  const rows = await getSql()<KeepaliveHeartbeatRow[]>`
    insert into app_private.keepalive_heartbeat (
      source,
      project_ref,
      last_succeeded_at,
      run_count
    )
    values (${source}, ${projectRef}, now(), 1)
    on conflict (source) do update
    set
      project_ref = excluded.project_ref,
      last_succeeded_at = excluded.last_succeeded_at,
      run_count = app_private.keepalive_heartbeat.run_count + 1
    returning source, project_ref, last_succeeded_at, run_count
  `;
  const row = rows[0];

  if (!row) {
    throw new Error("Keepalive heartbeat was not persisted.");
  }

  return {
    source: row.source,
    projectRef: row.project_ref,
    lastSucceededAt: row.last_succeeded_at,
    runCount: row.run_count,
  };
}
