import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";

const env = {
  API_HOST: "127.0.0.1",
  API_PORT: 4000,
  AUTH_TRUSTED_ORIGINS: undefined,
  BETTER_AUTH_SECRET: "secret",
  BETTER_AUTH_URL: "http://localhost:4000",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/marginflow",
  GOOGLE_CLIENT_ID: "google-client-id",
  GOOGLE_CLIENT_SECRET: "google-client-secret",
  NODE_ENV: "test",
  WEB_APP_ORIGIN: "http://localhost:3000",
} as const;

function createService({
  authSession,
  defaultMembership = null,
  existingMembership = null,
  existingOrganization = null,
}: {
  authSession?: {
    session: { id: string; expiresAt: Date };
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      emailVerified: boolean;
    };
  } | null;
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
  const auth = {
    api: {
      getSession: vi.fn().mockResolvedValue(authSession ?? null),
    },
  };

  return {
    auth,
    db,
    insertMembershipValues,
    insertOrganizationValues,
    service: new AuthService(db as never, auth as never, env),
  };
}

describe("AuthService", () => {
  it("returns null when Better Auth session is missing", async () => {
    const { service } = createService();

    const context = await service.resolveRequestContext({
      headers: new Headers(),
    });

    expect(context).toBeNull();
  });

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

  it("hydrates auth context with ensured organization scope", async () => {
    const { service } = createService({
      authSession: {
        session: {
          expiresAt: new Date("2026-04-22T00:00:00.000Z"),
          id: "session_123",
        },
        user: {
          email: "owner@marginflow.local",
          emailVerified: true,
          id: "user_123",
          image: null,
          name: "Mateus",
        },
      },
      defaultMembership: {
        organization: {
          id: "org_123",
          name: "Existing Org",
          slug: "existing-org",
        },
        role: "owner",
      },
    });

    const context = await service.resolveRequestContext({
      headers: new Headers({
        cookie: "better-auth.session_token=token",
      }),
    });

    expect(context).toEqual({
      organization: {
        id: "org_123",
        name: "Existing Org",
        role: "owner",
        slug: "existing-org",
      },
      session: {
        expiresAt: new Date("2026-04-22T00:00:00.000Z"),
        id: "session_123",
      },
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
  });
});
