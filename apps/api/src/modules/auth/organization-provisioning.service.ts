import { randomUUID } from "node:crypto";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import {
  type DatabaseClient,
  organizationMembers,
  organizations,
} from "@marginflow/database";
import { DATABASE_CLIENT } from "@/common/tokens";

type AuthUser = {
  email: string;
  emailVerified: boolean;
  id: string;
  image?: string | null;
  name: string;
};

type OrganizationMembership = {
  id: string;
  name: string;
  role: string;
  slug: string;
};

@Injectable()
export class OrganizationProvisioningService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
  ) {}

  async findDefaultOrganization(userId: string): Promise<OrganizationMembership | null> {
    const existingDefaultMembership = await this.db.query.organizationMembers.findFirst({
      where: (table, { and, eq }) => and(eq(table.userId, userId), eq(table.isDefault, true)),
      with: {
        organization: true,
      },
    });

    if (existingDefaultMembership?.organization) {
      return {
        id: existingDefaultMembership.organization.id,
        name: existingDefaultMembership.organization.name,
        role: existingDefaultMembership.role,
        slug: existingDefaultMembership.organization.slug,
      };
    }

    const existingMembership = await this.db.query.organizationMembers.findFirst({
      where: (table, { eq }) => eq(table.userId, userId),
      with: {
        organization: true,
      },
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    if (existingMembership?.organization) {
      return {
        id: existingMembership.organization.id,
        name: existingMembership.organization.name,
        role: existingMembership.role,
        slug: existingMembership.organization.slug,
      };
    }

    return null;
  }

  async createOrganizationForUser(
    user: AuthUser,
    input: { name: string; slug?: string | null },
  ): Promise<OrganizationMembership> {
    const existingMembership = await this.findDefaultOrganization(user.id);

    if (existingMembership) {
      throw new ConflictException("This user already has a default organization.");
    }

    const organizationName = input.name.trim();
    const organizationSlug = await this.buildUniqueOrganizationSlug(input.slug ?? organizationName);

    const createdOrganization = await this.db.transaction(async (tx) => {
      return this.createOrganizationMembershipTx(tx as DatabaseClient, user, {
        name: organizationName,
        slug: organizationSlug,
      });
    });

    return {
      id: createdOrganization.organization.id,
      name: createdOrganization.organization.name,
      role: "owner",
      slug: createdOrganization.organization.slug,
    };
  }

  async ensureDefaultOrganization(user: AuthUser): Promise<OrganizationMembership> {
    const existingMembership = await this.findDefaultOrganization(user.id);

    if (existingMembership) {
      return existingMembership;
    }

    return this.createOrganizationForUser(user, {
      name: `${user.name?.trim() || user.email.split("@")[0]} Workspace`,
    });
  }

  async createOrganizationMembershipTx(
    tx: DatabaseClient,
    user: AuthUser,
    input: { name: string; slug: string },
  ) {
    const [organization] = await tx
      .insert(organizations)
      .values({
        name: input.name,
        slug: input.slug,
      })
      .returning({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      });

    await tx.insert(organizationMembers).values({
      isDefault: true,
      organizationId: organization.id,
      role: "owner",
      userId: user.id,
    });

    return {
      organization,
      role: "owner" as const,
    };
  }

  async buildUniqueOrganizationSlug(value: string) {
    const baseSlug = this.slugify(value);
    let candidate = baseSlug;

    while (true) {
      const existingOrganization = await this.db.query.organizations.findFirst({
        where: (table, { eq }) => eq(table.slug, candidate),
      });

      if (!existingOrganization) {
        return candidate;
      }

      candidate = `${baseSlug}-${randomUUID().slice(0, 8)}`;
    }
  }

  private slugify(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || `workspace-${randomUUID().slice(0, 8)}`;
  }
}
