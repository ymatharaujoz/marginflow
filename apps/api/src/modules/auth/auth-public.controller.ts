import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  signInWithPasswordSchema,
  signUpWithPasswordSchema,
} from "@lucreii/validation";
import {
  buildClearApiSessionCookie,
  buildSetApiSessionCookie,
  buildAbsoluteRequestUrl,
  resolveApiSessionCookiePolicy,
} from "./auth-http";
import { API_RUNTIME_ENV } from "@/common/tokens";
import type { ApiRuntimeEnv } from "@/common/config/api-env";
import { AuthService } from "./auth.service";
import { AuthExchangeService } from "./auth-exchange.service";
import { OrganizationProvisioningService } from "./organization-provisioning.service";

class SignUpWithPasswordDto {
  static schema = signUpWithPasswordSchema;

  email!: string;
  name!: string;
  password!: string;
}

class SignInWithPasswordDto {
  static schema = signInWithPasswordSchema;

  email!: string;
  password!: string;
}

@Controller("auth")
export class AuthPublicController {
  constructor(
    @Inject(API_RUNTIME_ENV)
    private readonly env: ApiRuntimeEnv,
    @Inject(AuthExchangeService)
    private readonly authExchangeService: AuthExchangeService,
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(OrganizationProvisioningService)
    private readonly organizationProvisioningService: OrganizationProvisioningService,
  ) {}

  @Post("sign-up")
  async signUp(
    @Body() body: SignUpWithPasswordDto,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const result = await this.authService.signUp(body, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });
    const organization = await this.organizationProvisioningService.findDefaultOrganization(result.userId);
    const ticket = await this.authExchangeService.createTicket({
      organizationId: organization?.id ?? null,
      remoteSessionToken: result.sessionToken,
      sessionId: result.sessionId,
      userId: result.userId,
    });
    const cookiePolicy = resolveApiSessionCookiePolicy({
      isHttps: buildAbsoluteRequestUrl(request).protocol === "https:",
      nodeEnv: this.env.NODE_ENV,
    });

    console.info("[lucreii/api] Public auth sign-up issued session cookie.", {
      sameSite: cookiePolicy.sameSite,
      secure: cookiePolicy.secure,
    });

    reply
      .header(
        "set-cookie",
        buildSetApiSessionCookie({
          expiresAt: result.expiresAt,
          sameSite: cookiePolicy.sameSite,
          secure: cookiePolicy.secure,
          sessionToken: result.sessionToken,
        }),
      )
      .status(201);

    return reply.send({
      data: {
        sessionId: result.sessionId,
        ticket,
      },
      error: null,
    });
  }

  @Post("sign-in")
  @HttpCode(200)
  async signIn(
    @Body() body: SignInWithPasswordDto,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const result = await this.authService.signIn(body, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });
    const organization = await this.organizationProvisioningService.findDefaultOrganization(result.userId);
    const ticket = await this.authExchangeService.createTicket({
      organizationId: organization?.id ?? null,
      remoteSessionToken: result.sessionToken,
      sessionId: result.sessionId,
      userId: result.userId,
    });
    const cookiePolicy = resolveApiSessionCookiePolicy({
      isHttps: buildAbsoluteRequestUrl(request).protocol === "https:",
      nodeEnv: this.env.NODE_ENV,
    });

    console.info("[lucreii/api] Public auth sign-in issued session cookie.", {
      sameSite: cookiePolicy.sameSite,
      secure: cookiePolicy.secure,
    });

    reply.header(
      "set-cookie",
      buildSetApiSessionCookie({
        expiresAt: result.expiresAt,
        sameSite: cookiePolicy.sameSite,
        secure: cookiePolicy.secure,
        sessionToken: result.sessionToken,
      }),
    );

    return reply.send({
      data: {
        sessionId: result.sessionId,
        ticket,
      },
      error: null,
    });
  }

  @Post("sign-out")
  @HttpCode(200)
  async signOut(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    await this.authService.signOut({
      headers: request.headers,
    });
    const cookiePolicy = resolveApiSessionCookiePolicy({
      isHttps: buildAbsoluteRequestUrl(request).protocol === "https:",
      nodeEnv: this.env.NODE_ENV,
    });

    console.info("[lucreii/api] Public auth sign-out cleared session cookie.", {
      sameSite: cookiePolicy.sameSite,
      secure: cookiePolicy.secure,
    });

    reply.header("set-cookie", buildClearApiSessionCookie(cookiePolicy));

    return reply.send({
      data: { success: true },
      error: null,
    });
  }
}
