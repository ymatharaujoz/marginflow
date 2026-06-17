# Import Result Modal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Mercado Livre import result modal with a premium 3-section layout (Hero Card → Bento Grid → Errors Panel).

**Architecture:** Replace the existing modal content (lines ~1808-1918 in products-shell.tsx) with new JSX structure. Remove the `ImportResultStat` component (lines ~320-375). Add a new `ImportResultHero` component for the hero section inline. Keep all state and mutation logic unchanged.

**Tech Stack:** React, framer-motion, lucide-react, Tailwind CSS, @lucreii/ui components

---

### Task 1: Remove ImportResultStat component

**Files:**
- Modify: `apps/web/src/components/products/products-shell.tsx:320-375`

- [ ] **Step 1: Delete the ImportResultStat type and function**

Remove lines 320-375 entirely (the `ImportResultStatProps` type and `ImportResultStat` function component).

The code to remove:
```tsx
type ImportResultStatProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  size?: "lg" | "sm";
  index?: number;
};

function ImportResultStat({
  label,
  value,
  icon,
  size = "sm",
  index = 0,
}: ImportResultStatProps) {
  const isLarge = size === "lg";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "relative flex flex-col border transition-all duration-200",
        isLarge
          ? "justify-between rounded-[var(--radius-xl)] border-border/70 bg-surface p-6 shadow-sm"
          : "justify-center rounded-[var(--radius-lg)] border-border/60 bg-surface-strong p-5",
      )}
    >
      <div className="absolute top-4 right-4 text-muted-foreground/40">
        {icon}
      </div>
      <p
        className={cn(
          "font-bold uppercase tracking-[0.2em] text-muted-foreground/50",
          isLarge ? "text-[11px]" : "text-[10px]",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "font-semibold tabular-nums tracking-tight text-foreground",
          isLarge ? "text-4xl mt-6" : "text-2xl mt-2",
        )}
      >
        {value}
      </p>
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/products/products-shell.tsx
git commit -m "refactor: remove ImportResultStat component before modal redesign"
```

---

### Task 2: Replace Mercado Livre modal with new design

**Files:**
- Modify: `apps/web/src/components/products/products-shell.tsx:1807-1918`

- [ ] **Step 1: Replace the entire Modal content for marketplace import result**

Find the Modal starting at line ~1807 with `title="Resultado da importação"` and replace its entire content (from the opening `<Modal` tag to the closing `</Modal>` tag at line ~1918) with:

