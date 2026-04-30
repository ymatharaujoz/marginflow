export const SYNC_TIME_ZONE = "America/Sao_Paulo";

export type SyncWindowName = "morning" | "afternoon" | "evening";

export type SyncWindowState = {
  currentWindowKey: string | null;
  currentWindowLabel: string | null;
  currentWindowSlot: SyncWindowName | null;
  nextAvailableAt: string;
  syncOpen: boolean;
};

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function readLocalDateParts(date: Date): LocalDateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: SYNC_TIME_ZONE,
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value] as const));

  return {
    day: Number(valueByType.get("day") ?? "1"),
    hour: Number(valueByType.get("hour") ?? "0"),
    minute: Number(valueByType.get("minute") ?? "0"),
    month: Number(valueByType.get("month") ?? "1"),
    year: Number(valueByType.get("year") ?? "1970"),
  };
}

function formatDateKey(parts: Pick<LocalDateParts, "day" | "month" | "year">) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function plusDays(parts: Pick<LocalDateParts, "day" | "month" | "year">, amount: number) {
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));

  return {
    day: utcDate.getUTCDate(),
    month: utcDate.getUTCMonth() + 1,
    year: utcDate.getUTCFullYear(),
  };
}

function toSaoPauloIso(
  dateParts: Pick<LocalDateParts, "day" | "month" | "year">,
  hour: number,
  minute = 0,
) {
  return new Date(
    `${formatDateKey(dateParts)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`,
  ).toISOString();
}

function buildWindowState(
  parts: LocalDateParts,
  slot: SyncWindowName,
  nextAvailableAt: string,
): SyncWindowState {
  return {
    currentWindowKey: `${formatDateKey(parts)}:${slot}`,
    currentWindowLabel:
      slot === "morning" ? "Morning" : slot === "afternoon" ? "Afternoon" : "Evening",
    currentWindowSlot: slot,
    nextAvailableAt,
    syncOpen: true,
  };
}

export function resolveSyncWindowState(now: Date = new Date()): SyncWindowState {
  const parts = readLocalDateParts(now);

  if (parts.hour < 6) {
    return {
      currentWindowKey: null,
      currentWindowLabel: null,
      currentWindowSlot: null,
      nextAvailableAt: toSaoPauloIso(parts, 6),
      syncOpen: false,
    };
  }

  if (parts.hour < 12) {
    return buildWindowState(parts, "morning", toSaoPauloIso(parts, 12));
  }

  if (parts.hour < 18) {
    return buildWindowState(parts, "afternoon", toSaoPauloIso(parts, 18));
  }

  return buildWindowState(parts, "evening", toSaoPauloIso(plusDays(parts, 1), 6));
}
