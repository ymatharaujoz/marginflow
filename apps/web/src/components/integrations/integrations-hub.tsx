"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button, Card } from "@marginflow/ui";
import type {
  IntegrationConnectionRecord,
  IntegrationConnectResponse,
  IntegrationProviderSlug,
  RunSyncResponse,
  SyncRunRecord,
  SyncStatusResponse,
} from "@marginflow/types";
import { ApiClientError, apiClient } from "@/lib/api/client";

const integrationsQueryKey = ["integrations"] as const;
const syncProvider: IntegrationProviderSlug = "mercadolivre";
const syncStatusQueryKey = ["sync-status", syncProvider] as const;
const syncHistoryQueryKey = ["sync-history", syncProvider] as const;

type IntegrationsHubProps = {
  initialMessage: string | null;
  initialStatus: "error" | "success" | null;
  organizationName: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCounts(run: SyncRunRecord) {
  return `${run.counts.orders} order${run.counts.orders === 1 ? "" : "s"}, ${run.counts.products} product${run.counts.products === 1 ? "" : "s"}, ${run.counts.items} item${run.counts.items === 1 ? "" : "s"}, ${run.counts.fees} fee${run.counts.fees === 1 ? "" : "s"}`;
}

async function fetchIntegrations(): Promise<IntegrationConnectionRecord[]> {
  const response = await apiClient.get<{ data: IntegrationConnectionRecord[]; error: null }>(
    "/integrations",
  );

  return response.data;
}

async function fetchSyncStatus(): Promise<SyncStatusResponse> {
  const response = await apiClient.get<{ data: SyncStatusResponse; error: null }>(
    `/sync/status?provider=${syncProvider}`,
  );

  return response.data;
}

async function fetchSyncHistory(): Promise<SyncRunRecord[]> {
  const response = await apiClient.get<{ data: SyncRunRecord[]; error: null }>(
    `/sync/history?provider=${syncProvider}`,
  );

  return response.data;
}

export function IntegrationsHub({
  initialMessage,
  initialStatus,
  organizationName,
}: IntegrationsHubProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [messageTone, setMessageTone] = useState<"critical" | "neutral">(
    initialStatus === "error" ? "critical" : "neutral",
  );
  const [busyProvider, setBusyProvider] = useState<IntegrationProviderSlug | null>(null);
  const [busyAction, setBusyAction] = useState<"connect" | "disconnect" | null>(null);

  const integrationsQuery = useQuery({
    queryFn: fetchIntegrations,
    queryKey: integrationsQueryKey,
  });
  const syncStatusQuery = useQuery({
    queryFn: fetchSyncStatus,
    queryKey: syncStatusQueryKey,
  });
  const syncHistoryQuery = useQuery({
    queryFn: fetchSyncHistory,
    queryKey: syncHistoryQueryKey,
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderSlug) => {
      const response = await apiClient.post<{ data: IntegrationConnectResponse; error: null }>(
        `/${["integrations", provider, "connect"].join("/")}`,
      );

      return response.data;
    },
    onError: (error) => {
      setMessage(
        error instanceof ApiClientError ? error.message : "Could not start the provider connection.",
      );
      setMessageTone("critical");
    },
    onSuccess: (data) => {
      window.location.assign(data.authorizationUrl);
    },
    onSettled: () => {
      setBusyAction(null);
      setBusyProvider(null);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderSlug) => {
      const response = await apiClient.post<{ data: IntegrationConnectionRecord; error: null }>(
        `/${["integrations", provider, "disconnect"].join("/")}`,
      );

      return response.data;
    },
    onError: (error) => {
      setMessage(
        error instanceof ApiClientError ? error.message : "Could not disconnect the provider.",
      );
      setMessageTone("critical");
    },
    onSuccess: async (record) => {
      setMessage(`${record.displayName} disconnected locally.`);
      setMessageTone("neutral");
      await queryClient.invalidateQueries({ queryKey: integrationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncStatusQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncHistoryQueryKey });
    },
    onSettled: () => {
      setBusyAction(null);
      setBusyProvider(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ data: RunSyncResponse; error: null }>("/sync/run", {
        body: {
          provider: syncProvider,
        },
      });

      return response.data;
    },
    onError: (error) => {
      setMessage(error instanceof ApiClientError ? error.message : "Could not start the sync.");
      setMessageTone("critical");
    },
    onSuccess: async (data) => {
      setMessage(
        `Sync finished with ${data.run.counts.orders} imported order${data.run.counts.orders === 1 ? "" : "s"}.`,
      );
      setMessageTone("neutral");
      await queryClient.invalidateQueries({ queryKey: integrationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncStatusQueryKey });
      await queryClient.invalidateQueries({ queryKey: syncHistoryQueryKey });
    },
  });

  function handleConnect(provider: IntegrationProviderSlug) {
    setBusyAction("connect");
    setBusyProvider(provider);
    setMessage(null);
    connectMutation.mutate(provider);
  }

  function handleDisconnect(provider: IntegrationProviderSlug) {
    setBusyAction("disconnect");
    setBusyProvider(provider);
    setMessage(null);
    disconnectMutation.mutate(provider);
  }

  const mercadoLivreConnection = integrationsQuery.data?.find(
    (connection) => connection.provider === syncProvider,
  );
  const syncStatus = syncStatusQuery.data;
  const syncHistory = syncHistoryQuery.data ?? [];
  const syncUnavailable =
    mercadoLivreConnection?.status === "unavailable" || syncStatus?.availability.reason === "provider_unavailable";

  return (
    <main className="space-y-6 py-6 md:py-8">
      <Card className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Marketplace connections
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Connect {organizationName} to the channels that feed MarginFlow.
        </h1>
        <p className="max-w-3xl text-base leading-8 text-foreground-soft">
          M10 introduces provider boundaries plus a first dedicated workspace page for marketplace
          account connections. Start with Mercado Livre now; Shopee stays mapped into the same
          architecture without pretending the live credentials already exist.
        </p>

        {message ? (
          <p
            className={
              messageTone === "critical"
                ? "rounded-[var(--radius-md)] border border-[color:rgba(220,38,38,0.22)] bg-[color:rgba(220,38,38,0.08)] px-4 py-3 text-sm text-foreground"
                : "rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-3 text-sm text-foreground"
            }
          >
            {message}
          </p>
        ) : null}
      </Card>

      {integrationsQuery.isLoading ? (
        <Card>
          <p className="text-lg font-semibold text-foreground">Loading provider connections...</p>
        </Card>
      ) : null}

      {integrationsQuery.error ? (
        <Card>
          <p className="text-lg font-semibold text-foreground">
            We could not load your provider connections.
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground-soft">
            {integrationsQuery.error instanceof Error
              ? integrationsQuery.error.message
              : "Unexpected connection error."}
          </p>
        </Card>
      ) : null}

      {integrationsQuery.data ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {integrationsQuery.data.map((connection) => {
            const isConnecting =
              busyAction === "connect" && busyProvider === connection.provider;
            const isDisconnecting =
              busyAction === "disconnect" && busyProvider === connection.provider;
            const connectedAccount = connection.connectedAccountLabel ?? connection.connectedAccountId;

            return (
              <Card
                key={connection.provider}
                className="border-border bg-surface shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                        {connection.provider}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-foreground">
                        {connection.displayName}
                      </h2>
                    </div>
                    <p className="text-sm leading-7 text-foreground-soft">
                      {connection.statusMessage}
                    </p>
                  </div>

                  <div className="rounded-full border border-border bg-background-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground-soft">
                    {connection.status.replaceAll("_", " ")}
                  </div>
                </div>

                <dl className="mt-6 grid gap-4 text-sm text-foreground-soft md:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      Account
                    </dt>
                    <dd className="mt-2 text-sm text-foreground">
                      {connectedAccount ?? "No account connected"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      Token expires
                    </dt>
                    <dd className="mt-2 text-sm text-foreground">
                      {formatDateTime(connection.tokenExpiresAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      Last sync
                    </dt>
                    <dd className="mt-2 text-sm text-foreground">
                      {formatDateTime(connection.lastSyncedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                      Actions
                    </dt>
                    <dd className="mt-2 text-sm text-foreground">
                      {connection.connectAvailable || connection.disconnectAvailable
                        ? "Connection controls ready"
                        : "No live action available yet"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button
                    disabled={
                      !connection.connectAvailable ||
                      busyProvider !== null ||
                      integrationsQuery.isFetching
                    }
                    onClick={() => handleConnect(connection.provider)}
                  >
                    {isConnecting ? "Opening provider..." : connection.connectLabel}
                  </Button>
                  {connection.disconnectAvailable ? (
                    <Button
                      disabled={busyProvider !== null || integrationsQuery.isFetching}
                      onClick={() => handleDisconnect(connection.provider)}
                      variant="secondary"
                    >
                      {isDisconnecting
                        ? "Disconnecting..."
                        : (connection.disconnectLabel ?? "Disconnect")}
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Card className="space-y-5 border-border bg-surface shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Manual sync
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-foreground">Mercado Livre sync control</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-foreground-soft">
              M11 keeps V1 sync manual and bounded. Run one sync per daily window, surface the
              last result clearly, and let finance metrics re-materialize after each successful
              import.
            </p>
          </div>
          <Button
            disabled={
              syncMutation.isPending ||
              syncStatusQuery.isLoading ||
              !syncStatus?.availability.canRun ||
              Boolean(syncUnavailable)
            }
            onClick={() => {
              setMessage(null);
              syncMutation.mutate();
            }}
          >
            {syncMutation.isPending ? "Syncing..." : "Sync data now"}
          </Button>
        </div>

        {syncStatusQuery.isLoading ? (
          <p className="text-sm text-foreground-soft">Loading sync availability...</p>
        ) : null}

        {syncStatusQuery.error ? (
          <div className="rounded-[var(--radius-md)] border border-[color:rgba(220,38,38,0.22)] bg-[color:rgba(220,38,38,0.08)] px-4 py-3 text-sm text-foreground">
            {syncStatusQuery.error instanceof Error
              ? syncStatusQuery.error.message
              : "Unexpected sync status error."}
          </div>
        ) : null}

        {syncStatus ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Availability
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {syncStatus.availability.canRun ? "Available now" : "Blocked"}
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                {syncStatus.availability.message}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Current window
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {syncStatus.availability.currentWindowLabel ?? "Closed right now"}
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                Next window or retry moment: {formatDateTime(syncStatus.availability.nextAvailableAt)}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Last successful sync
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {formatDateTime(syncStatus.availability.lastSuccessfulSyncAt)}
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                {syncStatus.lastCompletedRun
                  ? formatCounts(syncStatus.lastCompletedRun)
                  : "No completed imports recorded yet."}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Active run
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {syncStatus.activeRun ? syncStatus.activeRun.status : "No active run"}
              </p>
              <p className="mt-2 text-sm leading-7 text-foreground-soft">
                {syncStatus.activeRun?.startedAt
                  ? `Started ${formatDateTime(syncStatus.activeRun.startedAt)}`
                  : "Ready to start when the provider and window allow it."}
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                Recent sync history
              </p>
              <p className="mt-1 text-sm text-foreground-soft">
                Reverse chronological runs for Mercado Livre in this workspace.
              </p>
            </div>
            {mercadoLivreConnection ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-soft">
                Provider status: {mercadoLivreConnection.status.replaceAll("_", " ")}
              </p>
            ) : null}
          </div>

          {syncHistoryQuery.isLoading ? (
            <p className="text-sm text-foreground-soft">Loading sync history...</p>
          ) : null}

          {syncHistoryQuery.error ? (
            <div className="rounded-[var(--radius-md)] border border-[color:rgba(220,38,38,0.22)] bg-[color:rgba(220,38,38,0.08)] px-4 py-3 text-sm text-foreground">
              {syncHistoryQuery.error instanceof Error
                ? syncHistoryQuery.error.message
                : "Unexpected sync history error."}
            </div>
          ) : null}

          {syncHistory.length === 0 && !syncHistoryQuery.isLoading ? (
            <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-background-soft px-4 py-4 text-sm leading-7 text-foreground-soft">
              No sync runs recorded yet. Connect Mercado Livre, wait for an open daily window, and
              start the first manual import from this page.
            </div>
          ) : null}

          {syncHistory.length > 0 ? (
            <div className="grid gap-3">
              {syncHistory.map((run) => (
                <div
                  key={run.id}
                  className="rounded-[var(--radius-md)] border border-border bg-background-soft px-4 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {run.status} · {run.windowKey ?? "window unavailable"}
                      </p>
                      <p className="mt-1 text-sm text-foreground-soft">
                        Started {formatDateTime(run.startedAt)} and finished {formatDateTime(run.finishedAt)}
                      </p>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-soft">
                      {formatCounts(run)}
                    </p>
                  </div>
                  {run.errorSummary ? (
                    <p className="mt-3 text-sm leading-7 text-foreground">{run.errorSummary}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
