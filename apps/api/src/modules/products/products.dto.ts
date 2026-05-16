import {
  adCostFormSchema,
  adCostUpdateSchema,
  manualExpenseFormSchema,
  manualExpenseUpdateSchema,
  productCostFormSchema,
  productCostUpdateSchema,
  productFormSchema,
  productAnalyticsQuerySchema,
  productManualCreateSchema,
  productUpdateSchema,
} from "@marginflow/validation";
import type {
  AdCostFormInput,
  AdCostUpdateInput,
  ManualExpenseFormInput,
  ManualExpenseUpdateInput,
  ProductCostFormInput,
  ProductCostUpdateInput,
  ProductAnalyticsQueryInput,
  ProductFormInput,
  ProductManualCreateInput,
  ProductUpdateInput,
} from "@marginflow/validation";

export class CreateProductRequestDto implements ProductFormInput {
  static schema = productFormSchema;

  isActive!: boolean;
  name!: string;
  sellingPrice!: string;
  sku!: string | null;
}

export class UpdateProductRequestDto implements ProductUpdateInput {
  static schema = productUpdateSchema;

  isActive?: boolean;
  name?: string;
  sellingPrice?: string;
  sku?: string | null;
}

export class CreateManualProductRequestDto implements ProductManualCreateInput {
  static schema = productManualCreateSchema;

  initialFinance!: {
    advertisingCost: string;
    packagingCost: string;
    taxRate: string;
    unitCost: string;
  };

  product!: {
    isActive: boolean;
    name: string;
    sellingPrice: string;
    sku: string;
  };

  scope!: {
    channel: "mercadolivre";
    companyId: string;
    referenceMonth: string;
  };
}

export class ProductAnalyticsQueryDto implements ProductAnalyticsQueryInput {
  static schema = productAnalyticsQuerySchema;

  companyId?: string;
  referenceMonth?: string;
}

export class CreateProductCostRequestDto implements ProductCostFormInput {
  static schema = productCostFormSchema;

  amount!: string;
  costType!: string;
  currency!: string;
  effectiveFrom!: string | null;
  notes!: string | null;
  productId!: string;
}

export class UpdateProductCostRequestDto implements ProductCostUpdateInput {
  static schema = productCostUpdateSchema;

  amount?: string;
  costType?: string;
  currency?: string;
  effectiveFrom?: string | null;
  notes?: string | null;
  productId?: string;
}

export class CreateAdCostRequestDto implements AdCostFormInput {
  static schema = adCostFormSchema;

  amount!: string;
  channel!: string;
  currency!: string;
  notes!: string | null;
  productId!: string | null;
  spentAt!: string | null;
}

export class UpdateAdCostRequestDto implements AdCostUpdateInput {
  static schema = adCostUpdateSchema;

  amount?: string;
  channel?: string;
  currency?: string;
  notes?: string | null;
  productId?: string | null;
  spentAt?: string | null;
}

export class CreateManualExpenseRequestDto implements ManualExpenseFormInput {
  static schema = manualExpenseFormSchema;

  amount!: string;
  category!: string;
  currency!: string;
  incurredAt!: string | null;
  notes!: string | null;
}

export class UpdateManualExpenseRequestDto implements ManualExpenseUpdateInput {
  static schema = manualExpenseUpdateSchema;

  amount?: string;
  category?: string;
  currency?: string;
  incurredAt?: string | null;
  notes?: string | null;
}
