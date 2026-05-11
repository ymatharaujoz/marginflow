import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationsHub } from "./integrations-hub";

const reactQueryMocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useMutation: vi.fn(() => ({
    isPending: false,
    mutate: vi.fn(),
  })),
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: reactQueryMocks.useMutation,
  useQuery: reactQueryMocks.useQuery,
  useQueryClient: () => ({
    invalidateQueries: reactQueryMocks.invalidateQueries,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("IntegrationsHub", () => {
  function mockQueryByKey() {
    reactQueryMocks.useQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "integrations") {
        return {
          data: [
            {
              connectAvailable: true,
              connectLabel: "Connect account",
              connectedAccountId: null,
              connectedAccountLabel: null,
              disconnectAvailable: false,
              disconnectLabel: null,
              displayName: "Mercado Livre",
              lastSyncedAt: null,
              provider: "mercadolivre",
              status: "disconnected",
              statusMessage: "No marketplace account is connected yet.",
              tokenExpiresAt: null,
            },
          ],
          error: null,
          isFetching: false,
          isLoading: false,
        };
      }

      if (queryKey[0] === "sync-status") {
        return {
          data: {
            activeRun: null,
            availability: {
              canRun: true,
              currentWindowKey: "2026-05-01:morning",
              currentWindowLabel: "Morning",
              currentWindowSlot: "morning",
              lastSuccessfulSyncAt: null,
              message: "Sync is available for the current daily window.",
              nextAvailableAt: "2026-05-01T15:00:00.000Z",
              provider: "mercadolivre",
              reason: "available",
            },
            lastCompletedRun: null,
          },
          error: null,
          isFetching: false,
          isLoading: false,
        };
      }

      return {
        data: [],
        error: null,
        isFetching: false,
        isLoading: false,
      };
    });
  }

  beforeEach(() => {
    reactQueryMocks.invalidateQueries.mockReset();
    reactQueryMocks.useMutation.mockClear();
    reactQueryMocks.useQuery.mockReset();
  });

  it("renders provider cards and callback feedback", () => {
    mockQueryByKey();

    const markup = renderToStaticMarkup(
      <IntegrationsHub
        initialMessage="Mercado Livre conectado com sucesso."
        initialStatus="success"
        organizationName="MarginFlow"
      />,
    );

    expect(markup).toContain("Integrações");
    expect(markup).toContain("Mercado Livre");
    expect(markup).toContain("Conectar");
    expect(markup).toContain("Mercado Livre conectado com sucesso.");
    expect(markup).toContain("Status da Sincronização");
    expect(markup).toContain("Histórico de Sincronizações");
  });

  it("renders the API failure state", () => {
    reactQueryMocks.useQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === "integrations") {
        return {
          data: null,
          error: new Error("Boom"),
          isFetching: false,
          isLoading: false,
        };
      }

      return {
        data: null,
        error: null,
        isFetching: false,
        isLoading: false,
      };
    });

    const markup = renderToStaticMarkup(
      <IntegrationsHub initialMessage={null} initialStatus={null} organizationName="MarginFlow" />,
    );

    expect(markup).toContain("Erro ao carregar dados");
    expect(markup).toContain("Não foi possível carregar os dados de integrações.");
  });
});
