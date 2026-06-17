# Plano de Melhoria: Modais de Importação de Produtos

## Contexto
Melhorar o layout dos 5 modais da cadeia de importação em `/app/products/catalog` para um design premium e responsivo, seguindo o padrão visual do projeto (teal premium, superfícies suaves, gradientes sutis).

## Design System do Projeto
- **Cores**: Teal premium (`#0e7a6f`), superfícies suaves (`--surface`, `--surface-strong`)
- **Bordas**: `border-border/40` com hover `border-border/60`
- **Sombras**: `shadow-[var(--shadow-xs)]` → `shadow-[var(--shadow-md)]` no hover
- **Tipografia**: Labels uppercase com `tracking-[0.18em]` e `text-[10px]`/`text-[11px]` font-bold
- **Gradientes**: `bg-gradient-to-br from-accent/[0.02] via-surface-strong/40 to-background/20`
- **Ícones**: Containers com `bg-accent/10`, `ring-1 ring-accent/20`, `rounded-lg`
- **Animações**: Framer Motion com `staggerChildren`, `ease: [0.16, 1, 0.3, 1]`

## Componentes a Criar

### 1. `ImportOptionCard`
Card premium para opções de importação (Mercado Livre / Planilha)
- Layout: Flex row com ícone, título, descrição e chevron
- Estados: Default, hover (elevação + scale do ícone), disabled (opacidade reduzida)
- Animação: `initial={{ opacity: 0, y: 16 }}` com delay staggered
- Badge opcional para status de conexão

### 2. `ImportResultStat`
Card de métrica para resultados de importação
- Variantes: `default`, `success`, `warning`, `error`
- Cada variante tem cor de borda e gradiente de fundo específico
- Animação: `initial={{ opacity: 0, scale: 0.95 }}` com delay
- Tipografia: Label uppercase `tracking-[0.18em]`, valor `text-2xl font-bold`

### 3. `ColumnRequirementRow`
Linha de requisito de coluna para modal de planilha
- Layout: Badge numérico + label + descrição
- Fundo: `bg-surface-strong/50` com hover `bg-surface-strong/80`
- Animação: `initial={{ opacity: 0, x: -12 }}` staggered

### 4. `ImportConfirmationCard`
Card de confirmação com ícone e descrição
- Fundo gradiente sutil com borda refinada
- Cabeçalho com ícone em container estilizado

## Modais a Melhorar

### Modal 1: "Importar produtos" (Escolha de fonte)
**Localização**: Linhas 1354-1431 em `products-shell.tsx`

**Mudanças**:
- Substituir botões simples por `ImportOptionCard`
- Adicionar animação staggered entre as opções
- Ícone Mercado Livre: `bg-warning/10 ring-warning/20`
- Ícone Planilha: `bg-accent/10 ring-accent/20`
- Badge de status com variant do componente Badge existente
- Chevron de navegação que aparece no hover

**Layout**:
```
<Modal title="Importar produtos">
  <p className="text-sm text-muted-foreground">Escolha de onde os produtos serão importados.</p>
  <div className="space-y-3">
    <ImportOptionCard ...Mercado Livre... />
    <ImportOptionCard ...Planilha... />
  </div>
</Modal>
```

### Modal 2: "Importar por planilha" (Instruções + Upload)
**Localização**: Linhas 1433-1507

**Mudanças**:
- Header com ícone em container premium (ring, bg)
- Substituir grid de colunas por `ColumnRequirementRow` com animação staggered
- Lista numerada com badge circular
- CTA buttons com mais destaque
- Container de colunas com scroll se necessário em mobile

**Layout**:
```
<Modal title="Importar por planilha">
  <ImportHeaderCard icon={<FileSpreadsheet />} ... />
  <div className="space-y-2">
    <ColumnRequirementRow index={0} label="PRODUTO" desc="Nome do produto" />
    ...6 colunas...
  </div>
  <div className="flex justify-end gap-3">
    <Button variant="secondary">Cancelar</Button>
    <Button>Selecionar arquivo</Button>
  </div>
</Modal>
```

### Modal 3: "Importar do Mercado Livre" (Confirmação)
**Localização**: Linhas 1509-1552

**Mudanças**:
- Usar `ImportConfirmationCard` para o conteúdo
- Ícone de warning em container estilizado
- Texto hierárquico: título bold + descrição detalhada
- Botões de ação com espaçamento adequado
- Loading state com spinner e texto descritivo

### Modal 4: "Resultado da importação" (Mercado Livre)
**Localização**: Linhas 1554-1625

**Mudanças**:
- Substituir grid simples por `ImportResultStat` com animação staggered
- 6 estatísticas em grid responsivo (2-3 colunas)
- Variantes de cor baseadas no valor (success para criados/atualizados, warning para conflitos, error para erros)
- Lista de erros/conflitos com design refinado
- Badge de contagem em cada categoria

**Layout**:
```
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
  <ImportResultStat label="Encontrados" value={...} />
  <ImportResultStat label="Criados" value={...} variant="success" />
  <ImportResultStat label="Atualizados" value={...} variant="success" />
  <ImportResultStat label="Sem alteração" value={...} />
  <ImportResultStat label="Conflitos" value={...} variant="warning" />
  <ImportResultStat label="Erros" value={...} variant="error" />
</div>
```

### Modal 5: "Importar produtos" (Resultado planilha)
**Localização**: Linhas 1627-1740

**Mudanças**:
- Card de resumo com ícone e badge de contagem
- Variante visual baseada no sucesso (success vs warning)
- Lista de erros com scroll refinado
- Cada erro: Badge de linha + mensagem com hover
- Container de erros com borda sutil e shadow

## Responsividade
- **Mobile (< 768px)**: Empilhamento vertical, paddings reduzidos (`px-4 py-5`), grids em 1-2 colunas
- **Tablet/Desktop**: Grids em 2-3 colunas, maior espaçamento
- **Breakpoints**: Usar `sm:`, `md:` do Tailwind conforme padrão do projeto

## Performance
- Animações via `transform` e `opacity` apenas (GPU-safe)
- `will-change` apenas em elementos ativamente animando
- `backdrop-blur` restrito a elementos fixed/sticky
- Respeitar `prefers-reduced-motion`

## Arquivos a Modificar
1. `apps/web/src/components/products/products-shell.tsx`
   - Adicionar componentes auxiliares (~linha 243, após PremiumSwitch)
   - Atualizar 5 modais (linhas ~1354-1740)

## Testes Visuais
- Verificar animações ao abrir modal
- Verificar estados hover nos cards
- Verificar responsividade em 320px, 768px, 1440px
- Verificar dark mode (classes `.dark` aplicadas corretamente)

## Tempo Estimado
- Criação de componentes: 30min
- Atualização dos 5 modais: 1h
- Testes e ajustes: 30min
- **Total: ~2h**
