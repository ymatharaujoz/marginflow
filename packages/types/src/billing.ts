export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export const BILLING_PLAN_CODES = ["start", "pro", "business"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];
export type BillingPlanCode = (typeof BILLING_PLAN_CODES)[number];

export type BillingPlan = {
  annualPrice: string;
  annualPriceId: string;
  annualSuffix: string;
  cnpjLimit: number;
  cnpjLimitLabel: string;
  code: BillingPlanCode;
  description: string;
  featured?: boolean;
  features: readonly string[];
  monthlyPrice: string;
  monthlyPriceId: string;
  monthlySuffix: string;
  name: string;
};

export const BILLING_PLANS: readonly BillingPlan[] = [
  {
    annualPrice: "R$ 999,00",
    annualPriceId: "price_1TiiHfAcc6lqNf7o1HBx8o6c",
    annualSuffix: "/ano",
    cnpjLimit: 1,
    cnpjLimitLabel: "1 CNPJ",
    code: "start",
    description: "Para iniciar com uma operacao e controlar a margem desde o primeiro CNPJ.",
    features: [
      "1 CNPJ vinculado",
      "Dashboard financeiro",
      "Integracao com marketplaces",
      "Teste gratis de 7 dias",
    ],
    monthlyPrice: "R$ 99,90",
    monthlyPriceId: "price_1TiiHEAcc6lqNf7obNTfV2UF",
    monthlySuffix: "/mes",
    name: "Start",
  },
  {
    annualPrice: "R$ 1799,00",
    annualPriceId: "price_1TiiICAcc6lqNf7olbaW6UZw",
    annualSuffix: "/ano",
    cnpjLimit: 3,
    cnpjLimitLabel: "3 CNPJs",
    code: "pro",
    description: "Para operacoes em crescimento que gerenciam mais de uma empresa.",
    featured: true,
    features: [
      "Ate 3 CNPJs vinculados",
      "Dashboard financeiro",
      "Integracao com marketplaces",
      "Suporte por email e WhatsApp",
    ],
    monthlyPrice: "R$ 179,90",
    monthlyPriceId: "price_1TiiI0Acc6lqNf7oijT1DqqH",
    monthlySuffix: "/mes",
    name: "Pro",
  },
  {
    annualPrice: "R$ 2499,00",
    annualPriceId: "price_1TiiJBAcc6lqNf7osFGYo2ko",
    annualSuffix: "/ano",
    cnpjLimit: 5,
    cnpjLimitLabel: "5 CNPJs",
    code: "business",
    description: "Para operacoes com maior estrutura e ate cinco CNPJs vinculados.",
    features: [
      "Ate 5 CNPJs vinculados",
      "Dashboard financeiro",
      "Integracao com marketplaces",
      "Prioridade no suporte",
    ],
    monthlyPrice: "R$ 249,90",
    monthlyPriceId: "price_1TiiItAcc6lqNf7oYZv2jHVt",
    monthlySuffix: "/mes",
    name: "Business",
  },
] as const;

export const BILLING_PLAN_BY_CODE: Record<BillingPlanCode, BillingPlan> = {
  business: BILLING_PLANS[2],
  pro: BILLING_PLANS[1],
  start: BILLING_PLANS[0],
};

export function isBillingPlanCode(value: string): value is BillingPlanCode {
  return (BILLING_PLAN_CODES as readonly string[]).includes(value);
}

export function getBillingPlan(code: BillingPlanCode): BillingPlan {
  return BILLING_PLAN_BY_CODE[code];
}

export function getBillingPlanByPriceId(priceId: string): BillingPlan | null {
  return (
    BILLING_PLANS.find(
      (plan) =>
        plan.monthlyPriceId === priceId || plan.annualPriceId === priceId,
    ) ?? null
  );
}

export function resolveBillingIntervalFromPriceId(
  priceId: string,
): BillingInterval | null {
  const plan = getBillingPlanByPriceId(priceId);

  if (!plan) {
    return null;
  }

  return plan.annualPriceId === priceId ? "annual" : "monthly";
}
