import type { Company } from "@lucreii/types";

function parseDigitsToDecimalString(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) {
    return "0.00";
  }

  const normalized = (Number.parseInt(digits, 10) / 100).toFixed(2);
  return normalized;
}

export function formatCurrencyInput(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTaxPercentInput(rateDecimal: string) {
  const rate = Number.parseFloat(rateDecimal);
  const percent = Number.isFinite(rate) ? rate * 100 : 0;

  return percent.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyInputToNumber(value: string) {
  return Number.parseFloat(parseDigitsToDecimalString(value));
}

export function buildCompanyDefaultsPatch(input: {
  fixedCostInput: string;
  taxPercentInput: string;
}) {
  const fixedCostDefault = parseDigitsToDecimalString(input.fixedCostInput);
  const taxPercent = parseCurrencyInputToNumber(input.taxPercentInput);
  const normalizedTaxRate = (taxPercent / 100).toFixed(6);

  return {
    fixedCostDefault,
    taxRateDefault: normalizedTaxRate,
  };
}

export function getActiveCompany(companies: Company[]) {
  return companies.find((company) => company.isActive) ?? null;
}
