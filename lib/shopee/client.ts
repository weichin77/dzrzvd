import "server-only";

import { getShopeeConfig } from "@/lib/config";
import { createShopeeSignature } from "./signing";
import type {
  ShopeeApiEnvelope,
  ShopeeCategoryResponse,
  ShopeeItemBaseInfoResponse,
  ShopeeItemListResponse,
  ShopeeShopInfo,
  ShopeeTokenResponse,
} from "./types";

type QueryValue = string | number | boolean | bigint | undefined;

type RequestOptions = {
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
  authenticated?: boolean;
  retryable?: boolean;
};

export class ShopeeApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly requestId: string | null,
  ) {
    super(`Shopee API request failed: ${code}`);
    this.name = "ShopeeApiError";
  }
}

function unixTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class ShopeeClient {
  private requestCounter = 0;

  constructor(
    private readonly accessToken?: string,
    private readonly shopId?: bigint,
  ) {}

  get requestCount(): number {
    return this.requestCounter;
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    const config = getShopeeConfig();
    const timestamp = unixTimestamp();
    const authenticated = options.authenticated ?? true;

    if (authenticated && (!this.accessToken || this.shopId === undefined)) {
      throw new ShopeeApiError("missing_shop_authorization", null);
    }

    const signature = createShopeeSignature(config.partnerKey, {
      partnerId: config.partnerId,
      path: options.path,
      timestamp,
      accessToken: authenticated ? this.accessToken : undefined,
      shopId: authenticated ? this.shopId : undefined,
    });
    const url = new URL(options.path, config.apiBaseUrl);
    const query: Record<string, QueryValue> = {
      partner_id: config.partnerId,
      timestamp,
      sign: signature,
      ...(authenticated
        ? { access_token: this.accessToken, shop_id: this.shopId }
        : {}),
      ...options.query,
    };

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const attempts = options.retryable === false ? 1 : 3;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      this.requestCounter += 1;

      try {
        const response = await fetch(url, {
          method: options.method ?? "GET",
          headers: options.body
            ? { "content-type": "application/json" }
            : undefined,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: AbortSignal.timeout(20_000),
          cache: "no-store",
        });

        if (
          !response.ok &&
          attempt < attempts &&
          (response.status === 429 || response.status >= 500)
        ) {
          await delay(250 * 2 ** (attempt - 1));
          continue;
        }

        if (!response.ok) {
          throw new ShopeeApiError(`http_${response.status}`, null);
        }

        const envelope = (await response.json()) as ShopeeApiEnvelope<T> & T;

        if (envelope.error) {
          throw new ShopeeApiError(
            envelope.error,
            envelope.request_id ?? null,
          );
        }

        return (envelope.response ?? envelope) as T;
      } catch (error) {
        if (error instanceof ShopeeApiError || attempt === attempts) {
          throw error;
        }

        await delay(250 * 2 ** (attempt - 1));
      }
    }

    throw new ShopeeApiError("request_exhausted", null);
  }

  exchangeAuthorizationCode(
    code: string,
    shopId: bigint,
  ): Promise<ShopeeTokenResponse> {
    const config = getShopeeConfig();

    return this.request<ShopeeTokenResponse>({
      path: "/api/v2/auth/token/get",
      method: "POST",
      authenticated: false,
      retryable: false,
      body: {
        code,
        partner_id: config.partnerId,
        shop_id: Number(shopId),
      },
    });
  }

  refreshAccessToken(
    refreshToken: string,
    shopId: bigint,
  ): Promise<ShopeeTokenResponse> {
    const config = getShopeeConfig();

    return this.request<ShopeeTokenResponse>({
      path: "/api/v2/auth/access_token/get",
      method: "POST",
      authenticated: false,
      retryable: false,
      body: {
        refresh_token: refreshToken,
        partner_id: config.partnerId,
        shop_id: Number(shopId),
      },
    });
  }

  getShopInfo(): Promise<ShopeeShopInfo> {
    return this.request<ShopeeShopInfo>({
      path: "/api/v2/shop/get_shop_info",
    });
  }

  getItemList(
    offset: number,
    itemStatus = "NORMAL",
  ): Promise<ShopeeItemListResponse> {
    return this.request<ShopeeItemListResponse>({
      path: "/api/v2/product/get_item_list",
      query: {
        offset,
        page_size: 100,
        item_status: itemStatus,
      },
    });
  }

  getItemBaseInfo(itemIds: bigint[]): Promise<ShopeeItemBaseInfoResponse> {
    if (!itemIds.length || itemIds.length > 50) {
      throw new Error("Shopee base-info batches must contain 1 to 50 item IDs.");
    }

    return this.request<ShopeeItemBaseInfoResponse>({
      path: "/api/v2/product/get_item_base_info",
      query: {
        item_id_list: itemIds.join(","),
        need_tax_info: false,
        need_complaint_policy: false,
      },
    });
  }

  getCategories(): Promise<ShopeeCategoryResponse> {
    return this.request<ShopeeCategoryResponse>({
      path: "/api/v2/product/get_category",
      query: { language: "zh-hant" },
    });
  }
}
