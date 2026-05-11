import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const authId = () => text("id").primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());
const organizationId = () => uuid("organization_id").notNull();

export const users = pgTable(
  "user",
  {
    id: authId(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("user_email_key").on(table.email)],
);

export const sessions = pgTable(
  "session",
  {
    id: authId(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    uniqueIndex("session_token_key").on(table.token),
  ],
);

export const accounts = pgTable(
  "account",
  {
    id: authId(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_key").on(table.providerId, table.accountId),
  ],
);

export const verifications = pgTable(
  "verification",
  {
    id: authId(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    timezone: varchar("timezone", { length: 64 }).default("America/Sao_Paulo").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("organizations_slug_key").on(table.slug)],
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).default("owner").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("organization_members_organization_id_idx").on(table.organizationId),
    uniqueIndex("organization_members_user_org_key").on(table.userId, table.organizationId),
  ],
);

export const companies = pgTable(
  "companies",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 12 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("companies_name_length", sql`char_length(trim(${table.name})) >= 2`),
    check("companies_code_length", sql`char_length(trim(${table.code})) between 2 and 12`),
    check("companies_code_uppercase", sql`${table.code} = upper(${table.code})`),
    index("companies_organization_id_idx").on(table.organizationId),
    index("companies_user_id_idx").on(table.userId),
    index("companies_org_is_active_idx").on(table.organizationId, table.isActive),
    uniqueIndex("companies_org_code_key").on(table.organizationId, table.code),
  ],
);

export const productMonthlyPerformance = pgTable(
  "product_monthly_performance",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    referenceMonth: date("reference_month").notNull(),
    channel: varchar("channel", { length: 120 }).notNull(),
    productName: varchar("product_name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 128 }).notNull(),
    salesQuantity: integer("sales_quantity").default(0).notNull(),
    returnsQuantity: integer("returns_quantity").default(0).notNull(),
    unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).default("0").notNull(),
    salePrice: numeric("sale_price", { precision: 12, scale: 2 }).notNull(),
    commissionRate: numeric("commission_rate", { precision: 8, scale: 6 }).default("0").notNull(),
    shippingFee: numeric("shipping_fee", { precision: 12, scale: 2 }).default("0").notNull(),
    taxRate: numeric("tax_rate", { precision: 8, scale: 6 }).default("0").notNull(),
    packagingCost: numeric("packaging_cost", { precision: 12, scale: 2 }).default("0").notNull(),
    advertisingCost: numeric("advertising_cost", { precision: 12, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "product_monthly_performance_reference_month_first_day",
      sql`${table.referenceMonth} = date_trunc('month', ${table.referenceMonth})::date`,
    ),
    check(
      "product_monthly_performance_channel_not_empty",
      sql`char_length(trim(${table.channel})) >= 2`,
    ),
    check(
      "product_monthly_performance_product_name_not_empty",
      sql`char_length(trim(${table.productName})) >= 2`,
    ),
    check("product_monthly_performance_sku_not_empty", sql`char_length(trim(${table.sku})) >= 1`),
    check("product_monthly_performance_sales_non_negative", sql`${table.salesQuantity} >= 0`),
    check("product_monthly_performance_returns_non_negative", sql`${table.returnsQuantity} >= 0`),
    check(
      "product_monthly_performance_returns_lte_sales",
      sql`${table.returnsQuantity} <= ${table.salesQuantity}`,
    ),
    check("product_monthly_performance_unit_cost_non_negative", sql`${table.unitCost} >= 0`),
    check("product_monthly_performance_sale_price_positive", sql`${table.salePrice} > 0`),
    check(
      "product_monthly_performance_commission_rate_range",
      sql`${table.commissionRate} >= 0 and ${table.commissionRate} <= 1`,
    ),
    check(
      "product_monthly_performance_shipping_fee_non_negative",
      sql`${table.shippingFee} >= 0`,
    ),
    check("product_monthly_performance_tax_rate_range", sql`${table.taxRate} >= 0 and ${table.taxRate} <= 1`),
    check(
      "product_monthly_performance_packaging_cost_non_negative",
      sql`${table.packagingCost} >= 0`,
    ),
    check(
      "product_monthly_performance_advertising_cost_non_negative",
      sql`${table.advertisingCost} >= 0`,
    ),
    index("product_monthly_performance_organization_id_idx").on(table.organizationId),
    index("product_monthly_performance_user_id_idx").on(table.userId),
    index("product_monthly_performance_company_month_idx").on(table.companyId, table.referenceMonth),
    index("product_monthly_performance_org_month_idx").on(table.organizationId, table.referenceMonth),
    index("product_monthly_performance_channel_month_idx").on(table.channel, table.referenceMonth),
    index("product_monthly_performance_sku_idx").on(table.sku),
    uniqueIndex("product_monthly_performance_org_company_month_channel_sku_key").on(
      table.organizationId,
      table.companyId,
      table.referenceMonth,
      table.channel,
      table.sku,
    ),
  ],
);

export const fixedCosts = pgTable(
  "fixed_costs",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    referenceMonth: date("reference_month").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 120 }).default("general").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    isRecurring: boolean("is_recurring").default(true).notNull(),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "fixed_costs_reference_month_first_day",
      sql`${table.referenceMonth} = date_trunc('month', ${table.referenceMonth})::date`,
    ),
    check("fixed_costs_name_not_empty", sql`char_length(trim(${table.name})) >= 2`),
    check("fixed_costs_category_not_empty", sql`char_length(trim(${table.category})) >= 2`),
    check("fixed_costs_amount_non_negative", sql`${table.amount} >= 0`),
    index("fixed_costs_organization_id_idx").on(table.organizationId),
    index("fixed_costs_user_id_idx").on(table.userId),
    index("fixed_costs_company_month_idx").on(table.companyId, table.referenceMonth),
    index("fixed_costs_org_month_idx").on(table.organizationId, table.referenceMonth),
    index("fixed_costs_category_idx").on(table.category),
  ],
);

