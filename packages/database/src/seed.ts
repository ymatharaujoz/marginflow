import { and, eq, inArray } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { createDatabaseClient } from "./client";
import { createPostgresConnection } from "./connection";
import { readMigrationDatabaseUrl } from "./database-url";
import { loadRepoEnv } from "./load-repo-env";
import {
  companies,
  marketplaceConnections,
  organizationMembers,
  organizations,
  products,
  productMonthlyPerformance,
  subscriptions,
  syncRuns,
  users,
} from "./schema";
import { buildGestaoSeedRows, type GestaoSeedSource } from "./seed-data";
import { readSeedUserId } from "./seed-config";

loadRepoEnv(import.meta.url);

async function run() {
  const connectionString = readMigrationDatabaseUrl();

  const sql = createPostgresConnection(connectionString);

  try {
    const db = createDatabaseClient(sql);
    await seedDatabase(db);

    console.info("Database seed finished.");
  } finally {
    await sql.end({ timeout: 10 });
  }
}

async function seedDatabase(
  db: ReturnType<typeof createDatabaseClient>,
) {
  const organizationSlug = "demo-org";
  const seededUserId = readSeedUserId();

  await db
    .insert(organizations)
    .values({
      name: "Demo Organization",
      slug: organizationSlug,
    })
    .onConflictDoNothing({ target: organizations.slug });

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.slug, organizationSlug),
  });

  if (!organization) {
    throw new Error("Failed to load seeded organization.");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, seededUserId),
  });

  if (!user) {
    throw new Error(
      `Seed user not found. Create the user first and set SEED_USER_ID=${seededUserId}.`,
    );
  }

  await db
    .insert(companies)
    .values({
      code: "GESTAO",
      isActive: true,
      name: "Gestao Abril e Maio",
      organizationId: organization.id,
      userId: user.id,
    })
    .onConflictDoNothing({
      target: [companies.organizationId, companies.code],
    });

  const company = await db.query.companies.findFirst({
    where: and(eq(companies.organizationId, organization.id), eq(companies.code, "GESTAO")),
  });

  if (!company) {
    throw new Error("Failed to load seeded company.");
  }

  await db
    .insert(organizationMembers)
    .values({
      organizationId: organization.id,
      userId: seededUserId,
      role: "owner",
      isDefault: true,
    })
    .onConflictDoNothing({
      target: [organizationMembers.userId, organizationMembers.organizationId],
    });

  const existingSubscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.organizationId, organization.id),
      eq(subscriptions.externalSubscriptionId, "sub_demo_org"),
    ),
  });

  if (!existingSubscription) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db.insert(subscriptions).values({
      organizationId: organization.id,
      billingCustomerId: null,
      provider: "stripe",
      externalSubscriptionId: "sub_demo_org",
      planCode: "starter-monthly",
      status: "active",
      interval: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
  }

  const gestaoSeed = buildGestaoSeedRows(
    await readGestaoSeedSource(),
    {
      organizationId: organization.id,
      userId: user.id,
    },
  );

  const existingProducts = await db.query.products.findMany({
    columns: {
      sku: true,
    },
    where: and(
      eq(products.organizationId, organization.id),
      inArray(products.sku, gestaoSeed.productRows.map((row) => row.sku)),
    ),
  });
  const existingProductSkus = new Set(existingProducts.map((row) => row.sku).filter(Boolean));

  for (const row of gestaoSeed.productRows) {
    if (existingProductSkus.has(row.sku)) {
      continue;
    }

    await db.insert(products).values(row);
  }

  const existingPerformanceRows = await db.query.productMonthlyPerformance.findMany({
    columns: {
      channel: true,
      companyId: true,
      referenceMonth: true,
      sku: true,
    },
    where: and(eq(productMonthlyPerformance.organizationId, organization.id), eq(productMonthlyPerformance.userId, user.id)),
  });
  const existingPerformanceKeys = new Set(
    existingPerformanceRows.map((row) => `${row.companyId}:${row.referenceMonth}:${row.channel}:${row.sku}`),
  );

  for (const row of gestaoSeed.performanceRows) {
    const performanceKey = `${company.id}:${row.referenceMonth}:${row.channel}:${row.sku}`;

    if (existingPerformanceKeys.has(performanceKey)) {
      continue;
    }

    await db.insert(productMonthlyPerformance).values({
      advertisingCost: row.advertisingCost,
      channel: row.channel,
      commissionRate: row.commissionRate,
      companyId: company.id,
      notes: `Importado de dados_gestao_abril_maio.json (${row.companyCode})`,
      organizationId: row.organizationId,
      packagingCost: row.packagingCost,
      productName: row.productName,
      referenceMonth: row.referenceMonth,
      returnsQuantity: row.returnsQuantity,
      salePrice: row.salePrice,
      salesQuantity: row.salesQuantity,
      shippingFee: row.shippingFee,
      sku: row.sku,
      taxRate: row.taxRate,
      unitCost: row.unitCost,
      userId: row.userId,
    });
  }

  await db
    .insert(marketplaceConnections)
    .values({
      organizationId: organization.id,
      provider: "mercadolivre",
      status: "connected",
      externalAccountId: "ml-demo-store",
    })
    .onConflictDoNothing({
      target: [marketplaceConnections.organizationId, marketplaceConnections.provider],
    });

  const existingSyncRun = await db.query.syncRuns.findFirst({
    where: and(
      eq(syncRuns.organizationId, organization.id),
      eq(syncRuns.provider, "mercadolivre"),
      eq(syncRuns.windowKey, "2026-04-20-morning"),
    ),
  });

  if (!existingSyncRun) {
    await db.insert(syncRuns).values({
      organizationId: organization.id,
      provider: "mercadolivre",
      status: "completed",
      windowKey: "2026-04-20-morning",
      startedAt: new Date("2026-04-20T09:00:00.000Z"),
      finishedAt: new Date("2026-04-20T09:01:00.000Z"),
    });
  }
}

async function readGestaoSeedSource() {
  const seedFile = new URL("../../../dados_gestao_abril_maio.json", import.meta.url);
  const raw = await readFile(seedFile, "utf8");
  return JSON.parse(raw) as GestaoSeedSource;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
