import "server-only";

import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { productFilterOverride } from "@/db/schema";
import type { ClassificationOverride } from "@/lib/catalog/classifier";

export async function getProductOverrides(
  itemIds: bigint[],
): Promise<Map<string, ClassificationOverride>> {
  if (!itemIds.length) {
    return new Map();
  }

  const rows = await getDb()
    .select({
      itemId: productFilterOverride.itemId,
      decision: productFilterOverride.decision,
    })
    .from(productFilterOverride)
    .where(inArray(productFilterOverride.itemId, itemIds));

  return new Map(
    rows.map((row) => [
      row.itemId.toString(),
      row.decision === "include" ? "include" : "exclude",
    ]),
  );
}

export async function setProductOverride(input: {
  itemId: bigint;
  decision: "include" | "exclude";
  reason: string;
  userId: string;
}): Promise<void> {
  await getDb()
    .insert(productFilterOverride)
    .values({
      itemId: input.itemId,
      decision: input.decision,
      reason: input.reason.trim(),
      createdBy: input.userId,
    })
    .onConflictDoUpdate({
      target: productFilterOverride.itemId,
      set: {
        decision: input.decision,
        reason: input.reason.trim(),
        createdBy: input.userId,
        updatedAt: new Date(),
      },
    });
}

export async function clearProductOverride(itemId: bigint): Promise<void> {
  await getDb()
    .delete(productFilterOverride)
    .where(eq(productFilterOverride.itemId, itemId));
}
