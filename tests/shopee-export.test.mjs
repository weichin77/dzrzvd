import assert from "node:assert/strict";
import test from "node:test";

import { utils, write } from "@e965/xlsx";

import {
  parseShopeeExport,
  ShopeeExportValidationError,
} from "../lib/catalog/parse-shopee-export.ts";

function workbookBuffer(rows) {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), "商品");
  return write(workbook, { bookType: "xlsx", type: "buffer" });
}

test("parses, classifies, translates, and de-duplicates Shopee export rows", () => {
  const result = parseShopeeExport(workbookBuffer([
    ["商品ID", "商品名稱", "主商品圖片", "商品分類"],
    ["1001", "DZRZVD 防風外套", "https://down-tw.img.susercontent.com/file/a", "101 - Men Clothes/Tops/Jackets"],
    ["1002", "其他品牌上衣", "https://down-tw.img.susercontent.com/file/b", "102 - Men Clothes/Tops/T-shirts"],
    ["1003", "杜戛地 登山褲", "https://down-tw.img.susercontent.com/file/c", "103 - Sports & Outdoors/Outdoor Recreation/Trail Clothing"],
    ["1001", "DZRZVD 防風外套 新版", "https://down-tw.img.susercontent.com/file/d", "101 - Men Clothes/Tops/Jackets"],
    ["", "DZRZVD 缺少編號", "https://down-tw.img.susercontent.com/file/e", "101 - Men Clothes/Tops/Jackets"],
  ]));

  assert.deepEqual(result.stats, {
    totalRows: 5,
    included: 2,
    excludedNotDzrzvd: 1,
    excludedMissingField: 1,
    duplicates: 1,
  });
  assert.equal(result.categories.length, 2);
  assert.deepEqual(result.missingTranslations, ["Trail Clothing"]);

  const men = result.categories.find((category) => category.categoryId === "101");
  assert.equal(men?.name, "男裝／上衣／夾克");
  assert.equal(men?.products[0].name, "DZRZVD 防風外套 新版");
});

test("requires all four expected Chinese headers", () => {
  assert.throws(
    () => parseShopeeExport(workbookBuffer([
      ["商品ID", "商品名稱", "商品分類"],
      ["1001", "DZRZVD 外套", "101 - Men Clothes/Tops/Jackets"],
    ])),
    (error) =>
      error instanceof ShopeeExportValidationError &&
      error.message.includes("主商品圖片"),
  );
});

test("rejects data URLs and malformed category values before inclusion", () => {
  const result = parseShopeeExport(workbookBuffer([
    ["商品ID", "商品名稱", "主商品圖片", "商品分類"],
    ["1001", "DZRZVD 外套", "data:image/png;base64,abc", "invalid"],
  ]));

  assert.equal(result.stats.included, 0);
  assert.equal(result.stats.excludedMissingField, 1);
});

test("preserves numeric Shopee IDs and accepts numeric-only category IDs", () => {
  const result = parseShopeeExport(workbookBuffer([
    ["商品ID", "商品名稱", "主商品圖片", "商品分類"],
    [28482675953, "DZRZVD杜戛地防曬外套", "https://down-bs-sg.img.susercontent.com/file/a", 100017],
  ]));

  assert.equal(result.stats.included, 1);
  assert.equal(result.categories[0].categoryId, "100017");
  assert.equal(result.categories[0].name, "分類 100017");
  assert.equal(result.categories[0].products[0].itemId, "28482675953");
});
