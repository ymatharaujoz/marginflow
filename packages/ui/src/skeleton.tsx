import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-md)] bg-foreground/5",
        className,
      )}
      {...props}
    />
  );
}
