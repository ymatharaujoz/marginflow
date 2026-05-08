# DESIGNER.md — Dashboard Principal SaaS Premium

## Objetivo

Este documento define a direção visual, experiência de usuário, identidade estética e comportamento da nova página principal do dashboard financeiro da plataforma.

O objetivo é criar uma interface SaaS premium inspirada em:

- Vercel
- Linear
- Stripe
- Raycast

A página deve parecer moderna, inteligente, extremamente organizada e sofisticada.

O dashboard deve transmitir sensação de:

- controle operacional
- inteligência financeira
- velocidade
- clareza
- confiabilidade
- produto enterprise premium

---

# Filosofia do Design

A interface NÃO deve parecer:

- ERP antigo
- planilha renderizada
- dashboard poluído
- painel cheio de widgets aleatórios
- sistema administrativo genérico

A interface DEVE parecer:

- um cockpit financeiro moderno
- uma central operacional inteligente
- um SaaS premium de alta qualidade
- um produto com obsessão por UX

---

# Inspirações

## Vercel

Usar como inspiração:

- espaçamento
- minimalismo
- sensação clean
- hierarquia visual
- uso de branco e cinza
- simplicidade elegante
- densidade equilibrada

### NÃO copiar
- layout idêntico
- componentes exatos
- branding

---

## Linear

Usar como inspiração:

- refinamento visual
- alinhamento impecável
- microinterações
- tipografia
- fluidez
- contraste suave
- UX extremamente polida

---

## Stripe

Usar como inspiração:

- grids
- organização de informação
- elegância enterprise
- sensação tecnológica
- profundidade visual
- visual financeiro sofisticado

---

## Raycast

Usar como inspiração:

- velocidade visual
- clareza
- painéis compactos
- experiência fluida
- foco em produtividade

---

# Identidade Visual

## Tema

### Principal

- White Theme Premium

### Base de cores

| Uso | Cor |
|---|---|
| Fundo principal | #FAFAFA |
| Cards | #FFFFFF |
| Bordas | #ECECEC |
| Texto primário | #111111 |
| Texto secundário | #666666 |
| Texto suave | #888888 |
| Hover | #F3F4F6 |
| Azul principal | #2563EB |
| Verde positivo | #16A34A |
| Vermelho crítico | #DC2626 |
| Amarelo alerta | #F59E0B |

---

# Sensação Visual

A página deve transmitir:

- ar
- espaço
- organização
- clareza
- sofisticação
- silêncio visual

Evitar:

- excesso de sombras
- gradientes exagerados
- elementos gigantes
- excesso de cores
- excesso de bordas
- excesso de animações

---

# Tipografia

## Estilo

Tipografia moderna, limpa e extremamente legível.

### Sensação

- técnica
- premium
- precisa
- sofisticada

---

## Hierarquia

### Heading principal

- forte
- limpa
- espaçada
- elegante

### Subtítulos

- discretos
- suaves
- informativos

### KPIs

- destaque forte
- grandes
- legíveis imediatamente

---

# Layout Geral

## Estrutura

```txt
┌────────────────────────────────────┐
│ Header                             │
├────────────────────────────────────┤
│ Filtros                            │
├────────────────────────────────────┤
│ KPIs                               │
├────────────────────────────────────┤
│ Insights                           │
├───────────────┬────────────────────┤
│ Gráfico       │ Gráfico            │
├───────────────┴────────────────────┤
│ Produtos destaque                 │
├────────────────────────────────────┤
│ Tabela principal                   │
├────────────────────────────────────┤
│ Alertas + resumo operacional       │
└────────────────────────────────────┘
```

---

# Espaçamento

## Regra principal

Respiração visual é prioridade.

### Espaçamentos recomendados

| Elemento | Espaço |
|---|---|
| Entre seções | 32px a 48px |
| Entre cards | 16px a 24px |
| Padding cards | 20px a 28px |
| Gap tabela | confortável |
| Header | espaçoso |

Nunca compactar excessivamente.

---

# Header

## Objetivo

Passar sensação de dashboard enterprise moderno.

---

## Estrutura

### Esquerda

```txt
Raio-X da Operação
Visão consolidada da performance financeira e operacional.
```

### Direita

- seletor de período
- seletor marketplace
- botão atualizar
- botão exportar

---

## Visual

- limpo
- poucas bordas
- muito alinhamento
- aparência sofisticada

---

# Filtros

## Objetivo

Permitir exploração rápida sem poluir visualmente.

---

## Aparência

- minimalista
- compacta
- elegante
- alinhada horizontalmente

---

## Componentes

- selects suaves
- search moderna
- toggles discretos
- sliders minimalistas

---

# Cards de KPI

## Objetivo

Os KPIs são o primeiro impacto visual.

Precisam parecer:
- premium
- confiáveis
- escaneáveis

---

# Estrutura do Card

```txt
┌───────────────────┐
│ Ícone       +12%  │
│                   │
│ R$ 182.450        │
│ Faturamento       │
└───────────────────┘
```

---

# Características

## Visual

