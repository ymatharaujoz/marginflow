import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { DatabaseClient } from "@marginflow/database";
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
}
