"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Command, X } from "lucide-react";
import { Button } from "@marginflow/ui";

interface SearchItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

interface SearchCommandProps {
  items: SearchItem[];
  placeholder?: string;
  shortcut?: string;
  className?: string;
}

export function SearchCommand({
  items,
  placeholder = "Buscar...",
  shortcut = "⌘K",
  className = "",
}: SearchCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.description?.toLowerCase().includes(query.toLowerCase())
  );

  // Keyboard shortcut handler
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    });
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className={`
          inline-flex items-center gap-2 rounded-[var(--radius-md)] 
          border border-border bg-surface-strong px-3 py-2
          text-sm text-muted-foreground transition-all
          hover:border-border-strong hover:text-foreground
          focus:outline-none focus:ring-2 focus:ring-accent/20
          ${className}
        `}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{placeholder}</span>
        <span className="sm:hidden">Buscar</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
          {shortcut}
        </kbd>
      </button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            {/* Command Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface shadow-[var(--shadow-xl)]">
                {/* Search Input */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="rounded p-1 text-muted-foreground hover:bg-surface-strong hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {filteredItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum resultado encontrado
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            item.onClick?.();
                            if (item.href) {
                              window.location.href = item.href;
                            }
                            setIsOpen(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left transition-colors hover:bg-surface-strong"
                        >
                          {item.icon && (
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-strong text-muted-foreground">
                              {item.icon}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              {item.label}
                            </p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-border bg-surface-strong px-1.5 py-0.5">↑↓</kbd>
                      <span>navigar</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-border bg-surface-strong px-1.5 py-0.5">↵</kbd>
                      <span>selecionar</span>
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-border bg-surface-strong px-1.5 py-0.5">Esc</kbd>
                    <span>fechar</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
