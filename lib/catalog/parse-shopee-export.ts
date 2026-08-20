import { read, utils, type WorkSheet } from "@e965/xlsx";

import { classifyDzrzvdTitle } from "./classifier.ts";

const EXPECTED_HEADERS = ["商品ID", "商品名稱", "主商品圖片", "商品分類"] as const;
const MAX_WORKSHEET_ROWS = 20_000;
const ALLOWED_IMAGE_HOSTS = new Set([
  "down-tw.img.susercontent.com",
  "cf.shopee.tw",
]);

const CATEGORY_TRANSLATIONS: Readonly<Record<string, string>> = {
  "automotive": "汽機車零件百貨",
  "baby & kids fashion": "嬰幼童與童裝",
  "bags & accessories": "包包精品",
  "camping & hiking": "露營與登山",
  "coats, jackets & vests": "外套、夾克與背心",
  "computers & accessories": "電腦及周邊",
  "fashion accessories": "時尚配件",
  "food & beverages": "美食與飲品",
  "health & beauty": "美妝保健",
  "hobbies & books": "興趣與書籍",
  "home & living": "居家生活",
  "home appliances": "家電",
  "hoodies & sweatshirts": "帽T與大學T",
  "jackets": "夾克",
  "men clothes": "男裝",
  "men shoes": "男鞋",
  "mobiles & gadgets": "手機平板與周邊",
  "outdoor recreation": "戶外休閒",
  "pants": "長褲",
  "pets": "寵物",
  "shirts": "襯衫",
  "shorts": "短褲",
  "sports & outdoor apparels": "運動與戶外服飾",
  "sports & outdoors": "運動與戶外",
  "sportswear": "運動服飾",
  "sweaters & cardigans": "毛衣與針織外套",
  "t-shirts": "T恤",
  "tickets & vouchers": "票券",
  "tops": "上衣",
  "video games": "電玩遊戲",
  "women clothes": "女裝",
  "women shoes": "女鞋",
};

export type ParsedShopeeProduct = {
  itemId: string;
  name: string;
  imageUrl: string;
  categoryId: string;
};

export type ParsedShopeeCategory = {
  categoryId: string;
  name: string;
  originalName: string;
  breadcrumb: string[];
  products: ParsedShopeeProduct[];
};

export type ShopeeExportStats = {
  totalRows: number;
  included: number;
  excludedNotDzrzvd: number;
  excludedMissingField: number;
  duplicates: number;
};

export type ParsedShopeeExport = {
  categories: ParsedShopeeCategory[];
  stats: ShopeeExportStats;
  missingTranslations: string[];
};

export class ShopeeExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopeeExportValidationError";
  }
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    const candidate = value as {
      text?: unknown;
      result?: unknown;
      richText?: Array<{ text?: unknown }>;
    };

    if (typeof candidate.text === "string") {
      return candidate.text.normalize("NFKC").trim();
    }

    if (candidate.result !== undefined) {
      return cellText(candidate.result);
    }

    if (Array.isArray(candidate.richText)) {
      return candidate.richText.map((part) => cellText(part.text)).join("").trim();
    }
  }

  return String(value).normalize("NFKC").trim();
}

function normalizedHeader(value: unknown): string {
  return cellText(value).replace(/^\uFEFF/, "").replace(/\s+/g, "");
}

function workbookRows(sheet: WorkSheet): unknown[][] {
  return utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    // Shopee IDs are numeric cells. Reading formatted display values can turn
    // them into rounded scientific notation and destroy the original ID.
    raw: true,
    defval: "",
    blankrows: false,
  });
}

function findHeaderRow(rows: unknown[][]): {
  rowIndex: number;
  columns: Record<(typeof EXPECTED_HEADERS)[number], number>;
} {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 10); rowIndex += 1) {
    const headers = rows[rowIndex].map(normalizedHeader);
    const columns = Object.fromEntries(
      EXPECTED_HEADERS.map((header) => [header, headers.indexOf(header)]),
    ) as Record<(typeof EXPECTED_HEADERS)[number], number>;

    if (EXPECTED_HEADERS.every((header) => columns[header] >= 0)) {
      return { rowIndex, columns };
    }
  }

  throw new ShopeeExportValidationError(
    `找不到必要欄位：${EXPECTED_HEADERS.join("、")}。請上傳蝦皮「大量更新媒體資訊」匯出檔。`,
  );
}

function parsePositiveId(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0
      ? BigInt(value).toString()
      : null;
  }

  const normalized = cellText(value).replace(/,/g, "");

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  try {
    const id = BigInt(normalized);
    return id > BigInt(0) ? id.toString() : null;
  } catch {
    return null;
  }
}

