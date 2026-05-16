import type { DashboardSummaryMetrics } from "@marginflow/types";

/**
 * Mensagens vindas da API (inglês e/ou pt-BR) — normalizamos para pt-BR na interface.
 * Chaves em inglês permanecem enquanto partes do backend ainda as enviam; chaves em pt-BR
 * cobrem respostas já localizadas (ex.: integrações).
 */
const API_MESSAGES_BASE: Record<string, string> = {
  "Sync is available for the current daily window.":
    "A sincronização está disponível na janela diária atual.",
  "This daily sync window was already used. Wait for the next window to open.":
    "Esta janela diária de sincronização já foi utilizada. Aguarde a próxima janela abrir.",
  "Provider credentials are not configured in the API environment yet.":
    "As credenciais do provedor ainda não estão configuradas no ambiente da API.",
  "This provider is connected structurally but does not support live sync yet.":
    "Este provedor está ligado estruturalmente, mas ainda não oferece sincronização em tempo real.",
  "Connect this marketplace account before running the first sync.":
    "Conecte esta conta do marketplace antes de executar a primeira sincronização",
  "Stored provider token expired. Reconnect the account before syncing again.":
    "O token armazenado do provedor expirou. Reconecte a conta antes de sincronizar novamente.",
  "A sync is already in progress for this provider.":
    "Já há uma sincronização em andamento para este provedor.",
  "Sync is unavailable overnight. The next daily window opens at 06:00.":
    "A sincronização fica indisponível durante a madrugada. A próxima janela diária abre às 06:00.",

  "Mercado Livre connected successfully.": "Mercado Livre conectado com sucesso.",

  "No marketplace account is connected yet.":
    "Nenhuma conta do marketplace está conectada ainda",
  "Account connected and ready for sync.": "Conta conectada e pronta para sincronizar.",
  "Stored token expired. Reconnect this provider before the next sync.":
    "O token armazenado expirou. Reconecte este provedor antes da próxima sincronização.",
  "Account disconnected.": "Conta desconectada.",
  "Provider credentials are missing, so reconnect is unavailable right now.":
    "Faltam credenciais do provedor; não é possível reconectar neste momento.",

  "Mercado Livre is not configured in the API environment.":
    "O Mercado Livre não está configurado no ambiente da API.",
  "Mercado Livre sync is not configured in the API environment.":
    "A sincronização com o Mercado Livre não está configurada no ambiente da API.",
  "Mercado Livre connection is missing the account token required for sync.":
    "A conexão com o Mercado Livre não tem o token de conta necessário para sincronizar.",
};

/** Prefixos (inglês) retornados pela API com sufixo variável — troca só o prefixo, mantém o restante. */
const API_MESSAGE_PREFIX_PT: { en: string; pt: string }[] = [
  {
    en: "Mercado Livre token exchange failed.",
    pt: "Falha na troca de token do Mercado Livre.",
  },
  {
    en: "Mercado Livre account lookup failed.",
    pt: "Falha ao consultar a conta do Mercado Livre.",
  },
  {
    en: "Mercado Livre order fetch failed.",
    pt: "Falha ao buscar pedidos do Mercado Livre.",
  },
];

function addIdentityPtKeys(base: Record<string, string>): Record<string, string> {
  const out = { ...base };
  for (const value of Object.values(base)) {
    if (!(value in out)) {
      out[value] = value;
    }
  }
  return out;
}

const API_MESSAGES = addIdentityPtKeys(API_MESSAGES_BASE);

function translateApiMessageByPrefix(text: string): string {
  for (const { en, pt } of API_MESSAGE_PREFIX_PT) {
    if (text.startsWith(en)) {
      return pt + text.slice(en.length);
    }
  }
  return text;
}

const WINDOW_LABEL_PT: Record<string, string> = {
  Closed: "Fechada",
  Morning: "Manhã",
  Afternoon: "Tarde",
  Evening: "Noite",
};

const INTEGRATION_ACTION_BASE: Record<string, string> = {
  "Connect account": "Conectar conta",
  "Refresh connection": "Renovar autorização",
  "Reconnect account": "Reconectar conta",
  Disconnect: "Desconectar",
  Unavailable: "Indisponível",
};

const INTEGRATION_ACTION_PT = addIdentityPtKeys(INTEGRATION_ACTION_BASE);

export function translateApiMessage(text: string | null | undefined): string {
  if (text === null || text === undefined || text === "") return "";
  const trimmed = text.trim();
  return API_MESSAGES[trimmed] ?? translateApiMessageByPrefix(trimmed);
}

export function translateSyncWindowLabel(label: string | null | undefined): string {
  if (label === null || label === undefined || label === "") return "Encerrado";
  return WINDOW_LABEL_PT[label] ?? label;
}

export function translateIntegrationButtonLabel(label: string | null | undefined): string {
  if (label === null || label === undefined) return "";
  const trimmed = label.trim();
  return INTEGRATION_ACTION_PT[trimmed] ?? trimmed;
}

const CONNECTION_STATUS_PT: Record<string, string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  needs_reconnect: "Reconectar",
  unavailable: "Indisponível",
};

export function translateConnectionUiStatus(slug: string): string {
  return CONNECTION_STATUS_PT[slug] ?? "Estado desconhecido";
}

const SYNC_RUN_STATUS_BASE: Record<string, string> = {
  completed: "Concluída",
  failed: "Falhou",
  running: "Em andamento",
  pending: "Pendente",
  cancelled: "Cancelada",
  Completed: "Concluída",
  Failed: "Falhou",
  Running: "Em andamento",
  Pending: "Pendente",
  Cancelled: "Cancelada",
};

const SYNC_RUN_STATUS_PT = addIdentityPtKeys(SYNC_RUN_STATUS_BASE);

export function translateSyncRunStatus(status: string): string {
  const trimmed = status.trim();
  return SYNC_RUN_STATUS_PT[trimmed] ?? "Status desconhecido";
}

const DASHBOARD_CARD_LABEL_BASE: Record<string, string> = {
  "Gross revenue": "Receita bruta",
  "Net profit": "Lucro líquido",
  "Gross margin": "Margem bruta",
  "Break-even revenue": "Receita no ponto de equilíbrio",
};

const DASHBOARD_CARD_LABEL_PT = addIdentityPtKeys(DASHBOARD_CARD_LABEL_BASE);

export function translateDashboardCardLabel(label: string): string {
  const trimmed = label.trim();
  return DASHBOARD_CARD_LABEL_PT[trimmed] ?? trimmed;
}

export function translateDashboardCardHelper(label: string, metrics: DashboardSummaryMetrics): string {
  switch (label.trim()) {
    case "Gross revenue":
    case "Receita bruta":
      return `${metrics.ordersCount} pedidos entre ${metrics.unitsSold} unidades vendidas`;
    case "Net profit":
    case "Lucro líquido":
      return `${metrics.netRevenue} de receita líquida após descontos e reembolsos`;
    case "Gross margin":
    case "Margem bruta":
      return `${metrics.contributionMargin} de margem de contribuição`;
    case "Break-even revenue":
    case "Receita no ponto de equilíbrio":
      return `${metrics.breakEvenUnits} unidades necessárias no perfil de contribuição atual`;
    default:
      return "";
  }
}
