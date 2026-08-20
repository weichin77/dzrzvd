import "server-only";

import { and, desc, eq, isNull, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  categoryPresentation,
  excelImport,
  shopeeCategory,
  shopeeProduct,
} from "@/db/schema";
import type { ParsedShopeeExport } from "@/lib/catalog/parse-shopee-export";

const SHOPEE_SHOP_ID = BigInt(16630682);

export type ExcelImportRecord = typeof excelImport.$inferSelect;

type ImportCatalogInput = {
  importId: string;
  userId: string;
  filename: string;
  storagePath: string;
  parsed: ParsedShopeeExport;
};

function excludedCount(parsed: ParsedShopeeExport): number {
  return Math.max(0, parsed.stats.totalRows - parsed.stats.included);
}

export async function importParsedShopeeCatalog({
  importId,
  userId,
  filename,
  storagePath,
  parsed,
}: ImportCatalogInput): Promise<void> {
  const now = new Date();
  const categories = parsed.categories;
  const products = categories.flatMap((category) => category.products);
  const itemIds = products.map((product) => BigInt(product.itemId));

  await getDb().transaction(async (tx) => {
    await tx
      .insert(shopeeCategory)
      .values(categories.map((category) => ({
        categoryId: BigInt(category.categoryId),
        parentCategoryId: null,
        originalName: category.originalName,
        displayName: category.name,
        hasChildren: false,
        breadcrumb: category.breadcrumb,
        depth: Math.max(0, category.breadcrumb.length - 1),
        sourceUpdatedAt: now,
      })))
      .onConflictDoUpdate({
        target: shopeeCategory.categoryId,
        set: {
          parentCategoryId: null,
          originalName: sql`excluded.original_name`,
          displayName: sql`excluded.display_name`,
          hasChildren: false,
          breadcrumb: sql`excluded.breadcrumb`,
          depth: sql`excluded.depth`,
          sourceUpdatedAt: now,
        },
      });

    await tx
      .insert(categoryPresentation)
      .values(categories.map((category) => ({
        categoryId: BigInt(category.categoryId),
        slug: category.categoryId,
        customLabel: category.name,
        visible: true,
      })))
      .onConflictDoUpdate({
        target: categoryPresentation.categoryId,
        set: {
          slug: sql`excluded.slug`,
          customLabel: sql`excluded.custom_label`,
          visible: true,
        },
      });

    await tx
      .insert(shopeeProduct)
      .values(products.map((product) => ({
        itemId: BigInt(product.itemId),
        shopId: SHOPEE_SHOP_ID,
        categoryId: BigInt(product.categoryId),
        name: product.name,
        availableStock: null,
        status: "NORMAL",
        imageUrls: [product.imageUrl],
        canonicalUrl: `https://shopee.tw/product/${SHOPEE_SHOP_ID}/${product.itemId}`,
        isDzrzvd: true,
        matchMethod: "manual_excel_import",
        matchEvidence: null,
        classificationVersion: "excel-v1",
        sourceUpdateTime: null,
        firstSeenAt: now,
        lastSeenAt: now,
        inactiveAt: null,
        sourcePayload: null,
      })))
      .onConflictDoUpdate({
        target: shopeeProduct.itemId,
        set: {
          shopId: SHOPEE_SHOP_ID,
          categoryId: sql`excluded.category_id`,
          name: sql`excluded.name`,
          availableStock: null,
          status: "NORMAL",
          imageUrls: sql`excluded.image_urls`,
          canonicalUrl: sql`excluded.canonical_url`,
          isDzrzvd: true,
          matchMethod: "manual_excel_import",
          matchEvidence: null,
          classificationVersion: "excel-v1",
          sourceUpdateTime: null,
          lastSeenAt: now,
          inactiveAt: null,
          sourcePayload: null,
        },
      });

    await tx
      .update(shopeeProduct)
      .set({ inactiveAt: now })
      .where(and(
        eq(shopeeProduct.shopId, SHOPEE_SHOP_ID),
        eq(shopeeProduct.isDzrzvd, true),
        isNull(shopeeProduct.inactiveAt),
        notInArray(shopeeProduct.itemId, itemIds),
      ));

    await tx.insert(excelImport).values({
      id: importId,
      uploadedBy: userId,
      sourceFilename: filename,
      status: "succeeded",
      rowCount: parsed.stats.totalRows,
      includedCount: parsed.stats.included,
      excludedCount: excludedCount(parsed),
      categoryCount: categories.length,
      missingTranslationSegments: parsed.missingTranslations,
      storagePath,
      errorMessage: null,
    });
  });
}

export async function recordFailedExcelImport(input: {
  importId: string;
  userId: string;
  filename: string;
  storagePath: string | null;
  errorMessage: string;
  parsed?: ParsedShopeeExport;
}): Promise<void> {
  await getDb().insert(excelImport).values({
    id: input.importId,
    uploadedBy: input.userId,
    sourceFilename: input.filename,
    status: "failed",
    rowCount: input.parsed?.stats.totalRows ?? 0,
    includedCount: input.parsed?.stats.included ?? 0,
    excludedCount: input.parsed ? excludedCount(input.parsed) : 0,
    categoryCount: input.parsed?.categories.length ?? 0,
    missingTranslationSegments: input.parsed?.missingTranslations ?? [],
    storagePath: input.storagePath,
    errorMessage: input.errorMessage,
  });
}

export async function getExcelImport(
  importId: string,
): Promise<ExcelImportRecord | null> {
  const rows = await getDb()
    .select()
    .from(excelImport)
    .where(eq(excelImport.id, importId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRecentExcelImports(
  limit = 8,
): Promise<ExcelImportRecord[]> {
  return getDb()
    .select()
    .from(excelImport)
    .orderBy(desc(excelImport.createdAt))
    .limit(Math.min(Math.max(limit, 1), 20));
}
