const CATEGORY_TRANSLATIONS: Readonly<Record<string, string>> = {
  automotive: "汽機車零件百貨",
  "baby & kids fashion": "嬰幼童與童裝",
  "bags & accessories": "包包精品",
  backpacks: "後背包",
  bottoms: "下身服飾",
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
  jackets: "夾克",
  "jackets, coats & vests": "夾克、外套與背心",
  "men bags": "男包",
  "men clothes": "男裝",
  "men shoes": "男鞋",
  "mobiles & gadgets": "手機平板與周邊",
  others: "其他",
  "outdoor recreation": "戶外休閒",
  pants: "長褲",
  pets: "寵物",
  "rock climbing": "攀岩",
  sets: "套裝",
  shirts: "襯衫",
  shorts: "短褲",
  "sports & outdoor apparels": "運動與戶外服飾",
  "sports & outdoor recreation equipments": "運動與戶外休閒用品",
  "sports & outdoors": "運動與戶外",
  sportswear: "運動服飾",
  "sweaters & cardigans": "毛衣與針織外套",
  "t-shirts": "T恤",
  "tickets & vouchers": "票券",
  tops: "上衣",
  "trail clothing": "登山服飾",
  vests: "背心",
  "video games": "電玩遊戲",
  "winter jackets & coats": "冬季夾克與外套",
  "women clothes": "女裝",
  "women shoes": "女鞋",
};

function normalizeCategorySegment(segment: string): string {
  return segment.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function translateCategorySegment(segment: string): string | null {
  const normalized = normalizeCategorySegment(segment);
  return CATEGORY_TRANSLATIONS[normalized.toLocaleLowerCase("en")] ?? null;
}

export function translateCategoryPath(path: string): string {
  return path
    .split(/\s*(?:\/|／|>|＞)\s*/)
    .map((segment) => {
      const normalized = normalizeCategorySegment(segment);
      return translateCategorySegment(normalized) ?? normalized;
    })
    .filter(Boolean)
    .join("／");
}
