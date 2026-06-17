"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, BarChart3, Building2, Link2, Package, Zap } from "lucide-react";
import { Card } from "@lucreii/ui";
import { itemVariants } from "@/lib/animations";

const organizationFeatures = [
  {
    icon: Link2,
    title: "Integração com Marketplaces",
    description:
      "Sincronize produtos e pedidos do Mercado Livre e Shopee automaticamente em um só lugar.",
  },
  {
    icon: BarChart3,
    title: "Visão dos seus lucros",
    description:
      "Acompanhe margens reais, custos operacionais e descubra quais produtos são mais rentáveis.",
  },
  {
    icon: Zap,
    title: "Dashboards inteligentes",
    description: "Monitore vendas, tendências e performance de cada canal com dados atualizados.",
  },
];

const companyFeatures = [
  {
    icon: Building2,
    title: "Escopo por empresa",
    description: "Separe operações quando precisar trabalhar com mais de um CNPJ na mesma organização.",
  },
  {
    icon: Package,
    title: "Produto manual com SKU",
    description: "Cadastre SKU do seu produto para fazer match com vendas sincronizadas de marketplaces.",
  },
  {
    icon: BarChart3,
    title: "Filtro mensal consistente",
    description: "Consulte vendas, devolucoes, frete, taxas e impostos pelo mês da empresa selecionada.",
  },
];

export function SetupInfoCard({ stage = "organization" }: { stage?: "company" | "organization" }) {
  const isCompanyStage = stage === "company";
  const features = isCompanyStage ? companyFeatures : organizationFeatures;

  return (
    <motion.div variants={itemVariants} className="h-full min-h-0">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden border-border/60">
        <div className="shrink-0 border-b border-border bg-surface-strong/30 px-6 py-4">
          <h3 className="font-semibold text-foreground">
            {isCompanyStage ? "Por que essa etapa?" : "O que vem depois?"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isCompanyStage
              ? "Sua empresa define contexto usado nos relatórios mensais, importações de produtos e filtros."
              : "Após criar sua organização, você terá acesso a:"}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col divide-y divide-border">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-4 p-4 transition-colors hover:bg-surface-strong/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <feature.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-medium text-foreground">{feature.title}</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
