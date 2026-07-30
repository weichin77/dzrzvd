"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearProductOverride,
  setProductOverride,
} from "@/db/repositories/overrides";
import { runShopeeSync, type SyncMode } from "@/lib/shopee/sync";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function runManualSyncAction(formData: FormData) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    redirect("/admin/login");
  }

  const mode: SyncMode =
    formData.get("mode") === "dry_run" ? "dry_run" : "full";
  const result = await runShopeeSync({ trigger: "manual", mode });

  revalidatePath("/admin/shopee-catalog");
  redirect(`/admin/shopee-catalog?sync=${encodeURIComponent(result.status)}`);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

export async function saveProductOverrideAction(formData: FormData) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    redirect("/admin/login");
  }

  const rawItemId = String(formData.get("itemId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  let itemId: bigint;

  try {
    itemId = BigInt(rawItemId);
    if (itemId <= BigInt(0)) {
      throw new Error("invalid");
    }
  } catch {
    redirect("/admin/shopee-catalog?override=invalid_item");
  }

  if (decision === "clear") {
    await clearProductOverride(itemId);
    revalidatePath("/admin/shopee-catalog");
    redirect("/admin/shopee-catalog?override=cleared");
  }

  if (!["include", "exclude"].includes(decision) || reason.length < 3) {
    redirect("/admin/shopee-catalog?override=invalid_input");
  }

  await setProductOverride({
    itemId,
    decision: decision as "include" | "exclude",
    reason,
    userId: authorization.identity.userId,
  });
  revalidatePath("/admin/shopee-catalog");
  redirect("/admin/shopee-catalog?override=saved");
}
