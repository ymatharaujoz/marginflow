import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { fromNodeHeaders } from "better-auth/node";
import { AppModule } from "./app.module";
import {
  readApiEnv,
  readTrustedOriginList,
  type ApiRuntimeEnv,
} from "@/common/config/api-env";
import { HttpExceptionFilter } from "@/common/filters/http-exception.filter";
import { ZodValidationPipe } from "@/common/pipes/zod-validation.pipe";
import { AUTH_INSTANCE } from "@/common/tokens";
import {
  buildAbsoluteRequestUrl,
  buildAuthCompleteRedirectUrl,
  proxyBetterAuthResponse,
  readBetterAuthSessionTokenFromSetCookie,
  startBetterAuthSocialSignIn,
} from "@/modules/auth/better-auth-http";
import { AuthExchangeService } from "@/modules/auth/auth-exchange.service";
import { AuthService } from "@/modules/auth/auth.service";

export async function buildApp(
  env: ApiRuntimeEnv = readApiEnv(),
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(env),
    new FastifyAdapter(),
    {
      bufferLogs: true,
      rawBody: true,
    },
  );

  await app.register(cors, {
    credentials: true,
    origin: readTrustedOriginList(env),
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());

  await app.init();

  const fastify = app.getHttpAdapter().getInstance();
  const auth = app.get(AUTH_INSTANCE) as {
    handler: (request: Request) => Promise<Response>;
  };
  const authExchangeService = app.get(AuthExchangeService);
  const authService = app.get(AuthService);

  fastify.route({
    method: "GET",
    url: "/auth/start/google",
    async handler(request, reply) {
      const callbackURL =
        typeof request.query === "object" &&
        request.query !== null &&
        "callbackURL" in request.query &&
        typeof request.query.callbackURL === "string"
          ? request.query.callbackURL
          : undefined;

      return startBetterAuthSocialSignIn({
        auth,
        callbackURL,
        provider: "google",
        reply,
        request,
        webAppOrigin: env.WEB_APP_ORIGIN,
      });
    },
  });

  fastify.route({
    method: ["GET", "POST"],
    url: "/auth/*",
    async handler(request, reply) {
      const url = buildAbsoluteRequestUrl(request);
      const headers = fromNodeHeaders(request.headers);
      const authRequest = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body !== undefined ? { body: JSON.stringify(request.body) } : {}),
      });
      const response = await auth.handler(authRequest);

      if (
        request.method === "GET" &&
        url.pathname.startsWith("/auth/callback/") &&
        response.headers.get("location")
      ) {
        const setCookieHeaders = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
          (() => {
            const header = response.headers.get("set-cookie");
            return header ? [header] : [];
          })();
        const sessionToken = readBetterAuthSessionTokenFromSetCookie(setCookieHeaders);

        if (sessionToken) {
          const authContext = await authService.resolveRequestContext({
            headers: new Headers({
              cookie: `better-auth.session_token=${sessionToken}`,
            }),
          });

          if (authContext) {
            const ticket = await authExchangeService.createTicket({
              organizationId: authContext.organization?.id ?? null,
              remoteSessionToken: sessionToken,
              sessionId: authContext.session.id,
              userId: authContext.user.id,
            });
            const redirectUrl = buildAuthCompleteRedirectUrl({
              callbackLocation: response.headers.get("location")!,
              ticket,
              webAppOrigin: env.WEB_APP_ORIGIN,
            });

            console.info("[marginflow/api] Better Auth callback redirected to web handoff.", {
              origin: url.origin,
              path: url.pathname,
              redirectUrl,
            });

            reply.raw.setHeader("set-cookie", setCookieHeaders);
            reply.status(302);
            reply.header("location", redirectUrl);
            return reply.send();
          }
        }
      }

      return proxyBetterAuthResponse(reply, response);
    },
  });

  await app.getHttpAdapter().getInstance().ready();

  return app;
}
