"use client";

import { motion } from "framer-motion";
import { MercadoLivreIcon, ShopeeIcon, CheckIcon, ClockIcon, ArrowRightIcon } from "./marketplace-icons";

const easeOut = [0.16, 1, 0.3, 1] as const;

// Integration Card - Clean Enterprise Style
function IntegrationCard({
  name,
  description,
  icon,
  status,
  statusLabel,
  statusColor,
  features,
  index,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "available" | "coming-soon";
  statusLabel: string;
  statusColor: string;
  features?: string[];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: easeOut }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:border-accent/20 hover:shadow-md"
    >
      {/* Status badge - subtle pill */}
      <div className="absolute right-4 top-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusColor}`}
        >
          {status === "available" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel}
            </>
          ) : (
            <>
              <ClockIcon className="h-3 w-3" />
              {statusLabel}
            </>
          )}
        </span>
      </div>

      {/* Icon */}
      <div className="mb-4">{icon}</div>

      {/* Name */}
      <h3 className="mb-2 text-lg font-semibold text-foreground">{name}</h3>

      {/* Description */}
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{description}</p>

      {/* Features list - only for available */}
      {features && features.length > 0 && (
        <div className="mt-auto space-y-2 border-t border-border/50 pt-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckIcon className="h-3.5 w-3.5 text-accent" />
              {feature}
            </motion.div>
          ))}
        </div>
      )}

      {/* Coming soon CTA */}
      {status === "coming-soon" && (
        <div className="mt-auto pt-4">
          <a
            href="#demo"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            Ser notificado quando lançar
            <ArrowRightIcon className="h-3 w-3" />
          </a>
        </div>
      )}
    </motion.div>
  );
}

export function IntegrationsSection() {
  return (
    <section id="integracoes" className="scroll-mt-28 py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header - Clean */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="mb-16 text-center"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-accent"
          >
            Integrações
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15, ease: easeOut }}
            className="mt-5 text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
          >
            Conecte seus marketplaces
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: easeOut }}
            className="mx-auto mt-4 max-w-xl text-base text-muted-foreground"
          >
            Integre as plataformas que você já usa e gerencie tudo em um único lugar.
          </motion.p>
        </motion.div>

        {/* Integration Cards - Clean Grid */}
        <div className="grid gap-5 md:grid-cols-2">
          {/* Mercado Livre */}
          <IntegrationCard
            name="Mercado Livre"
            description="A maior marketplace da América Latina. Sincronize pedidos, produtos e métricas em tempo real."
            icon={<MercadoLivreIcon className="h-12 w-12" />}
            status="available"
            statusLabel="Disponível"
            statusColor="border-green-200 bg-green-50 text-green-700"
            features={[
              "Sincronização automática de pedidos",
              "Importação de produtos e SKUs",
              "Cálculo automático de taxas",
            ]}
            index={0}
          />

          {/* Shopee */}
          <IntegrationCard
            name="Shopee"
            description="Uma das marketplaces que mais cresce no Brasil. Estamos preparando a integração completa."
            icon={<ShopeeIcon className="h-12 w-12" />}
            status="coming-soon"
            statusLabel="Em breve"
            statusColor="border-indigo-200 bg-indigo-50 text-indigo-700"
            index={1}
          />
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Deseja integração com outra plataforma?{" "}
            <a href="#demo" className="font-medium text-accent hover:underline">
              Solicite aqui
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
