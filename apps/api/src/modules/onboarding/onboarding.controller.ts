import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@/modules/auth/auth.guard";
import { CurrentAuthContext } from "@/modules/auth/current-auth-context";
import type { AuthenticatedRequestContext } from "@/modules/auth/auth.types";
import { CreateOrganizationOnboardingDto } from "./onboarding.dto";
import { OnboardingService } from "./onboarding.service";

@Controller("onboarding")
export class OnboardingController {
  constructor(
    @Inject(OnboardingService)
    private readonly onboardingService: OnboardingService,
  ) {}

  @Post("organization")
  @UseGuards(AuthGuard)
  async completeOrganizationOnboarding(
    @CurrentAuthContext() authContext: AuthenticatedRequestContext,
    @Body() body: CreateOrganizationOnboardingDto,
  ) {
    return {
      data: await this.onboardingService.completeOrganizationOnboarding(authContext, body),
      error: null,
    };
  }
}
