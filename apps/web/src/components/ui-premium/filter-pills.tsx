"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}

export function FilterPills({
  options,
  selected,
  onChange,
  className = "",
}: FilterPillsProps) {
  const toggleFilter = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = () => onChange([]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => toggleFilter(option.value)}
            type="button"
            className={`
              relative inline-flex items-center gap-1.5 rounded-[var(--radius-full)]
              px-3 py-1.5 text-xs font-medium transition-all duration-[var(--transition-fast)]
              ${isSelected 
                ? "bg-accent text-white shadow-[var(--shadow-xs)]" 
                : "bg-surface-strong text-muted-foreground hover:text-foreground border border-border hover:border-border-strong"
              }
            `}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={`
                inline-flex items-center justify-center rounded-full px-1.5 py-0 text-[10px]
                ${isSelected ? "bg-white/20 text-white" : "bg-foreground/10 text-foreground-soft"}
              `}>
                {option.count}
              </span>
            )}
            {isSelected && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-0.5"
              >
                <X className="h-3 w-3" />
              </motion.span>
            )}
          </button>
        );
      })}
      
      {selected.length > 0 && (
        <button
          onClick={clearAll}
          type="button"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
