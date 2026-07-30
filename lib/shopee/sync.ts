import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { getDb } from "@/db";
import { shopeeCategory, shopeeProduct } from "@/db/schema";
import { getProductOverrides } from "@/db/repositories/overrides";
import {
  getAuthorizedShop,
  markShopSynchronized,
  replaceShopTokens,
  updateShopMetadata,
} from "@/db/repositories/shops";
import {
  acquireSyncLease,
  heartbeatSyncLease,
  releaseSyncLease,
} from "@/db/repositories/sync-locks";
import {
  createSyncRun,
  finishSyncRun,
} from "@/db/repositories/sync-runs";
import {
  isPubliclyVisibleProduct,
  normalizeCategories,
  normalizeProduct,
  type NormalizedProduct,
} from "@/lib/catalog/normalize";
import {
  getShopeeConfig,
  hasDatabaseConfig,
  hasShopeeConfig,
} from "@/lib/config";
import {
  decryptToken,
  encryptToken,
} from "@/lib/crypto/token-encryption";
import { ShopeeApiError, ShopeeClient } from "./client";
import type {
  ShopeeItemBaseInfo,
  ShopeeItemListEntry,
} from "./types";

export type SyncTrigger = "cron" | "manual" | "bootstrap";
export type SyncMode = "full" | "dry_run";

export type SyncResult = {
  runId: string | null;
  status:
    | "succeeded"
    | "dry_run"
    | "skipped_locked"
    | "not_configured"
    | "not_authorized"
    | "failed";
  discoveredCount: number;
  includedCount: number;
  excludedCount: number;
  inactivatedCount: number;
  safeErrorCode?: string;
};

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
}

function expiryFromNow(seconds: number | undefined, fallbackSeconds: number): Date {
  return new Date(Date.now() + (seconds || fallbackSeconds) * 1000);
}

async function ensureFreshTokens(
  shop: NonNullable<Awaited<ReturnType<typeof getAuthorizedShop>>>,
): Promise<{ accessToken: string; requestCount: number }> {
  const encryptionKey = getShopeeConfig().tokenEncryptionKey;

  if (
    !shop.accessTokenCiphertext ||
    !shop.refreshTokenCiphertext ||
    !shop.tokenExpiresAt
  ) {
    throw new ShopeeApiError("missing_encrypted_tokens", null);
  }

  const currentAccessToken = decryptToken(
    shop.accessTokenCiphertext,
    encryptionKey,
  );
  const refreshThreshold = Date.now() + 10 * 60 * 1000;

  if (shop.tokenExpiresAt.getTime() > refreshThreshold) {
    return { accessToken: currentAccessToken, requestCount: 0 };
  }

  const refreshToken = decryptToken(
    shop.refreshTokenCiphertext,
    encryptionKey,
  );
  const refreshClient = new ShopeeClient();
  const refreshed = await refreshClient.refreshAccessToken(
    refreshToken,
    shop.shopId,
  );
  const replaced = await replaceShopTokens({
    id: shop.id,
    expectedTokenVersion: shop.tokenVersion,
    accessTokenCiphertext: encryptToken(refreshed.access_token, encryptionKey),
    refreshTokenCiphertext: encryptToken(refreshed.refresh_token, encryptionKey),
    tokenExpiresAt: expiryFromNow(refreshed.expire_in, 4 * 60 * 60),
    refreshTokenExpiresAt: expiryFromNow(
      refreshed.refresh_token_expire_in,
      30 * 24 * 60 * 60,
    ),
  });

  if (!replaced) {
    throw new ShopeeApiError("token_refresh_conflict", null);
  }

  return {
    accessToken: refreshed.access_token,
    requestCount: refreshClient.requestCount,
  };
}

function safeErrorCode(error: unknown): string {
  if (error instanceof ShopeeApiError) {
    return error.code.slice(0, 120);
  }

  return "sync_failed";
}

async function enumerateListings(
  client: ShopeeClient,
): Promise<ShopeeItemListEntry[]> {
  const listings = new Map<number, ShopeeItemListEntry>();
  const seenOffsets = new Set<number>();
  let offset = 0;

  for (let page = 0; page < 500; page += 1) {
    if (seenOffsets.has(offset)) {
      throw new ShopeeApiError("pagination_loop", null);
    }

    seenOffsets.add(offset);
    const response = await client.getItemList(offset);
    const items = response.item ?? response.item_list ?? [];

    for (const item of items) {
      if (Number.isSafeInteger(item.item_id) && item.item_id > 0) {
        listings.set(item.item_id, item);
      }
    }

    if (!response.has_next_page) {
      return Array.from(listings.values());
    }

    if (!Number.isSafeInteger(response.next_offset)) {
      throw new ShopeeApiError("missing_next_offset", null);
    }

    offset = response.next_offset!;
  }

  throw new ShopeeApiError("pagination_limit_exceeded", null);
}

