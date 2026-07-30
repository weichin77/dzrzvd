import { requireAdmin } from "@/lib/supabase/require-admin";
import { runShopeeSync, type SyncMode } from "@/lib/shopee/sync";

export const maxDuration = 300;

export async function POST(request: Request) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    return Response.json(
      { ok: false, error: authorization.reason },
      { status: authorization.reason === "forbidden" ? 403 : 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { mode?: string };
  const mode: SyncMode = body.mode === "dry_run" ? "dry_run" : "full";
  const result = await runShopeeSync({ trigger: "manual", mode });
  const ok = ["succeeded", "dry_run", "skipped_locked"].includes(result.status);
  const status = result.status === "failed"
    ? 502
    : ["not_configured", "not_authorized"].includes(result.status)
      ? 503
      : 200;

  return Response.json({
    ok,
    ...result,
  }, { status });
}
