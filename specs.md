# Business Financial Management SaaS PRD

Version: 2.0  
Status: Draft for implementation  
Owner: Mateus Araújo  
Document type: Unified Product Requirements Document  
Execution model: Checkbox-driven  
Implementation style: End-to-end TypeScript, separate frontend and backend, monorepo, full linting

---

## 1. Executive Summary

Build a subscription-based SaaS web application for small businesses and marketplace sellers that consolidates financial and sales data from Mercado Livre and Shopee, combines that data with manually entered product and cost information, and exposes profitability insights through dashboards, charts, lists, and indicators.

The product will use paid monthly and annual plans. Users should only be able to access protected product functionality when they have an active subscription.

For V1, the product must favor clarity, maintainability, and operational simplicity:

- **Frontend**: Next.js on Vercel
- **Backend**: NestJS on Render
- **Repository**: monorepo with shared TypeScript packages
- **Database**: Supabase Postgres
- **Authentication**: Better Auth with Google login
- **Billing**: Stripe subscriptions
- **Sync model**: manual only
- **Sync limit**: three daily windows (morning, afternoon, evening)
- **No workers, no queues, no Redis in V1**
- **APIs live in the NestJS backend, not inside Next.js**

The codebase must be designed so that background jobs, workers, queues, and a more advanced sync engine can be introduced later without a rewrite.

---

## 2. Plan Summary

### 2.1 Architecture Summary

```txt
apps/
  web/  -> Next.js frontend, landing page, dashboard UI, SEO pages
  api/  -> NestJS backend API, auth handlers, billing, marketplace integrations

packages/
  config/
  database/
  types/
  ui/
  eslint-config/
  tsconfig/
  domain/
  validation/
```

### 2.2 Deployment Summary

```txt
Vercel
  └─ apps/web

Render
  └─ apps/api

Supabase
  └─ PostgreSQL

Stripe
  └─ subscription billing

Mercado Livre / Shopee
  └─ marketplace integrations
```

### 2.3 V1 Delivery Summary

- Separate frontend and backend from day one
- SEO-first public website in Next.js
- NestJS API as the single backend authority
- Manual sync button with three allowed windows per day
- Dashboard focused on profitability, margins, break-even, and product/channel insight
- Shared contracts and strict TypeScript across the full repository

---

## 3. Product Vision

Help sellers understand whether they are actually profitable, not just generating sales volume.

The product should answer questions like:

- How much profit am I making per product?
- Which marketplace is more profitable?
- How much do fees, shipping, ads, and costs reduce margin?
- What is my break-even point?
- Which products should I keep selling?

The product should feel modern, credible, and operationally useful from the first login.

---

## 4. Goals

### 4.1 Business Goals

- Launch a monetizable SaaS with monthly and annual plans
- Validate demand with a lean but production-worthy V1
- Keep operational complexity low while preserving architectural separation
- Create a foundation that can grow into deeper analytics and automation

### 4.2 Product Goals

- Let users connect marketplaces and manually sync sales data
- Let users register products, costs, ad spend, and other expenses
- Calculate core financial metrics reliably
- Present insights through a useful dashboard with charts, tables, and indicators
- Provide a high-conversion public landing page with strong SEO foundations

### 4.3 Technical Goals

- Entire codebase in TypeScript end to end
- Strong typing across frontend, backend, database schema, validation, and tests
- Separate frontend and backend applications
- Shared repository packages for consistency and reuse
- Full ESLint coverage across the repository
- Easy to scale the architecture later without a destructive rewrite

---

## 5. Non-Goals for V1

The following are explicitly out of scope for V1:

- Automatic recurring syncs
- Background workers
- Redis
- Queue orchestration
- Complex permission matrix beyond essential organization membership
- Native mobile apps
- Deep accounting workflows such as bank reconciliation
- Predictive analytics and forecasting
- Multi-region infrastructure
- Large-scale inventory management
- Complex tax engine for multiple jurisdictions

---

## 6. Target Users

### 6.1 Primary User

Small business owners and marketplace sellers who need visibility into sales, costs, fees, ads, and real profitability.

### 6.2 Secondary User

Operators or small teams helping manage stores, products, and profitability decisions.

### 6.3 Typical User Characteristics

- Sells through Mercado Livre and/or Shopee
- Understands gross sales better than net profit
- Wants visual dashboards and simple calculators
- Needs practical insights more than accounting complexity

---

## 7. Core User Problems

- Marketplace data is fragmented
- Revenue is visible, but profit is unclear
- Fees, ads, shipping, and product costs are hard to consolidate
- Spreadsheets are slow and error-prone
- Sellers struggle to identify profitable versus unprofitable products

---

## 8. Success Metrics

### 8.1 Product Metrics

- Percentage of registered users who complete onboarding
- Percentage of paying users who connect at least one marketplace
- Percentage of active users who use sync at least once per week
- Percentage of users who register at least one manual product and cost
- Time to first usable dashboard after signup

### 8.2 Business Metrics

- Free-to-paid conversion rate
- Monthly recurring revenue
- Annual plan adoption rate
- Churn rate

### 8.3 Technical Metrics

- Sync success rate
- Average sync duration
- Average API response time for dashboard routes
- Billing webhook success rate
- Lint, typecheck, and test pass rate in CI

---

## 9. Product Scope

### 9.1 V1 Included Features

#### Public marketing site

- Hero section with strong CTA
- Features section
- Pricing section with monthly/annual toggle
- Footer with navigation and social links
- Final CTA section
- SEO-ready metadata, sitemap, canonical structure, and robots

#### Authentication and access

- Signup/login
- Google login
- Session management
- Protected app routes
- Organization/workspace association

#### Billing

- Monthly and annual subscription plans
- Stripe checkout
- Local subscription state mirroring
- Subscription-gated access

#### Dashboard

- Revenue indicators
- Profitability indicators
- Margin indicators
- Charts and tables
- Recent sync information
- Sync-window availability messaging

#### Products and costs

- Manual product registration
- Product cost registration
- Ad cost input
- Manual expense input

#### Integrations

- Marketplace connection structure
- Manual sync trigger
- Sync history and status tracking
- Three sync windows per day

#### Financial calculations

- Gross revenue
- Net revenue
- Gross margin
- Contribution margin
- Net profit
- Break-even point
- Break-even quantity
- Profit per product
- Profit per channel

### 9.2 Post-V1 Expansion Candidates

- Scheduled sync jobs
- Background workers
- Redis/BullMQ
- Automatic retries
- Report exports
- Notifications
- Team permissions
- Deeper analytics
- More integrations
- Separate worker services on Render

---

## 10. Functional Requirements

### 10.1 Marketing Website

The public website must:

- Communicate value clearly in the hero section
- Explain main features with visual clarity
- Present pricing with monthly and annual toggle
- Include a strong CTA near the end of the page
- Load quickly and be optimized for SEO
- Look modern and premium, inspired by Stripe, Vercel, and Linear

#### Acceptance Criteria

