import { getAuthorizedShop } from "@/db/repositories/shops";
import { getLatestSyncRun } from "@/db/repositories/sync-runs";
import { hasDatabaseConfig } from "@/lib/config";
import { requireAdmin } from "@/lib/supabase/require-admin";

export async function GET() {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    return Response.json(
      { ok: false, error: authorization.reason },
      { status: authorization.reason === "forbidden" ? 403 : 401 },
    );
  }

  if (!hasDatabaseConfig()) {
    return Response.json({ ok: false, error: "database_unconfigured" });
  }

  const [shop, latestRun] = await Promise.all([
    getAuthorizedShop(),
    getLatestSyncRun(),
  ]);

  return Response.json({
    ok: true,
    shop: shop
      ? {
          shopId: shop.shopId.toString(),
          shopName: shop.shopName,
          authorizationStatus: shop.authorizationStatus,
          tokenExpiresAt: shop.tokenExpiresAt?.toISOString() ?? null,
          lastSyncAt: shop.lastSyncAt?.toISOString() ?? null,
        }
      : null,
    latestRun: latestRun
      ? {
          id: latestRun.id,
          trigger: latestRun.trigger,
          mode: latestRun.mode,
          status: latestRun.status,
          startedAt: latestRun.startedAt.toISOString(),
          finishedAt: latestRun.finishedAt?.toISOString() ?? null,
          discoveredCount: latestRun.discoveredCount,
          includedCount: latestRun.includedCount,
          excludedCount: latestRun.excludedCount,
          safeErrorSummary: latestRun.safeErrorSummary,
        }
      : null,
  });
}
