import { NextResponse } from "next/server";

import { ensureDomainAdminProvisioned } from "@/lib/supabase/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null): string {
  return value?.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\")
    ? value
    : "/admin/catalog-upload";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();

  if (!code || !supabase) {
    return NextResponse.redirect(
      new URL("/admin/login?error=auth_unavailable", url),
    );
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL("/admin/login?error=callback_failed", url),
    );
  }

  try {
    const provisioned = await ensureDomainAdminProvisioned(data.user);

    if (!provisioned) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/admin/login?error=domain_forbidden", url),
      );
    }
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/admin/login?error=provision_failed", url),
    );
  }

  return NextResponse.redirect(new URL(nextPath, url));
}
