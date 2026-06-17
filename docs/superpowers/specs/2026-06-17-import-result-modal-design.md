# Design - Redesign do Modal "Resultado da importação" (Mercado Livre)

**Data:** 2026-06-17
**Arquivo alvo:** `apps/web/src/components/products/products-shell.tsx`
**Componente removido:** `ImportResultStat` (será substituído)

## Problema

O modal atual usa um grid 3 colunas com 6 cards `ImportResultStat` de tamanhos variados, layout denso e visual genérico. Falta hierarquia visual e hierarquia de informação.

## Solução

Layout em 3 seções verticais: Hero Card → Bento Grid → Painel de Erros.

### Seção 1: Hero Card

**Propósito:** Comunicar imediatamente o resultado geral da importação.

**Estrutura:**
- Card full-width com gradiente sutil `from-accent-soft/20 via-surface/60 to-background`
- Ícone central grande (`h-16 w-16`) com ring glow
  - Sucesso: `CheckCircle2` com `ring-success/20` + animação pulse sutil
  - Com erros: `AlertTriangle` com `ring-warning/20`
- Título: "Importação concluída" ou "Importação com ressalvas"
- Subtítulo: `"${total} produtos do Mercado Livre processados"`
- Divider horizontal sutil (`h-px bg-border/40`)

**Animação:** stagger - ícone (0ms) → título (100ms) → subtítulo (200ms)

**Estado vazio:** Se `found === 0`, hero mostra ícone info + "Nenhum produto encontrado"

### Seção 2: Bento Grid de Stats

**Propósito:** Detalhar os números de forma scannable.

**Estrutura:**
- Grid 4 colunas (`grid-cols-4 gap-3`)
- 4 cards: Encontrados, Criados, Atualizados, Sem alteração
- Cada card:
  - `rounded-[var(--radius-xl)] bg-surface border border-border/60`
  - Ícone no canto superior direito com `opacity-30`
  - Label: uppercase, `text-[10px]`, `tracking-[0.15em]`, `text-muted-foreground/60`
  - Número: `text-3xl font-bold tabular-nums tracking-tight`
  - Animação stagger: `delay: index * 0.08`
  - Valor zero: `text-muted-foreground/40` no número para feedback visual

### Seção 3: Painel de Conflitos e Erros

**Propósito:** Listar problemas de forma clara e acionável.

**Condicional:** Só renderiza se `conflicts.length + errors.length > 0`

**Estrutura:**
- Card único com header + lista scrollable
- Header:
  - Ícone `AlertTriangle` com bg `bg-warning/10 ring-warning/20`
  - Label: "Conflitos e erros"
  - Badge com total (`variant="warning"` ou `"error"`)
- Divider sutil
- Lista: `max-h-52 overflow-y-auto mf-scrollbar`
- Cada item:
  - Bullet `h-1 w-1 rounded-full bg-border-strong`
  - SKU/ID em `font-medium text-foreground text-sm`
  - Mensagem em `text-muted-foreground text-sm leading-relaxed`
  - Hover: `bg-error-soft/30 rounded-[var(--radius-md)] px-3 py-2.5`
  - Animação: slide-in-left stagger `delay: 0.1 + idx * 0.05`

### Footer

- Botão "Fechar" alinhado à direita
- `variant="secondary"`, `rounded-full px-6 py-2.5`
- Animação fade-in com delay 400ms

### Modal Container

- `max-w-2xl` (mais largo que o atual `max-w-xl`)
- `className` direta no Modal, sem condicional
- `onClose` desabilitado enquanto mutation pendente

## Dependências

- `framer-motion` (já usado no arquivo)
- `lucide-react` (ícones já importados)
- CSS vars do `globals.css` (radius, shadows, cores semânticas)
- Componentes `Modal`, `Button`, `Badge` do `@lucreii/ui`

## Dados

Interface `marketplaceImportResult` mantém mesma shape:
```ts
{
  found: number;
  created: number;
  updated: number;
  unchanged: number;
  conflicts: Array<{ externalProductId: string; sku?: string; message: string }>;
  errors: Array<{ externalProductId: string; sku?: string; message: string }>;
}
```

## Trade-offs

- **Hero sem stats inline:** Hero foca na mensagem emocional (sucesso/ressalvas + total). Detalhes numéricos ficam no bento grid, evitando redundância.
- **Bento grid de 4 colunas:** Em telas menores pode ficar apertado. Solução: `max-w-2xl` no modal garante espaço. Valores zero usam opacidade reduzida.
- **Painel unificado de conflitos+erros:** Simplifica vs separar em duas seções. Se houver muitos itens de um tipo, o scroll resolve.
