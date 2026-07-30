import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { shopeeShop } from "@/db/schema";

export type AuthorizedShop = typeof shopeeShop.$inferSelect;

export async function getAuthorizedShop(): Promise<AuthorizedShop | null> {
  const rows = await getDb()
    .select()
    .from(shopeeShop)
    .where(eq(shopeeShop.authorizationStatus, "active"))
    .limit(1);

  return rows[0] ?? null;
}

export async function saveShopAuthorization(input: {
  shopId: bigint;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  tokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}): Promise<void> {
  const now = new Date();

  await getDb()
    .insert(shopeeShop)
    .values({
      shopId: input.shopId,
      accessTokenCiphertext: input.accessTokenCiphertext,
      refreshTokenCiphertext: input.refreshTokenCiphertext,
      tokenExpiresAt: input.tokenExpiresAt,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt,
      authorizedAt: now,
      authorizationExpiresAt: new Date(
        now.getTime() + 365 * 24 * 60 * 60 * 1000,
      ),
      authorizationStatus: "active",
      tokenVersion: 1,
    })
    .onConflictDoUpdate({
      target: shopeeShop.shopId,
      set: {
        accessTokenCiphertext: input.accessTokenCiphertext,
        refreshTokenCiphertext: input.refreshTokenCiphertext,
        tokenExpiresAt: input.tokenExpiresAt,
        refreshTokenExpiresAt: input.refreshTokenExpiresAt,
        authorizedAt: now,
        authorizationExpiresAt: new Date(
          now.getTime() + 365 * 24 * 60 * 60 * 1000,
        ),
        authorizationStatus: "active",
        tokenVersion: 1,
        updatedAt: now,
      },
    });
}

export async function replaceShopTokens(input: {
  id: string;
  expectedTokenVersion: number;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  tokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}): Promise<boolean> {
  const updated = await getDb()
    .update(shopeeShop)
    .set({
      accessTokenCiphertext: input.accessTokenCiphertext,
      refreshTokenCiphertext: input.refreshTokenCiphertext,
      tokenExpiresAt: input.tokenExpiresAt,
      refreshTokenExpiresAt: input.refreshTokenExpiresAt,
      tokenVersion: input.expectedTokenVersion + 1,
      lastTokenRefreshAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(shopeeShop.id, input.id),
        eq(shopeeShop.tokenVersion, input.expectedTokenVersion),
      ),
    )
    .returning({ id: shopeeShop.id });

  return updated.length === 1;
}

export async function updateShopMetadata(input: {
  shopId: bigint;
  shopName: string | null;
  shopStatus: string | null;
}): Promise<void> {
  await getDb()
    .update(shopeeShop)
    .set({
      shopName: input.shopName,
      shopStatus: input.shopStatus,
      updatedAt: new Date(),
    })
    .where(eq(shopeeShop.shopId, input.shopId));
}

export async function markShopSynchronized(shopId: bigint): Promise<void> {
  await getDb()
    .update(shopeeShop)
    .set({ lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(shopeeShop.shopId, shopId));
}
