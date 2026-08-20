"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./login.module.css";

function safeNextPath(value: string | null): string {
  return value?.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\")
    ? value
    : "/admin/catalog-upload";
}

const CALLBACK_ERRORS: Record<string, string> = {
  auth_unavailable: "Supabase 登入服務尚未完成設定。",
  callback_failed: "Google 登入驗證失敗，請重新嘗試。",
  domain_forbidden: "請使用已驗證的 gold-tank.com Google Workspace 帳號登入。",
  provision_failed: "無法建立管理者權限，請聯絡系統管理員。",
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"password" | "google" | null>(null);

  const callbackError = CALLBACK_ERRORS[searchParams.get("error") ?? ""];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("password");
    setError(null);

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase 尚未設定，請先完成環境變數配置。");
      setPending(null);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("登入失敗，請確認帳號已受邀且密碼正確。");
      setPending(null);
      return;
    }

    router.replace(safeNextPath(searchParams.get("next")));
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setPending("google");
    setError(null);

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase 尚未設定，請先完成環境變數配置。");
      setPending(null);
      return;
    }

    const nextPath = safeNextPath(searchParams.get("next"));
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", nextPath);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: { hd: "gold-tank.com" },
      },
    });

    if (signInError) {
      setError("無法啟動 Google 登入，請稍後再試。");
      setPending(null);
    }
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
      {error || callbackError ? (
        <p className={styles.error} role="alert">{error || callbackError}</p>
      ) : null}
      <button disabled={pending !== null} type="submit">
        {pending === "password" ? "登入中…" : "使用密碼登入"}
      </button>
      <div className={styles.divider}><span>或</span></div>
      <button
        className={styles.googleButton}
        disabled={pending !== null}
        onClick={handleGoogleSignIn}
        type="button"
      >
        {pending === "google" ? "前往 Google…" : "使用 gold-tank.com Google 登入"}
      </button>
    </form>
  );
}
