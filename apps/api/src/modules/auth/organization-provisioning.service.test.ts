import { describe, expect, it, vi } from "vitest";
import { OrganizationProvisioningService } from "./organization-provisioning.service";

function createService({
  defaultMembership = null,
  existingMembership = null,
  existingOrganization = null,
}: {
  defaultMembership?: unknown;
  existingMembership?: unknown;
  existingOrganization?: unknown;
} = {}) {
  const insertMembershipValues = vi.fn();
  const insertOrganizationValues = vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([
      {
        id: "org_created",
        name: "Mateus Workspace",
        slug: "mateus",
      },
    ]),
  });
  let insertCount = 0;
  const tx = {
    insert: vi.fn(() => {
      insertCount += 1;

      if (insertCount === 1) {
        return { values: insertOrganizationValues };
      }

      return {
        values: insertMembershipValues,
      };
    }),
  };
  const db = {
    query: {
      organizationMembers: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(defaultMembership)
          .mockResolvedValueOnce(existingMembership),
      },
      organizations: {
        findFirst: vi.fn().mockResolvedValue(existingOrganization),
      },
    },
    transaction: vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
  };

  return {
    db,
    insertMembershipValues,
    insertOrganizationValues,
    service: new OrganizationProvisioningService(db as never),
  };
}

describe("OrganizationProvisioningService", () => {
  it("reuses existing default organization membership", async () => {
    const { db, service } = createService({
      defaultMembership: {
        organization: {
          id: "org_123",
          name: "Existing Org",
          slug: "existing-org",
        },
        role: "owner",
      },
    });

    const organization = await service.ensureDefaultOrganization({
      email: "owner@marginflow.local",
      emailVerified: true,
      id: "user_123",
      image: null,
      name: "Mateus",
    });

    expect(organization).toEqual({
      id: "org_123",
      name: "Existing Org",
      role: "owner",
      slug: "existing-org",
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("bootstraps default organization and owner membership on first authenticated access", async () => {
    const { db, insertMembershipValues, insertOrganizationValues, service } = createService();

    const organization = await service.ensureDefaultOrganization({
      email: "owner@marginflow.local",
      emailVerified: true,
      id: "user_123",
      image: null,
      name: "Mateus",
    });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(insertOrganizationValues).toHaveBeenCalledWith({
      name: "Mateus Workspace",
      slug: "mateus",
    });
    expect(insertMembershipValues).toHaveBeenCalledWith({
      isDefault: true,
      organizationId: "org_created",
      role: "owner",
      userId: "user_123",
    });
    expect(organization).toEqual({
      id: "org_created",
      name: "Mateus Workspace",
      role: "owner",
      slug: "mateus",
    });
  });
});
