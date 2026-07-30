import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyDzrzvdTitle,
  normalizeProductTitle,
} from "../lib/catalog/classifier.ts";
import {
  buildShopeeSignatureBase,
  createShopeeSignature,
} from "../lib/shopee/signing.ts";

test("classifies only the two confirmed DZRZVD title tokens", () => {
  assert.equal(classifyDzrzvdTitle("DZRZVD 防風外套").included, true);
  assert.equal(classifyDzrzvdTitle("dzrzvd 機能長褲").included, true);
  assert.equal(classifyDzrzvdTitle("杜戛地 女款防曬衣").included, true);
  assert.equal(classifyDzrzvdTitle("KUSPORT 一般商品").included, false);
});

test("normalizes Unicode width and whitespace before matching", () => {
  assert.equal(normalizeProductTitle("  ＤＺＲＺＶＤ   外套  "), "DZRZVD 外套");
  assert.equal(classifyDzrzvdTitle("  ＤＺＲＺＶＤ   外套  ").included, true);
});

test("manual classification overrides remain deterministic", () => {
  assert.deepEqual(
    classifyDzrzvdTitle("Unrelated title", "include").method,
    "manual_include",
  );
  assert.deepEqual(
    classifyDzrzvdTitle("DZRZVD 防風外套", "exclude").method,
    "manual_exclude",
  );
});

test("builds the Shopee Shop API signature base in the required order", () => {
  const input = {
    partnerId: 1000,
    path: "/api/v2/product/get_item_list",
    timestamp: 1700000000,
    accessToken: "token",
    shopId: BigInt(123456789),
  };

  assert.equal(
    buildShopeeSignatureBase(input),
    "1000/api/v2/product/get_item_list1700000000token123456789",
  );
  assert.equal(
    createShopeeSignature("test-key", input),
    "5a172ec8d664bc71ca822be5d4277922b3d9c0f3b74fd763ecebee03cd8365fe",
  );
});
