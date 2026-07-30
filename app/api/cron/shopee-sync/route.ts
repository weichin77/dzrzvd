import { getCronSecret } from "@/lib/config";
import { runShopeeSync } from "@/lib/shopee/sync";

export const maxDuration = 300;

export async function GET(request: Request) {
  let expectedAuthorization: string;

  try {
    expectedAuthorization = `Bearer ${getCronSecret()}`;
  } catch {
    return Response.json(
      { ok: false, error: "cron_not_configured" },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== expectedAuthorization) {
    return Response.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const result = await runShopeeSync({ trigger: "cron", mode: "full" });
  const ok = ["succeeded", "skipped_locked"].includes(result.status);
  const status = result.status === "failed"
    ? 502
    : ["not_configured", "not_authorized"].includes(result.status)
      ? 503
      : 200;

  return Response.json({ ok, ...result }, { status });
}
