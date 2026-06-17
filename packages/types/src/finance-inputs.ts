import type { DecimalString } from "./products";

export type Company = {
  id: string;
  cnpj: string;
  razaoSocial: string;
  code: string;
  isActive: boolean;
  fixedCostDefault: DecimalString;
  taxRateDefault: DecimalString;
  createdAt: string;
  updatedAt: string;
};

export type CreateCompanyInput = {
  cnpj: string;
  razaoSocial: string;
  isActive?: boolean;
  fixedCostDefault?: DecimalString;
  taxRateDefault?: DecimalString;
};

export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export type ProductMonthlyPerformanceInput = {
  companyId: string;
  referenceMonth: string;
  channel: string;
  productName: string;
  sku: string;
  salesQuantity: number;
  returnsQuantity: number;
  unitCost: DecimalString;
  salePrice: DecimalString;
  commissionRate: DecimalString;
  shippingFee: DecimalString;
  packagingCost: DecimalString;
  advertisingCost: DecimalString;
  notes?: string | null;
};

export type ProductMonthlyPerformanceRow = ProductMonthlyPerformanceInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProductMonthlyPerformanceInput = Partial<ProductMonthlyPerformanceInput>;

export type FixedCostInput = {
  companyId: string;
  referenceMonth: string;
  name: string;
  category: string;
  amount: DecimalString;
  isRecurring?: boolean;
  notes?: string | null;
};

export type FixedCostRow = FixedCostInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateFixedCostInput = Partial<FixedCostInput>;
