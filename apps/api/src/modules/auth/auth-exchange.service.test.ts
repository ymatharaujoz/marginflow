import { describe, expect, it, vi } from "vitest";
import { authExchangeTickets } from "@marginflow/database";
import { AuthExchangeService } from "./auth-exchange.service";

function createService() {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  const db = {
    insert: vi.fn((table: unknown) => {
      if (table !== authExchangeTickets) {
        throw new Error("Unexpected insert target.");
      }

      return {
        values: insertValues,
      };
    }),
    query: {
      authExchangeTickets: {
        findFirst: vi.fn(),
      },
      sessions: {
        findFirst: vi.fn(),
      },
    },
    transaction: vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db)),
    update: vi.fn((table: unknown) => {
      if (table !== authExchangeTickets) {
        throw new Error("Unexpected update target.");
      }

      return {
        set: updateSet,
      };
    }),
  };
  const organizationProvisioningService = {
    findDefaultOrganization: vi.fn(),
  };

  return {
    db,
    insertValues,
    organizationProvisioningService,
    service: new AuthExchangeService(db as never, organizationProvisioningService as never),
    updateSet,
  };
}

describe("AuthExchangeService", () => {
  it("creates one-time exchange tickets for authenticated Better Auth sessions", async () => {
    const { insertValues, service } = createService();

    const ticket = await service.createTicket({
      remoteSessionToken: "remote_session_token_123",
      sessionId: "session_123",
      userId: "user_123",
    });

    expect(ticket).toMatch(/[A-Za-z0-9_-]{20,}/);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteSessionToken: "remote_session_token_123",
        sessionId: "session_123",
        userId: "user_123",
      }),
    );
    expect(insertValues.mock.calls[0]?.[0]).not.toHaveProperty("organizationId");
  });

  it("includes organizationId in the insert only when an organization exists", async () => {
    const { insertValues, service } = createService();

    await service.createTicket({
      organizationId: "550e8400-e29b-41d4-a716-446655440000",
      remoteSessionToken: "remote_session_token_123",
      sessionId: "session_123",
      userId: "user_123",
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    );
  });

  it("consumes valid ticket once and returns mirrored auth payload", async () => {
    const { db, organizationProvisioningService, service } = createService();
    db.query.authExchangeTickets.findFirst.mockResolvedValue({
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      id: "exchange_123",
      remoteSessionToken: "remote_session_token_123",
      sessionId: "session_123",
      userId: "user_123",
      usedAt: null,
    });
    db.query.sessions.findFirst.mockResolvedValue({
      expiresAt: new Date("2026-12-31T00:00:00.000Z"),
      id: "session_123",
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    organizationProvisioningService.findDefaultOrganization.mockResolvedValue({
      id: "org_123",
      name: "MarginFlow",
      role: "owner",
      slug: "marginflow",
    });

    const payload = await service.consumeTicket("ticket_123");

    expect(db.query.authExchangeTickets.findFirst).toHaveBeenCalled();
    expect(db.query.sessions.findFirst).toHaveBeenCalled();
    expect(organizationProvisioningService.findDefaultOrganization).toHaveBeenCalledWith("user_123");
    expect(payload).toEqual({
      authState: {
        onboardingStatus: "complete",
        organization: {
          id: "org_123",
          name: "MarginFlow",
          role: "owner",
          slug: "marginflow",
        },
        session: {
          expiresAt: "2026-12-31T00:00:00.000Z",
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
      remoteSessionToken: "remote_session_token_123",
    });
  });

  it("accepts string timestamps from database rows when consuming ticket", async () => {
    const { db, organizationProvisioningService, service } = createService();
    db.query.authExchangeTickets.findFirst.mockResolvedValue({
      expiresAt: "2099-01-01T00:00:00.000Z",
      id: "exchange_123",
      remoteSessionToken: "remote_session_token_123",
      sessionId: "session_123",
      userId: "user_123",
      usedAt: null,
    });
    db.query.sessions.findFirst.mockResolvedValue({
      expiresAt: "2026-12-31T00:00:00.000Z",
      id: "session_123",
      user: {
        email: "owner@marginflow.local",
        emailVerified: true,
        id: "user_123",
        image: null,
        name: "Mateus",
      },
    });
    organizationProvisioningService.findDefaultOrganization.mockResolvedValue(null);

    const payload = await service.consumeTicket("ticket_123");

    expect(payload).toEqual({
      authState: {
        onboardingStatus: "organization_missing",
        organization: null,
        session: {
          expiresAt: "2026-12-31T00:00:00.000Z",
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
      remoteSessionToken: "remote_session_token_123",
    });
  });

  it("rejects ticket consumption when the stored Better Auth session row no longer exists", async () => {
    const { db, service } = createService();
    db.query.authExchangeTickets.findFirst.mockResolvedValue({
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      id: "exchange_123",
      remoteSessionToken: "remote_session_token_123",
      sessionId: "session_123",
      userId: "user_123",
      usedAt: null,
    });
    db.query.sessions.findFirst.mockResolvedValue(null);

    await expect(service.consumeTicket("ticket_123")).rejects.toThrow(
      "Remote Better Auth session is no longer valid.",
    );
  });
});
