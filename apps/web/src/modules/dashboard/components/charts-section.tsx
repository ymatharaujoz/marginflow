"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Cell,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Card } from "@marginflow/ui";
import { slideInUpVariants, containerVariants } from "@/lib/animations";
import type { DashboardChartsResponse } from "@marginflow/types";
import { formatMetricDate, formatMoneyCompact, formatProviderLabel } from "../utils/formatters";

interface ChartsSectionProps {
  data: DashboardChartsResponse;
  className?: string;
}

const chartColors = {
  grossRevenue: "#0e7a6f",
  netProfit: "#141c22",
  warning: "#f59e0b",
  grid: "rgba(148, 163, 184, 0.15)",
};

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ color?: string; name?: string; value?: number }>;
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-white px-3 py-2.5 shadow-[var(--shadow-lg)]">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <div className="mt-1.5 space-y-0.5">
        {payload.map((entry, index) => (
          <p key={index} className="flex items-center gap-1.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {typeof entry.value === "number" ? formatMoneyCompact(entry.value) : entry.value}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function ChartsSection({ data, className = "" }: ChartsSectionProps) {
  const dailyData = data.daily.map((point) => ({
    ...point,
    label: formatMetricDate(point.metricDate),
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className={`space-y-4 ${className}`}>
      <motion.div variants={slideInUpVariants}>
        <Card padding="md" className="h-full">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">EVOLUÇÃO FINANCEIRA</h3>
                <p className="text-[10px] text-muted-foreground">RECEITA BRUTA VS LUCRO</p>
              </div>
            </div>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailyData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.grossRevenue} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={chartColors.grossRevenue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.netProfit} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={chartColors.netProfit} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: chartColors.grid }}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickFormatter={formatMoneyCompact}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="grossRevenue" stroke="none" fill="url(#revenueGradient)" />
                <Area type="monotone" dataKey="netProfit" stroke="none" fill="url(#profitGradient)" />
                <Line
                  type="monotone"
                  dataKey="grossRevenue"
                  name="Receita bruta"
                  stroke={chartColors.grossRevenue}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: chartColors.grossRevenue }}
                />
                <Line
                  type="monotone"
                  dataKey="netProfit"
                  name="Lucro líquido"
                  stroke={chartColors.netProfit}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: chartColors.netProfit }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={slideInUpVariants}>
        <Card padding="md">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/5">
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-foreground">PERFORMANCE POR CANAL</h3>
                <p className="text-[10px] text-muted-foreground">LUCRO POR MARKETPLACE</p>
              </div>
            </div>
          </div>

          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.channels} margin={{ top: 4, right: 12, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal vertical={false} />
                <XAxis
                  dataKey="channel"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickFormatter={formatProviderLabel}
                  tickLine={false}
                  axisLine={{ stroke: chartColors.grid }}
                  angle={data.channels.length > 3 ? -30 : 0}
                  textAnchor={data.channels.length > 3 ? "end" : "middle"}
                  height={data.channels.length > 3 ? 50 : 30}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickFormatter={formatMoneyCompact}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="netProfit" name="Lucro líquido" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {data.channels.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.netProfit >= 0 ? chartColors.grossRevenue : chartColors.warning} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
