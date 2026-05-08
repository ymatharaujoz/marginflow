"use client";

import { motion, useReducedMotion } from "framer-motion";

// Star rating component
function StarRating({ rating = 5 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-warning" : "text-muted/30"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// Avatar placeholder
function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white shadow-md"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

// Trust badge component
function TrustBadge({
  value,
  label,
  icon,
  delay,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  delay: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: reduceMotion ? 0 : delay }}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4 shadow-sm"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
    </motion.div>
  );
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  initials: string;
  color: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Aumentamos nossa margem em 23% no primeiro trimestre usando o MarginFlow. Finalmente conseguimos ver onde estávamos perdendo dinheiro.",
    author: "Carlos Silva",
    role: "CFO",
    company: "TechStore Brasil",
    initials: "CS",
    color: "#0e7a6f",
    rating: 5,
  },
  {
    quote:
      "Finalmente entendemos onde estávamos perdendo dinheiro. O dashboard de lucratividade por SKU mudou completamente nossa forma de precificar.",
    author: "Ana Paula Mendes",
    role: "CEO",
    company: "ModaBrasil",
    initials: "AP",
    color: "#2563eb",
    rating: 5,
  },
  {
    quote:
      "O ROI ficou claro desde o primeiro mês. Conseguimos reduzir custos em 15% e aumentar o lucro líquido em 30%.",
    author: "Roberto Campos",
    role: "Fundador",
    company: "EletroPlus",
    initials: "RC",
    color: "#dc2626",
    rating: 5,
  },
];

const trustMetrics = [
  {
    value: "500+",
    label: "Empresas usando",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    value: "R$ 50M+",
    label: "Em vendas analisadas",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: "4.9/5",
    label: "Avaliação média",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
];

export function SocialProof() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 text-center"
        >
          <span className="inline-flex items-center rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            Depoimentos
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
            Empresários que transformaram seus resultados
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Veja como sellers profissionais estão usando o MarginFlow para escalar seus negócios.
          </p>
        </motion.div>

        {/* Trust Metrics */}
        <div className="mb-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {trustMetrics.map((metric, index) => (
            <TrustBadge
              key={metric.label}
              value={metric.value}
              label={metric.label}
              icon={metric.icon}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                delay: reduceMotion ? 0 : index * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
              className="group relative flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm transition-all duration-300 hover:border-accent/20 hover:shadow-lg"
            >
              {/* Quote icon */}
              <div className="absolute -top-3 left-6 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-md">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>

              {/* Rating */}
              <div className="mb-4">
                <StarRating rating={testimonial.rating} />
              </div>

              {/* Quote */}
              <blockquote className="mb-6 flex-1 text-sm leading-relaxed text-foreground">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <Avatar initials={testimonial.initials} color={testimonial.color} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>

              {/* Hover accent line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>

        {/* Additional Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Junte-se a mais de <span className="font-semibold text-foreground">500 empresas</span> que já estão
            tomando decisões baseadas em dados reais.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
