"use client";

import styles from "./catalog.module.css";

export default function ProductsError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main className={styles.page}>
      <section className={styles.catalogHero}>
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>CATALOG STATUS</p>
          <h1>商品目錄暫時無法讀取</h1>
          <button className={styles.retryButton} onClick={reset} type="button">
            再試一次
          </button>
        </div>
      </section>
    </main>
  );
}
