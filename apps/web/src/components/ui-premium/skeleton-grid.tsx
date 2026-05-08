"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@marginflow/ui";

interface SkeletonGridProps {
  rows?: number;
  columns?: number;
  height?: number;
  className?: string;
}

export function SkeletonGrid({
  rows = 2,
  columns = 4,
  height = 120,
  className = "",
}: SkeletonGridProps) {
  const items = Array.from({ length: rows * columns });
  
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns as keyof typeof gridCols] || "grid-cols-4"} ${className}`}>
      {items.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <Skeleton 
            className="w-full rounded-[var(--radius-lg)]" 
            style={{ height }}
          />
        </motion.div>
      ))}
    </div>
  );
}

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-border bg-surface-strong p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5 rounded-md" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      {lines > 1 && (
        <>
          <Skeleton className="h-3 w-20 mb-1" />
          {lines > 2 && <Skeleton className="h-3 w-16" />}
        </>
      )}
    </div>
  );
}

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-border bg-surface-strong p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="w-full rounded-[var(--radius-md)]" style={{ height: 240 }} />
    </div>
  );
}
