import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  adCosts,
  externalFees,
  externalOrderItems,
  externalOrders,
  externalProducts,
  manualExpenses,
  marketplaceConnections,
  productCosts,
  products,
  TEMPLATE_WORKSPACE_SLUG,
  type DatabaseClient,
} from "@marginflow/database";
import { eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { OrganizationProvisioningService } from "@/modules/auth/organization-provisioning.service";
import { BillingService } from "@/modules/billing/billing.service";
import { EntitlementsService } from "@/modules/billing/entitlements.service";

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(OrganizationProvisioningService)
    private readonly organizationProvisioningService: OrganizationProvisioningService,
    @Inject(BillingService)
    private readonly billingService: BillingService,
    @Inject(EntitlementsService)
    private readonly entitlementsService: EntitlementsService,
  ) {}

  async completeOrganizationOnboarding(
    authContext: AuthenticatedRequestContext,
    input: { name: string; slug?: string | null },
  ) {
    if (authContext.organization) {
      throw new ConflictException("This user already completed onboarding.");
    }

    const templateOrganization = await this.db.query.organizations.findFirst({
      where: (table) => eq(table.slug, TEMPLATE_WORKSPACE_SLUG),
    });

    if (!templateOrganization) {
      throw new NotFoundException("Template workspace not found. Run the pending migration first.");
    }

    const [templateProducts, templateProductCosts, templateConnections, templateExternalProducts, templateExternalOrders, templateExternalOrderItems, templateExternalFees, templateAdCosts, templateManualExpenses] =
      await Promise.all([
        this.db.query.products.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
        this.db.query.productCosts.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
        this.db.query.marketplaceConnections.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
        this.db.query.externalProducts.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
        this.db.query.externalOrders.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
        this.db.query.externalOrderItems.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
        this.db.query.externalFees.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
        this.db.query.adCosts.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
        this.db.query.manualExpenses.findMany({
          where: (table) => eq(table.organizationId, templateOrganization.id),
        }),
      ]);

    const trimmedName = input.name.trim();
    if (trimmedName.length < 2) {
      throw new BadRequestException("Organization name must have at least 2 characters.");
    }

    const organizationSlug = await this.organizationProvisioningService.buildUniqueOrganizationSlug(
      input.slug?.trim() || trimmedName,
    );

    const createdOrganization = await this.db.transaction(async (tx) => {
      const membership = await this.organizationProvisioningService.createOrganizationMembershipTx(
        tx as DatabaseClient,
        authContext.user,
        {
          name: trimmedName,
          slug: organizationSlug,
        },
      );

      await this.cloneTemplateWorkspaceTx(tx as DatabaseClient, {
        organizationId: membership.organization.id,
        templateConnections,
        templateAdCosts,
        templateExternalFees,
        templateExternalOrderItems,
        templateExternalOrders,
        templateExternalProducts,
        templateManualExpenses,
        templateProductCosts,
        templateProducts,
      });

      await this.billingService.completePendingCheckoutForOrganizationTx(tx as DatabaseClient, {
        organizationId: membership.organization.id,
        userId: authContext.user.id,
      });

      return membership.organization;
    });

    const billing = await this.entitlementsService.getBillingSnapshot({
      organizationId: createdOrganization.id,
      userId: authContext.user.id,
    });

    return {
      organization: {
        id: createdOrganization.id,
        name: createdOrganization.name,
        role: "owner",
        slug: createdOrganization.slug,
      },
      billing,
    };
  }

  private async cloneTemplateWorkspaceTx(
    tx: DatabaseClient,
    input: {
      organizationId: string;
      templateProducts: Array<typeof products.$inferSelect>;
      templateProductCosts: Array<typeof productCosts.$inferSelect>;
      templateConnections: Array<typeof marketplaceConnections.$inferSelect>;
      templateExternalProducts: Array<typeof externalProducts.$inferSelect>;
      templateExternalOrders: Array<typeof externalOrders.$inferSelect>;
      templateExternalOrderItems: Array<typeof externalOrderItems.$inferSelect>;
      templateExternalFees: Array<typeof externalFees.$inferSelect>;
      templateAdCosts: Array<typeof adCosts.$inferSelect>;
      templateManualExpenses: Array<typeof manualExpenses.$inferSelect>;
    },
  ) {
    const productIdMap = new Map<string, string>();
    const connectionIdMap = new Map<string, string>();
    const externalProductIdMap = new Map<string, string>();
    const externalOrderIdMap = new Map<string, string>();

    if (input.templateProducts.length > 0) {
      await tx.insert(products).values(
        input.templateProducts.map((row) => {
          const id = randomUUID();
          productIdMap.set(row.id, id);
          return {
            id,
            organizationId: input.organizationId,
            name: row.name,
            sku: row.sku,
            sellingPrice: row.sellingPrice,
            isActive: row.isActive,
          };
        }),
      );
    }

    if (input.templateProductCosts.length > 0) {
      await tx.insert(productCosts).values(
        input.templateProductCosts.map((row) => ({
          id: randomUUID(),
          organizationId: input.organizationId,
          productId: productIdMap.get(row.productId) ?? row.productId,
          costType: row.costType,
          amount: row.amount,
          currency: row.currency,
          effectiveFrom: row.effectiveFrom,
          notes: row.notes,
        })),
      );
    }

    if (input.templateConnections.length > 0) {
      await tx.insert(marketplaceConnections).values(
        input.templateConnections.map((row) => {
          const id = randomUUID();
          connectionIdMap.set(row.id, id);
          return {
            id,
            organizationId: input.organizationId,
            provider: row.provider,
            status: row.status,
            externalAccountId: row.externalAccountId,
            accessToken: null,
            refreshToken: null,
            tokenExpiresAt: null,
            metadata: row.metadata ?? {},
            lastSyncedAt: row.lastSyncedAt,
          };
        }),
      );
    }

    if (input.templateExternalProducts.length > 0) {
      await tx.insert(externalProducts).values(
        input.templateExternalProducts.map((row) => {
          const id = randomUUID();
          externalProductIdMap.set(row.id, id);
          return {
            id,
            organizationId: input.organizationId,
            marketplaceConnectionId: row.marketplaceConnectionId
              ? connectionIdMap.get(row.marketplaceConnectionId) ?? null
              : null,
            provider: row.provider,
            externalProductId: row.externalProductId,
            sku: row.sku,
            title: row.title,
            linkedProductId: row.linkedProductId ? productIdMap.get(row.linkedProductId) ?? null : null,
            reviewStatus: row.reviewStatus,
            metadata: row.metadata ?? {},
          };
        }),
      );
    }

    if (input.templateExternalOrders.length > 0) {
      await tx.insert(externalOrders).values(
        input.templateExternalOrders.map((row) => {
          const id = randomUUID();
          externalOrderIdMap.set(row.id, id);
          return {
            id,
            organizationId: input.organizationId,
            marketplaceConnectionId: row.marketplaceConnectionId
              ? connectionIdMap.get(row.marketplaceConnectionId) ?? null
              : null,
            syncRunId: null,
            provider: row.provider,
            externalOrderId: row.externalOrderId,
            status: row.status,
            currency: row.currency,
            orderedAt: row.orderedAt,
            totalAmount: row.totalAmount,
            metadata: row.metadata ?? {},
          };
        }),
      );
    }

    if (input.templateExternalOrderItems.length > 0) {
      await tx.insert(externalOrderItems).values(
        input.templateExternalOrderItems.map((row) => ({
          id: randomUUID(),
          organizationId: input.organizationId,
          externalOrderId: externalOrderIdMap.get(row.externalOrderId) ?? row.externalOrderId,
          externalProductId: row.externalProductId
            ? externalProductIdMap.get(row.externalProductId) ?? null
            : null,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          totalPrice: row.totalPrice,
        })),
      );
    }

    if (input.templateExternalFees.length > 0) {
      await tx.insert(externalFees).values(
        input.templateExternalFees.map((row) => ({
          id: randomUUID(),
          organizationId: input.organizationId,
          externalOrderId: row.externalOrderId
            ? externalOrderIdMap.get(row.externalOrderId) ?? null
            : null,
          provider: row.provider,
          feeType: row.feeType,
          amount: row.amount,
          currency: row.currency,
          metadata: row.metadata ?? {},
        })),
      );
    }

    if (input.templateAdCosts.length > 0) {
      await tx.insert(adCosts).values(
        input.templateAdCosts.map((row) => ({
          id: randomUUID(),
          organizationId: input.organizationId,
          productId: row.productId ? productIdMap.get(row.productId) ?? null : null,
          channel: row.channel,
          amount: row.amount,
          currency: row.currency,
          spentAt: row.spentAt,
          notes: row.notes,
        })),
      );
    }

    if (input.templateManualExpenses.length > 0) {
      await tx.insert(manualExpenses).values(
        input.templateManualExpenses.map((row) => ({
          id: randomUUID(),
          organizationId: input.organizationId,
          category: row.category,
          amount: row.amount,
          currency: row.currency,
          incurredAt: row.incurredAt,
          notes: row.notes,
        })),
      );
    }
  }
}
