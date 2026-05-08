import type { SyncRunRecord } from "@marginflow/types";

export function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatCounts(run: SyncRunRecord): string {
  const o = run.counts.orders;
  const p = run.counts.products;
  const i = run.counts.items;
  const f = run.counts.fees;
  return `${o} pedido${o === 1 ? "" : "s"}, ${p} produto${p === 1 ? "" : "s"}, ${i} item${i === 1 ? "" : "s"}, ${f} taxa${f === 1 ? "" : "s"}`;
}

/** Duas linhas para células de tabela (data + hora). */
export function formatStartedParts(value: string | null): { dateLine: string; timeLine: string } {
  if (!value) return { dateLine: "—", timeLine: "" };
  const d = new Date(value);
  return {
    dateLine: new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d),
    timeLine: new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(d),
  };
}

export function formatSyncDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt || !finishedAt) return "—";
  const diff = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (diff < 0) return "—";
  if (diff < 60) return `${diff}s`;
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function getSyncStatusLabel(canRun: boolean): string {
  return canRun ? "Disponível agora" : "Bloqueada";
}
