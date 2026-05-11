import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies.controller";
import { FinanceInputsService } from "./finance-inputs.service";
import { FixedCostsController } from "./fixed-costs.controller";
import { PerformanceController } from "./performance.controller";

@Module({
  controllers: [CompaniesController, PerformanceController, FixedCostsController],
  providers: [FinanceInputsService],
  exports: [FinanceInputsService],
})
export class FinanceInputsModule {}