export const billingCustomers = pgTable(
  "billing_customers",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).default("stripe").notNull(),
    externalCustomerId: varchar("external_customer_id", { length: 255 }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("billing_customers_organization_id_idx").on(table.organizationId),
    uniqueIndex("billing_customers_provider_external_id_key").on(
      table.provider,
      table.externalCustomerId,
    ),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    billingCustomerId: uuid("billing_customer_id").references(() => billingCustomers.id, {
      onDelete: "set null",
    }),
    provider: varchar("provider", { length: 32 }).default("stripe").notNull(),
    externalSubscriptionId: varchar("external_subscription_id", { length: 255 }),
    planCode: varchar("plan_code", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).default("inactive").notNull(),
    interval: varchar("interval", { length: 32 }).default("monthly").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("subscriptions_organization_id_idx").on(table.organizationId),
    index("subscriptions_organization_status_idx").on(table.organizationId, table.status),
  ],
);

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).default("stripe").notNull(),
    eventType: varchar("event_type", { length: 128 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("subscription_events_organization_id_idx").on(table.organizationId)],
);

export const pendingCheckouts = pgTable(
  "pending_checkouts",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    checkoutSessionId: varchar("checkout_session_id", { length: 255 }).notNull(),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    planCode: varchar("plan_code", { length: 64 }).notNull(),
    interval: varchar("interval", { length: 32 }).default("monthly").notNull(),
    status: varchar("status", { length: 32 }).default("created").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("pending_checkouts_user_id_idx").on(table.userId),
    index("pending_checkouts_org_id_idx").on(table.organizationId),
    index("pending_checkouts_user_status_idx").on(table.userId, table.status),
    uniqueIndex("pending_checkouts_checkout_session_id_key").on(table.checkoutSessionId),
  ],
);

