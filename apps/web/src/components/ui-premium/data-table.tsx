"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";

type SortDirection = "asc" | "desc" | null;

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  sortable?: boolean;
  className?: string;
  rowClassName?: string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  sortable = true,
  className = "",
  rowClassName = "",
  onRowClick,
  emptyState,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: SortDirection;
  } | null>(null);

  const handleSort = (column: Column<T>) => {
    if (!sortable || !column.sortable) return;

    const key = String(column.key);
    let direction: SortDirection = "asc";

    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig?.key === key && sortConfig.direction === "desc") {
      direction = null;
    }

    setSortConfig(direction ? { key, direction } : null);
  };

  const sortedData = sortConfig
    ? [...data].sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T];
        const bValue = b[sortConfig.key as keyof T];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc"
            ? aValue - bValue
            : bValue - aValue;
        }

        return 0;
      })
    : data;

  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={`w-full overflow-x-auto rounded-[var(--radius-lg)] border border-border ${className}`}>
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border bg-surface-strong/95 backdrop-blur-sm">
            {columns.map((column) => (
              <th
                key={String(column.key)}
                onClick={() => handleSort(column)}
                className={`
                  px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground
                  ${column.align ? alignClasses[column.align] : "text-left"}
                  ${sortable && column.sortable ? "cursor-pointer select-none hover:text-foreground" : ""}
                `}
                style={{ width: column.width }}
              >
                <div className={`flex items-center gap-1 ${column.align === "right" ? "justify-end" : column.align === "center" ? "justify-center" : ""}`}>
                  {column.header}
                  {sortable && column.sortable && (
                    <span className="inline-flex flex-col">
                      {sortConfig?.key === column.key ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5 text-accent" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-accent" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sortedData.map((row, index) => (
              <motion.tr
              key={keyExtractor(row)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
              onClick={() => onRowClick?.(row)}
              className={`
                transition-colors duration-150
                ${onRowClick ? "cursor-pointer hover:bg-foreground/[0.015]" : "hover:bg-foreground/[0.01]"}
                ${rowClassName}
              `}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick(row);
                }
              } : undefined}
            >
              {columns.map((column) => (
                <td
                  key={`${keyExtractor(row)}-${String(column.key)}`}
                  className={`
                    px-4 py-3.5 text-foreground
                    ${column.align ? alignClasses[column.align] : "text-left"}
                  `}
                >
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key as string] ?? "—")}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
