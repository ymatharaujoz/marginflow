import { describe, expect, it } from "vitest";
import {
  getManualProductCompanyValidationMessage,
  resolveManualProductCompanyState,
} from "./manual-product-company-state";

describe("manual product company state", () => {
  it("blocks the flow when no active companies exist", () => {
    expect(
      resolveManualProductCompanyState({
        companies: [],
        preferredCompanyId: null,
      }),
    ).toEqual({
      activeCompanies: [],
      blockingMessage:
        "Cadastre uma empresa ativa antes de salvar um produto manual com custos e impostos mensais.",
      requiresExplicitSelection: false,
      selectedCompanyId: "",
    });
  });

  it("preselects the only active company", () => {
    expect(
      resolveManualProductCompanyState({
        companies: [
          {
            code: "MAIN",
            createdAt: "2026-05-15T10:00:00.000Z",
            id: "company_1",
            isActive: true,
            name: "Empresa Principal",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ],
        preferredCompanyId: null,
      }),
    ).toEqual(
      expect.objectContaining({
        blockingMessage: null,
        requiresExplicitSelection: false,
        selectedCompanyId: "company_1",
      }),
    );
  });

  it("requires explicit selection when multiple active companies exist", () => {
    expect(
      resolveManualProductCompanyState({
        companies: [
          {
            code: "MAIN",
            createdAt: "2026-05-15T10:00:00.000Z",
            id: "company_1",
            isActive: true,
            name: "Empresa Principal",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
          {
            code: "SHOP",
            createdAt: "2026-05-15T10:00:00.000Z",
            id: "company_2",
            isActive: true,
            name: "Filial Shop",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ],
        preferredCompanyId: null,
      }),
    ).toEqual(
      expect.objectContaining({
        blockingMessage: null,
        requiresExplicitSelection: true,
        selectedCompanyId: "",
      }),
    );
  });

  it("rejects submit when no company is selected", () => {
    expect(
      getManualProductCompanyValidationMessage({
        companies: [
          {
            code: "MAIN",
            createdAt: "2026-05-15T10:00:00.000Z",
            id: "company_1",
            isActive: true,
            name: "Empresa Principal",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
          {
            code: "SHOP",
            createdAt: "2026-05-15T10:00:00.000Z",
            id: "company_2",
            isActive: true,
            name: "Filial Shop",
            updatedAt: "2026-05-15T10:00:00.000Z",
          },
        ],
        companyId: "",
      }),
    ).toBe(
      "Selecione a empresa que deve receber os custos e impostos mensais deste produto.",
    );
  });
});
