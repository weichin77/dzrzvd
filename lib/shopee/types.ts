export type ShopeeApiEnvelope<T> = {
  error?: string;
  message?: string;
  request_id?: string;
  response?: T;
};

export type ShopeeTokenResponse = {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  refresh_token_expire_in?: number;
  shop_id?: number;
};

export type ShopeeShopInfo = {
  shop_name?: string;
  region?: string;
  status?: string;
  shop_status?: string;
};

export type ShopeeItemListEntry = {
  item_id: number;
  item_status?: string;
  update_time?: number;
};

export type ShopeeItemListResponse = {
  item?: ShopeeItemListEntry[];
  item_list?: ShopeeItemListEntry[];
  total_count?: number;
  has_next_page?: boolean;
  next_offset?: number;
};

export type ShopeePriceInfo = {
  currency?: string;
  original_price?: number;
  current_price?: number;
  inflated_original_price?: number;
  inflated_price_of_current_price?: number;
};

export type ShopeeItemBaseInfo = {
  item_id: number;
  category_id?: number;
  item_name?: string;
  item_sku?: string;
  item_status?: string;
  update_time?: number;
  image?: {
    image_url_list?: string[];
  };
  brand?: {
    brand_id?: number;
    original_brand_name?: string;
  };
  price_info?: ShopeePriceInfo[];
  stock_info_v2?: {
    summary_info?: {
      total_available_stock?: number;
    };
  };
};

export type ShopeeItemBaseInfoResponse = {
  item_list?: ShopeeItemBaseInfo[];
};

export type ShopeeCategoryEntry = {
  category_id: number;
  parent_category_id?: number;
  original_category_name?: string;
  display_category_name?: string;
  has_children?: boolean;
};

export type ShopeeCategoryResponse = {
  category_list?: ShopeeCategoryEntry[];
};
