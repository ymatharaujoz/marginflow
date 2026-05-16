import type { Company } from "@marginflow/types";

const COMPANY_REQUIRED_MESSAGE =
  "Cadastre uma empresa ativa antes de salvar um produto manual com custos e impostos mensais.";
const COMPANY_SELECTION_MESSAGE =
  "Selecione a empresa que deve receber os custos e impostos mensais deste produto.";

export function getActiveCompanies(companies: Company[]) {
  return companies.filter((company) => company.isActive);
}

export function resolveManualProductCompanyState(input: {
  companies: Company[];
  preferredCompanyId: string | null;
}) {
  const activeCompanies = getActiveCompanies(input.companies);
  const hasPreferredCompany =
    input.preferredCompanyId !== null &&
    activeCompanies.some((company) => company.id === input.preferredCompanyId);

  return {
    activeCompanies,
    blockingMessage: activeCompanies.length === 0 ? COMPANY_REQUIRED_MESSAGE : null,
    requiresExplicitSelection: activeCompanies.length > 1 && !hasPreferredCompany,
    selectedCompanyId: hasPreferredCompany
      ? input.preferredCompanyId ?? ""
      : activeCompanies.length === 1
        ? activeCompanies[0]?.id ?? ""
        : "",
  };
}

export function getManualProductCompanyValidationMessage(input: {
  companies: Company[];
  companyId: string;
}) {
  const activeCompanies = getActiveCompanies(input.companies);

  if (activeCompanies.length === 0) {
    return COMPANY_REQUIRED_MESSAGE;
  }

  if (input.companyId.trim().length === 0) {
    return COMPANY_SELECTION_MESSAGE;
  }

  if (!activeCompanies.some((company) => company.id === input.companyId.trim())) {
    return "Selecione uma empresa ativa para continuar.";
  }

  return null;
}
