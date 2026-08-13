import {
  bigint,
  boolean,
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const catalogSchema = pgSchema("catalog");
export const privateSchema = pgSchema("app_private");

export const keepaliveHeartbeat = privateSchema.table(
  "keepalive_heartbeat",
  {
    source: text("source").primaryKey(),
    projectRef: text("project_ref").notNull(),
    lastSucceededAt: timestamp("last_succeeded_at", {
      withTimezone: true,
    }).defaultNow().notNull(),
    runCount: integer("run_count").default(0).notNull(),
  },
);

export const shopeeShop = privateSchema.table(
  "shopee_shop",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: bigint("shop_id", { mode: "bigint" }).notNull(),
    market: text("market").default("TW").notNull(),
    shopName: text("shop_name"),
    accessTokenCiphertext: text("access_token_ciphertext"),
    refreshTokenCiphertext: text("refresh_token_ciphertext"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    tokenVersion: integer("token_version").default(0).notNull(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    authorizationExpiresAt: timestamp("authorization_expires_at", {
      withTimezone: true,
    }),
    shopStatus: text("shop_status"),
    lastTokenRefreshAt: timestamp("last_token_refresh_at", {
      withTimezone: true,
    }),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    authorizationStatus: text("authorization_status").default("active").notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("shopee_shop_shop_id_uidx").on(table.shopId),
  ],
);

export const shopeeCategory = catalogSchema.table(
  "shopee_category",
  {
    categoryId: bigint("category_id", { mode: "bigint" }).primaryKey(),
    parentCategoryId: bigint("parent_category_id", { mode: "bigint" }),
    originalName: text("original_name").notNull(),
    displayName: text("display_name").notNull(),
    hasChildren: boolean("has_children").default(false).notNull(),
    breadcrumb: text("breadcrumb").array().default([]).notNull(),
    depth: smallint("depth").default(0).notNull(),
    sourceUpdatedAt: timestamp("source_updated_at", {
      withTimezone: true,
    }).notNull(),
    ...auditColumns,
  },
  (table) => [
    index("shopee_category_parent_idx").on(table.parentCategoryId),
  ],
);

export const categoryPresentation = catalogSchema.table(
  "category_presentation",
  {
    categoryId: bigint("category_id", { mode: "bigint" })
      .primaryKey()
      .references(() => shopeeCategory.categoryId, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    customLabel: text("custom_label"),
    description: text("description"),
    heroImageUrl: text("hero_image_url"),
    sortOrder: integer("sort_order").default(0).notNull(),
    visible: boolean("visible").default(true).notNull(),
    ...auditColumns,
  },
  (table) => [
    uniqueIndex("category_presentation_slug_uidx").on(table.slug),
  ],
);

export const shopeeProduct = catalogSchema.table(
  "shopee_product",
  {
    itemId: bigint("item_id", { mode: "bigint" }).primaryKey(),
    shopId: bigint("shop_id", { mode: "bigint" })
      .notNull()
      .references(() => shopeeShop.shopId),
    categoryId: bigint("category_id", { mode: "bigint" }).references(
      () => shopeeCategory.categoryId,
    ),
    name: text("name").notNull(),
    itemSku: text("item_sku"),
    brandId: bigint("brand_id", { mode: "bigint" }),
    brandName: text("brand_name"),
    currency: char("currency", { length: 3 }).default("TWD").notNull(),
    originalPrice: numeric("original_price", { precision: 14, scale: 2 }),
    currentPrice: numeric("current_price", { precision: 14, scale: 2 }),
    priceMin: numeric("price_min", { precision: 14, scale: 2 }),
    priceMax: numeric("price_max", { precision: 14, scale: 2 }),
    availableStock: integer("available_stock"),
    status: text("status").notNull(),
    imageUrls: text("image_urls").array().default([]).notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    isDzrzvd: boolean("is_dzrzvd").default(false).notNull(),
    matchMethod: text("match_method"),
    matchEvidence: text("match_evidence"),
    classificationVersion: text("classification_version").notNull(),
    sourceUpdateTime: timestamp("source_update_time", { withTimezone: true }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    inactiveAt: timestamp("inactive_at", { withTimezone: true }),
    sourcePayload: jsonb("source_payload"),
    ...auditColumns,
  },
  (table) => [
    index("shopee_product_shop_idx").on(table.shopId),
    index("shopee_product_category_idx").on(table.categoryId),
    index("shopee_product_public_idx").on(
      table.isDzrzvd,
      table.status,
      table.inactiveAt,
      table.availableStock,
    ),
    index("shopee_product_last_seen_idx").on(table.lastSeenAt),
  ],
);

export const syncRun = privateSchema.table(
  "sync_run",
  {
    id: uuid("id").primaryKey(),
    shopId: bigint("shop_id", { mode: "bigint" })
      .notNull()
      .references(() => shopeeShop.shopId),
    trigger: text("trigger").notNull(),
    mode: text("mode").default("full").notNull(),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    discoveredCount: integer("discovered_count").default(0).notNull(),
    enrichedCount: integer("enriched_count").default(0).notNull(),
    includedCount: integer("included_count").default(0).notNull(),
    excludedCount: integer("excluded_count").default(0).notNull(),
    insertedCount: integer("inserted_count").default(0).notNull(),
    updatedCount: integer("updated_count").default(0).notNull(),
    inactivatedCount: integer("inactivated_count").default(0).notNull(),
    warningCount: integer("warning_count").default(0).notNull(),
    endpointRequestCount: integer("endpoint_request_count").default(0).notNull(),
    safeErrorSummary: text("safe_error_summary"),
    deploymentId: text("deployment_id"),
  },
  (table) => [
    index("sync_run_shop_started_idx").on(table.shopId, table.startedAt),
    index("sync_run_status_idx").on(table.status),
  ],
);

export const appAdmin = privateSchema.table("app_admin", {
  userId: uuid("user_id").primaryKey(),
  role: text("role").default("operator").notNull(),
  active: boolean("active").default(true).notNull(),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  ...auditColumns,
});

export const productFilterOverride = privateSchema.table(
  "product_filter_override",
  {
    itemId: bigint("item_id", { mode: "bigint" })
      .primaryKey()
      .references(() => shopeeProduct.itemId, { onDelete: "cascade" }),
    decision: text("decision").notNull(),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => appAdmin.userId),
    ...auditColumns,
  },
  (table) => [
    index("product_filter_override_decision_idx").on(table.decision),
  ],
);

export const syncLock = privateSchema.table("sync_lock", {
  shopId: bigint("shop_id", { mode: "bigint" })
    .primaryKey()
    .references(() => shopeeShop.shopId, { onDelete: "cascade" }),
  ownerRunId: uuid("owner_run_id")
    .notNull()
    .references(() => syncRun.id, { onDelete: "cascade" }),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
  heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }).notNull(),
});

export const syncRequest = privateSchema.table(
  "sync_request",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    syncRunId: uuid("sync_run_id")
      .notNull()
      .references(() => syncRun.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    shopeeRequestId: text("shopee_request_id"),
    status: text("status").notNull(),
    durationMs: integer("duration_ms").notNull(),
    safeErrorCode: text("safe_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sync_request_run_idx").on(table.syncRunId),
  ],
);
