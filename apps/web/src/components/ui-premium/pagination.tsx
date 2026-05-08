"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showFirstLast?: boolean;
  siblingCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
  showFirstLast = false,
  siblingCount = 1,
}: PaginationProps) {
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 5 + siblingCount * 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const leftSibling = Math.max(currentPage - siblingCount, 1);
      const rightSibling = Math.min(currentPage + siblingCount, totalPages);
      
      const showLeftDots = leftSibling > 2;
      const showRightDots = rightSibling < totalPages - 1;
      
      if (!showLeftDots && showRightDots) {
        for (let i = 1; i <= 3 + siblingCount * 2; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (showLeftDots && !showRightDots) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - (3 + siblingCount * 2) + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else if (showLeftDots && showRightDots) {
        pages.push(1);
        pages.push("...");
        for (let i = leftSibling; i <= rightSibling; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      }
    }
    
    return pages;
  };

  const pages = generatePageNumbers();

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-1">
        {showFirstLast && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-strong text-muted-foreground transition-all disabled:opacity-40 hover:border-border-strong hover:text-foreground disabled:hover:border-border disabled:hover:text-muted-foreground"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
        
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-strong text-muted-foreground transition-all disabled:opacity-40 hover:border-border-strong hover:text-foreground disabled:hover:border-border disabled:hover:text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1 px-2">
          {pages.map((page, index) => (
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                type="button"
                className={`
                  inline-flex h-8 min-w-[32px] items-center justify-center rounded-md px-2.5 text-sm font-medium transition-all
                  ${currentPage === page
                    ? "bg-accent text-white shadow-[var(--shadow-xs)]"
                    : "border border-border bg-surface-strong text-muted-foreground hover:border-border-strong hover:text-foreground"
                  }
                `}
              >
                {page}
              </button>
            )
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-strong text-muted-foreground transition-all disabled:opacity-40 hover:border-border-strong hover:text-foreground disabled:hover:border-border disabled:hover:text-muted-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {showFirstLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-strong text-muted-foreground transition-all disabled:opacity-40 hover:border-border-strong hover:text-foreground disabled:hover:border-border disabled:hover:text-muted-foreground"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Página {currentPage} de {totalPages}
      </div>
    </div>
  );
}
