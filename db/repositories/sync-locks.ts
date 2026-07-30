import "server-only";

import { getSql } from "@/db";

const LEASE_MINUTES = 15;

export async function acquireSyncLease(
  shopId: bigint,
  ownerRunId: string,
): Promise<boolean> {
  const rows = await getSql()<Array<{ owner_run_id: string }>>`
    insert into app_private.sync_lock (
      shop_id,
      owner_run_id,
      acquired_at,
      heartbeat_at,
      locked_until
    )
    values (
      ${shopId.toString()}::bigint,
      ${ownerRunId}::uuid,
      now(),
      now(),
      now() + (${LEASE_MINUTES} * interval '1 minute')
    )
    on conflict (shop_id) do update
    set
      owner_run_id = excluded.owner_run_id,
      acquired_at = excluded.acquired_at,
      heartbeat_at = excluded.heartbeat_at,
      locked_until = excluded.locked_until
    where app_private.sync_lock.locked_until < now()
    returning owner_run_id::text
  `;

  return rows[0]?.owner_run_id === ownerRunId;
}

export async function heartbeatSyncLease(
  shopId: bigint,
  ownerRunId: string,
): Promise<boolean> {
  const rows = await getSql()<Array<{ owner_run_id: string }>>`
    update app_private.sync_lock
    set
      heartbeat_at = now(),
      locked_until = now() + (${LEASE_MINUTES} * interval '1 minute')
    where shop_id = ${shopId.toString()}::bigint
      and owner_run_id = ${ownerRunId}::uuid
      and locked_until >= now()
    returning owner_run_id::text
  `;

  return rows[0]?.owner_run_id === ownerRunId;
}

export async function releaseSyncLease(
  shopId: bigint,
  ownerRunId: string,
): Promise<void> {
  await getSql()`
    delete from app_private.sync_lock
    where shop_id = ${shopId.toString()}::bigint
      and owner_run_id = ${ownerRunId}::uuid
  `;
}
