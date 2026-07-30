import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CatalogStatus from "@/app/components/catalog/CatalogStatus";
import CategoryNavigation from "@/app/components/catalog/CategoryNavigation";
import CategorySection from "@/app/components/catalog/CategorySection";
import { getCatalogCategory } from "@/db/repositories/catalog";
import styles from "../catalog.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ categorySlug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const { category } = await getCatalogCategory(categorySlug);

  if (!category) {
    return { title: "商品分類" };
  }

  return {
    title: category.name,
    description:
      category.description ||
      `探索目前在售的 DZRZVD ${category.name}商品，並前往官方 Shopee 商店選購。`,
  };
}

export default async function ProductCategoryPage({ params }: PageProps) {
  const { categorySlug } = await params;
  const { overview, category } = await getCatalogCategory(categorySlug);

  if (!category && overview.status === "ready") {
    notFound();
  }

  return (
    <main className={styles.page}>
      <section className={styles.categoryHero}>
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>DZRZVD COLLECTION · CATEGORY</p>
          <h1>{category?.name || "商品分類"}</h1>
          <p>
            僅顯示目前在 Shopee 正常販售且確認有庫存的 DZRZVD 商品。
          </p>
        </div>
      </section>
      <div className={styles.catalogBody}>
        <CategoryNavigation
          activeSlug={categorySlug}
          categories={overview.categories}
        />
        {category ? (
          <CategorySection
            category={category}
            headingLevel={1}
            showCategoryLink={false}
          />
        ) : (
          <CatalogStatus
            status={overview.status === "ready" ? "error" : overview.status}
            showBackLink
          />
        )}
      </div>
    </main>
  );
}
