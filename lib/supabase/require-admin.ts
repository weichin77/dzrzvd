import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appAdmin } from "@/db/schema";
import { hasDatabaseConfig } from "@/lib/config";
import { createSupabaseServerClient } from "./server";
import {
  DEFAULT_ADMIN_GOOGLE_WORKSPACE_DOMAIN,
  isVerifiedGoldTankGoogleUser,
} from "./google-admin-policy";

export { isVerifiedGoldTankGoogleUser } from "./google-admin-policy";

export type AdminIdentity = {
  userId: string;
  email: string | null;
};

export type AdminAuthorization =
  | { authorized: true; identity: AdminIdentity }
  | {
      authorized: false;
      reason: "unconfigured" | "unauthenticated" | "forbidden";
    };

export async function ensureDomainAdminProvisioned(
  user: Parameters<typeof isVerifiedGoldTankGoogleUser>[0],
): Promise<boolean> {
  if (!isVerifiedGoldTankGoogleUser(
    user,
    DEFAULT_ADMIN_GOOGLE_WORKSPACE_DOMAIN,
  )) {
    return false;
  }

  await getDb()
    .insert(appAdmin)
    .values({
      userId: user.id,
      role: "operator",
      active: true,
      lastVerifiedAt: new Date(),
    })
    .onConflictDoNothing({ target: appAdmin.userId });

  return true;
}

export async function requireAdmin(): Promise<AdminAuthorization> {
  const supabase = await createSupabaseServerClient();

  if (!supabase || !hasDatabaseConfig()) {
    return { authorized: false, reason: "unconfigured" };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authorized: false, reason: "unauthenticated" };
  }

  const rows = await getDb()
    .select({ userId: appAdmin.userId })
    .from(appAdmin)
    .where(
      and(
        eq(appAdmin.userId, user.id),
        eq(appAdmin.active, true),
      ),
    )
    .limit(1);

  if (!rows[0]) {
    return { authorized: false, reason: "forbidden" };
  }

  return {
    authorized: true,
    identity: {
      userId: user.id,
      email: user.email ?? null,
    },
  };
}
