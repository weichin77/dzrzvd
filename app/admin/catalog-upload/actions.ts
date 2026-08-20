"use server";

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  importParsedShopeeCatalog,
  recordFailedExcelImport,
} from "@/db/repositories/excel-imports";
import {
  parseShopeeExport,
  ShopeeExportValidationError,
  type ParsedShopeeExport,
} from "@/lib/catalog/parse-shopee-export";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/supabase/require-admin";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const UPLOAD_BUCKET = "catalog-uploads";

class OperatorImportError extends Error {}

function safeFilename(value: string): string {
  const basename = value.split(/[\\/]/).at(-1)?.normalize("NFKC") ?? "";
  return basename.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 255) ||
    "catalog.xlsx";
}

function storageFilename(value: string): string {
  const extension = ".xlsx";
  const stem = value.slice(0, -extension.length)
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/^\.+/, "")
    .slice(0, 160) || "catalog";
  return `${stem}${extension}`;
}

function operatorMessage(error: unknown): string {
  if (error instanceof ShopeeExportValidationError ||
      error instanceof OperatorImportError) {
    return error.message.slice(0, 1_000);
  }

  return "匯入期間發生錯誤，資料庫交易已回復，現有商品目錄未變更。";
}

export async function uploadCatalogAction(formData: FormData): Promise<never> {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    redirect("/admin/login?next=/admin/catalog-upload");
  }

  const importId = randomUUID();
  const entry = formData.get("catalogFile");
  const sourceFilename = entry instanceof File
    ? safeFilename(entry.name)
    : "catalog.xlsx";
  let storagePath: string | null = null;
  let parsed: ParsedShopeeExport | undefined;

  try {
    if (!(entry instanceof File) || entry.size === 0) {
      throw new OperatorImportError("請選擇要上傳的 .xlsx 商品檔案。");
    }

    if (!sourceFilename.toLocaleLowerCase("en").endsWith(".xlsx")) {
      throw new OperatorImportError("檔案格式不符；僅接受 .xlsx 檔案。");
    }

    if (entry.size > MAX_UPLOAD_BYTES) {
      throw new OperatorImportError("檔案超過 10 MB 上限，請縮小檔案後再試。");
    }

    const buffer = Buffer.from(await entry.arrayBuffer());
    parsed = parseShopeeExport(buffer);

    if (parsed.stats.included === 0) {
      throw new OperatorImportError(
        "檔案中沒有可匯入的 DZRZVD／杜戛地商品；現有目錄未變更。",
      );
    }

    storagePath = `${importId}/${storageFilename(sourceFilename)}`;
    const { error: storageError } = await getSupabaseAdminClient()
      .storage
      .from(UPLOAD_BUCKET)
      .upload(storagePath, buffer, {
        cacheControl: "3600",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false,
      });

    if (storageError) {
      throw new OperatorImportError(
        "無法保存原始 Excel 檔案；匯入尚未寫入資料庫。請確認私有儲存空間已建立。",
      );
    }

    await importParsedShopeeCatalog({
      importId,
      userId: authorization.identity.userId,
      filename: sourceFilename,
      storagePath,
      parsed,
    });

    updateTag("shopee-catalog");
    revalidatePath("/products");
    revalidatePath("/products/[categorySlug]", "page");
    revalidatePath("/admin/catalog-upload");
  } catch (error) {
    const errorMessage = operatorMessage(error);
    console.error("Catalog Excel import failed", { importId, error });

    try {
      await recordFailedExcelImport({
        importId,
        userId: authorization.identity.userId,
        filename: sourceFilename,
        storagePath,
        errorMessage,
        parsed,
      });
    } catch (auditError) {
      console.error("Could not persist failed Excel import audit", {
        importId,
        auditError,
      });
    }
  }

  redirect(`/admin/catalog-upload?import=${encodeURIComponent(importId)}`);
}