function parseImageUrl(value: unknown): string | null {
  const text = cellText(value);
  const candidate = text.match(/https:\/\/[^\s,;"']+/i)?.[0] ?? text;

  try {
    const url = new URL(candidate);
    const allowedHost = ALLOWED_IMAGE_HOSTS.has(url.hostname) ||
      url.hostname.endsWith(".img.susercontent.com") ||
      url.hostname.endsWith(".shopee.tw");
    return url.protocol === "https:" && allowedHost
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function translateSegment(segment: string): { value: string; missing: boolean } {
  const normalized = segment.normalize("NFKC").replace(/\s+/g, " ").trim();
  const translation = CATEGORY_TRANSLATIONS[normalized.toLocaleLowerCase("en")];
  return translation
    ? { value: translation, missing: false }
    : { value: normalized, missing: true };
}

function parseCategory(value: unknown): {
  categoryId: string;
  originalName: string;
  breadcrumb: string[];
  displayName: string;
  missingTranslations: string[];
} | null {
  const raw = cellText(value);
  const prefixed = raw.match(/^(\d+)\s*-\s*(.+)$/);
  const numericOnly = raw.match(/^\d+$/);
  const parenthesized = raw.match(/^(.+?)\s*\((\d+)\)\s*$/);

  if (!prefixed && !numericOnly && !parenthesized) {
    return null;
  }

  const categoryId = parsePositiveId(
    prefixed?.[1] ?? numericOnly?.[0] ?? parenthesized?.[2],
  );
  const path = prefixed?.[2] ?? parenthesized?.[1] ?? "";
  const segments = path
    .split(/\s*(?:\/|／|>|＞)\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (!categoryId) {
    return null;
  }

  if (!segments.length) {
    const fallback = `分類 ${categoryId}`;
    return {
      categoryId,
      originalName: fallback,
      breadcrumb: [fallback],
      displayName: fallback,
      missingTranslations: [],
    };
  }

  const translated = segments.map(translateSegment);

  return {
    categoryId,
    originalName: segments.at(-1)!,
    breadcrumb: translated.map((segment) => segment.value),
    displayName: translated.map((segment) => segment.value).join("／"),
    missingTranslations: segments.filter((_, index) => translated[index].missing),
  };
}

export function parseShopeeExport(
  buffer: ArrayBuffer | Buffer,
): ParsedShopeeExport {
  let workbook;

  try {
    workbook = read(buffer, {
      type: Buffer.isBuffer(buffer) ? "buffer" : "array",
      dense: true,
      sheetRows: MAX_WORKSHEET_ROWS + 12,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
    });
  } catch {
    throw new ShopeeExportValidationError(
      "無法讀取 Excel 活頁簿。請確認檔案未損毀，且格式為 .xlsx。",
    );
  }

  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

  if (!firstSheet) {
    throw new ShopeeExportValidationError("Excel 活頁簿中沒有可讀取的工作表。");
  }

  const rows = workbookRows(firstSheet);
  const { rowIndex: headerRowIndex, columns } = findHeaderRow(rows);
  const dataRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((value) => cellText(value) !== ""));

  if (dataRows.length > MAX_WORKSHEET_ROWS) {
    throw new ShopeeExportValidationError(
      `工作表超過 ${MAX_WORKSHEET_ROWS.toLocaleString("en-US")} 筆資料上限。`,
    );
  }

  const stats: ShopeeExportStats = {
    totalRows: dataRows.length,
    included: 0,
    excludedNotDzrzvd: 0,
    excludedMissingField: 0,
    duplicates: 0,
  };
  const products = new Map<string, ParsedShopeeProduct>();
  const categoryDetails = new Map<
    string,
    Omit<ParsedShopeeCategory, "products">
  >();
  const missingTranslations = new Set<string>();

  for (const row of dataRows) {
    const itemId = parsePositiveId(row[columns["商品ID"]]);
    const name = cellText(row[columns["商品名稱"]]);
    const imageUrl = parseImageUrl(row[columns["主商品圖片"]]);
    const category = parseCategory(row[columns["商品分類"]]);

    if (!itemId || !name || !imageUrl || !category) {
      stats.excludedMissingField += 1;
      continue;
    }

    if (!classifyDzrzvdTitle(name).included) {
      stats.excludedNotDzrzvd += 1;
      continue;
    }

    if (products.has(itemId)) {
      stats.duplicates += 1;
    }

    products.set(itemId, {
      itemId,
      name,
      imageUrl,
      categoryId: category.categoryId,
    });
    categoryDetails.set(category.categoryId, {
      categoryId: category.categoryId,
      name: category.displayName,
      originalName: category.originalName,
      breadcrumb: category.breadcrumb,
    });

    for (const segment of category.missingTranslations) {
      missingTranslations.add(segment);
    }
  }

  stats.included = products.size;
  const productsByCategory = new Map<string, ParsedShopeeProduct[]>();

  for (const product of products.values()) {
    const current = productsByCategory.get(product.categoryId) ?? [];
    current.push(product);
    productsByCategory.set(product.categoryId, current);
  }

  const categories = Array.from(productsByCategory, ([categoryId, items]) => {
    const details = categoryDetails.get(categoryId)!;
    return {
      ...details,
      products: items.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));

  return {
    categories,
    stats,
    missingTranslations: Array.from(missingTranslations).sort((a, b) =>
      a.localeCompare(b, "en")),
  };
}
