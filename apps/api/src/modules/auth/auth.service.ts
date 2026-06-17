import { randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  accounts,
  sessions,
  users,
  type DatabaseClient,
} from "@lucreii/database";
import { and, eq } from "drizzle-orm";
import { DATABASE_CLIENT } from "@/common/tokens";
import { AUTH_SESSION_TTL_MS, createAuthSessionToken, readApiSessionTokenFromCookieHeader } from "./auth-http";
import type { AuthenticatedRequestContext } from "./auth.types";
import { OrganizationProvisioningService } from "./organization-provisioning.service";

const CREDENTIAL_PROVIDER_ID = "credential";
const scrypt = promisify(nodeScrypt);

type SessionRecord = {
  expiresAt: Date | string;
  id: string;
  user: {
    email: string;
    emailVerified: boolean;
    id: string;
    image: string | null;
    name: string;
  } | null;
};

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly db: DatabaseClient,
    @Inject(OrganizationProvisioningService)
    private readonly organizationProvisioningService: OrganizationProvisioningService,
  ) {}

  async signUp(
    input: { email: string; name: string; password: string },
    metadata: { ipAddress?: string | null; userAgent?: string | string[] | undefined },
  ) {
    const email = normalizeEmail(input.email);
    const existingUser = await this.db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, email),
    });

    if (existingUser) {
      throw new ConflictException("User already exists.");
    }

    const userId = randomUUID();
    const sessionId = randomUUID();
    const sessionToken = createAuthSessionToken();
    const passwordHash = await this.hashPassword(input.password);
    const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS);

    await this.db.transaction(async (tx) => {
      await tx.insert(users).values({
        email,
        emailVerified: true,
        id: userId,
        image: null,
        name: input.name.trim(),
      });
      await tx.insert(accounts).values({
        accountId: email,
        id: randomUUID(),
        password: passwordHash,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId,
      });
      await tx.insert(sessions).values({
        expiresAt,
        id: sessionId,
        ipAddress: metadata.ipAddress ?? null,
        token: sessionToken,
        userAgent: this.normalizeUserAgent(metadata.userAgent),
        userId,
      });
    });

    return {
      expiresAt,
      sessionId,
      sessionToken,
      userId,
    };
  }

  async signIn(
    input: { email: string; password: string },
    metadata: { ipAddress?: string | null; userAgent?: string | string[] | undefined },
  ) {
    const email = normalizeEmail(input.email);
    const account = await this.db.query.accounts.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.accountId, email), eq(table.providerId, CREDENTIAL_PROVIDER_ID)),
      with: {
        user: true,
      },
    });

    if (!account?.user || !account.password) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const isValidPassword = await this.verifyPassword(account.password, input.password);

    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const sessionId = randomUUID();
    const sessionToken = createAuthSessionToken();
    const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS);

    await this.db.insert(sessions).values({
      expiresAt,
      id: sessionId,
      ipAddress: metadata.ipAddress ?? null,
      token: sessionToken,
      userAgent: this.normalizeUserAgent(metadata.userAgent),
      userId: account.user.id,
    });

    return {
      expiresAt,
      sessionId,
      sessionToken,
      userId: account.user.id,
    };
  }

  async signOut(
    request:
      | {
          headers: Headers;
        }
      | {
          headers: Record<string, string | string[] | undefined>;
        },
  ) {
    const token = this.readSessionToken(request);

    if (!token) {
      return;
    }

    await this.db.delete(sessions).where(eq(sessions.token, token));
  }

  async resolveRequestContext(
    request:
      | {
          headers: Record<string, string | string[] | undefined>;
        }
      | {
          headers: Headers;
        },
  ): Promise<AuthenticatedRequestContext | null> {
    const token = this.readSessionToken(request);

    if (!token) {
      return null;
    }

    const persistedSession = (await this.db.query.sessions.findFirst({
      where: (table, { eq }) => eq(table.token, token),
      with: {
        user: true,
      },
    })) as SessionRecord | null;

    if (!persistedSession?.user) {
      return null;
    }

    if (toDate(persistedSession.expiresAt).getTime() <= Date.now()) {
      await this.db.delete(sessions).where(eq(sessions.id, persistedSession.id));
      return null;
    }

    const membership = await this.organizationProvisioningService.findDefaultOrganization(
      persistedSession.user.id,
    );

    return {
      session: {
        expiresAt: toDate(persistedSession.expiresAt),
        id: persistedSession.id,
      },
      user: {
        email: persistedSession.user.email,
        emailVerified: persistedSession.user.emailVerified,
        id: persistedSession.user.id,
        image: persistedSession.user.image ?? null,
        name: persistedSession.user.name,
      },
      organization: membership,
    };
  }

  async requireRequestContext(
    request:
      | {
          headers: Record<string, string | string[] | undefined>;
        }
      | {
          headers: Headers;
        },
  ) {
    const context = await this.resolveRequestContext(request);

    if (!context) {
      throw new UnauthorizedException("Authentication required.");
    }

    return context;
  }

  requireOrganizationMembership(context: AuthenticatedRequestContext) {
    if (!context.organization?.id) {
      throw new ForbiddenException("Organization membership required.");
    }

    return context.organization;
  }

  private async hashPassword(password: string) {
    const salt = randomUUID();
    const hash = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt:${salt}:${hash.toString("hex")}`;
  }

  private async verifyPassword(storedHash: string, password: string) {
    const [algorithm, salt, expectedHashHex] = storedHash.split(":");

    if (algorithm !== "scrypt" || !salt || !expectedHashHex) {
      return false;
    }

    const actualHash = (await scrypt(password, salt, 64)) as Buffer;
    const expectedHash = Buffer.from(expectedHashHex, "hex");

    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(actualHash, expectedHash);
  }

  private normalizeUserAgent(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] ?? null : value ?? null;
  }

  private readSessionToken(
    request:
      | {
          headers: Record<string, string | string[] | undefined>;
        }
      | {
          headers: Headers;
        },
  ) {
    const cookieHeader =
      request.headers instanceof Headers
        ? request.headers.get("cookie") ?? undefined
        : request.headers.cookie;

    return readApiSessionTokenFromCookieHeader(cookieHeader);
  }
}
