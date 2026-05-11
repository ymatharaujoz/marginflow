import {
  companyFormSchema,
  companyUpdateSchema,
  fixedCostFiltersSchema,
  fixedCostFormSchema,
  fixedCostUpdateSchema,
  performanceFiltersSchema,
  performanceFormSchema,
  performanceUpdateSchema,
} from "@marginflow/validation";
import type {
  CompanyFormInput,
  CompanyUpdateInput,
  FixedCostFiltersInput,
  FixedCostFormInput,
  FixedCostUpdateInput,
  PerformanceFiltersInput,
  ProductMonthlyPerformanceFormInput,
  ProductMonthlyPerformanceUpdateInput,
} from "@marginflow/validation";

export class CreateCompanyRequestDto implements CompanyFormInput {
  static schema = companyFormSchema;

  code!: string;
  isActive!: boolean;
  name!: string;
}

export class UpdateCompanyRequestDto implements CompanyUpdateInput {
  static schema = companyUpdateSchema;

  code?: string;
  isActive?: boolean;
  name?: string;
}

export class ListPerformanceQueryDto implements PerformanceFiltersInput {
  static schema = performanceFiltersSchema;

  channel?: string;
  companyId!: string;
  referenceMonth!: string;
  sku?: string;
}

export class CreatePerformanceRequestDto implements ProductMonthlyPerformanceFormInput {
  static schema = performanceFormSchema;

  advertisingCost!: string;
  channel!: string;
  commissionRate!: string;
  companyId!: string;
  notes!: string | null;
  packagingCost!: string;
  productName!: string;
  referenceMonth!: string;
  returnsQuantity!: number;
  salePrice!: string;
  salesQuantity!: number;
  shippingFee!: string;
  sku!: string;
  taxRate!: string;
  unitCost!: string;
}

export class UpdatePerformanceRequestDto implements ProductMonthlyPerformanceUpdateInput {
  static schema = performanceUpdateSchema;

  advertisingCost?: string;
  channel?: string;
  commissionRate?: string;
  companyId?: string;
  notes?: string | null;
  packagingCost?: string;
  productName?: string;
  referenceMonth?: string;
  returnsQuantity?: number;
  salePrice?: string;
  salesQuantity?: number;
  shippingFee?: string;
  sku?: string;
  taxRate?: string;
  unitCost?: string;
}

export class ListFixedCostsQueryDto implements FixedCostFiltersInput {
  static schema = fixedCostFiltersSchema;

  companyId!: string;
  referenceMonth!: string;
}

export class CreateFixedCostRequestDto implements FixedCostFormInput {
  static schema = fixedCostFormSchema;

  amount!: string;
  category!: string;
  companyId!: string;
  isRecurring!: boolean;
  name!: string;
  notes!: string | null;
  referenceMonth!: string;
}

export class UpdateFixedCostRequestDto implements FixedCostUpdateInput {
  static schema = fixedCostUpdateSchema;

  amount?: string;
  category?: string;
  companyId?: string;
  isRecurring?: boolean;
  name?: string;
  notes?: string | null;
  referenceMonth?: string;
}
