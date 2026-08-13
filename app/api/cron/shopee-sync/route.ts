import { recordKeepaliveHeartbeat } from "@/db/repositories/keepalive";
import { getCronSecret, hasDatabaseConfig } from "@/lib/config";
import { runShopeeSync } from "@/lib/shopee/sync";
import { isSupabaseProjectConfigError } from "@/lib/supabase/project-ref";

export const maxDuration = 300;

function json(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  let expectedAuthorization: string;

  try {
    expectedAuthorization = `Bearer ${getCronSecret()}`;
  } catch {
    return json(
      { ok: false, error: "cron_not_configured" },
      503,
    );
  }

  if (request.headers.get("authorization") !== expectedAuthorization) {
    return json(
      { ok: false, error: "unauthorized" },
      401,
    );
  }

  if (!hasDatabaseConfig()) {
    return json(
      { ok: false, error: "database_not_configured" },
      503,
    );
  }

  let heartbeat;

  try {
    heartbeat = await recordKeepaliveHeartbeat("shopee-sync");
  } catch (error) {
    if (isSupabaseProjectConfigError(error)) {
      console.error("Supabase project configuration validation failed.");

      return json(
        { ok: false, error: "project_mismatch" },
        503,
      );
    }

    console.error("Supabase keepalive heartbeat failed for Shopee cron.");

    return json(
      { ok: false, error: "database_unavailable" },
      502,
    );
  }

  const result = await runShopeeSync({ trigger: "cron", mode: "full" });
  const ok = ["succeeded", "skipped_locked"].includes(result.status);
  const status = result.status === "failed"
    ? 502
    : ["not_configured", "not_authorized"].includes(result.status)
      ? 503
      : 200;

  return json({
    ok,
    ...result,
    heartbeat: {
      projectRef: heartbeat.projectRef,
      lastSucceededAt: heartbeat.lastSucceededAt,
      runCount: heartbeat.runCount,
    },
  }, status);
}
