import "server-only";

import { and, asc, desc, eq, gt, isNull, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getDb } from "@/db";
import {
  categoryPresentation,
  excelImport,
  shopeeCategory,
  shopeeProduct,
  syncRun,
} from "@/db/schema";
import { hasDatabaseConfig } from "@/lib/config";
import type {
  CatalogCategory,
  CatalogOverview,
  CatalogProduct,
} from "@/lib/catalog/types";

function defaultCategorySlug(categoryId: bigint): string {
  return `category-${categoryId}`;
}

async function readCatalogOverview(): Promise<CatalogOverview> {
  const db = getDb();
  const [rows, latestRuns, latestImports] = await Promise.all([
    db
      .select({
        itemId: shopeeProduct.itemId,
        name: shopeeProduct.name,
        imageUrls: shopeeProduct.imageUrls,
        shopeeUrl: shopeeProduct.canonicalUrl,
        categoryId: shopeeCategory.categoryId,
        categoryName: shopeeCategory.displayName,
        categorySlug: categoryPresentation.slug,
        categoryLabel: categoryPresentation.customLabel,
        categoryDescription: categoryPresentation.description,
        categorySortOrder: categoryPresentation.sortOrder,
      })
      .from(shopeeProduct)
      .leftJoin(
        shopeeCategory,
        eq(shopeeProduct.categoryId, shopeeCategory.categoryId),
      )
      .leftJoin(
        categoryPresentation,
        eq(shopeeCategory.categoryId, categoryPresentation.categoryId),
      )
      .where(
        and(
          eq(shopeeProduct.isDzrzvd, true),
          eq(shopeeProduct.status, "NORMAL"),
          isNull(shopeeProduct.inactiveAt),
          or(
            gt(shopeeProduct.availableStock, 0),
            eq(shopeeProduct.matchMethod, "manual_excel_import"),
          ),
          or(
            isNull(categoryPresentation.visible),
            eq(categoryPresentation.visible, true),
          ),
        ),
      )
      .orderBy(
        asc(categoryPresentation.sortOrder),
        asc(shopeeCategory.displayName),
        desc(shopeeProduct.sourceUpdateTime),
        asc(shopeeProduct.name),
      ),
    db
      .select({ finishedAt: syncRun.finishedAt })
      .from(syncRun)
      .where(eq(syncRun.status, "succeeded"))
      .orderBy(desc(syncRun.finishedAt))
      .limit(1),
    db
      .select({ createdAt: excelImport.createdAt })
      .from(excelImport)
      .where(eq(excelImport.status, "succeeded"))
      .orderBy(desc(excelImport.createdAt))
      .limit(1),
  ]);

  const categories = new Map<string, CatalogCategory>();

  for (const row of rows) {
    const categoryId = row.categoryId?.toString() ?? "other";
    const category = categories.get(categoryId) ?? {
      categoryId,
      slug:
        row.categorySlug ||
        (row.categoryId ? defaultCategorySlug(row.categoryId) : "other"),
      name: row.categoryLabel || row.categoryName || "其他",
      description: row.categoryDescription,
      products: [],
    };
    const product: CatalogProduct = {
      itemId: row.itemId.toString(),
      name: row.name,
      imageUrl: row.imageUrls[0] || null,
      shopeeUrl: row.shopeeUrl,
      categoryId,
    };

    category.products.push(product);
    categories.set(categoryId, category);
  }

  const groupedCategories = Array.from(categories.values());

  const lastUpdatedAt = [
    latestRuns[0]?.finishedAt,
    latestImports[0]?.createdAt,
  ].filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    status: groupedCategories.length ? "ready" : "empty",
    lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
    categories: groupedCategories,
  };
}

const readCachedCatalogOverview = unstable_cache(
  readCatalogOverview,
  ["shopee-catalog-overview-v1"],
  { revalidate: 3600, tags: ["shopee-catalog"] },
);

export async function getCatalogOverview(): Promise<CatalogOverview> {
  if (!hasDatabaseConfig()) {
    return {
      status: "unconfigured",
      lastUpdatedAt: null,
      categories: [],
    };
  }

  try {
    return await readCachedCatalogOverview();
  } catch {
    return {
      status: "error",
      lastUpdatedAt: null,
      categories: [],
    };
  }
}

export async function getCatalogCategory(
  slug: string,
): Promise<{ overview: CatalogOverview; category: CatalogCategory | null }> {
  const overview = await getCatalogOverview();
  const category =
    overview.categories.find((candidate) => candidate.slug === slug) ?? null;

  return { overview, category };
}
