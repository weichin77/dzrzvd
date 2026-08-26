import Link from "next/link";

import type { CatalogCategory } from "@/lib/catalog/types";
import ProductCard from "./ProductCard";
import styles from "@/app/products/catalog.module.css";

export default function CategorySection({
  category,
  headingLevel = 2,
  showCategoryLink = true,
}: {
  category: CatalogCategory;
  headingLevel?: 1 | 2;
  showCategoryLink?: boolean;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";

  return (
    <section
      aria-labelledby={`category-${category.categoryId}`}
      className={styles.categorySection}
    >
      <header className={styles.sectionHeader}>
        <div>
          <p className={styles.sectionEyebrow}>SHOPEE 商品分類</p>
          <Heading id={`category-${category.categoryId}`}>
            {category.name}
          </Heading>
          {category.description ? <p>{category.description}</p> : null}
        </div>
        {showCategoryLink ? (
          <Link className={styles.categoryLink} href={`/products/${category.slug}`}>
            查看分類 <span aria-hidden="true">↗</span>
          </Link>
        ) : null}
      </header>
      <div className={styles.productGrid}>
        {category.products.map((product) => (
          <ProductCard key={product.itemId} product={product} />
        ))}
      </div>
    </section>
  );
}
