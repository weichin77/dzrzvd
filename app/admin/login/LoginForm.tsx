"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./login.module.css";

function safeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/admin/shopee-catalog";
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase 尚未設定，請先完成環境變數配置。");
      setPending(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("登入失敗，請確認帳號已受邀且密碼正確。");
      setPending(false);
      return;
    }

    router.replace(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label>
        <span>管理者電子郵件</span>
        <input
          autoComplete="email"
          inputMode="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label>
        <span>密碼</span>
        <input
          autoComplete="current-password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button disabled={pending} type="submit">
        {pending ? "登入中…" : "登入管理介面"}
      </button>
    </form>
  );
}
