"use client";

import { Skeleton } from "@marginflow/ui";

interface LoadingIntegrationsProps {
  cardCount?: number;
}

function MarketplaceCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-[72px] w-[72px] rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  );
}

export function LoadingIntegrations({ cardCount = 2 }: LoadingIntegrationsProps) {
  return (
    <div className="space-y-10">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="border-t border-border/60" />

      {/* Marketplaces Section Skeleton — Premium Layout */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: cardCount }).map((_, i) => (
            <MarketplaceCardSkeleton key={i} />
          ))}
        </div>
      </div>

      <div className="border-t border-border/60" />

      {/* Sync Section Skeleton */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-24 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  );
}
