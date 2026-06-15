import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { authExchangeTickets, sessions } from "@marginflow/database";
import { eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { OrganizationProvisioningService } from "./organization-provisioning.service";
import type { AuthenticatedRequestContext } from "./auth.types";

const EXCHANGE_TICKET_TTL_MS = 5 * 60 * 1000;

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

type AuthExchangeRecord = {
  id: string;
  remoteSessionToken: string;
  expiresAt: Date | string;
  sessionId: string;
  userId: string;
  usedAt: Date | string | null;
};

type AuthExchangeDb = {
  insert: (table: unknown) => { values: (value: unknown) => Promise<unknown> | unknown };
  query: {
    authExchangeTickets: {
      findFirst: (input?: unknown) => Promise<AuthExchangeRecord | null>;
    };
    sessions: {
      findFirst: (input?: unknown) => Promise<{
        expiresAt: Date | string;
        id: string;
        user: {
          email: string;
          emailVerified: boolean;
          id: string;
          image: string | null;
          name: string;
        } | null;
      } | null>;
    };
  };
  transaction: <T>(callback: (tx: AuthExchangeDb) => Promise<T>) => Promise<T>;
  update: (table: unknown) => {
    set: (value: unknown) => { where: (input: unknown) => Promise<unknown> | unknown };
  };
};

@Injectable()
export class AuthExchangeService {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly db: AuthExchangeDb,
    @Inject(OrganizationProvisioningService)
    private readonly organizationProvisioningService: OrganizationProvisioningService,
  ) {}

  async createTicket(input: {
    organizationId?: string | null;
    remoteSessionToken: string;
    sessionId: string;
    userId: string;
  }) {
    const ticket = randomBytes(32).toString("base64url");
    const ticketHash = this.hashTicket(ticket);
    const insertValues = {
      expiresAt: new Date(Date.now() + EXCHANGE_TICKET_TTL_MS),
      remoteSessionToken: input.remoteSessionToken,
      sessionId: input.sessionId,
      ticketHash,
      userId: input.userId,
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    };

    await this.db.insert(authExchangeTickets).values(insertValues);

    console.info("[marginflow/api] Auth exchange ticket created.", {
      hasOrganizationId: Boolean(input.organizationId),
      sessionId: input.sessionId,
      userId: input.userId,
    });

    return ticket;
  }

  async consumeTicket(ticket: string) {
    return this.db.transaction(async (tx) => {
      const record = await tx.query.authExchangeTickets.findFirst({
        where: eq(authExchangeTickets.ticketHash, this.hashTicket(ticket)),
      });

      if (!record || record.usedAt || toDate(record.expiresAt).getTime() <= Date.now()) {
        console.warn("[marginflow/api] Auth exchange ticket rejected.", {
          code: !record ? "ticket_not_found" : record.usedAt ? "ticket_already_used" : "ticket_expired",
        });
        throw new UnauthorizedException("Invalid or expired auth exchange ticket.");
      }

      const persistedSession = await tx.query.sessions.findFirst({
        where: eq(sessions.id, record.sessionId),
        with: {
          user: true,
        },
      });

      if (!persistedSession?.user || toDate(persistedSession.expiresAt).getTime() <= Date.now()) {
        console.warn("[marginflow/api] Auth exchange ticket rejected.", {
          code: !persistedSession?.user ? "remote_session_missing" : "remote_session_expired",
          sessionId: record.sessionId,
          userId: record.userId,
        });
        throw new UnauthorizedException("Remote Better Auth session is no longer valid.");
      }

      await tx
        .update(authExchangeTickets)
        .set({
          usedAt: new Date(),
        })
        .where(eq(authExchangeTickets.id, record.id));

      console.info("[marginflow/api] Auth exchange ticket consumed.", {
        sessionId: record.sessionId,
        userId: record.userId,
      });

      const organization = await this.organizationProvisioningService.findDefaultOrganization(
        record.userId,
      );

      return {
        authState: this.toAuthState({
          organization,
          session: {
            expiresAt: toDate(persistedSession.expiresAt),
            id: persistedSession.id,
          },
          user: {
            email: persistedSession.user.email,
            emailVerified: persistedSession.user.emailVerified,
            id: persistedSession.user.id,
            image: persistedSession.user.image,
            name: persistedSession.user.name,
          },
        }),
        remoteSessionToken: record.remoteSessionToken,
      };
    });
  }

  private hashTicket(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private toAuthState(authContext: AuthenticatedRequestContext) {
    return {
      onboardingStatus: authContext.organization ? "complete" : "organization_missing",
      organization: authContext.organization,
      session: {
        expiresAt: authContext.session.expiresAt.toISOString(),
        id: authContext.session.id,
      },
      user: authContext.user,
    } as const;
  }
}
