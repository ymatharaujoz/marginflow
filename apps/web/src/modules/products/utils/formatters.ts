import { parseProtectedNumber } from "@/lib/protected-numbers";

/** Em dash placeholder for unavailable numeric values */
const EMPTY = "\u2014";

export function formatMoney(value: number | string | null): string {
  if (value === null || value === undefined) return EMPTY;

  const numeric = parseProtectedNumber(value);

  if (numeric === null) return EMPTY;

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(numeric);
}

export function formatPercent(value: number | null, options?: { digits?: number }): string {
  if (value === null || value === undefined) return EMPTY;

  if (value === 0 || Object.is(value, -0)) {
    return "0.0%";
  }

  const digits = options?.digits ?? 1;

  return `${value.toFixed(digits)}%`;
}

export function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return EMPTY;

  return new Intl.NumberFormat("pt-BR").format(value);
}

/** Ratios displayed as multiplier, e.g. ROAS `n,nx`. */
export function formatMultiplier(value: number | null, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EMPTY;
  }

  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}x`;
}

export function formatDate(value: string | null): string {
  if (!value) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Sem hist\u00f3rico";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
