import { orderListFiltersSchema } from "@lucreii/validation";
import type { OrderCanonicalStatus } from "@lucreii/types";

export class OrderListFiltersDto {
  static schema = orderListFiltersSchema;

  page?: number;
  pageSize?: number;
  search?: string;
  provider?: "mercadolivre" | "shopee" | "shein";
  status?: OrderCanonicalStatus;
}
