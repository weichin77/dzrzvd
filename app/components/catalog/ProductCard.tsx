"use client";

import Image from "next/image";
import { useState } from "react";

import type { CatalogProduct } from "@/lib/catalog/types";
import styles from "@/app/products/catalog.module.css";

export default function ProductCard({
  product,
}: {
  product: CatalogProduct;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = product.imageUrl && !imageFailed;

  return (
    <a
      aria-label={`${product.name}，在新分頁開啟 Shopee 商品頁`}
      className={styles.productCard}
      href={product.shopeeUrl}
      rel="noreferrer noopener"
      target="_blank"
      title={product.name}
    >
      <span className={styles.imageFrame}>
        {showImage ? (
          <Image
            alt={product.name}
            className={styles.productImage}
            fill
            onError={() => setImageFailed(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 960px) 33vw, 25vw"
            src={product.imageUrl!}
          />
        ) : (
          <span aria-hidden="true" className={styles.placeholder}>
            <span>DZRZVD</span>
          </span>
        )}
      </span>
      <span className={styles.productTitle}>{product.name}</span>
    </a>
  );
}
