import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getShopeeConfig, hasShopeeConfig } from "@/lib/config";
import { requireAdmin } from "@/lib/supabase/require-admin";

const STATE_COOKIE = "shopee_oauth_state";

export async function GET() {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    return Response.json(
      { ok: false, error: authorization.reason },
      { status: authorization.reason === "forbidden" ? 403 : 401 },
    );
  }

  if (!hasShopeeConfig()) {
    return Response.json(
      { ok: false, error: "shopee_not_configured" },
      { status: 503 },
    );
  }

  const config = getShopeeConfig();
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/shopee/auth/callback",
    maxAge: 10 * 60,
  });

  const authorizationUrl = new URL(config.authBaseUrl);
  authorizationUrl.searchParams.set("partner_id", String(config.partnerId));
  authorizationUrl.searchParams.set("redirect", config.redirectUrl);
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("auth_type", "seller");

  return NextResponse.redirect(authorizationUrl);
}
