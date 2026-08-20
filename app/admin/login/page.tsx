import type { Metadata } from "next";
import { Suspense } from "react";

import LoginForm from "./LoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "目錄管理登入",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>OPERATOR ACCESS</p>
        <h1>目錄管理登入</h1>
        <p className={styles.intro}>
          gold-tank.com Google Workspace 成員可直接登入；受邀帳號亦可使用密碼作為備援。
        </p>
        <Suspense fallback={<p>載入登入介面…</p>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
