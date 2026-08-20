import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getExcelImport,
  getRecentExcelImports,
  type ExcelImportRecord,
} from "@/db/repositories/excel-imports";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { signOutAction } from "../shopee-catalog/actions";
import UploadForm from "./UploadForm";
import styles from "./upload.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "上傳商品目錄",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ import?: string }>;
};

function isUuid(value: string | undefined): value is string {
  return Boolean(value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(value);
}

function ImportSummary({ record }: { record: ExcelImportRecord }) {
  const succeeded = record.status === "succeeded";

  return (
    <section
      className={succeeded ? styles.successSummary : styles.failureSummary}
      aria-live="polite"
    >
      <p className={styles.cardLabel}>IMPORT RESULT</p>
      <h2>{succeeded ? "商品目錄已更新" : "匯入未完成"}</h2>
      {succeeded ? (
        <>
          <dl className={styles.summaryGrid}>
            <div><dt>Excel 資料列</dt><dd>{record.rowCount}</dd></div>
            <div><dt>納入商品</dt><dd>{record.includedCount}</dd></div>
            <div><dt>排除商品</dt><dd>{record.excludedCount}</dd></div>
            <div><dt>商品分類</dt><dd>{record.categoryCount}</dd></div>
          </dl>
          {record.missingTranslationSegments.length ? (
            <div className={styles.warning}>
              <strong>尚未翻譯的分類片段</strong>
              <p>{record.missingTranslationSegments.join("、")}</p>
            </div>
          ) : null}
          <Link className={styles.textLink} href="/products">
            查看公開商品目錄 ↗
          </Link>
        </>
      ) : (
        <p className={styles.errorMessage}>{record.errorMessage}</p>
      )}
    </section>
  );
}

export default async function CatalogUploadPage({ searchParams }: PageProps) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    if (authorization.reason === "forbidden") {
      return (
        <main className={styles.page}>
          <section className={styles.denied}>
            <h1>無法使用目錄上傳</h1>
            <p>此帳號未啟用管理者權限，請聯絡系統管理員。</p>
          </section>
        </main>
      );
    }

    redirect("/admin/login?next=/admin/catalog-upload");
  }

  const query = await searchParams;
  const [selectedImport, recentImports] = await Promise.all([
    isUuid(query.import) ? getExcelImport(query.import) : Promise.resolve(null),
    getRecentExcelImports(),
  ]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>CATALOG OPERATIONS</p>
          <h1>上傳商品目錄</h1>
          <p>上傳完整 Excel 匯出檔後，公開商品頁會立即讀取最新資料。</p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.secondaryButton} href="/admin/shopee-catalog">
            同步管理
          </Link>
          <form action={signOutAction}>
            <button className={styles.secondaryButton} type="submit">登出</button>
          </form>
        </div>
      </section>

      {selectedImport ? <ImportSummary record={selectedImport} /> : null}

      <section className={styles.panel}>
        <div>
          <p className={styles.cardLabel}>NEW IMPORT</p>
          <h2>更新完整商品清單</h2>
          <p className={styles.panelCopy}>
            系統會先檢查欄位、篩選 DZRZVD 商品並完成分類翻譯，再以單一交易更新目錄。
          </p>
        </div>
        <UploadForm />
      </section>

      <section className={styles.history}>
        <p className={styles.cardLabel}>RECENT IMPORTS</p>
        <h2>最近匯入紀錄</h2>
        {recentImports.length ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>時間</th>
                  <th>檔名</th>
                  <th>狀態</th>
                  <th>納入</th>
                  <th>分類</th>
                </tr>
              </thead>
              <tbody>
                {recentImports.map((record) => (
                  <tr key={record.id}>
                    <td><Link href={`/admin/catalog-upload?import=${record.id}`}>{formatDate(record.createdAt)}</Link></td>
                    <td>{record.sourceFilename}</td>
                    <td>{record.status === "succeeded" ? "成功" : "失敗"}</td>
                    <td>{record.includedCount}</td>
                    <td>{record.categoryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>尚無 Excel 匯入紀錄。</p>
        )}
      </section>
    </main>
  );
}
