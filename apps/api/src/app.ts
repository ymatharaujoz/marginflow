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
  buildWebAuthCompleteRedirectUrl,
  proxyBetterAuthResponse,
  readBetterAuthSessionTokenFromCookieHeader,
  sanitizeNextPath,
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
      const nextPath =
        typeof request.query === "object" &&
        request.query !== null &&
        "next" in request.query &&
        typeof request.query.next === "string"
          ? request.query.next
          : undefined;

      return startBetterAuthSocialSignIn({
        auth,
        nextPath,
        provider: "google",
        reply,
        request,
        webAppOrigin: env.WEB_APP_ORIGIN,
      });
    },
  });

  fastify.route({
    method: "GET",
    url: "/auth/finalize",
    async handler(request, reply) {
      const nextPath =
        typeof request.query === "object" &&
        request.query !== null &&
        "next" in request.query &&
        typeof request.query.next === "string"
          ? sanitizeNextPath(request.query.next)
          : "/app";
      const sessionToken = readBetterAuthSessionTokenFromCookieHeader(request.headers.cookie);

      if (!sessionToken) {
        console.error("[marginflow/api] Better Auth finalize missing session cookie.", {
          nextPath,
          origin: buildAbsoluteRequestUrl(request).origin,
          path: request.url,
        });
        reply.status(303);
        reply.header("location", `${env.WEB_APP_ORIGIN}/sign-in?auth_error=oauth_complete_failed`);
        return reply.send();
      }

      const authContext = await authService.resolveRequestContext({
        headers: request.headers,
      });

      if (!authContext) {
        console.error("[marginflow/api] Better Auth finalize could not resolve session context.", {
          nextPath,
          origin: buildAbsoluteRequestUrl(request).origin,
          path: request.url,
        });
        reply.status(303);
        reply.header("location", `${env.WEB_APP_ORIGIN}/sign-in?auth_error=oauth_complete_failed`);
        return reply.send();
      }

      const ticket = await authExchangeService.createTicket({
        organizationId: authContext.organization?.id ?? null,
        remoteSessionToken: sessionToken,
        sessionId: authContext.session.id,
        userId: authContext.user.id,
      });
      const redirectUrl = buildWebAuthCompleteRedirectUrl({
        nextPath,
        ticket,
        webAppOrigin: env.WEB_APP_ORIGIN,
      });

      console.info("[marginflow/api] Better Auth finalize redirected to web handoff.", {
        origin: buildAbsoluteRequestUrl(request).origin,
        path: request.url,
        redirectUrl,
      });

      reply.status(303);
      reply.header("location", redirectUrl);
      return reply.send();
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

      return proxyBetterAuthResponse(reply, response);
    },
  });

  await app.getHttpAdapter().getInstance().ready();

  return app;
}