async function persistCatalog(input: {
  shopId: bigint;
  runStartedAt: Date;
  categories: ReturnType<typeof normalizeCategories>;
  products: NormalizedProduct[];
}): Promise<{ insertedCount: number; updatedCount: number; inactivatedCount: number }> {
  const db = getDb();
  const itemIds = input.products.map((product) => product.itemId);
  const existingRows = itemIds.length
    ? await db
        .select({ itemId: shopeeProduct.itemId })
        .from(shopeeProduct)
        .where(inArray(shopeeProduct.itemId, itemIds))
    : [];
  const existingIds = new Set(existingRows.map((row) => row.itemId.toString()));

  return db.transaction(async (transaction) => {
    if (input.categories.length) {
      await transaction
        .insert(shopeeCategory)
        .values(input.categories)
        .onConflictDoUpdate({
          target: shopeeCategory.categoryId,
          set: {
            parentCategoryId: sql`excluded.parent_category_id`,
            originalName: sql`excluded.original_name`,
            displayName: sql`excluded.display_name`,
            hasChildren: sql`excluded.has_children`,
            breadcrumb: sql`excluded.breadcrumb`,
            depth: sql`excluded.depth`,
            sourceUpdatedAt: sql`excluded.source_updated_at`,
            updatedAt: sql`now()`,
          },
        });
    }

    for (const productBatch of chunks(input.products, 100)) {
      await transaction
        .insert(shopeeProduct)
        .values(productBatch)
        .onConflictDoUpdate({
          target: shopeeProduct.itemId,
          set: {
            shopId: sql`excluded.shop_id`,
            categoryId: sql`excluded.category_id`,
            name: sql`excluded.name`,
            itemSku: sql`excluded.item_sku`,
            brandId: sql`excluded.brand_id`,
            brandName: sql`excluded.brand_name`,
            currency: sql`excluded.currency`,
            originalPrice: sql`excluded.original_price`,
            currentPrice: sql`excluded.current_price`,
            priceMin: sql`excluded.price_min`,
            priceMax: sql`excluded.price_max`,
            availableStock: sql`excluded.available_stock`,
            status: sql`excluded.status`,
            imageUrls: sql`excluded.image_urls`,
            canonicalUrl: sql`excluded.canonical_url`,
            isDzrzvd: sql`excluded.is_dzrzvd`,
            matchMethod: sql`excluded.match_method`,
            matchEvidence: sql`excluded.match_evidence`,
            classificationVersion: sql`excluded.classification_version`,
            sourceUpdateTime: sql`excluded.source_update_time`,
            lastSeenAt: sql`excluded.last_seen_at`,
            inactiveAt: null,
            sourcePayload: sql`excluded.source_payload`,
            updatedAt: sql`now()`,
          },
        });
    }

    const inactivated = await transaction
      .update(shopeeProduct)
      .set({ inactiveAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(shopeeProduct.shopId, input.shopId),
          isNull(shopeeProduct.inactiveAt),
          lt(shopeeProduct.lastSeenAt, input.runStartedAt),
        ),
      )
      .returning({ itemId: shopeeProduct.itemId });

    const updatedCount = input.products.filter((product) =>
      existingIds.has(product.itemId.toString())
    ).length;

    return {
      insertedCount: input.products.length - updatedCount,
      updatedCount,
      inactivatedCount: inactivated.length,
    };
  });
}

