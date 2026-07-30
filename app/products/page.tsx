import type { Metadata } from "next";

import CatalogStatus from "@/app/components/catalog/CatalogStatus";
import CategoryNavigation from "@/app/components/catalog/CategoryNavigation";
import CategorySection from "@/app/components/catalog/CategorySection";
import { getCatalogOverview } from "@/db/repositories/catalog";
import styles from "./catalog.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "商品目錄",
  description:
    "依 Shopee 商品分類探索目前在售的 DZRZVD 杜戛地戶外機能服飾，並前往官方 kuSport Shopee 商店選購。",
};

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return "等待首次同步";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value));
}

export default async function ProductsPage() {
  const overview = await getCatalogOverview();

  return (
    <main className={styles.page}>
      <section className={styles.catalogHero}>
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>DZRZVD COLLECTION · SHOPEE</p>
          <h1>依機能分類，<br />找到自在裝備。</h1>
          <div className={styles.heroMeta}>
            <p>
              只收錄目前在 Shopee 正常販售且確認有庫存的 DZRZVD 商品。
              選定款式後，將前往 kuSport Shopee 商店完成購買。
            </p>
            <span>更新時間：{formatUpdatedAt(overview.lastUpdatedAt)}</span>
          </div>
        </div>
      </section>

      <div className={styles.catalogBody}>
        <CategoryNavigation categories={overview.categories} />

        {overview.status === "ready" ? (
          <div className={styles.sections}>
            {overview.categories.map((category) => (
              <CategorySection category={category} key={category.categoryId} />
            ))}
          </div>
        ) : (
          <CatalogStatus status={overview.status} />
        )}
      </div>
    </main>
  );
}