- User can understand product value in under 10 seconds
- Pricing clearly distinguishes monthly and annual billing
- CTA is visible above the fold and near the bottom of the page
- Sitemap and robots are available
- Public pages include metadata, canonical URLs, and Open Graph tags

### 10.2 Authentication

The application must:

- Allow signup/login using Google
- Support secure sessions
- Prevent unauthorized access to private routes
- Associate users with an organization/workspace model

#### Acceptance Criteria

- User can sign up using Google
- User can access dashboard only when authenticated
- Unauthenticated users are redirected appropriately

### 10.3 Billing and Plan Enforcement

The product must:

- Provide monthly and annual plans
- Use Stripe Checkout or equivalent Stripe-hosted flow
- Mirror subscription status into the local database
- Restrict protected features when plan state is inactive or invalid

#### Acceptance Criteria

- User can subscribe to a plan
- Successful payment unlocks dashboard access
- Failed or inactive subscription blocks protected usage according to product rules
- Webhook events update subscription state locally

### 10.4 Product and Cost Management

The application must allow users to:

- Create manual products
- Set selling price
- Set product cost
- Set ad cost
- Set additional expenses where applicable
- Edit and archive products

#### Acceptance Criteria

- User can create and edit products
- Calculated fields update correctly
- Archived products do not appear as active by default

### 10.5 Marketplace Integrations

The application must support:

- Connection flow for Mercado Livre
- Connection flow for Shopee if credentials and approval are available
- Secure storage of integration credentials and tokens
- Manual sync trigger
- Sync history tracking

#### Acceptance Criteria

- User can connect a supported marketplace account
- User can trigger sync when allowed
- Sync result is recorded with status and timestamps
- Integration failures are surfaced clearly

### 10.6 Sync Window Rules

The sync feature must:

- Be manual only in V1
- Be allowed at most once per window
- Use three daily windows: morning, afternoon, evening
- Prevent duplicate sync usage within the same window
- Show the next available sync window when blocked

#### Proposed Window Definition

- Morning: 06:00 to 11:59
- Afternoon: 12:00 to 17:59
- Evening: 18:00 to 23:59

Time zone should initially use the product’s primary business time zone and later become organization-configurable.

#### Acceptance Criteria

- If the current window was already used, sync is blocked
- If the current window was not used, sync is allowed
- UI shows current sync availability and next allowed time

### 10.7 Dashboard and Analytics

The dashboard must show:

- Revenue summary
- Net profit summary
- Margin indicators
- Product profitability ranking
- Channel profitability summary
- Recent sync status
- Time-based charts for financial evolution

#### Acceptance Criteria

- Dashboard loads core summary metrics without spreadsheet work
- User can understand profitability at a glance
- Calculations match defined formulas

---

## 11. Financial Calculation Requirements

The application must calculate and expose at least the following:

### 11.1 Core Metrics

- Gross revenue
- Net revenue
- Total cost of goods sold
- Total ad costs
- Total fees
- Gross margin percentage
- Contribution margin
- Net profit
- Profit by SKU
- Profit by channel
- Break-even point
- Break-even quantity

### 11.2 Example Formulas

These formulas should be centralized in backend domain services and tested.

- Gross Revenue = sum of sales values
- Net Revenue = gross revenue - refunds - discounts when applicable
- Contribution Margin = selling price - variable costs
- Gross Margin % = (revenue - COGS) / revenue
- Net Profit = revenue - COGS - marketplace fees - ad costs - taxes estimate - fixed costs - additional expenses
- Break-even Quantity = fixed costs / contribution margin per unit

### 11.3 Requirements

- Calculations must be deterministic
- Calculation logic must not be duplicated across frontend and backend
- All formulas must have unit tests

---

## 12. UX and Design Requirements

### 12.1 Brand and UI Direction

The product should feel:

- modern
- clean
- premium
- trustworthy
- data-rich without becoming noisy

### 12.2 Design Principles

- clear typography
- strong spacing
- restrained gradients
- dashboard first, decoration second
- visual hierarchy around important numbers
- no cluttered enterprise-looking screens

### 12.3 Dashboard UX Principles

- important metrics above the fold
- charts should support summary indicators, not replace them
- empty states must guide setup and first sync
- errors must be clear and actionable

---

## 13. SEO Requirements

SEO applies primarily to public pages served by the Next.js frontend.

### 13.1 Public SEO Scope

- homepage
- pricing page
- features page
- integrations page
- future blog or comparison pages

### 13.2 Private App SEO Scope

Private dashboard routes must be noindexed.

### 13.3 Required SEO Features

- metadata per page
- Open Graph tags
- canonical URLs
- sitemap generation
- robots rules
- statically rendered or server-rendered public pages where appropriate
- strong Core Web Vitals hygiene

### 13.4 Acceptance Criteria

- Public pages expose metadata correctly
- Sitemap is generated
- Robots file is available
- Private routes are not intended for search indexing

---

## 14. Technical Architecture

### 14.1 V1 Architecture Decision

For V1, use a **separate frontend and backend**:

- **Frontend**: Next.js on Vercel
- **Backend**: NestJS on Render

This keeps the public web experience fast and SEO-friendly while preserving a clear backend boundary for authentication, billing, integrations, sync orchestration, and domain logic.

### 14.2 Why This Direction

- Keeps frontend and backend responsibilities cleanly separated
- Preserves strong SEO for the public website
- Gives the backend its own deployment lifecycle
- Avoids burying business logic inside Next.js route handlers
- Makes later scaling to workers and background jobs easier

### 14.3 V1 Constraint

V1 still avoids workers, queues, and Redis. The NestJS backend will execute syncs directly in the request path, so sync scope must stay incremental and bounded.

### 14.4 Stack

#### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query

#### Backend

- NestJS
- TypeScript
- Fastify adapter preferred
- Zod for validation boundaries

#### Authentication

- Better Auth
- Google login

#### Billing

- Stripe

#### Database

- Supabase Postgres

#### ORM / Schema / Migrations

- Drizzle ORM

#### Charts

- Recharts or similar React chart library

#### Linting and code quality

- ESLint
- TypeScript strict mode
- Prettier optional but recommended

#### Testing

- Vitest for unit/integration tests
- Playwright for end-to-end tests

#### CI/CD

- GitHub Actions
- Vercel for `apps/web`
- Render for `apps/api`

---

## 15. End-to-End TypeScript Requirements

The entire stack must be TypeScript.

### Required Areas

- Next.js frontend
- NestJS backend
- database schema and queries
- auth configuration
- billing integration layer
- marketplace integration layer
- test code
- shared DTOs, contracts, and validation schemas
- repository tooling where applicable

### Rules

- Enable `strict` TypeScript mode
- Avoid `any` except where explicitly documented and isolated
- Prefer inferred types from schema and validators where practical
- Shared types must live in reusable packages, not copied manually

---

## 16. Linting and Quality Gates

### Required

- ESLint configured for TypeScript, Next.js, and NestJS
- CI must fail on lint errors
- CI must fail on typecheck errors
- CI must fail on test failures for protected branches

