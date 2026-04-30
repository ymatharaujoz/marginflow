import { Inject, Injectable } from "@nestjs/common";
import type {
  DashboardChartsResponse,
  DashboardChannelChartRow,
  DashboardChartPoint,
  DashboardProfitabilityResponse,
  DashboardRecentSyncResponse,
  DashboardSummaryCard,
  DashboardSummaryMetrics,
  DashboardSummaryResponse,
} from "@marginflow/types";
import { FinanceService } from "@/modules/finance/finance.service";
import { SyncService } from "@/modules/sync/sync.service";

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function createSummaryCards(summary: DashboardSummaryMetrics): DashboardSummaryCard[] {
  const grossRevenue = toNumber(summary.grossRevenue);
  const netProfit = toNumber(summary.netProfit);
  const grossMarginPercent = toNumber(summary.grossMarginPercent);
  const breakEvenRevenue = toNumber(summary.breakEvenRevenue);

  return [
    {
      helperText: `${summary.ordersCount} orders across ${summary.unitsSold} sold units`,
      label: "Gross revenue",
      tone: grossRevenue > 0 ? "positive" : "default",
      value: summary.grossRevenue,
    },
    {
      helperText: `${summary.netRevenue} net revenue after discounts and refunds`,
      label: "Net profit",
      tone: netProfit >= 0 ? "positive" : "warning",
      value: summary.netProfit,
    },
    {
      helperText: `${summary.contributionMargin} contribution margin`,
      label: "Gross margin",
      tone: grossMarginPercent >= 30 ? "positive" : grossMarginPercent > 0 ? "default" : "warning",
      value: summary.grossMarginPercent,
    },
    {
      helperText: `${summary.breakEvenUnits} units needed at the current contribution profile`,
      label: "Break-even revenue",
      tone: breakEvenRevenue > 0 ? "default" : "warning",
      value: summary.breakEvenRevenue,
    },
  ];
}

@Injectable()
export class DashboardService {
  constructor(
    @Inject(FinanceService)
    private readonly financeService: FinanceService,
    @Inject(SyncService)
    private readonly syncService: SyncService,
  ) {}

  async readSummary(organizationId: string): Promise<DashboardSummaryResponse> {
    const summary = await this.financeService.readSummaryMetrics(organizationId);

    return {
      cards: createSummaryCards(summary),
      summary,
    };
  }

  async readCharts(organizationId: string): Promise<DashboardChartsResponse> {
    const readModel = await this.financeService.buildDashboardReadModel(organizationId);

    return {
      channels: readModel.channels.map<DashboardChannelChartRow>((row) => ({
        channel: row.channel,
        grossRevenue: toNumber(row.summary.grossRevenue),
        netProfit: toNumber(row.summary.netProfit),
        unitsSold: row.summary.unitsSold,
      })),
      daily: readModel.daily.map<DashboardChartPoint>((row) => ({
        grossRevenue: toNumber(row.summary.grossRevenue),
        metricDate: row.metricDate,
        netProfit: toNumber(row.summary.netProfit),
        ordersCount: row.ordersCount,
        unitsSold: row.summary.unitsSold,
      })),
    };
  }

  async readRecentSync(organizationId: string): Promise<DashboardRecentSyncResponse> {
    return this.syncService.getStatus(organizationId, "mercadolivre");
  }

  async readProfitability(organizationId: string): Promise<DashboardProfitabilityResponse> {
    const readModel = await this.financeService.buildDashboardReadModel(organizationId);

    return {
      channels: readModel.channels,
      products: readModel.productProfitability,
    };
  }
}
