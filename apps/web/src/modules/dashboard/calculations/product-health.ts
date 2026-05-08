import type { ProductHealthStatus } from "../types/dashboard";

type ProductHealthInput = {
  margin: number; // Margem percentual (ex: 25 para 25%)
  profit: number; // Lucro em valor monetário
  roi: number | null; // ROI percentual (ex: 50 para 50%) ou null
  roas: number | null; // ROAS (ex: 3.5 para 3.5x) ou null
  netSales?: number; // Vendas líquidas (para detectar produto sem venda)
  returns?: number; // Devoluções (para detectar alta devolução)
  sales?: number; // Vendas brutas (para calcular taxa de devolução)
};

/**
 * Regras de Saúde Financeira:
 * - Lucro Negativo -> Crítico
 * - Margem Baixa (< 10%) -> Atenção
 * - ROAS Abaixo do Mínimo (< 1) -> Atenção
 * - ROI Alto (>= 50%) E Margem Boa (>= 20%) -> Escalável
 * - Alta Devolução (> 15% de taxa) -> Atenção
 * - Produto Sem Venda (netSales = 0) -> Neutro
 * - Produto com Lucro e Margem Bons -> Saudável
 */
export function getProductHealthStatus({
  margin,
  profit,
  roi,
  roas,
  netSales = 1,
  returns = 0,
  sales = 1,
}: ProductHealthInput): ProductHealthStatus {
  // Produto sem venda -> Neutro
  if (netSales === 0 || sales === 0) {
    return "neutral";
  }

  // Calcular taxa de devolução
  const returnRate = sales > 0 ? returns / sales : 0;

  // Lucro Negativo -> Crítico (prioridade máxima)
  if (profit < 0 || margin < 0) {
    return "critical";
  }

  // Alta Devolução (> 15%) -> Atenção
  if (returnRate > 0.15) {
    return "attention";
  }

  // Margem Baixa (< 10%) -> Atenção
  if (margin < 10) {
    return "attention";
  }

  // ROAS Abaixo do Mínimo (< 1) -> Atenção
  if (roas !== null && roas < 1) {
    return "attention";
  }

  // ROI Alto (>= 50%) E Margem Boa (>= 20%) -> Escalável
  if (roi !== null && roi >= 50 && margin >= 20) {
    return "scalable";
  }

  // Produto com Lucro e Margem Bons -> Saudável
  // Critério: lucro > 0 E margem >= 10 (já filtrado acima)
  if (profit > 0 && margin >= 10) {
    return "healthy";
  }

  // Caso neutro (lucro zero, margem zero, etc.)
  if (profit === 0 && margin === 0) {
    return "neutral";
  }

  // Fallback: Saudável
  return "healthy";
}
