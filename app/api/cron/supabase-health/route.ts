import { recordKeepaliveHeartbeat } from "@/db/repositories/keepalive";
import {
  getCronSecret,
  hasDatabaseConfig,
} from "@/lib/config";
import { isSupabaseProjectConfigError } from "@/lib/supabase/project-ref";

export const maxDuration = 30;

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

  const startedAt = performance.now();

  try {
    const heartbeat = await recordKeepaliveHeartbeat("supabase-health");

    return json({
      ok: true,
      checkedAt: heartbeat.lastSucceededAt,
      latencyMs: Math.round(performance.now() - startedAt),
      projectRef: heartbeat.projectRef,
      runCount: heartbeat.runCount,
    });
  } catch (error) {
    if (isSupabaseProjectConfigError(error)) {
      console.error("Supabase project configuration validation failed.");

      return json(
        { ok: false, error: "project_mismatch" },
        503,
      );
    }

    console.error("Supabase keepalive heartbeat failed.");

    return json(
      { ok: false, error: "database_unavailable" },
      502,
    );
  }
}
