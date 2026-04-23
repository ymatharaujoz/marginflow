import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
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

  async ensureDefaultOrganization(user: AuthUser): Promise<OrganizationMembership> {
    const existingDefaultMembership = await this.db.query.organizationMembers.findFirst({
      where: (table, { and, eq }) => and(eq(table.userId, user.id), eq(table.isDefault, true)),
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
      where: (table, { eq }) => eq(table.userId, user.id),
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

    const organizationName = this.buildOrganizationName(user);
    const organizationSlug = await this.buildUniqueOrganizationSlug(user);

    const createdOrganization = await this.db.transaction(async (tx) => {
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: organizationName,
          slug: organizationSlug,
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

      return organization;
    });

    return {
      id: createdOrganization.id,
      name: createdOrganization.name,
      role: "owner",
      slug: createdOrganization.slug,
    };
  }

  private buildOrganizationName(user: AuthUser) {
    const baseName = user.name?.trim() || user.email.split("@")[0];

    return `${baseName} Workspace`;
  }

  private async buildUniqueOrganizationSlug(user: AuthUser) {
    const baseSlug = this.slugify(user.name?.trim() || user.email.split("@")[0] || "workspace");
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
      .slice(0, 100) || "workspace";
  }
}
