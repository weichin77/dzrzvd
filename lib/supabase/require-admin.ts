import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appAdmin } from "@/db/schema";
import { hasDatabaseConfig } from "@/lib/config";
import { createSupabaseServerClient } from "./server";

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
