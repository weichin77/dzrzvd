import styles from "./catalog.module.css";

export default function ProductsLoading() {
  return (
    <main className={styles.page}>
      <section className={styles.catalogHero}>
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>DZRZVD COLLECTION</p>
          <h1>正在整理商品目錄…</h1>
        </div>
      </section>
    </main>
  );
}
