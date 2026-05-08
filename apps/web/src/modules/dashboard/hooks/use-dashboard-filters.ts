"use client";

import { useState } from "react";
import type { DashboardPeriod } from "../types/dashboard";

export function useDashboardFilters(initialPeriod: DashboardPeriod = "30d") {
  const [period, setPeriod] = useState<DashboardPeriod>(initialPeriod);

  return {
    period,
    setPeriod,
  };
}
