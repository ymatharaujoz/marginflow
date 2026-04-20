import type { HTMLAttributes } from "react";

function mergeClassNames(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={mergeClassNames("mx-auto w-full max-w-6xl px-6 md:px-10", className)} {...props} />;
}
