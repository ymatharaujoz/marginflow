import { Module } from "@nestjs/common";
import { FinanceModule } from "@/modules/finance/finance.module";
import { SyncModule } from "@/modules/sync/sync.module";
import { CostsController } from "./costs.controller";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [FinanceModule, SyncModule],
  controllers: [ProductsController, CostsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
