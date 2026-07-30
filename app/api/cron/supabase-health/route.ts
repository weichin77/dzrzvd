import { getSql } from "@/db";
import {
  getCronSecret,
  hasDatabaseConfig,
} from "@/lib/config";

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
    await getSql()`select 1 as health_check`;

    return json({
      ok: true,
      checkedAt: new Date().toISOString(),
      latencyMs: Math.round(performance.now() - startedAt),
    });
  } catch {
    console.error("Supabase database health check failed.");

    return json(
      { ok: false, error: "database_unavailable" },
      502,
    );
  }
}
