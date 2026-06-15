import { Module } from "@nestjs/common";
import { ProductsModule } from "@/modules/products/products.module";
import { SyncModule } from "@/modules/sync/sync.module";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";

@Module({
  imports: [ProductsModule, SyncModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
