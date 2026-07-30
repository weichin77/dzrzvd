import { createHmac } from "node:crypto";

export type ShopeeSignatureInput = {
  partnerId: number;
  path: string;
  timestamp: number;
  accessToken?: string;
  shopId?: bigint;
};

export function buildShopeeSignatureBase({
  partnerId,
  path,
  timestamp,
  accessToken,
  shopId,
}: ShopeeSignatureInput): string {
  const publicBase = `${partnerId}${path}${timestamp}`;

  if (!accessToken || shopId === undefined) {
    return publicBase;
  }

  return `${publicBase}${accessToken}${shopId}`;
}

export function createShopeeSignature(
  partnerKey: string,
  input: ShopeeSignatureInput,
): string {
  return createHmac("sha256", partnerKey)
    .update(buildShopeeSignatureBase(input))
    .digest("hex");
}
