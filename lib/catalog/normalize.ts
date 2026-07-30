import {
  CLASSIFICATION_VERSION,
  classifyDzrzvdTitle,
  type ClassificationOverride,
} from "./classifier";
import type {
  ShopeeCategoryEntry,
  ShopeeItemBaseInfo,
  ShopeeItemListEntry,
} from "@/lib/shopee/types";

export type NormalizedCategory = {
  categoryId: bigint;
  parentCategoryId: bigint | null;
  originalName: string;
  displayName: string;
  hasChildren: boolean;
  breadcrumb: string[];
  depth: number;
  sourceUpdatedAt: Date;
};

export type NormalizedProduct = {
  itemId: bigint;
  shopId: bigint;
  categoryId: bigint | null;
  name: string;
  itemSku: string | null;
  brandId: bigint | null;
  brandName: string | null;
  currency: string;
  originalPrice: string | null;
  currentPrice: string | null;
  priceMin: string | null;
  priceMax: string | null;
  availableStock: number | null;
  status: string;
  imageUrls: string[];
  canonicalUrl: string;
  isDzrzvd: boolean;
  matchMethod: string;
  matchEvidence: string | null;
  classificationVersion: string;
  sourceUpdateTime: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  inactiveAt: Date | null;
  sourcePayload: ShopeeItemBaseInfo;
};

function safeBigInt(value: number | undefined): bigint | null {
  if (!Number.isSafeInteger(value) || !value || value <= 0) {
    return null;
  }

  return BigInt(value);
}

function safeHttpsUrls(urls: string[] | undefined): string[] {
  const allowedHosts = new Set([
    "down-tw.img.susercontent.com",
    "cf.shopee.tw",
  ]);

  return (urls ?? []).filter((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && allowedHosts.has(url.hostname);
    } catch {
      return false;
    }
  });
}

function toDate(unixSeconds: number | undefined): Date | null {
  if (!Number.isFinite(unixSeconds) || !unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000);
}

export function normalizeCategories(
  categories: ShopeeCategoryEntry[],
  sourceUpdatedAt: Date,
): NormalizedCategory[] {
  const byId = new Map(
    categories
      .filter((category) => safeBigInt(category.category_id))
      .map((category) => [category.category_id, category]),
  );

  function resolveBreadcrumb(
    category: ShopeeCategoryEntry,
    visited = new Set<number>(),
  ): string[] {
    if (visited.has(category.category_id) || visited.size > 12) {
      return [];
    }

    const nextVisited = new Set(visited).add(category.category_id);
    const name =
      category.display_category_name?.trim() ||
      category.original_category_name?.trim() ||
      `Category ${category.category_id}`;
    const parent = category.parent_category_id
      ? byId.get(category.parent_category_id)
      : undefined;

    return parent
      ? [...resolveBreadcrumb(parent, nextVisited), name]
      : [name];
  }

  return categories.flatMap((category) => {
    const categoryId = safeBigInt(category.category_id);

    if (!categoryId) {
      return [];
    }

    const breadcrumb = resolveBreadcrumb(category);
    const originalName =
      category.original_category_name?.trim() ||
      category.display_category_name?.trim() ||
      `Category ${category.category_id}`;

    return [{
      categoryId,
      parentCategoryId: safeBigInt(category.parent_category_id),
      originalName,
      displayName:
        category.display_category_name?.trim() || originalName,
      hasChildren: Boolean(category.has_children),
      breadcrumb,
      depth: Math.max(0, breadcrumb.length - 1),
      sourceUpdatedAt,
    }];
  });
}

export function normalizeProduct(
  item: ShopeeItemBaseInfo,
  listing: ShopeeItemListEntry | undefined,
  shopId: bigint,
  runStartedAt: Date,
  override: ClassificationOverride = null,
): NormalizedProduct | null {
  const itemId = safeBigInt(item.item_id);
  const name = item.item_name?.normalize("NFKC").trim();

  if (!itemId || !name) {
    return null;
  }

  const classification = classifyDzrzvdTitle(name, override);
  const priceValues = (item.price_info ?? [])
    .map((price) => price.current_price)
    .filter((price): price is number => Number.isFinite(price));
  const firstPrice = item.price_info?.[0];
  const status = item.item_status || listing?.item_status || "UNKNOWN";
  const availableStock =
    item.stock_info_v2?.summary_info?.total_available_stock;

  return {
    itemId,
    shopId,
    categoryId: safeBigInt(item.category_id),
    name,
    itemSku: item.item_sku?.trim() || null,
    brandId: safeBigInt(item.brand?.brand_id),
    brandName: item.brand?.original_brand_name?.trim() || null,
    currency: (firstPrice?.currency || "TWD").slice(0, 3),
    originalPrice: Number.isFinite(firstPrice?.original_price)
      ? String(firstPrice?.original_price)
      : null,
    currentPrice: Number.isFinite(firstPrice?.current_price)
      ? String(firstPrice?.current_price)
      : null,
    priceMin: priceValues.length ? String(Math.min(...priceValues)) : null,
    priceMax: priceValues.length ? String(Math.max(...priceValues)) : null,
    availableStock: Number.isInteger(availableStock) ? availableStock! : null,
    status,
    imageUrls: safeHttpsUrls(item.image?.image_url_list),
    canonicalUrl: `https://shopee.tw/product/${shopId}/${itemId}`,
    isDzrzvd: classification.included,
    matchMethod: classification.method,
    matchEvidence: classification.evidence,
    classificationVersion: CLASSIFICATION_VERSION,
    sourceUpdateTime: toDate(item.update_time || listing?.update_time),
    firstSeenAt: runStartedAt,
    lastSeenAt: runStartedAt,
    inactiveAt: null,
    sourcePayload: item,
  };
}

export function isPubliclyVisibleProduct(product: NormalizedProduct): boolean {
  return product.isDzrzvd &&
    product.status === "NORMAL" &&
    product.inactiveAt === null &&
    product.availableStock !== null &&
    product.availableStock > 0;
}
