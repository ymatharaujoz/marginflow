"use client";

import { useState } from "react";

export function useProductTable(initialPage = 1, itemsPerPage = 5) {
  const [currentPage, setCurrentPage] = useState(initialPage);

  return {
    currentPage,
    itemsPerPage,
    setCurrentPage,
  };
}
