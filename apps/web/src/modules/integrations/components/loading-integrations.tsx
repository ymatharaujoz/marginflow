"use client";

import { Skeleton, Card } from "@marginflow/ui";
import { SkeletonGrid, SkeletonChart } from "@/components/ui-premium/skeleton-grid";

interface LoadingIntegrationsProps {
  cardCount?: number;
}

export function LoadingIntegrations({ cardCount = 2 }: LoadingIntegrationsProps) {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Integration Cards Skeleton */}
      <SkeletonGrid rows={1} columns={cardCount} height={280} />

      {/* Sync Section Skeleton */}
      <Card variant="outlined" className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <SkeletonChart />
        </div>
      </Card>
    </div>
  );
}
