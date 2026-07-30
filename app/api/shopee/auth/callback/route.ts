import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { saveShopAuthorization } from "@/db/repositories/shops";
import { getShopeeConfig, hasShopeeConfig } from "@/lib/config";
import { encryptToken } from "@/lib/crypto/token-encryption";
import { ShopeeClient } from "@/lib/shopee/client";
import { requireAdmin } from "@/lib/supabase/require-admin";

const STATE_COOKIE = "shopee_oauth_state";

function equalState(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer);
}

function expiryFromNow(seconds: number | undefined, fallbackSeconds: number): Date {
  return new Date(Date.now() + (seconds || fallbackSeconds) * 1000);
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shopIdValue = url.searchParams.get("shop_id");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || !equalState(expectedState, state)) {
    return Response.json(
      { ok: false, error: "invalid_oauth_state" },
      { status: 400 },
    );
  }

  let shopId: bigint;

  try {
    shopId = BigInt(shopIdValue ?? "");
    if (shopId <= BigInt(0)) {
      throw new Error("invalid");
    }
  } catch {
    return Response.json(
      { ok: false, error: "invalid_shop_id" },
      { status: 400 },
    );
  }

  const config = getShopeeConfig();
  const client = new ShopeeClient();
  const tokens = await client.exchangeAuthorizationCode(code, shopId);

  if (tokens.shop_id && BigInt(tokens.shop_id) !== shopId) {
    return Response.json(
      { ok: false, error: "shop_id_mismatch" },
      { status: 400 },
    );
  }

  await saveShopAuthorization({
    shopId,
    accessTokenCiphertext: encryptToken(
      tokens.access_token,
      config.tokenEncryptionKey,
    ),
    refreshTokenCiphertext: encryptToken(
      tokens.refresh_token,
      config.tokenEncryptionKey,
    ),
    tokenExpiresAt: expiryFromNow(tokens.expire_in, 4 * 60 * 60),
    refreshTokenExpiresAt: expiryFromNow(
      tokens.refresh_token_expire_in,
      30 * 24 * 60 * 60,
    ),
  });

  const response = NextResponse.redirect(
    new URL("/admin/shopee-catalog?authorized=1", url),
  );
  response.cookies.delete(STATE_COOKIE);
  return response;
}
