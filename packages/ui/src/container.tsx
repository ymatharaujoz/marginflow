import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

export type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: ContainerSize;
};

const sizeStyles: Record<ContainerSize, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

export function Container({ className, size = "lg", ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 sm:px-8 md:px-10 lg:px-12 xl:px-14",
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  );
}
