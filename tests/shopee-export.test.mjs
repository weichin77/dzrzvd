import assert from "node:assert/strict";
import test from "node:test";

import { utils, write } from "@e965/xlsx";

import {
  parseShopeeExport,
  ShopeeExportValidationError,
} from "../lib/catalog/parse-shopee-export.ts";
import { translateCategoryPath } from "../lib/catalog/category-translations.ts";

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
  assert.deepEqual(result.missingTranslations, []);

  const men = result.categories.find((category) => category.categoryId === "101");
  assert.equal(men?.name, "男裝／上衣／夾克");
  assert.equal(men?.products[0].name, "DZRZVD 防風外套 新版");

  const trail = result.categories.find((category) => category.categoryId === "103");
  assert.equal(trail?.name, "運動與戶外／戶外休閒／登山服飾");
});

test("translates every category segment currently used by the Taiwan catalog", () => {
  const result = parseShopeeExport(workbookBuffer([
    ["商品ID", "商品名稱", "主商品圖片", "商品分類"],
    ["2001", "DZRZVD 後背包", "https://down-tw.img.susercontent.com/file/a", "100564 - Men Bags/Backpacks"],
    ["2002", "DZRZVD 冬季背心", "https://down-tw.img.susercontent.com/file/b", "100371 - Women Clothes/Jackets, Coats & Vests/Vests"],
    ["2003", "DZRZVD 冬季外套", "https://down-tw.img.susercontent.com/file/c", "100367 - Women Clothes/Jackets, Coats & Vests/Winter Jackets & Coats"],
    ["2004", "DZRZVD 攀岩裝備", "https://down-tw.img.susercontent.com/file/d", "101274 - Sports & Outdoors/Sports & Outdoor Recreation Equipments/Rock Climbing"],
    ["2005", "DZRZVD 運動長褲", "https://down-tw.img.susercontent.com/file/e", "101313 - Sports & Outdoors/Sports & Outdoor Apparels/Bottoms"],
    ["2006", "DZRZVD 運動套裝", "https://down-tw.img.susercontent.com/file/f", "101309 - Sports & Outdoors/Sports & Outdoor Apparels/Sets"],
  ]));

  assert.deepEqual(result.missingTranslations, []);
  assert.deepEqual(
    result.categories.map((category) => category.name),
    [
      "女裝／夾克、外套與背心／冬季夾克與外套",
      "女裝／夾克、外套與背心／背心",
      "男包／後背包",
      "運動與戶外／運動與戶外休閒用品／攀岩",
      "運動與戶外／運動與戶外服飾／下身服飾",
      "運動與戶外／運動與戶外服飾／套裝",
    ],
  );
});

test("translates existing mixed-language catalog labels at display time", () => {
  assert.deepEqual(
    [
      "Men Bags／Backpacks",
      "女裝／Jackets, Coats & Vests／Others",
      "女裝／Jackets, Coats & Vests／Vests",
      "男裝／Jackets, Coats & Vests／Winter Jackets & Coats",
      "運動與戶外／Sports & Outdoor Recreation Equipments／Rock Climbing",
      "運動與戶外／運動與戶外服飾／Bottoms",
      "運動與戶外／運動與戶外服飾／Sets",
    ].map(translateCategoryPath),
    [
      "男包／後背包",
      "女裝／夾克、外套與背心／其他",
      "女裝／夾克、外套與背心／背心",
      "男裝／夾克、外套與背心／冬季夾克與外套",
      "運動與戶外／運動與戶外休閒用品／攀岩",
      "運動與戶外／運動與戶外服飾／下身服飾",
      "運動與戶外／運動與戶外服飾／套裝",
    ],
  );
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

test("accepts current Shopee CDN URLs and skips export instruction rows", () => {
  const result = parseShopeeExport(workbookBuffer([
    ["et_title_product_id", "et_title_product_name", "ps_item_cover_image", "et_title_product_category"],
    ["media_info", "0", '{"search_condition":{}}', ""],
    ["商品ID", "商品名稱", "主商品圖片", "商品分類"],
    ["164", "164", "必填", "164"],
    ["164", "164", "請輸入圖片的 URL", "164"],
    [
      "23411317645",
      "【零碼出清】DZRZVD杜戛地女款兩件式外套",
      "https://s-cf-tw.shopeesz.com/file/tw-11134207-example",
      "100367 - Women Clothes/Jackets, Coats & Vests/Winter Jackets & Coats",
    ],
  ]));

  assert.equal(result.stats.totalRows, 3);
  assert.equal(result.stats.included, 1);
  assert.equal(result.stats.excludedMissingField, 2);
  assert.equal(result.categories[0].products[0].itemId, "23411317645");
});