### Recommended Scripts

- `lint`
- `typecheck`
- `test`
- `test:e2e`
- `build`

---

## 17. Repository Structure

```txt
apps/
  web/
    src/
      app/
      components/
      features/
      lib/
      styles/

  api/
    src/
      main.ts
      app.module.ts
      modules/
      common/
      integrations/
      domain/
      infra/

packages/
  ui/
  config/
  database/
  types/
  domain/
  validation/
  eslint-config/
  tsconfig/
```

### 17.1 Architectural Rules

- `apps/web` contains frontend pages, layouts, UI state, and client/server rendering concerns
- `apps/api` contains controllers, services, modules, webhooks, integration adapters, and domain orchestration
- `packages/*` contains shared code used by one or both apps
- framework entrypoints must stay thin
- calculations stay in reusable domain modules
- integration code stays behind provider boundaries
- frontend must consume backend APIs, not duplicate business logic

---

## 18. Data Model Overview

### 18.1 Core Tables

#### Users and organizations

- users
- organizations
- organization_members
- sessions
- auth_accounts

#### Billing

- billing_customers
- subscriptions
- subscription_events

#### Marketplace connections

- marketplace_connections
- sync_runs
- external_orders
- external_order_items
- external_products
- external_fees

#### Product and cost management

- products
- product_costs
- ad_costs
- manual_expenses

#### Analytics

- daily_metrics
- product_metrics

### 18.2 Important Notes

- All business data should be organization-scoped
- Index organization foreign keys consistently
- Sync history should record provider, status, timestamps, and error summary
- Subscription data should be mirrored locally
- Tables used by Better Auth must be aligned with the chosen adapter and schema strategy

---

## 19. API Requirements

The NestJS backend is the API authority. The Next.js frontend must consume this API.

### 19.1 Auth and Billing

- `POST /auth/*`
- `POST /billing/stripe/webhook`

### 19.2 Dashboard

- `GET /dashboard/summary`
- `GET /dashboard/charts`
- `GET /dashboard/recent-sync`

### 19.3 Products and Costs

- `GET /products`
- `POST /products`
- `PATCH /products/:id`
- `GET /costs`
- `POST /costs`
- `PATCH /costs/:id`

### 19.4 Integrations and Sync

- `POST /integrations/mercadolivre/connect`
- `POST /integrations/shopee/connect`
- `POST /sync/run`
- `GET /sync/status`
- `GET /sync/history`

### 19.5 API Rules

- Validate all inputs with Zod or equivalent validated DTO boundaries
- Return typed response shapes
- Use organization-scoped authorization checks
- Keep controllers thin
- Keep business logic in services and domain modules

---

## 20. Sync Design for V1

### 20.1 Sync Philosophy

V1 sync is manual, bounded, and incremental.

### Rules

- User triggers sync manually
- Sync allowed only once per window
- Sync fetches only new or changed data since the last successful sync when supported
- Sync records are stored for visibility and debugging

### 20.2 Sync Flow

1. User clicks `Sync Data` in the web app
2. Frontend calls the NestJS backend
3. Backend authenticates user and verifies active plan
4. Backend determines current window key
5. Backend checks whether that window already contains a successful or processing sync
6. If blocked, backend returns next allowed window
7. If allowed, backend records `sync_run` as processing
8. Backend performs marketplace sync
9. Backend stores or upserts marketplace data
10. Backend recalculates affected metrics
11. Backend records sync as completed or failed
12. Frontend displays result and updated availability state

### 20.3 Sync Risks

- external API slowness
- long-running sync requests
- partial sync failures
- duplicate runs if locking is weak

### 20.4 Mitigations

- keep sync incremental
- limit sync scope
- maintain sync status table
- use idempotent upsert logic where possible
- maintain a clean seam for later worker extraction

---

## 21. Security and Access Requirements

- All private backend endpoints must require authentication
- Subscription-gated features must verify active entitlement
- Secrets must stay server-side
- Marketplace tokens must be encrypted or stored securely
- Stripe webhooks must verify signatures
- Input validation must happen server-side
- Sensitive logs must avoid secret leakage
- CORS and cookie/session strategy must be explicitly configured between `web` and `api`

---

## 22. Performance Requirements

### 22.1 Public Site

- fast initial load
- good Core Web Vitals targets
- CDN-friendly output

### 22.2 Private App

- dashboard summary endpoints should be performant
- frontend should avoid repeated expensive polling
- backend should avoid recalculating everything from raw tables on every request if it becomes expensive

### 22.3 Sync

- keep runtime bounded
- incremental processing only
- fail clearly if provider or time-window rules prevent execution

---

## 23. Observability Requirements

### Required in V1

- error logging for backend routes
- logging for sync runs
- logging for Stripe webhooks
- traceable failure messages in sync history

### Nice to Have

- structured request logging
- monitoring provider integration failures by provider
- analytics for onboarding completion and sync usage

---

## 24. Testing Requirements

### 24.1 Unit Tests

Must cover:

- financial formulas
- sync window calculation
- plan and entitlement rules
- provider mapping helpers
- domain validation rules

### 24.2 Integration Tests

Must cover:

- database repositories
- Stripe webhook handling
- sync orchestration logic
- auth and organization access logic
- key NestJS modules

### 24.3 End-to-End Tests

Must cover:

- signup/login with Google mocked or adapted for test strategy
- subscription unlock flow where feasible
- product creation
- sync-button rule behavior
- dashboard loading

---

## 25. Progress Tracker

This PRD is checkbox-driven. The sections below are the operational source of truth for implementation progress.

### 25.1 How to Use This Tracker

- Mark milestone-level checkboxes only when the milestone exit criteria are satisfied
- Mark task-level checkboxes as implementation work is completed and merged
- Keep exactly one item under Current Focus checked at a time
- When blocked, add a note under the milestone's Blockers / Notes subsection
- When a milestone is finished, update `docs/CHECKPOINTS.md` with a short summary of what shipped

### 25.2 Overall Progress Snapshot

- M0. Repository Foundation
- M1. Monorepo and Shared Packages
- M2. Frontend Web App Scaffold
- M3. Backend API Scaffold on Render
- M4. Database and Schema
- M5. Authentication and Access Control
- M6. Billing and Entitlements
- M7. Marketing Site and SEO
- M8. Product and Cost Management
- M9. Financial Domain Engine
- M10. Marketplace Connections
- M11. Manual Sync System with 3 Daily Windows
- M12. Dashboard and Insights
- M13. Quality, Observability, and Hardening
- M14. Launch and Post-Launch Readiness

### 25.3 Current Focus

- Active milestone identified
- Active task identified
- Dependencies checked
- Blockers reviewed
- Next task queued

### 25.4 Suggested Tracker Fields for Repo Updates

