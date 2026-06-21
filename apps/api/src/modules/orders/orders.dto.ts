import { orderListFiltersSchema } from "@lucreii/validation";

export class OrderListFiltersDto {
  static schema = orderListFiltersSchema;

  page?: number;
  pageSize?: number;
  search?: string;
  provider?: "mercadolivre" | "shopee" | "shein";
  status?: string;
}