```tsx
<Modal
  className="max-w-2xl"
  onClose={() => {
    if (!marketplaceCatalogImportMutation.isPending) {
      setMarketplaceImportResult(null);
      setShowMercadoLivreConfirmation(false);
    }
  }}
  open={marketplaceImportResult !== null}
  title="Resultado da importação"
>
  {marketplaceImportResult ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-2xl)] border p-8 text-center",
          marketplaceImportResult.conflicts.length > 0 ||
            marketplaceImportResult.errors.length > 0
            ? "border-warning/30 bg-gradient-to-br from-warning-soft/20 via-surface/60 to-background"
            : "border-success/30 bg-gradient-to-br from-success-soft/20 via-surface/60 to-background",
        )}
      >
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: 0.1,
            duration: 0.5,
            ease: [0.34, 1.56, 0.64, 1],
          }}
          className={cn(
            "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ring-2",
            marketplaceImportResult.conflicts.length > 0 ||
              marketplaceImportResult.errors.length > 0
              ? "bg-warning/10 ring-warning/20"
              : "bg-success/10 ring-success/20",
          )}
        >
          {marketplaceImportResult.conflicts.length > 0 ||
          marketplaceImportResult.errors.length > 0 ? (
            <AlertTriangle
              className="h-8 w-8 text-warning"
              strokeWidth={1.5}
            />
          ) : (
            <CheckCircle2
              className="h-8 w-8 text-success"
              strokeWidth={1.5}
            />
          )}
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="text-xl font-semibold tracking-tight text-foreground"
        >
          {marketplaceImportResult.conflicts.length > 0 ||
          marketplaceImportResult.errors.length > 0
            ? "Importação com ressalvas"
            : "Importação concluída"}
        </motion.h3>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="mt-2 text-sm text-muted-foreground"
        >
          {marketplaceImportResult.found} produto
          {marketplaceImportResult.found !== 1 ? "s" : ""} do Mercado Livre
          processado{marketplaceImportResult.found !== 1 ? "s" : ""}
        </motion.p>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-6 h-px w-32 bg-border/40"
        />
      </motion.div>

      {/* Bento Grid Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-4 gap-3"
      >
        {[
          {
            label: "Encontrados",
            value: marketplaceImportResult.found,
            icon: <Search className="h-5 w-5" strokeWidth={1.5} />,
          },
          {
            label: "Criados",
            value: marketplaceImportResult.created,
            icon: <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />,
          },
          {
            label: "Atualizados",
            value: marketplaceImportResult.updated,
            icon: <RefreshCw className="h-5 w-5" strokeWidth={1.5} />,
          },
          {
            label: "Sem alteração",
            value: marketplaceImportResult.unchanged,
            icon: <Minus className="h-5 w-5" strokeWidth={1.5} />,
          },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.2 + idx * 0.08,
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative flex flex-col justify-center rounded-[var(--radius-xl)] border border-border/60 bg-surface p-5"
          >
            <div className="absolute top-3 right-3 text-muted-foreground/30">
              {stat.icon}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
              {stat.label}
            </p>
            <p
              className={cn(
                "mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground",
                stat.value === 0 && "text-muted-foreground/40",
              )}
            >
              {stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Conflicts & Errors Panel */}
      {[...marketplaceImportResult.conflicts, ...marketplaceImportResult.errors]
        .length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[var(--radius-xl)] border border-warning/20 bg-surface p-5 shadow-[var(--shadow-xs)]"
        >
          {/* Panel Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 ring-1 ring-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Conflitos e erros
                </p>
                <p className="text-xs text-muted-foreground">
                  Revise os itens abaixo para resolver as pendências.
                </p>
              </div>
            </div>
            <Badge variant="warning">
              {marketplaceImportResult.conflicts.length +
                marketplaceImportResult.errors.length}
            </Badge>
          </div>

          {/* Divider */}
          <div className="mb-4 h-px bg-border/40" />

          {/* Scrollable List */}
          <div className="max-h-52 space-y-1 overflow-y-auto mf-scrollbar">
            {[
              ...marketplaceImportResult.conflicts,
              ...marketplaceImportResult.errors,
            ].map((issue, idx) => (
              <motion.div
                key={`${issue.externalProductId}:${issue.message}:${idx}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.35 + idx * 0.05,
                  duration: 0.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-start gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-colors hover:bg-error-soft/30"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {issue.sku || issue.externalProductId}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                    {issue.message}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : null}

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="flex justify-end pt-2"
      >
        <Button
          onClick={() => {
            setMarketplaceImportResult(null);
            setShowMercadoLivreConfirmation(false);
          }}
          variant="secondary"
          className="rounded-full px-6 py-2.5"
        >
          Fechar
        </Button>
      </motion.div>
    </motion.div>
  ) : null}
</Modal>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/products/products-shell.tsx
git commit -m "feat: redesign Mercado Livre import result modal with hero, bento grid, and errors panel"
```

---

### Task 3: Verify no broken references

**Files:**
- Verify: `apps/web/src/components/products/products-shell.tsx`

- [ ] **Step 1: Check that all imports are still used**

Verify these icons are still imported (they are used in the new modal):
- `CheckCircle2` - used in hero + bento grid
- `AlertTriangle` - used in hero + errors panel
- `Search` - used in bento grid
- `RefreshCw` - used in bento grid
- `Minus` - used in bento grid

Remove unused imports if any:
- `XCircle` - was used in old `ImportResultStat`, check if used elsewhere. If not, remove.
- `FileWarning` - was used in the other import modal (line ~2010), keep it.

- [ ] **Step 2: Run type check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors related to the modal changes.

- [ ] **Step 3: Commit any cleanup**

```bash
git add apps/web/src/components/products/products-shell.tsx
git commit -m "chore: remove unused imports after modal redesign"
```