```md
## Current Focus
- Active milestone: M11
- Active task: run the first real sync, confirm same-window blocking, and verify refreshed metrics on `/app`
- Next task: Dashboard metrics validation and layout (M12)
- Blockers: Real sync validation had a Drizzle nested lateral join limit bug when fetching `externalProducts` within `externalOrders` in `finance.service.ts`. This was fixed by separating the query. Waiting for user confirmation on M11 completion.
- Note: Long Postgres FK names were replaced with explicit short constraint names in `packages/database` (schema + `0000_small_dazzler.sql` + snapshot) to avoid 63-byte identifier truncation notices during `db:migrate`. If `0000` already ran against a database, reset that DB or add a manual `RENAME CONSTRAINT` migration from the truncated names Postgres created.
- Note: `pnpm ngrok:mercadolivre:callback` normalizes `NGROK_DOMAIN` (strip `https://` / `http://`, trailing `/`) before `ngrok http --domain`, avoiding ERR_NGROK_9038 when the env value was copied with a trailing slash.
- Note: `db:migrate` calls `sql.end()` on the postgres-js client so CLI processes exit cleanly (previously the open pool kept Node alive indefinitely).
- Note: Supabase-first DB setup uses `DATABASE_URL` for runtime and prefers `DATABASE_MIGRATION_URL` for Drizzle tooling (`db:generate`, `db:migrate`, `db:studio`), falling back to `DATABASE_URL` only when the migration-specific URL is omitted.
- Note: Stripe subscription reads exclude seed placeholder rows (`subscriptions.billing_customer_id` must be present). Entitlements treat `trialing` and `active` as paid access; `GET /billing/subscription` and `EntitlementGuard` reconcile rows still marked `active`/`trialing` against Stripe immediately so cancelling in the Dashboard retracts access even when webhooks lag (`POST /billing/checkout/confirm` still covers the success redirect gap before webhooks). **`/products` and `/costs/`* use `EntitlementGuard` with `AuthGuard`.**
- Note: User-facing strings in `apps/web` default to Brazilian Portuguese (`pt-BR`), including localized labels for KPIs/dashboard copy and mappings for backend English phrases often shown next to integrations and sync controls.
- Note: `apps/api/src/modules/integrations/integrations.service.ts` now emits user-facing copy in pt-BR (connection cards, OAuth redirect messages, synced-product actions, HTTP errors) aligned with `apps/web/src/lib/pt-br/api-ui.ts` where applicable.
- Note: `apps/web/src/lib/pt-br/api-ui.ts` adds pt-BR identity keys for API messages already in Portuguese, prefix translation for dynamic Mercado Livre errors, and Portuguese fallbacks for unknown connection/sync statuses instead of echoing raw English slugs.
- Last completed checkpoint: M6

## UI Redesign (cross-cutting)
- [x] Phase 1: Design system foundation (tokens, primitives)
- [x] Phase 2: App shell (sidebar + top bar layout)
- [x] Phase 3: Marketing pages (landing, features, pricing, sign-in, integrations)
- [x] Phase 4: App pages (dashboard, products, integrations hub, billing)
- [x] Phase 5: Animations (Framer Motion + CSS transitions)
- [x] Phase 6: Responsive + cleanup
- [x] Phase 7: Verification (lint ✓, typecheck ✓, build ✓, tests ✓)
- Note: Page chrome uses warmer off-white tokens (`globals.css`), a softer marketing backdrop gradient, and aligned marketing nav glass.
- Note: Marketing backdrop base layer (`marketing-backdrop.tsx`) uses the same canvas as `body` and `/app` (`var(--background)` → `var(--background-soft)` plus matching radial highlights from `globals.css`), replacing the previous near-white gradient.
- Note: Landing sections (Dashboard showcase, Depoimentos, CTA final) no longer use flat `#fafafa` / pure white bands; they use vertical `linear-gradient` overlays on design tokens (`transparent` → `background` → `background-elevated` / `surface-strong`) so the tone shift stays visible without a hard horizontal color break. Shared `Container` gutters scale `px-6` → `xl:px-14`; the app shell main column and top bar share `max-w-[min(100%,1440px)]` with the same padding scale so wide viewports stay centered without hurting small screens.
- Note: `/sign-in` uses a SaaS-style layout (brand header, eyebrow + title hierarchy, Google-standard OAuth button styling, trust copy, back link, pricing cross-link) in `sign-in/page.tsx` and `sign-in-panel.tsx`.
- Note: `apps/web/src/lib/auth-client.ts` resolves the Better Auth client `baseURL` via `getWebEnv().NEXT_PUBLIC_API_BASE_URL` (same `pickNonEmpty` + dev localhost defaults as `readPublicEnv`). Reading `process.env` directly with `??` let an **empty** `NEXT_PUBLIC_API_BASE_URL` become relative `/auth`, which Better Auth rejects (“Invalid base URL”).
- Note: `packages/ui` `Avatar` uses default `referrerPolicy="no-referrer"` on the `<img>` (common fix for Google `googleusercontent.com` avatars when the app origin would otherwise be sent as `Referer`) and falls back to initials on `onError` so a bad URL never shows a broken image icon in the app shell.
- Note: `/app/integrations` (`IntegrationsHub`) uses a hero band (grid texture, soft gradients, chips), elevated provider cards in a full-width `lg:grid-cols-2` layout with equal-height / shared stat-tile rhythm (not a centered max-width column), status-colored top accent, and a split “sync command” panel; motion respects `useReducedMotion`.
- Note: “Sincronizar agora” stays enabled when the API reports `canRun: false` (janela já usada, fora da janela, etc.); the click surfaces `availability.message` in the banner instead of a dead disabled control. Still disabled only while status is loading, during a run, or when Mercado Livre is structurally unavailable (`syncUnavailable`).
- Note: API `SYNC_RELAX_GUARDS=true` (see `.env.example`) skips overnight + “window already used” checks when `NODE_ENV !== "production"`; uses `resolveSyncWindowStateAtNextOpenHour` if the real clock is in the closed window so `windowKey` stays valid for inserts.
- Note: `/app/billing` uses a two-column hero + plan cards layout (`billing-panel.tsx`): feature checklist, Stripe trust line, emphasized annual tier; removed inline “Status atual” / “Liberado” copy; page no longer wraps `Container` so width follows the app shell content column.
- Note: Public branding and displayed plan prices come from `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_ICON`, `NEXT_PUBLIC_PRICE_MONTHLY_LABEL`, and `NEXT_PUBLIC_PRICE_ANNUAL_LABEL` (see `.env.example`; defaults applied in `readPublicEnv` / `public-branding.ts`).
- Note: Public landing (`apps/web/src/components/marketing/landing-page.tsx`) uses a Vercel-inspired dark hero, gradient headline utility (`mf-marketing-gradient-text`), marketplace marquee, bento feature layout, integration band with explicit availability labels (Mercado Livre disponível; Shopee em breve; Amazon roadmap), annual/monthly pricing toggle with equivalent monthly plus annual billing copy, and expanded motion plus optional border glow; backdrop/particles/header updated in the same marketing folder for cohesion.