export const marketplaceConnections = pgTable(
  "marketplace_connections",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).default("disconnected").notNull(),
    externalAccountId: varchar("external_account_id", { length: 255 }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("marketplace_connections_organization_id_idx").on(table.organizationId),
    index("marketplace_connections_org_provider_idx").on(table.organizationId, table.provider),
    uniqueIndex("marketplace_connections_org_provider_key").on(table.organizationId, table.provider),
  ],
);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    marketplaceConnectionId: uuid("marketplace_connection_id"),
    provider: varchar("provider", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).default("pending").notNull(),
    windowKey: varchar("window_key", { length: 64 }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    errorSummary: text("error_summary"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("sync_runs_organization_id_idx").on(table.organizationId),
    index("sync_runs_org_provider_created_idx").on(table.organizationId, table.provider, table.createdAt),
    foreignKey({
      name: "sync_runs_marketplace_connection_fk",
      columns: [table.marketplaceConnectionId],
      foreignColumns: [marketplaceConnections.id],
    }).onDelete("set null"),
  ],
);

export const externalProducts = pgTable(
  "external_products",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    marketplaceConnectionId: uuid("marketplace_connection_id"),
    provider: varchar("provider", { length: 32 }).notNull(),
    externalProductId: varchar("external_product_id", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 128 }),
    title: text("title"),
    linkedProductId: uuid("linked_product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    reviewStatus: varchar("review_status", { length: 48 }).default("unreviewed").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("external_products_organization_id_idx").on(table.organizationId),
    index("external_products_linked_product_id_idx").on(table.linkedProductId),
    uniqueIndex("external_products_org_provider_external_key").on(
      table.organizationId,
      table.provider,
      table.externalProductId,
    ),
    foreignKey({
      name: "external_products_marketplace_connection_fk",
      columns: [table.marketplaceConnectionId],
      foreignColumns: [marketplaceConnections.id],
    }).onDelete("set null"),
  ],
);

export const externalOrders = pgTable(
  "external_orders",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    marketplaceConnectionId: uuid("marketplace_connection_id"),
    syncRunId: uuid("sync_run_id").references(() => syncRuns.id, { onDelete: "set null" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    externalOrderId: varchar("external_order_id", { length: 255 }).notNull(),
    status: varchar("status", { length: 32 }).default("imported").notNull(),
    currency: varchar("currency", { length: 8 }).default("BRL").notNull(),
    orderedAt: timestamp("ordered_at", { withTimezone: true }),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("external_orders_organization_id_idx").on(table.organizationId),
    uniqueIndex("external_orders_org_provider_external_key").on(
      table.organizationId,
      table.provider,
      table.externalOrderId,
    ),
    foreignKey({
      name: "external_orders_marketplace_connection_fk",
      columns: [table.marketplaceConnectionId],
      foreignColumns: [marketplaceConnections.id],
    }).onDelete("set null"),
  ],
);

export const externalOrderItems = pgTable(
  "external_order_items",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    externalOrderId: uuid("external_order_id").notNull().references(() => externalOrders.id, {
      onDelete: "cascade",
    }),
    externalProductId: uuid("external_product_id"),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: numeric("unit_price", { precision: 14, scale: 2 }).default("0").notNull(),
    totalPrice: numeric("total_price", { precision: 14, scale: 2 }).default("0").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("external_order_items_organization_id_idx").on(table.organizationId),
    foreignKey({
      name: "external_order_items_external_product_fk",
      columns: [table.externalProductId],
      foreignColumns: [externalProducts.id],
    }).onDelete("set null"),
  ],
);

export const externalFees = pgTable(
  "external_fees",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    externalOrderId: uuid("external_order_id").references(() => externalOrders.id, {
      onDelete: "cascade",
    }),
    provider: varchar("provider", { length: 32 }).notNull(),
    feeType: varchar("fee_type", { length: 64 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).default("0").notNull(),
    currency: varchar("currency", { length: 8 }).default("BRL").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("external_fees_organization_id_idx").on(table.organizationId)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 128 }),
    sellingPrice: numeric("selling_price", { precision: 14, scale: 2 }).default("0").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("products_organization_id_idx").on(table.organizationId),
    index("products_org_active_idx").on(table.organizationId, table.isActive),
  ],
);

