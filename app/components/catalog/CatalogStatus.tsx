import Link from "next/link";

import type { CatalogOverviewStatus } from "@/lib/catalog/types";
import styles from "@/app/products/catalog.module.css";

const content: Record<
  Exclude<CatalogOverviewStatus, "ready">,
  { eyebrow: string; title: string; body: string }
> = {
  unconfigured: {
    eyebrow: "CATALOG SETUP",
    title: "商品目錄正在建置中",
    body: "我們正在連接 DZRZVD 的官方 Shopee 商品資料。完成設定後，這裡會依商品分類每日更新。",
  },
  empty: {
    eyebrow: "CURRENT COLLECTION",
    title: "目前沒有可公開的商品",
    body: "目錄只顯示名稱含 DZRZVD 或杜戛地、狀態正常且確認有庫存的商品。",
  },
  error: {
    eyebrow: "CATALOG STATUS",
    title: "商品目錄暫時無法讀取",
    body: "我們已保留既有資料，管理者可從受保護的操作介面確認同步狀態。",
  },
};

export default function CatalogStatus({
  status,
  showBackLink = false,
}: {
  status: Exclude<CatalogOverviewStatus, "ready">;
  showBackLink?: boolean;
}) {
  const message = content[status];

  return (
    <section className={styles.statusPanel}>
      <p className={styles.sectionEyebrow}>{message.eyebrow}</p>
      <h2>{message.title}</h2>
      <p>{message.body}</p>
      {showBackLink ? (
        <Link className={styles.categoryLink} href="/products">
          返回全部分類
        </Link>
      ) : null}
    </section>
  );
}
