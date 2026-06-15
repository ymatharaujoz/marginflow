import type { InputHTMLAttributes } from "react";
import { cn } from "./utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  endAdornment?: React.ReactNode;
  error?: string;
  helperText?: string;
  label?: string;
};

export function Input({
  className,
  endAdornment,
  error,
  helperText,
  id,
  label,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-sm font-medium text-foreground"
          htmlFor={inputId}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={cn(
            "h-10 w-full rounded-[var(--radius-md)] border bg-surface-strong px-3.5 text-sm text-foreground placeholder:text-muted transition-all duration-[var(--transition-fast)]",
            endAdornment ? "pr-10" : undefined,
            error
              ? "border-error focus:outline-2 focus:outline-error/30"
              : "border-border hover:border-border-strong focus:border-border-focus focus:outline-2 focus:outline-accent/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          id={inputId}
          {...props}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {endAdornment}
          </div>
        )}
      </div>
      {(error || helperText) && (
        <p
          className={cn(
            "text-xs",
            error ? "text-error" : "text-muted-foreground",
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}