export const productCosts = pgTable(
  "product_costs",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    costType: varchar("cost_type", { length: 32 }).default("base").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).default("0").notNull(),
    currency: varchar("currency", { length: 8 }).default("BRL").notNull(),
    effectiveFrom: date("effective_from"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("product_costs_organization_id_idx").on(table.organizationId)],
);

export const adCosts = pgTable(
  "ad_costs",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    channel: varchar("channel", { length: 64 }).default("manual").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).default("0").notNull(),
    currency: varchar("currency", { length: 8 }).default("BRL").notNull(),
    spentAt: date("spent_at"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("ad_costs_organization_id_idx").on(table.organizationId)],
);

export const manualExpenses = pgTable(
  "manual_expenses",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 64 }).default("general").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).default("0").notNull(),
    currency: varchar("currency", { length: 8 }).default("BRL").notNull(),
    incurredAt: date("incurred_at"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("manual_expenses_organization_id_idx").on(table.organizationId)],
);

export const dailyMetrics = pgTable(
  "daily_metrics",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    metricDate: date("metric_date").notNull(),
    grossRevenue: numeric("gross_revenue", { precision: 14, scale: 2 }).default("0").notNull(),
    netRevenue: numeric("net_revenue", { precision: 14, scale: 2 }).default("0").notNull(),
    netProfit: numeric("net_profit", { precision: 14, scale: 2 }).default("0").notNull(),
    ordersCount: integer("orders_count").default(0).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("daily_metrics_organization_id_idx").on(table.organizationId),
    uniqueIndex("daily_metrics_org_date_key").on(table.organizationId, table.metricDate),
  ],
);

export const productMetrics = pgTable(
  "product_metrics",
  {
    id: id(),
    organizationId: organizationId().references(() => organizations.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    metricDate: date("metric_date").notNull(),
    unitsSold: integer("units_sold").default(0).notNull(),
    grossRevenue: numeric("gross_revenue", { precision: 14, scale: 2 }).default("0").notNull(),
    netProfit: numeric("net_profit", { precision: 14, scale: 2 }).default("0").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("product_metrics_organization_id_idx").on(table.organizationId),
    index("product_metrics_org_date_idx").on(table.organizationId, table.metricDate),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  organizationMembers: many(organizationMembers),
  companies: many(companies),
  fixedCosts: many(fixedCosts),
  productMonthlyPerformance: many(productMonthlyPerformance),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  companies: many(companies),
  billingCustomers: many(billingCustomers),
  subscriptions: many(subscriptions),
  pendingCheckouts: many(pendingCheckouts),
  subscriptionEvents: many(subscriptionEvents),
  marketplaceConnections: many(marketplaceConnections),
  syncRuns: many(syncRuns),
  externalProducts: many(externalProducts),
  externalOrders: many(externalOrders),
  externalOrderItems: many(externalOrderItems),
  externalFees: many(externalFees),
  fixedCosts: many(fixedCosts),
  products: many(products),
  productCosts: many(productCosts),
  productMonthlyPerformance: many(productMonthlyPerformance),
  adCosts: many(adCosts),
  manualExpenses: many(manualExpenses),
  dailyMetrics: many(dailyMetrics),
  productMetrics: many(productMetrics),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [companies.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [companies.userId],
    references: [users.id],
  }),
  fixedCosts: many(fixedCosts),
  performanceRows: many(productMonthlyPerformance),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const billingCustomersRelations = relations(billingCustomers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [billingCustomers.organizationId],
    references: [organizations.id],
  }),
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  billingCustomer: one(billingCustomers, {
    fields: [subscriptions.billingCustomerId],
    references: [billingCustomers.id],
  }),
  events: many(subscriptionEvents),
}));

export const subscriptionEventsRelations = relations(subscriptionEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptionEvents.organizationId],
    references: [organizations.id],
  }),
  subscription: one(subscriptions, {
    fields: [subscriptionEvents.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const pendingCheckoutsRelations = relations(pendingCheckouts, ({ one }) => ({
  user: one(users, {
    fields: [pendingCheckouts.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [pendingCheckouts.organizationId],
    references: [organizations.id],
  }),
}));

export const marketplaceConnectionsRelations = relations(
  marketplaceConnections,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [marketplaceConnections.organizationId],
      references: [organizations.id],
    }),
    syncRuns: many(syncRuns),
    externalProducts: many(externalProducts),
    externalOrders: many(externalOrders),
  }),
);