- fundo branco
- borda extremamente suave
- sombra leve
- radius elegante
- hover refinado

---

## Conteúdo

### Topo
- ícone discreto
- tendência percentual

### Centro
- valor principal grande

### Base
- label pequena e suave

---

# Comportamento

## Hover

Leve elevação.

### Nunca:
- glow exagerado
- efeitos chamativos
- animações lentas

---

# Insights Inteligentes

## Objetivo

Transformar números em leitura operacional.

---

# Visual

Insights devem parecer:

- pequenas análises
- discretas
- inteligentes
- úteis

---

# Estrutura

```txt
[!] Publicidade consumiu 41% da margem
[+] Shopee apresentou maior ROI do período
[-] 3 produtos operam abaixo do ROAS ideal
```

---

# Cores

| Tipo | Cor |
|---|---|
| Positivo | Verde suave |
| Atenção | Amarelo |
| Crítico | Vermelho |
| Informação | Azul |

---

# Gráficos

## Filosofia

Os gráficos devem:

- complementar
- não dominar a tela
- serem extremamente legíveis

---

# Estilo

- minimalista
- linhas suaves
- poucos grids
- muito espaço
- tooltips refinados

---

# NÃO fazer

- gráficos neon
- muitos efeitos
- excesso de legendas
- cores fortes demais
- backgrounds escuros

---

# Gráfico de Performance

## Mostrar

- faturamento
- lucro
- ads

---

# Gráfico de Marketplaces

## Mostrar

- comparação de marketplaces
- lucro
- faturamento
- ROI

---

# Produtos em Destaque

## Objetivo

Criar leitura operacional rápida.

---

# Estrutura

```txt
Melhor ROI
Maior lucro
Produto crítico
Maior Ads
```

---

# Visual

- compacto
- elegante
- muito escaneável

---

# Tabela Principal

## Filosofia

A tabela NÃO deve parecer Excel.

Ela deve parecer:
- ferramenta enterprise
- painel operacional premium
- sistema financeiro moderno

---

# Visual

## Cabeçalho

- sticky
- clean
- contraste suave
- tipografia menor
- elegante

---

## Linhas

- muito respiro
- hover leve
- zebra extremamente suave ou inexistente
- alinhamento impecável

---

# Colunas Importantes

Destacar visualmente:

- lucro
- margem
- ROI
- ROAS
- status financeiro

---

# Estados Visuais

## Lucro negativo

- vermelho suave
- badge discreta

---

## Produto escalável

- azul suave
- indicador positivo

---

## Margem crítica

- amarelo elegante

---

## Excelente ROI

- verde sofisticado

---

# Badges

## Aparência

- pequenas
- suaves
- sem excesso de saturação

---

# Responsividade

## Desktop

Experiência principal.

---

## Tablet

- grids reorganizados
- menos colunas
- cards compactos

---

## Mobile

Transformar:
- tabelas em cards compactos
- reduzir densidade
- priorizar KPIs

---

# Motion Design

## Filosofia

Motion deve:
- dar refinamento
- indicar hierarquia
- melhorar percepção premium

Nunca:
- distrair
- atrasar interação
- exagerar

---

# Animações Recomendadas

## Cards
- fade
- slight-up

## Gráficos
- reveal suave

## Hover
- translate mínimo

## Tabela
- transições suaves

---

# Sombras

## Regra

Sombras extremamente suaves.

---

# Exemplo

Boa:
- sombra leve
- quase imperceptível

Ruim:
- sombra pesada
- glow
- depth exagerado

---

# Bordas

## Estilo

- suaves
- minimalistas
- claras
- quase invisíveis

---

# Radius

## Recomendação

- cards: rounded-2xl
- buttons: rounded-xl
- inputs: rounded-xl

---

# Inputs

## Aparência

- limpos
- modernos
- discretos

---

# Placeholder

- suave
- não competir com conteúdo

---

# Botões

## Primário

- azul elegante
- sólido
- sofisticado

---

## Secundário

- ghost/subtle
- minimalista

---

# Empty States

## Objetivo

Mesmo sem dados a página deve parecer premium.

---

# Exemplo

```txt
Nenhum dado encontrado para os filtros selecionados.
```

Com:
- ilustração minimalista
- ícone discreto
- CTA opcional

---

# Loading States

## Skeletons

- suaves
- minimalistas
- sem shimmer agressivo

---

# Error States

## Aparência

- elegante
- clara
- sem visual alarmante exagerado

---

# Sensação Final Esperada

Quando o usuário abrir a página ele deve sentir:

> “essa plataforma entende meu negócio”

E não:

> “isso é apenas mais um painel administrativo”

---

# Palavras-chave Visuais

- premium
- enterprise
- minimalista
- clean
- sofisticado
- financeiro
- operacional
- rápido
- inteligente
- escaneável
- elegante
- tecnológico
- refinado

---

# Resumo Final

A página precisa unir:

- a clareza da Vercel
- o refinamento da Linear
- a sofisticação da Stripe
- a fluidez da Raycast

O resultado final deve parecer um dashboard financeiro de próxima geração para sellers de marketplaces.
