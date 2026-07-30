import Link from "next/link";

import type { CatalogCategory } from "@/lib/catalog/types";
import styles from "@/app/products/catalog.module.css";

export default function CategoryNavigation({
  categories,
  activeSlug,
}: {
  categories: CatalogCategory[];
  activeSlug?: string;
}) {
  if (!categories.length) {
    return null;
  }

  return (
    <nav aria-label="商品分類" className={styles.categoryNavigation}>
      <Link
        aria-current={activeSlug ? undefined : "page"}
        className={!activeSlug ? styles.activeCategory : undefined}
        href="/products"
      >
        全部
      </Link>
      {categories.map((category) => (
        <Link
          aria-current={activeSlug === category.slug ? "page" : undefined}
          className={
            activeSlug === category.slug ? styles.activeCategory : undefined
          }
          href={`/products/${category.slug}`}
          key={category.categoryId}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
