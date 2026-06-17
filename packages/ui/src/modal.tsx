"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "./utils";

export type ModalProps = {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  open: boolean;
  title?: ReactNode;
};

export function Modal({ children, className, onClose, open, title }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-md animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-[var(--radius-xl)] border border-border bg-surface-strong shadow-[var(--shadow-xl)] animate-rise-in",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
      >
        {title && (
          <div className="flex shrink-0 items-start justify-between border-b border-border/50 px-8 py-6">
            <div className="flex flex-col gap-1">
              {typeof title === "string" ? (
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              ) : (
                title
              )}
            </div>
            <button
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors"
              onClick={onClose}
              aria-label="Close"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className={cn("overflow-y-auto mf-scrollbar min-h-0", title ? "px-8 py-10" : "px-8 py-10")}>
          {children}
        </div>
      </div>
    </div>
  );
}
