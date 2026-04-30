import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { CreateCheckoutRequestDto } from "./billing.dto";
import { BillingService } from "./billing.service";
import { EntitlementsService } from "./entitlements.service";

@Controller("billing")
export class BillingController {
  constructor(
    @Inject(BillingService)
    private readonly billingService: BillingService,
    @Inject(EntitlementsService)
    private readonly entitlementsService: EntitlementsService,
  ) {}

  @Get("subscription")
  @UseGuards(AuthGuard)
  async getSubscription(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
  ) {
    return {
      data: await this.entitlementsService.getBillingSnapshot(authContext.organization.id),
      error: null,
    };
  }

  @Post("checkout")
  @UseGuards(AuthGuard)
  async createCheckoutSession(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateCheckoutRequestDto,
  ) {
    return {
      data: await this.billingService.createCheckoutSession(authContext, body.interval),
      error: null,
    };
  }

  @Post("stripe/webhook")
  @HttpCode(200)
  async handleStripeWebhook(
    @Req()
    request: {
      headers: Record<string, string | string[] | undefined>;
      rawBody?: Buffer;
    },
  ) {
    await this.billingService.processWebhook(
      request.rawBody,
      request.headers["stripe-signature"],
    );

    return {
      data: {
        received: true,
      },
      error: null,
    };
  }
}
