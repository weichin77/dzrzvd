import {
  clearProductOverride,
  setProductOverride,
} from "@/db/repositories/overrides";
import { requireAdmin } from "@/lib/supabase/require-admin";

type Context = { params: Promise<{ itemId: string }> };

function parseItemId(value: string): bigint | null {
  try {
    const itemId = BigInt(value);
    return itemId > BigInt(0) ? itemId : null;
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: Context) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    return Response.json(
      { ok: false, error: authorization.reason },
      { status: authorization.reason === "forbidden" ? 403 : 401 },
    );
  }

  const { itemId: rawItemId } = await context.params;
  const itemId = parseItemId(rawItemId);
  const body = (await request.json().catch(() => ({}))) as {
    decision?: string;
    reason?: string;
  };

  if (
    !itemId ||
    !["include", "exclude"].includes(body.decision ?? "") ||
    !body.reason ||
    body.reason.trim().length < 3
  ) {
    return Response.json(
      { ok: false, error: "invalid_override" },
      { status: 400 },
    );
  }

  await setProductOverride({
    itemId,
    decision: body.decision as "include" | "exclude",
    reason: body.reason,
    userId: authorization.identity.userId,
  });

  return Response.json({ ok: true });
}

export async function DELETE(_: Request, context: Context) {
  const authorization = await requireAdmin();

  if (!authorization.authorized) {
    return Response.json(
      { ok: false, error: authorization.reason },
      { status: authorization.reason === "forbidden" ? 403 : 401 },
    );
  }

  const { itemId: rawItemId } = await context.params;
  const itemId = parseItemId(rawItemId);

  if (!itemId) {
    return Response.json(
      { ok: false, error: "invalid_item_id" },
      { status: 400 },
    );
  }

  await clearProductOverride(itemId);
  return Response.json({ ok: true });
}
