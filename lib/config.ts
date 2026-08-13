import "server-only";

import { resolveSupabaseProjectRef } from "@/lib/supabase/project-ref";

type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

type ShopeeConfig = {
  partnerId: number;
  partnerKey: string;
  apiBaseUrl: string;
  authBaseUrl: string;
  redirectUrl: string;
  tokenEncryptionKey: string;
};

function readRequired(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readPositiveInteger(name: string): number {
  const value = Number(readRequired(name));

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer.`);
  }

  return value;
}

function assertSupabaseEnvironmentScope(): void {
  const projectEnvironment = process.env.SUPABASE_PROJECT_ENV?.trim();

  if (!projectEnvironment) {
    throw new Error("Missing required environment variable: SUPABASE_PROJECT_ENV");
  }

  if (!["production", "nonproduction"].includes(projectEnvironment)) {
    throw new Error(
      "SUPABASE_PROJECT_ENV must be production or nonproduction.",
    );
  }

  if (
    process.env.VERCEL_ENV === "production" &&
    projectEnvironment !== "production"
  ) {
    throw new Error("Production Vercel cannot use non-production Supabase.");
  }

  if (
    process.env.VERCEL_ENV &&
    process.env.VERCEL_ENV !== "production" &&
    projectEnvironment === "production"
  ) {
    throw new Error("Preview or development Vercel cannot use production Supabase.");
  }
}

function hasValidSupabaseEnvironmentScope(): boolean {
  try {
    assertSupabaseEnvironmentScope();
    return true;
  } catch {
    return false;
  }
}

export function hasDatabaseConfig(): boolean {
  return Boolean(
    process.env.POSTGRES_URL?.trim() &&
      hasValidSupabaseEnvironmentScope(),
  );
}

export function getDatabaseUrl(): string {
  assertSupabaseEnvironmentScope();
  return readRequired("POSTGRES_URL");
}

export function getDatabaseProjectRef(): string {
  assertSupabaseEnvironmentScope();

  return resolveSupabaseProjectRef({
    databaseUrl: readRequired("POSTGRES_URL"),
    expectedProjectRef: readRequired("SUPABASE_PROJECT_REF"),
    publicUrls: [
      process.env.SUPABASE_URL?.trim(),
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    ].filter((value): value is string => Boolean(value)),
  });
}

export function hasSupabasePublicConfig(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
      (process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) &&
      hasValidSupabaseEnvironmentScope(),
  );
}

export function getSupabasePublicConfig(): PublicSupabaseConfig {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error("Missing Supabase server Auth configuration.");
  }

  assertSupabaseEnvironmentScope();

  return {
    url,
    publishableKey,
  };
}

export function hasShopeeConfig(): boolean {
  return Boolean(
    process.env.SHOPEE_PARTNER_ID?.trim() &&
      process.env.SHOPEE_PARTNER_KEY?.trim() &&
      process.env.SHOPEE_REDIRECT_URL?.trim() &&
      process.env.SHOPEE_TOKEN_ENCRYPTION_KEY?.trim(),
  );
}

export function getShopeeConfig(): ShopeeConfig {
  return {
    partnerId: readPositiveInteger("SHOPEE_PARTNER_ID"),
    partnerKey: readRequired("SHOPEE_PARTNER_KEY"),
    apiBaseUrl:
      process.env.SHOPEE_API_BASE_URL?.trim() ||
      "https://partner.shopeemobile.com",
    authBaseUrl:
      process.env.SHOPEE_AUTH_BASE_URL?.trim() ||
      "https://open.shopee.com/auth",
    redirectUrl: readRequired("SHOPEE_REDIRECT_URL"),
    tokenEncryptionKey: readRequired("SHOPEE_TOKEN_ENCRYPTION_KEY"),
  };
}

export function getCronSecret(): string {
  return readRequired("CRON_SECRET");
}

export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
}
