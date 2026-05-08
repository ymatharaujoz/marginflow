export function formatMoney(value: number | string | null | undefined, options?: { maximumFractionDigits?: number }) {
  const numeric = normalizeNumber(value);
  if (numeric === null) return "—";

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(numeric);
}

export function formatPercent(value: number | string | null | undefined, options?: { digits?: number }) {
  const numeric = normalizeNumber(value);
  if (numeric === null) return "—";

  return `${numeric.toFixed(options?.digits ?? 1)}%`;
}

export function formatNumber(value: number | string | null | undefined) {
  const numeric = normalizeNumber(value);
  if (numeric === null) return "—";

  return new Intl.NumberFormat("pt-BR").format(Math.round(numeric));
}

export function formatMoneyCompact(value: number | string | null | undefined) {
  const numeric = normalizeNumber(value);
  if (numeric === null) return "—";
  if (numeric >= 1000000) return `R$${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `R$${(numeric / 1000).toFixed(0)}k`;
  return `R$${Math.round(numeric)}`;
}

export function formatMetricDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatProviderLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Nunca sincronizado";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60) return `Há ${diffMins} min`;
  if (diffHours < 24) return `Há ${diffHours}h`;
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `Há ${diffDays} dias`;

  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function normalizeNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