export const syncRunsRelations = relations(syncRuns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [syncRuns.organizationId],
    references: [organizations.id],
  }),
  marketplaceConnection: one(marketplaceConnections, {
    fields: [syncRuns.marketplaceConnectionId],
    references: [marketplaceConnections.id],
  }),
  externalOrders: many(externalOrders),
}));

export const externalProductsRelations = relations(externalProducts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [externalProducts.organizationId],
    references: [organizations.id],
  }),
  marketplaceConnection: one(marketplaceConnections, {
    fields: [externalProducts.marketplaceConnectionId],
    references: [marketplaceConnections.id],
  }),
  linkedProduct: one(products, {
    fields: [externalProducts.linkedProductId],
    references: [products.id],
  }),
  orderItems: many(externalOrderItems),
}));

export const externalOrdersRelations = relations(externalOrders, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [externalOrders.organizationId],
    references: [organizations.id],
  }),
  marketplaceConnection: one(marketplaceConnections, {
    fields: [externalOrders.marketplaceConnectionId],
    references: [marketplaceConnections.id],
  }),
  syncRun: one(syncRuns, {
    fields: [externalOrders.syncRunId],
    references: [syncRuns.id],
  }),
  items: many(externalOrderItems),
  fees: many(externalFees),
}));

export const externalOrderItemsRelations = relations(externalOrderItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [externalOrderItems.organizationId],
    references: [organizations.id],
  }),
  externalOrder: one(externalOrders, {
    fields: [externalOrderItems.externalOrderId],
    references: [externalOrders.id],
  }),
  externalProduct: one(externalProducts, {
    fields: [externalOrderItems.externalProductId],
    references: [externalProducts.id],
  }),
}));

export const externalFeesRelations = relations(externalFees, ({ one }) => ({
  organization: one(organizations, {
    fields: [externalFees.organizationId],
    references: [organizations.id],
  }),
  externalOrder: one(externalOrders, {
    fields: [externalFees.externalOrderId],
    references: [externalOrders.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [products.organizationId],
    references: [organizations.id],
  }),
  externalProducts: many(externalProducts),
  productCosts: many(productCosts),
  adCosts: many(adCosts),
  productMetrics: many(productMetrics),
}));

export const productCostsRelations = relations(productCosts, ({ one }) => ({
  organization: one(organizations, {
    fields: [productCosts.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [productCosts.productId],
    references: [products.id],
  }),
}));

export const adCostsRelations = relations(adCosts, ({ one }) => ({
  organization: one(organizations, {
    fields: [adCosts.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [adCosts.productId],
    references: [products.id],
  }),
}));

export const manualExpensesRelations = relations(manualExpenses, ({ one }) => ({
  organization: one(organizations, {
    fields: [manualExpenses.organizationId],
    references: [organizations.id],
  }),
}));

export const productMonthlyPerformanceRelations = relations(
  productMonthlyPerformance,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [productMonthlyPerformance.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [productMonthlyPerformance.userId],
      references: [users.id],
    }),
    company: one(companies, {
      fields: [productMonthlyPerformance.companyId],
      references: [companies.id],
    }),
  }),
);

export const fixedCostsRelations = relations(fixedCosts, ({ one }) => ({
  organization: one(organizations, {
    fields: [fixedCosts.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [fixedCosts.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [fixedCosts.companyId],
    references: [companies.id],
  }),
}));

export const dailyMetricsRelations = relations(dailyMetrics, ({ one }) => ({
  organization: one(organizations, {
    fields: [dailyMetrics.organizationId],
    references: [organizations.id],
  }),
}));

export const productMetricsRelations = relations(productMetrics, ({ one }) => ({
  organization: one(organizations, {
    fields: [productMetrics.organizationId],
    references: [organizations.id],
  }),
  product: one(products, {
    fields: [productMetrics.productId],
    references: [products.id],
  }),
}));