## Dashboard Premium Refactor (2026-05-08)
- [x] Created 10+ reusable UI premium components in `apps/web/src/components/ui-premium/`
- [x] Implemented DashboardHeader with dynamic greeting, business summary, period selector, global search, marketplace filters
- [x] Refactored KpiCards with 8 premium stat cards, trend indicators, micro-interactions, stagger animations
- [x] Created ChartsSection with refined Recharts (gradient area fills, custom tooltips, rounded bars)
- [x] Built MarketplacesSection with elegant compact cards for ML and Shopee
- [x] Implemented InsightsSection with AI-powered insight cards (growth, alert, tip, info types)
- [x] Refactored ProductsTable with sticky glass header, sortable columns, smooth hover states, minimal pagination
- [x] `/app` ProductsTable: colunas PRODUTO (nome + SKU abaixo), MARKETPLACE, SAÚDE, Vendas, Devol., Líquida, Receita, ROAS, Lucro, Margem, ROI; removidas Ticket, Comissão, Frete, Imposto, Custo, Ads $; Saúde imediatamente após Marketplace
- [x] ProductsTable scroll fix: added proper overflow-x-auto container with min-width to prevent layout breaking
- [x] `/app/products` ProductTable: flex/grid `min-w-0` + `minmax(0,1fr)` column + `overflow-x-hidden` on app `main` so wide tables scroll inside the card (no page-level horizontal scrollbar)
- [x] `/app/products` ProductTable: células das colunas fixas (corpo) usam `bg-surface-strong` em vez de `bg-background`, alinhadas ao `Card`, para remover o “bloco” cinza ao rolar horizontalmente
- [x] `/app/products` ProductTable: barra de filtros em card com layout em grid – labels claros com ícones, input de busca com foco visual, botões de marketplace e saúde com estados ativos destacados, seção de "Filtros ativos" com chips removíveis individuais
- [x] `/app/products` ProductTable: correção de build (template literal sem fechar em chip de saúde; `motion.tr` → `MotionTableRow`; `className` com `>`/`<` via `cn()` para SWC/Turbopack)
- [x] `/app/products` ProductTable: removido contador (bolinha + total) ao lado do título "Produtos"
- [x] `/app/products` ProductHeader: removido botão "Adicionar produto" do topo (fluxos vazio/sem custo mantêm CTAs nos cards/EmptyState)
- [x] `/app/products` UI trim: removed ProductTable “Ações” column (edit/archive); removed secondary header chips (Produto / Custo / Anúncio) above the table; primary “Adicionar produto” CTA kept; removed sidebar “Ações rápidas” card; removed header “Margem média” strip above catalog insights
- [x] Refined AppSidebar with Linear/Vercel-style active states (left border accent), refined icons, smooth transitions
- [x] Added comprehensive Framer Motion animations (container variants, stagger children, hover effects)
- [x] Integrated all components in DashboardHome with responsive layouts, loading/error/empty states
- [x] Audited /app dashboard route, data flow, reusable seams, and replacement targets for milestone-safe refactor
- [x] Created apps/web/src/modules/dashboard feature boundary with extracted types, formatters, calculations, and hooks
- [x] Rewired /app dashboard composition to the new module while preserving route/auth/billing behavior
- [x] Added tests for financial state derivation, formatter helpers, KPI mapping, product health, and catalog empty state rendering
- [x] Hardened protected dashboard/products contracts with shared runtime validation in `@marginflow/validation`, blocking client-side parse errors on invalid payloads instead of falling back to heuristics
- [x] Added M7 refactor guardrail coverage for protected fetchers, analytics snapshot contracts, weighted margin behavior, zero-safe ROI/ROAS handling, and root `pnpm test` verification without phantom root tests
- Note: Legacy files in apps/web/src/components/dashboard now act as compatibility re-exports while active ownership lives in apps/web/src/modules/dashboard.
- Key files created/modified:
  - `apps/web/src/components/ui-premium/`* - 10 new reusable premium components
  - `apps/web/src/components/dashboard/dashboard-header.tsx` - new
  - `apps/web/src/components/dashboard/kpi-cards.tsx` - new
  - `apps/web/src/components/dashboard/charts-section.tsx` - new
  - `apps/web/src/components/dashboard/marketplaces-section.tsx` - new
  - `apps/web/src/components/dashboard/insights-section.tsx` - new
  - `apps/web/src/components/dashboard/products-table.tsx` - new
  - apps/web/src/components/dashboard/dashboard-home.tsx - refactored
  - apps/web/src/modules/dashboard/* - new feature-scoped dashboard foundation for milestones 1 and 2
  - `apps/web/src/components/app-shell/app-sidebar.tsx` - refined
  - `apps/web/src/lib/animations.ts` - new shared animation variants

## Completed Checkpoints
- [ ] M0 completed
- [ ] M1 completed
- [ ] M2 completed
```

---

## 26. Milestone Map

### 26.1 Milestone Sequence

- **M0** Repository Foundation
- **M1** Monorepo and Shared Packages
- **M2** Frontend Web App Scaffold
- **M3** Backend API Scaffold on Render
- **M4** Database and Schema
- **M5** Authentication and Access Control
- **M6** Billing and Entitlements
- **M7** Marketing Site and SEO
- **M8** Product and Cost Management
- **M9** Financial Domain Engine
- **M10** Marketplace Connections
- **M11** Manual Sync System with 3 Daily Windows
- **M12** Dashboard and Insights
- **M13** Quality, Observability, and Hardening
- **M14** Launch and Post-Launch Readiness

### 26.2 Milestone Completion Rule

A milestone is complete only when:

- every required task in that milestone is checked
- the milestone exit criteria are satisfied
- required tests for that milestone are passing
- the checkpoint note has been written to `docs/CHECKPOINTS.md`

### 26.3 Dependency Notes

- M0 blocks everything
- M1 depends on M0
- M2 and M3 depend on M1
- M4 depends on M1 and should align both apps
- M5 depends on M3 and M4
- M6 depends on M5
- M7 depends on M2
- M8 depends on M4 and M5
- M9 depends on M4 and M8
- M10 depends on M5 and M4
- M11 depends on M9 and M10
- M12 depends on M9 and M11
- M13 depends on the core user journey being functional
- M14 depends on all launch-critical milestones

---

## 27. Detailed Milestones and Tasks

---

## [x] M0. Repository Foundation

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Establish a strict TypeScript, ESLint, CI, and repository baseline.

### Dependencies

- none

### Task Groups

#### 0.1 Repository Setup

- Initialize repository
- Add top-level README with setup instructions
- Define branching and PR conventions
- Add `.editorconfig`, `.gitignore`, and repository hygiene files

#### 0.2 TypeScript and Linting Baseline

- Configure strict TypeScript defaults
- Configure ESLint base strategy
- Decide and document Prettier usage
- Define path alias strategy

#### 0.3 CI Baseline

- Add CI workflow for lint, typecheck, test, and build
- Verify local developer startup flow
- Add required scripts to root package.json

### Exit Criteria

- Repository installs cleanly
- Root scripts run successfully
- ESLint passes
- Typecheck passes
- Build pipeline passes
- Setup instructions are documented

### Blockers / Notes

- No blockers currently logged

---

## [x] M1. Monorepo and Shared Packages

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Create the monorepo shape and shared packages used by both frontend and backend.

### Dependencies

- M0 complete

### Task Groups

#### 1.1 Workspace Setup

- Configure pnpm workspaces
- Configure Turborepo
- Add root-level task pipeline
- Document package boundaries

#### 1.2 Shared Packages

- Create `packages/types`
- Create `packages/database`
- Create `packages/domain`
- Create `packages/validation`
- Create `packages/ui`
- Create `packages/eslint-config`
- Create `packages/tsconfig`

#### 1.3 Shared Package Validation

- Verify package imports from both apps
- Verify build and type resolution across apps
- Document package ownership rules

### Exit Criteria

- Monorepo workspace resolves correctly
- Shared packages build or typecheck successfully
- Both apps can consume shared packages
- Repository structure is documented

### Blockers / Notes

- No blockers currently logged

---

## [x] M2. Frontend Web App Scaffold

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Create the Next.js frontend with public and private route boundaries.

### Dependencies

- M1 complete

### Task Groups

#### 2.1 Web Bootstrap

- Initialize Next.js App Router app in `apps/web`
- Add Tailwind CSS
- Add base UI primitives and design tokens

#### 2.2 Route Structure

- Create `(marketing)` route group
- Create `(app)` route group
- Create base layouts
- Create protected app layout placeholder

#### 2.3 Frontend Conventions

- Add API client layer for NestJS communication
- Add frontend env configuration
- Add error/loading UI conventions
- Add TanStack Query baseline where appropriate

### Exit Criteria

- Frontend runs locally
- Marketing and app route groups exist
- Shared UI foundation exists
- API client layer is established

### Blockers / Notes

- No blockers currently logged

---

## [x] M3. Backend API Scaffold on Render

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Create the NestJS backend and prepare it for deployment on Render.

### Dependencies

- M1 complete

### Task Groups

#### 3.1 API Bootstrap

- Initialize NestJS app in `apps/api`
- Choose and configure HTTP adapter
- Add health endpoint
- Add module skeleton

#### 3.2 API Architecture

- Create `common`, `modules`, `infra`, and `integrations` structure
- Add global validation strategy
- Add error handling and exception filters
- Add CORS and cookie/session strategy for web-to-api communication

#### 3.3 Render Readiness

- Add Render build and start commands
- Add environment variable documentation for Render
- Add health check path
- Verify production boot flow locally

### Exit Criteria

- Backend runs locally
- Health endpoint works
- Base modules compile
- Render deploy instructions are documented

### Blockers / Notes

- No blockers currently logged

---

## [x] M4. Database and Schema

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Set up Supabase Postgres, Drizzle schema, migrations, and shared database access.

### Dependencies

- M1 complete

### Task Groups

#### 4.1 Database Foundation

- Configure database package
- Configure Drizzle
- Add migration workflow
- Add environment validation for DB access

#### 4.2 Initial Schema

- Model users and organizations
- Model billing tables
- Model marketplace connection tables
- Model products, costs, and expenses
- Model sync history
- Model metrics tables

#### 4.3 Database Quality

- Add indexes for organization-scoped access
- Add seed or fixture strategy for local development
- Document migration and rollback flow

### Exit Criteria

- Database connection works from backend
- Migrations run successfully
- Initial schema exists
- Local development data strategy exists

### Blockers / Notes

- No blockers currently logged
- User accepted milestone completion after implementation landed and migration generation plus repo verification passed

---

## [x] M5. Authentication and Access Control

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Implement authentication, sessions, organization scoping, and route protection.

### Dependencies

- M3 and M4 complete

### Task Groups

#### 5.1 Better Auth Setup

- Install and configure Better Auth in backend
- Configure database adapter
- Configure Google login
- Expose auth endpoints

#### 5.2 Session and Access Model

- Define session strategy
- Define organization membership model
- Add backend auth guards or equivalent access middleware
- Add frontend protected-route behavior

#### 5.3 Auth Quality

- Add auth integration tests
- Add login/logout flows in frontend
- Document auth environment variables

### Exit Criteria

- User can authenticate
- Protected routes are enforced
- Organization-scoped access works
- Auth flow is documented

### Blockers / Notes

- No blockers currently logged
- `/sign-in` no longer tripped a 500 on `GET /auth-state/me`: the API dev runner (`tsx`) does not emit Nest’s `design:paramtypes`, so class-based constructor injection was undefined for `AuthGuard` and other providers until explicit `@Inject(Type)` was added; the marketing `app/error.tsx` no longer wraps segment errors in `<html>/<body>` (that shape belongs only in `global-error.tsx`).
- Better Auth routing and Fastify bridge were corrected to use the live `/auth` base path with request-body forwarding, and server-side Google sign-in now returns a real Google authorization URL
- Local auth schema drift was repaired in development by resetting the empty local Postgres schema to the current Drizzle baseline, and the Better Auth tables were aligned to string IDs expected by the library
- Manual browser verification completed on 2026-05-01: Google login succeeded locally, the user accessed the platform, and sign-out also completed successfully
- M5 hardening code shipped: shared trusted-origin parsing, lifecycle-managed DB runtime, split auth provisioning seam, and safer frontend auth redirects/error states

---

## [x] M6. Billing and Entitlements

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Implement Stripe subscription flows and access gating.

### Dependencies

- M5 complete

### Task Groups

#### 6.1 Stripe Foundation

- Configure Stripe products and prices
- Define monthly and annual plan identifiers
- Implement checkout initiation flow
- Model billing customer and subscription mapping

#### 6.2 Webhooks and Local State

- Add Stripe webhook endpoint in backend
- Verify webhook signatures
- Mirror subscription state locally
- Define entitlement-check helper

#### 6.3 Product Enforcement

- Gate protected backend endpoints by entitlement
- Gate frontend app entry by entitlement
- Add subscription state UI in app

### Exit Criteria

- User can subscribe
- Subscription state is mirrored locally
- Protected product usage is gated correctly
- Billing flow is tested at minimum critical-path level

### Blockers / Notes

- No blockers currently logged
- Real Stripe monthly and annual price IDs are configured in env and were verified as active recurring prices against Stripe
- Manual browser verification completed on 2026-05-01: Stripe checkout succeeded locally, payment unlocked the platform, and subscription-gated access was released after the real billing flow
- M6 code shipped with API-owned checkout creation, verified webhook signature handling, local subscription mirroring, entitlement guard enforcement, `/billing/subscription`, `/billing/checkout`, `/billing/stripe/webhook`, and the `/app/billing` paywall route
- Repo verification passed after implementation: `lint`, `typecheck`, `test`, and `build`

---

## [] M7. Marketing Site and SEO

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Build the public website and SEO baseline in Next.js.

### Dependencies

- M2 complete

### Task Groups

#### 7.1 Public Pages

- Build Hero section
- Build Features section
- Build Pricing section with monthly/annual toggle
- Build Footer
- Build final CTA section

#### 7.2 SEO Foundation

- Add metadata strategy
- Add sitemap generation
- Add robots rules
- Add canonical URL strategy
- Add Open Graph tags

#### 7.3 UX and Performance

- Add responsive behavior
- Optimize visual loading
- Review page performance and page quality

### Exit Criteria

- Public website is complete
- SEO baseline exists
- Pricing is clear
- CTA flow leads toward signup

### Blockers / Notes

- No blockers currently logged
- 2026-04: Landing principal redesenhada em PT-BR com partículas (`@tsparticles`), animações (`framer-motion`), hero com mock do dashboard, grade de recursos, integrações, preços (mensal/anual) e CTA alinhados ao layout de marketing.
- M7 landing and SEO implementation shipped in `apps/web` with dedicated `features`, `pricing`, and `integrations` pages, reusable marketing components, metadata helpers, `robots.txt`, and `sitemap.xml`
- 2026-05-08: Marketing Mercado Livre icons (`MercadoLivreIcon`, `MercadoLivreMiniIcon`) passam a usar o SVG em `apps/web/public/icons/mercado-livre-logo.svg` (cópia do asset em `src/public/icons` para servir via Next.js `public/`).
- 2026-05-08 (follow-up): `viewBox` do wordmark ajustado para o logo preencher o canvas; símbolo (aperto de mãos) em `mercado-livre-symbol.svg` para mini/hero; rótulo textual removido ao lado do mini ícone nas linhas de integração do marketing.
- 2026-05-08: Símbolo ML com `viewBox` quadrado centrado no desenho + `Image` 243×243 e badge “Compatível com” em `grid place-items-center` para evitar ícone torto/comprimido no círculo.
- 2026-05-08: Barra “Compatível com” no marketing sem card circular — só texto + ícone ML alinhados em `flex`.
- 2026-05-08: Barra “Compatível com” inclui ícone Shopee (`public/icons/shopee-icon.svg`); `ShopeeIcon` / `ShopeeMiniIcon` passam a usar esse SVG em vez do placeholder.
- 2026-05-08: Mini marcas ML/Shopee com mesma **altura** (`h-7`/`sm:h-8` + `w-auto`) e símbolo ML com `viewBox` colado ao clip (243×139) para não parecer menor que a Shopee.
- 2026-05-08: Na barra “Compatível com”, ML com `scale` ~0,92/0,94 em relação à Shopee para equilibrar visualmente.
- Repo verification passed after implementation: `lint`, `typecheck`, `test`, and `build`
- Milestone is ready for final completion tick once user confirms it should be considered done

---

## [ ] M8. Product and Cost Management

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Allow users to create, edit, and manage products and related cost inputs.

### Dependencies

- M4 complete
- M5 complete

### Task Groups

#### 8.1 Backend

- Create product module
- Create product cost module
- Create ad cost and manual expense endpoints
- Add archive behavior

#### 8.2 Frontend

- Build product list page
- Build create/edit product forms
- Build cost entry flows
- Build empty and error states

#### 8.3 Quality

- Add validation tests
- Add core integration tests
- Verify organization scoping

### Exit Criteria

- User can manage products and costs
- Calculated fields can consume stored data
- Product CRUD path is functional end to end

### Blockers / Notes

- No blockers currently logged
- M8 shipped with protected API endpoints for products, product costs, ad costs, and manual expenses plus a single `/app/products` management hub in the web app
- Product archive behavior is soft-only via `isActive`, product cost history remains appendable, and product lists now surface the latest recorded cost per product
- The protected `/app/products` workspace now also surfaces Mercado Livre synced-product review items so users can keep manual products while importing, linking, or ignoring marketplace-discovered products
- Repo verification passed after implementation: `lint`, `typecheck`, `test`, and `build`
- Milestone is ready for final completion tick once user confirms it should be considered done

---

## [ ] M9. Financial Domain Engine

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Implement deterministic financial formulas and metric-generation logic.

### Dependencies

- M4 and M8 complete

### Task Groups

#### 9.1 Formula Layer

- Implement gross revenue formula
- Implement net revenue formula
- Implement contribution margin formula
- Implement gross margin formula
- Implement net profit formula
- Implement break-even formulas

#### 9.2 Metrics and Aggregation

- Add product-level profitability calculations
- Add channel-level profitability calculations
- Add daily metrics generation strategy
- Add metric read helpers for dashboard consumption

#### 9.3 Tests

- Add unit tests for formulas
- Add integration tests for stored metric generation
- Verify deterministic outputs

### Exit Criteria

- Core formulas are implemented
- Tests validate metric correctness
- Dashboard-facing data contracts are available

### Blockers / Notes

- No blockers currently logged
- M9 shipped a new `@marginflow/domain` finance engine with deterministic money math, formula helpers, organization finance snapshot types, overview aggregation, and unit coverage for formulas plus zero-edge behavior
- The API now includes an internal `FinanceModule` and `FinanceService` that build organization-scoped finance snapshots from current tables, map marketplace sales to internal products by SKU, aggregate summary/channel/product/daily read models, and materialize `daily_metrics` plus `product_metrics`
- Shared dashboard-facing contracts were added in `@marginflow/types`, and materialized metric metadata now carries supporting profitability fields for future M12 dashboard endpoints
- Repo verification passed after implementation: `lint`, `typecheck`, `test`, and `build`
- Milestone is ready for final completion tick once user confirms it should be considered done; M8 remains separately pending final confirmation

---

## [ ] M10. Marketplace Connections

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Implement marketplace account connection flows and provider boundaries.

### Dependencies

- M4 complete
- M5 complete

### Task Groups

#### 10.1 Provider Boundaries

- Define provider interface
- Add Mercado Livre provider skeleton
- Add Shopee provider skeleton
- Add secure token storage strategy

#### 10.2 Connection Flows

- Implement Mercado Livre connect flow
- Implement Shopee connect flow if credentials are available
- Add connection status endpoints
- Add disconnection flow if needed

#### 10.3 Quality

- Add provider mapping tests
- Add connection-flow integration tests
- Add provider error messaging strategy

### Exit Criteria

- At least one provider connect flow is functional
- Provider boundary exists for future expansion
- Connection state is visible in the app

### Blockers / Notes

- No blockers currently logged
- M10 shipped a protected `IntegrationsModule` in `apps/api` with signed Mercado Livre OAuth state, connection status/read-model endpoints, a callback bridge, and local disconnect flow on top of the existing `marketplace_connections` table
- The web app now includes a dedicated `/app/integrations` workspace page with provider cards, callback feedback messaging, and connect/disconnect actions wired to the API
- Shared integration contracts were added in `@marginflow/types`, and Shopee now exists as an explicit skeleton behind the same provider boundary without pretending the live flow is configured
- Mercado Livre synced products can now be listed and reviewed through protected API endpoints for imported catalog review, explicit link-to-existing-product, and ignore actions without auto-creating active internal products during sync
- Repo verification passed after implementation: `lint`, `typecheck`, `test`, and `build`
- Final milestone closure is still blocked on manual live Mercado Livre credential setup plus browser callback verification, so the milestone should remain incomplete until that pass succeeds

---

## [ ] M11. Manual Sync System with 3 Daily Windows

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Implement the manual sync button, daily window rules, sync status tracking, and incremental import flow.

### Dependencies

- M9 and M10 complete

### Task Groups

#### 11.1 Sync Rule Engine

- Implement window-key calculation
- Implement current-window availability check
- Implement duplicate-window blocking
- Implement next-available-window response logic

#### 11.2 Sync Execution

- Create sync run service
- Record `processing`, `completed`, and `failed` states
- Implement incremental sync strategy
- Implement idempotent upsert flow
- Recalculate affected metrics after sync

#### 11.3 Frontend UX

- Add Sync Data button
- Add blocked-state messaging
- Add sync status and history UI
- Add loading and failure states

### Exit Criteria

- User can run sync when allowed
- User is blocked after using the current window
- Sync history is visible
- Updated metrics appear after successful sync

### Blockers / Notes

- No blockers currently logged
- M11 shipped a new protected `SyncModule` in `apps/api` with `GET /sync/status`, `GET /sync/history`, and `POST /sync/run`, plus a Sao Paulo window-rule engine, provider-based Mercado Livre sync orchestration, sync-run persistence, and finance re-materialization after successful imports
- The `/app/integrations` workspace now includes manual sync availability, blocked-state messaging, active run feedback, last successful sync details, and recent sync history beside the existing provider cards
- Successful Mercado Livre sync imports now feed a review-first catalog workflow in `/app/products`, where external products stay read-only until the user imports or links them to the internal catalog, and finance matching now prefers explicit links before SKU fallback
- Repo verification passed after implementation: `lint`, `typecheck`, `test`, and `build`
- Final milestone closure is still blocked on live Mercado Livre credential setup plus browser verification for account callback, first import, same-window blocking, and real metrics refresh
- 2026-05-05: sync completion on `/app/integrations` now refreshes the page after a successful run, and finance re-materialization tolerates legacy `external_products` rows that do not yet have the review-link columns applied
- 2026-05-05: `/app/integrations` now exposes `Limpar logs` for sync history, backed by protected org-scoped history clearing that keeps active `processing` runs intact
- 2026-05-05: sync-history cleanup UX on `/app/integrations` now uses clean pt-BR copy plus a softer inline review state that explains scope before clearing, instead of a noisy destructive alert block
- 2026-05-05: history cleanup on `/app/integrations` now runs in one click without extra confirmation, while keeping the improved copy and lighter button styling

---

## [ ] M12. Dashboard and Insights

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Expose useful financial insights through the dashboard.

### Dependencies

- M9 and M11 complete

### Task Groups

#### 12.1 Backend Read Models

- Implement dashboard summary endpoint
- Implement chart endpoint
- Implement recent sync endpoint
- Implement product profitability read model

#### 12.2 Frontend Dashboard

- Build top-level KPI section
- Build charts section
- Build profitability tables
- Build recent sync panel
- Build empty states for not-yet-synced accounts

#### 12.3 Dashboard Quality

- Validate numbers against domain formulas
- Review data-loading states
- Review mobile and desktop usability

### Exit Criteria

- Dashboard displays useful financial insight
- Summary metrics and charts load correctly
- Recent sync data is visible
- UI reflects real backend-calculated values

### Blockers / Notes

- No blockers currently logged
- M12 shipped a new protected `DashboardModule` in `apps/api` with `GET /dashboard/summary`, `GET /dashboard/charts`, `GET /dashboard/recent-sync`, and `GET /dashboard/profitability`, all composed from the existing finance engine plus sync status service
- The web app now opens entitled users on a real `/app` dashboard with KPI cards, responsive Recharts trend/comparison views, profitability rankings, recent sync visibility, and distinct first-run empty states for no sync data vs missing catalog cost inputs
- Shared dashboard response contracts were added in `@marginflow/types`, and `/app` navigation now treats Dashboard as the primary workspace home instead of redirecting immediately to Products
- Repo verification passed after implementation: `lint`, `typecheck`, `test`, and `build`
- Milestone is ready for final completion tick once user confirms it should be considered done

---

## [ ] M13. Quality, Observability, and Hardening

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Improve reliability, error visibility, and launch confidence.

### Dependencies

- Core product path is functional

### Task Groups

#### 13.1 Quality Gates

- Expand unit test coverage
- Expand integration test coverage
- Add end-to-end smoke coverage
- Enforce CI branch protections

#### 13.2 Observability

- Add structured logging for backend
- Add sync failure logging
- Add webhook failure logging
- Add operational troubleshooting notes

#### 13.3 Hardening

- Review secrets handling
- Review error redaction
- Review API rate protection strategy
- Review deployment environment parity

### Exit Criteria

- Critical flows are covered by tests
- Logs support debugging
- Deployment posture is documented
- Release confidence is acceptable

### Blockers / Notes

- No blockers currently logged

---

## [ ] M14. Launch and Post-Launch Readiness

### Status

- Not started
- In progress
- Blocked
- Completed

### Objective

Prepare the product for initial launch and clear next-step evolution.

### Dependencies

- Launch-critical milestones complete

### Task Groups

#### 14.1 Launch Readiness

- Verify production environment variables
- Verify web and API domains
- Verify Stripe production configuration
- Verify Supabase production configuration
- Verify Render production deployment
- Verify Vercel production deployment

#### 14.2 Product Readiness

- Validate onboarding path
- Validate billing-to-access path
- Validate marketplace connect-to-sync path
- Validate dashboard insight path

#### 14.3 Post-Launch Planning

- Define V2 extraction points for jobs and workers
- Document future queue/Redis strategy
- Document next product milestones
- Write launch retrospective template

### Exit Criteria

- Production stack is verified
- Launch-critical journey works end to end
- Next technical evolution path is documented

### Blockers / Notes

- No blockers currently logged

---

## 28. Checkpoint Discipline

Every completed milestone must append an entry to `docs/CHECKPOINTS.md` using the following format:

```md
## Checkpoint Mx
- Date:
- Milestone:
- Summary of what shipped:
- Key files/modules added:
- Tests added or updated:
- Known issues:
- Next recommended milestone:
- Next recommended task:
```

The checkpoint file is intended to let an implementation agent resume accurately from the last known stable point.

---

## 29. Final V1 Recommendation

For V1, the recommended stack and deployment model are:

- **Frontend**: Next.js on Vercel
- **Backend**: NestJS on Render
- **Database**: Supabase Postgres
- **Auth**: Better Auth with Google login
- **Billing**: Stripe
- **Language**: TypeScript everywhere
- **Quality**: ESLint everywhere, strict typing, tests in CI
- **Sync model**: manual only, three daily windows
- **Background jobs**: deferred to a later phase
- **Architecture goal**: clean separation now, scalable extraction later
