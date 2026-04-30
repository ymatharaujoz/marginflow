import { Module } from "@nestjs/common";
import { CostsController } from "./costs.controller";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  controllers: [ProductsController, CostsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
