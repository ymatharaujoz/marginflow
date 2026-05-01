import type { DashboardSummaryMetrics } from "@marginflow/types";

/** Mensagens vindas da API (inglês) exibidas no web — correspondência para pt-BR. */
const API_MESSAGES: Record<string, string> = {
  "Sync is available for the current daily window.":
    "A sincronização está disponível na janela diária atual.",
  "This daily sync window was already used. Wait for the next window to open.":
    "Esta janela diária de sincronização já foi utilizada. Aguarde a próxima janela abrir.",
  "Provider credentials are not configured in the API environment yet.":
    "As credenciais do provedor ainda não estão configuradas no ambiente da API.",
  "This provider is connected structurally but does not support live sync yet.":
    "Este provedor está ligado estruturalmente, mas ainda não oferece sincronização em tempo real.",
  "Connect this marketplace account before running the first sync.":
    "Conecte esta conta do marketplace antes de executar a primeira sincronização.",
  "Stored provider token expired. Reconnect the account before syncing again.":
    "O token armazenado do provedor expirou. Reconecte a conta antes de sincronizar novamente.",
  "A sync is already in progress for this provider.":
    "Já há uma sincronização em andamento para este provedor.",
  "Sync is unavailable overnight. The next daily window opens at 06:00.":
    "A sincronização fica indisponível durante a madrugada. A próxima janela diária abre às 06:00.",

  "Mercado Livre connected successfully.": "Mercado Livre conectado com sucesso.",

  "No marketplace account is connected yet.":
    "Nenhuma conta do marketplace está conectada ainda.",
  "Account connected and ready for sync.": "Conta conectada e pronta para sincronizar.",
  "Stored token expired. Reconnect this provider before the next sync.":
    "O token armazenado expirou. Reconecte este provedor antes da próxima sincronização.",
  "Account disconnected.": "Conta desconectada.",
  "Provider credentials are missing, so reconnect is unavailable right now.":
    "Faltam credenciais do provedor; não é possível reconectar neste momento.",
};

const WINDOW_LABEL_PT: Record<string, string> = {
  Closed: "Fechada",
  Morning: "Manhã",
  Afternoon: "Tarde",
  Evening: "Noite",
};

const INTEGRATION_ACTION_PT: Record<string, string> = {
  "Connect account": "Conectar conta",
  "Reconnect account": "Reconectar conta",
  Disconnect: "Desconectar",
  Unavailable: "Indisponível",
};

export function translateApiMessage(text: string | null | undefined): string {
  if (text === null || text === undefined || text === "") return "";
  return API_MESSAGES[text] ?? text;
}

export function translateSyncWindowLabel(label: string | null | undefined): string {
  if (label === null || label === undefined || label === "") return "Encerrado";
  return WINDOW_LABEL_PT[label] ?? label;
}

export function translateIntegrationButtonLabel(label: string | null | undefined): string {
  if (label === null || label === undefined) return "";
  return INTEGRATION_ACTION_PT[label] ?? label;
}

const CONNECTION_STATUS_PT: Record<string, string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  needs_reconnect: "Reconectar",
  unavailable: "Indisponível",
};

export function translateConnectionUiStatus(slug: string): string {
  return CONNECTION_STATUS_PT[slug] ?? slug.replace(/_/g, " ");
}

const SYNC_RUN_STATUS_PT: Record<string, string> = {
  completed: "Concluída",
  failed: "Falhou",
  running: "Em andamento",
  pending: "Pendente",
  cancelled: "Cancelada",
};

export function translateSyncRunStatus(status: string): string {
  return SYNC_RUN_STATUS_PT[status] ?? status;
}

const DASHBOARD_CARD_LABEL_PT: Record<string, string> = {
  "Gross revenue": "Receita bruta",
  "Net profit": "Lucro líquido",
  "Gross margin": "Margem bruta",
  "Break-even revenue": "Receita no ponto de equilíbrio",
};

export function translateDashboardCardLabel(label: string): string {
  return DASHBOARD_CARD_LABEL_PT[label] ?? label;
}

export function translateDashboardCardHelper(label: string, metrics: DashboardSummaryMetrics): string {
  switch (label) {
    case "Gross revenue":
      return `${metrics.ordersCount} pedidos entre ${metrics.unitsSold} unidades vendidas`;
    case "Net profit":
      return `${metrics.netRevenue} de receita líquida após descontos e reembolsos`;
    case "Gross margin":
      return `${metrics.contributionMargin} de margem de contribuição`;
    case "Break-even revenue":
      return `${metrics.breakEvenUnits} unidades necessárias no perfil de contribuição atual`;
    default:
      return "";
  }
}