export async function runShopeeSync(input: {
  trigger: SyncTrigger;
  mode?: SyncMode;
}): Promise<SyncResult> {
  if (!hasDatabaseConfig() || !hasShopeeConfig()) {
    return {
      runId: null,
      status: "not_configured",
      discoveredCount: 0,
      includedCount: 0,
      excludedCount: 0,
      inactivatedCount: 0,
    };
  }

  const shop = await getAuthorizedShop();

  if (!shop) {
    return {
      runId: null,
      status: "not_authorized",
      discoveredCount: 0,
      includedCount: 0,
      excludedCount: 0,
      inactivatedCount: 0,
    };
  }

  const runId = randomUUID();
  const mode = input.mode ?? "full";
  const startedAt = new Date();
  await createSyncRun({
    id: runId,
    shopId: shop.shopId,
    trigger: input.trigger,
    mode,
    startedAt,
  });

  const acquired = await acquireSyncLease(shop.shopId, runId);

  if (!acquired) {
    await finishSyncRun(runId, { status: "skipped_locked" });
    return {
      runId,
      status: "skipped_locked",
      discoveredCount: 0,
      includedCount: 0,
      excludedCount: 0,
      inactivatedCount: 0,
    };
  }

  let discoveredCount = 0;
  let includedCount = 0;
  let excludedCount = 0;
  let endpointRequestCount = 0;
  let warningCount = 0;

  try {
    const freshTokens = await ensureFreshTokens(shop);
    endpointRequestCount += freshTokens.requestCount;
    const client = new ShopeeClient(freshTokens.accessToken, shop.shopId);
    const [shopInfo, categoryResponse, listings] = await Promise.all([
      client.getShopInfo(),
      client.getCategories(),
      enumerateListings(client),
    ]);
    endpointRequestCount += client.requestCount;
    discoveredCount = listings.length;

    const shopStatus = shopInfo.status || shopInfo.shop_status || null;

    if ((shopInfo.region && shopInfo.region !== "TW") ||
      (shopStatus && shopStatus !== "NORMAL")) {
      throw new ShopeeApiError("unexpected_shop_identity", null);
    }

    await updateShopMetadata({
      shopId: shop.shopId,
      shopName: shopInfo.shop_name?.trim() || null,
      shopStatus: shopStatus?.trim() || null,
    });

    const overrides = await getProductOverrides(
      listings.map((listing) => BigInt(listing.item_id)),
    );
    const listingById = new Map(
      listings.map((listing) => [listing.item_id, listing]),
    );
    const itemDetails: ShopeeItemBaseInfo[] = [];

    for (const batch of chunks(listings, 50)) {
      const response = await client.getItemBaseInfo(
        batch.map((listing) => BigInt(listing.item_id)),
      );
      itemDetails.push(...(response.item_list ?? []));

      const ownsLease = await heartbeatSyncLease(shop.shopId, runId);
      if (!ownsLease) {
        throw new ShopeeApiError("sync_lease_lost", null);
      }
    }

    endpointRequestCount = freshTokens.requestCount + client.requestCount;
    const itemDetailsById = new Map(
      itemDetails
        .filter((item) => Number.isSafeInteger(item.item_id) && item.item_id > 0)
        .map((item) => [item.item_id, item]),
    );

    if (itemDetailsById.size !== listings.length) {
      throw new ShopeeApiError("incomplete_item_details", null);
    }

    const normalizedCategories = normalizeCategories(
      categoryResponse.category_list ?? [],
      startedAt,
    );

    if (!normalizedCategories.length && listings.length) {
      throw new ShopeeApiError("empty_category_tree", null);
    }

    const knownCategoryIds = new Set(
      normalizedCategories.map((category) => category.categoryId.toString()),
    );
    const normalizedProducts = Array.from(itemDetailsById.values()).flatMap((item) => {
      const normalized = normalizeProduct(
        item,
        listingById.get(item.item_id),
        shop.shopId,
        startedAt,
        overrides.get(String(item.item_id)) ?? null,
      );

      return normalized ? [normalized] : [];
    });

    if (normalizedProducts.length !== listings.length) {
      throw new ShopeeApiError("invalid_item_details", null);
    }

    const productsWithResolvedCategories = normalizedProducts.map((product) => {
      if (
        product.categoryId &&
        !knownCategoryIds.has(product.categoryId.toString())
      ) {
        warningCount += 1;
        return { ...product, categoryId: null };
      }

      return product;
    });
    includedCount =
      productsWithResolvedCategories.filter(isPubliclyVisibleProduct).length;
    excludedCount = productsWithResolvedCategories.length - includedCount;

    if (mode === "dry_run") {
      await finishSyncRun(runId, {
        status: "dry_run",
        discoveredCount,
        enrichedCount: productsWithResolvedCategories.length,
        includedCount,
        excludedCount,
        warningCount,
        endpointRequestCount,
      });

      return {
        runId,
        status: "dry_run",
        discoveredCount,
        includedCount,
        excludedCount,
        inactivatedCount: 0,
      };
    }

    const persisted = await persistCatalog({
      shopId: shop.shopId,
      runStartedAt: startedAt,
      categories: normalizedCategories,
      products: productsWithResolvedCategories,
    });
    await markShopSynchronized(shop.shopId);
    await finishSyncRun(runId, {
      status: "succeeded",
      discoveredCount,
      enrichedCount: productsWithResolvedCategories.length,
      includedCount,
      excludedCount,
      insertedCount: persisted.insertedCount,
      updatedCount: persisted.updatedCount,
      inactivatedCount: persisted.inactivatedCount,
      warningCount,
      endpointRequestCount,
    });
    revalidateTag("shopee-catalog", "max");

    return {
      runId,
      status: "succeeded",
      discoveredCount,
      includedCount,
      excludedCount,
      inactivatedCount: persisted.inactivatedCount,
    };
  } catch (error) {
    const errorCode = safeErrorCode(error);
    await finishSyncRun(runId, {
      status: "failed",
      discoveredCount,
      includedCount,
      excludedCount,
      warningCount,
      endpointRequestCount,
      safeErrorSummary: errorCode,
    });

    return {
      runId,
      status: "failed",
      discoveredCount,
      includedCount,
      excludedCount,
      inactivatedCount: 0,
      safeErrorCode: errorCode,
    };
  } finally {
    await releaseSyncLease(shop.shopId, runId);
  }
}
