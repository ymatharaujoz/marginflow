import { and } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { createDatabaseClient } from "./client";
import { loadRepoEnv } from "./load-repo-env";

loadRepoEnv(import.meta.url);
import {
  accounts,
  billingCustomers,
  marketplaceConnections,
  organizationMembers,
  organizations,
  products,
  subscriptions,
  syncRuns,
  users,
} from "./schema";

async function run() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  const db = createDatabaseClient(connectionString);
  const organizationSlug = "demo-org";
  const userEmail = "owner@marginflow.local";

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

  await db
    .insert(users)
    .values({
      email: userEmail,
      name: "Demo Owner",
      emailVerified: true,
    })
    .onConflictDoNothing({ target: users.email });

  const user = await db.query.users.findFirst({
    where: eq(users.email, userEmail),
  });

  if (!user) {
    throw new Error("Failed to load seeded user.");
  }

  await db
    .insert(organizationMembers)
    .values({
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
      isDefault: true,
    })
    .onConflictDoNothing({
      target: [organizationMembers.userId, organizationMembers.organizationId],
    });

  const existingAccount = await db.query.accounts.findFirst({
    where: and(eq(accounts.providerId, "google"), eq(accounts.accountId, userEmail)),
  });

  if (!existingAccount) {
    await db.insert(accounts).values({
      userId: user.id,
      providerId: "google",
      accountId: userEmail,
    });
  }

  const existingProduct = await db.query.products.findFirst({
    where: and(eq(products.organizationId, organization.id), eq(products.sku, "DEMO-001")),
  });

  if (!existingProduct) {
    await db.insert(products).values({
      organizationId: organization.id,
      name: "Produto Demo",
      sku: "DEMO-001",
      sellingPrice: "129.90",
    });
  }

  await db
    .insert(billingCustomers)
    .values({
      organizationId: organization.id,
      provider: "stripe",
      externalCustomerId: "cus_demo_org",
    })
    .onConflictDoNothing({
      target: [billingCustomers.provider, billingCustomers.externalCustomerId],
    });

  const customer = await db.query.billingCustomers.findFirst({
    where: eq(billingCustomers.organizationId, organization.id),
  });

  const existingSubscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.organizationId, organization.id),
      eq(subscriptions.externalSubscriptionId, "sub_demo_org"),
    ),
  });

  if (!existingSubscription) {
    await db.insert(subscriptions).values({
      organizationId: organization.id,
      billingCustomerId: customer?.id,
      provider: "stripe",
      externalSubscriptionId: "sub_demo_org",
      planCode: "starter-monthly",
      status: "active",
      interval: "monthly",
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

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
