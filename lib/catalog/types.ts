export type CatalogProduct = {
  itemId: string;
  name: string;
  imageUrl: string | null;
  shopeeUrl: string;
  categoryId: string;
};

export type CatalogCategory = {
  categoryId: string;
  slug: string;
  name: string;
  description: string | null;
  products: CatalogProduct[];
};

export type CatalogOverviewStatus =
  | "ready"
  | "empty"
  | "unconfigured"
  | "error";

export type CatalogOverview = {
  status: CatalogOverviewStatus;
  lastUpdatedAt: string | null;
  categories: CatalogCategory[];
};
