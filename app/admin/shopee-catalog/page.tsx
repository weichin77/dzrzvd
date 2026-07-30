import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthorizedShop } from "@/db/repositories/shops";
import { getLatestSyncRun } from "@/db/repositories/sync-runs";
import { requireAdmin } from "@/lib/supabase/require-admin";
import {
  runManualSyncAction,
  saveProductOverrideAction,
  signOutAction,
} from "./actions";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shopee 目錄管理",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{
    authorized?: string;
    sync?: string;
    override?: string;
  }>;
};

function formatDate(value: Date | null): string {
  if (!value) {
    return "尚無資料";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(value);
}

export default async function ShopeeCatalogAdminPage({
  searchParams,
}: PageProps) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    if (authorization.reason === "forbidden") {
      return (
        <main className={styles.page}>
          <section className={styles.denied}>
            <p>此帳號尚未加入 DZRZVD 管理者允許清單。</p>
          </section>
        </main>
      );
    }

    redirect("/admin/login?next=/admin/shopee-catalog");
  }

  const [shop, latestRun, query] = await Promise.all([
    getAuthorizedShop(),
    getLatestSyncRun(),
    searchParams,
  ]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>CATALOG OPERATIONS</p>
          <h1>Shopee 目錄管理</h1>
          <p>查看授權與同步狀態，必要時執行安全的人工同步。</p>
        </div>
        <form action={signOutAction}>
          <button className={styles.secondaryButton} type="submit">登出</button>
        </form>
      </section>

      {query.authorized === "1" ? (
        <p className={styles.notice}>Shopee 商店授權已更新。</p>
      ) : null}
      {query.sync ? (
        <p className={styles.notice}>同步結果：{query.sync}</p>
      ) : null}
      {query.override ? (
        <p className={styles.notice}>商品例外處理結果：{query.override}</p>
      ) : null}

      <section className={styles.grid}>
        <article className={styles.card}>
          <p className={styles.cardLabel}>SHOP CONNECTION</p>
          <h2>{shop?.shopName || "尚未連接 Shopee 商店"}</h2>
          <dl>
            <div><dt>Shop ID</dt><dd>{shop?.shopId.toString() || "—"}</dd></div>
            <div><dt>授權狀態</dt><dd>{shop?.authorizationStatus || "未授權"}</dd></div>
            <div><dt>Token 到期</dt><dd>{formatDate(shop?.tokenExpiresAt ?? null)}</dd></div>
            <div><dt>最近同步</dt><dd>{formatDate(shop?.lastSyncAt ?? null)}</dd></div>
          </dl>
          <Link
            className={styles.primaryButton}
            href="/api/shopee/auth/start"
          >
            {shop ? "重新授權 Shopee" : "連接 Shopee 商店"}
          </Link>
        </article>

        <article className={styles.card}>
          <p className={styles.cardLabel}>LATEST RUN</p>
          <h2>{latestRun?.status || "尚無同步紀錄"}</h2>
          <dl>
            <div><dt>開始時間</dt><dd>{formatDate(latestRun?.startedAt ?? null)}</dd></div>
            <div><dt>觸發方式</dt><dd>{latestRun?.trigger || "—"}</dd></div>
            <div><dt>發現商品</dt><dd>{latestRun?.discoveredCount ?? 0}</dd></div>
            <div><dt>公開商品</dt><dd>{latestRun?.includedCount ?? 0}</dd></div>
            <div><dt>安全錯誤</dt><dd>{latestRun?.safeErrorSummary || "無"}</dd></div>
          </dl>
        </article>
      </section>

      <section className={styles.actions}>
        <div>
          <p className={styles.cardLabel}>MANUAL ACTIONS</p>
          <h2>人工同步</h2>
          <p>先執行預覽，確認商品數量合理後再寫入正式目錄。</p>
        </div>
        <div className={styles.actionButtons}>
          <form action={runManualSyncAction}>
            <input name="mode" type="hidden" value="dry_run" />
            <button className={styles.secondaryButton} type="submit">
              執行同步預覽
            </button>
          </form>
          <form action={runManualSyncAction}>
            <input name="mode" type="hidden" value="full" />
            <button
              className={styles.primaryButton}
              disabled={!shop}
              type="submit"
            >
              執行完整同步
            </button>
          </form>
        </div>
      </section>

      <section className={styles.overridePanel}>
        <div>
          <p className={styles.cardLabel}>PRODUCT OVERRIDE</p>
          <h2>商品分類例外</h2>
          <p>
            例外只能調整名稱比對結果；無庫存或非正常狀態商品仍不會公開。
          </p>
        </div>
        <form action={saveProductOverrideAction} className={styles.overrideForm}>
          <label>
            <span>Shopee Item ID</span>
            <input inputMode="numeric" name="itemId" required />
          </label>
          <label>
            <span>處理方式</span>
            <select defaultValue="exclude" name="decision">
              <option value="exclude">強制排除</option>
              <option value="include">強制納入名稱比對</option>
              <option value="clear">清除既有例外</option>
            </select>
          </label>
          <label className={styles.reasonField}>
            <span>原因（清除例外時可留空）</span>
            <input name="reason" placeholder="至少 3 個字元" />
          </label>
          <button className={styles.primaryButton} type="submit">
            儲存商品例外
          </button>
        </form>
      </section>
    </main>
  );
}
