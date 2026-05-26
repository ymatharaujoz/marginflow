import { Module } from "@nestjs/common";
import { FinanceModule } from "@/modules/finance/finance.module";
import { SyncController } from "./sync.controller";
import { SyncPerformanceMaterializerService } from "./sync-performance-materializer.service";
import { SyncService } from "./sync.service";

@Module({
  imports: [FinanceModule],
  controllers: [SyncController],
  providers: [SyncService, SyncPerformanceMaterializerService],
  exports: [SyncService],
})
export class SyncModule {}
