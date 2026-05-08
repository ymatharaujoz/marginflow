"use client";

import type { ImgHTMLAttributes } from "react";
import { useEffect, useState } from "react";
import { cn } from "./utils";

type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "size"> & {
  fallback?: string;
  size?: AvatarSize;
};

const sizeStyles: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function InitialsFallback({
  className,
  sizeClass,
  fallback,
  alt,
}: {
  className?: string;
  sizeClass: string;
  fallback?: string;
  alt?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-accent-soft font-semibold text-accent-strong",
        sizeClass,
        className,
      )}
      aria-label={alt}
    >
      {fallback ? getInitials(fallback) : "?"}
    </span>
  );
}

export function Avatar({
  className,
  fallback,
  size = "md",
  src,
  alt,
  referrerPolicy = "no-referrer",
  onError,
  ...props
}: AvatarProps) {
  const sizeClass = sizeStyles[size];
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [src]);

  if (!src || loadFailed) {
    return <InitialsFallback className={className} sizeClass={sizeClass} fallback={fallback} alt={alt} />;
  }

  return (
    <img
      alt={alt}
      className={cn("rounded-full object-cover", sizeClass, className)}
      src={src}
      referrerPolicy={referrerPolicy}
      onError={(event) => {
        setLoadFailed(true);
        onError?.(event);
      }}
      {...props}
    />
  );
}
