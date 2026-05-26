import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { authExchangeTickets } from "@marginflow/database";
import { eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequestContext } from "./auth.types";

const EXCHANGE_TICKET_TTL_MS = 5 * 60 * 1000;

type AuthExchangeRecord = {
  id: string;
  remoteSessionToken: string;
  expiresAt: Date;
  sessionId: string;
  userId: string;
  usedAt: Date | null;
};

type AuthExchangeDb = {
  insert: (table: unknown) => { values: (value: unknown) => Promise<unknown> | unknown };
  query: {
    authExchangeTickets: {
      findFirst: (input?: unknown) => Promise<AuthExchangeRecord | null>;
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
    private readonly authService: AuthService,
  ) {}

  async createTicket(input: {
    organizationId?: string | null;
    remoteSessionToken: string;
    sessionId: string;
    userId: string;
  }) {
    const ticket = randomBytes(32).toString("base64url");
    const ticketHash = this.hashTicket(ticket);

    await this.db.insert(authExchangeTickets).values({
      expiresAt: new Date(Date.now() + EXCHANGE_TICKET_TTL_MS),
      organizationId: input.organizationId ?? null,
      remoteSessionToken: input.remoteSessionToken,
      sessionId: input.sessionId,
      ticketHash,
      userId: input.userId,
    });

    console.info("[marginflow/api] Auth exchange ticket created.", {
      organizationId: input.organizationId ?? null,
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

      if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
        console.warn("[marginflow/api] Auth exchange ticket rejected.", {
          code: !record ? "ticket_not_found" : record.usedAt ? "ticket_already_used" : "ticket_expired",
        });
        throw new UnauthorizedException("Invalid or expired auth exchange ticket.");
      }

      const authContext = await this.authService.resolveRequestContext({
        headers: new Headers({
          cookie: `better-auth.session_token=${record.remoteSessionToken}`,
        }),
      });

      if (!authContext) {
        console.warn("[marginflow/api] Auth exchange ticket rejected.", {
          code: "remote_session_invalid",
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

      return {
        authState: this.toAuthState(authContext),
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
