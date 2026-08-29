# Design System: Trip Tracker

Extracted from `src/index.css` (CSS custom properties, no Tailwind config in repo). Documents what exists today — not a redesign — so Google Stitch generates screens consistent with the live app.

## 1. Visual Theme & Atmosphere

Mobile-first travel/expense-tracking app, max-width 500px column (680px/820px on desktop breakpoints). Neutral gray-scale base with one confident teal accent ("Linear/Stripe/Notion" pattern) plus a secondary warm-orange accent for primary CTAs. Frosted-glass header/nav (`backdrop-filter: blur`) over a live map backdrop. Supports light mode, OS-driven dark mode, and explicit dark-mode toggle (`data-theme="dark"`).

## 2. Color Tokens

### Light (`:root` default)
- **Page background** `--bg-page` `#F4F5F7`
- **App shell background** `--bg-app` `#FAFBFC`
- **Surface (cards, inputs)** `--bg-surface` `#FFFFFF`
- **Surface hover** `--bg-surface-hover` `#F1F2F4`
- **Border** `--border-color` `#E4E7EC`
- **Border focus** `--border-color-focus` `rgba(15, 111, 99, 0.35)`
- **Primary accent (teal)** `--primary-accent` `#0F6F63`
- **Primary accent light** `--primary-accent-light` `#3FA396`
- **Secondary accent (ink)** `--secondary-accent` `#16181D`
- **Secondary accent light** `--secondary-accent-light` `#3A3D44`
- **Accent orange (CTA/FAB)** `--accent-orange` `#FF7A00`
- **Success** `--color-success` `#16A34A` / text variant `--color-success-text` `#12843C`
- **Danger** `--color-danger` `#DC2626`
- **Warning** `--color-warning` `#D97706` / text variant `--color-warning-text` `#AC5F05`
- **Text primary** `--text-primary` `#16181D`
- **Text secondary** `--text-secondary` `#55585E`
- **Text muted** `--text-muted` `#6B6E76`
- **Header background** `--bg-header` `#0F6F63`, solid gradient `--header-gradient-solid` `linear-gradient(135deg, #0F6F63, #0B5348)`

### Dark (`prefers-color-scheme: dark` or `[data-theme="dark"]`)
Elevated dark grays (never pure black), same teal accent brightened for contrast.
- **Page** `#0D0E10` → **App** `#131417` → **Surface** `#1A1C20` → **Surface hover** `#22252A`
- **Border** `#2A2D33`, focus `rgba(63, 203, 189, 0.4)`
- **Primary accent** `#3FCBBD`, light `#63D8CC`
- **Secondary accent** `#EDEEF0`
- **Success** `#34D399` · **Danger** `#F87171` · **Warning** `#FBBF24`
- **Text primary** `#EDEEF0` · secondary `#A3A6AD` · muted `#8B8E96`
- **Header** `#163B36`, solid gradient `linear-gradient(135deg, #1F6E68, #0D2522)`

### Shadows (elevation)
- `--shadow-sm` `0 1px 2px rgba(22,24,29,.04), 0 4px 12px -4px rgba(22,24,29,.08)`
- `--shadow-md` `0 4px 12px rgba(22,24,29,.08), 0 12px 32px -8px rgba(22,24,29,.14)`
- `--shadow-lg` `0 8px 24px rgba(22,24,29,.12), 0 20px 48px -12px rgba(22,24,29,.2)`
- `--glass-shadow` `0 1px 3px rgba(22,24,29,.06), 0 6px 20px -6px rgba(22,24,29,.12)` — used on cards/popups
- Dark mode swaps all shadow bases to `rgba(0,0,0,...)` with higher opacity.

Rule: one accent family (teal) + one warm CTA accent (orange). No purple/neon. No pure black.

## 3. Typography

| Role | Font stack | Source |
|---|---|---|
| Titles (`h1-h4`, `.app-logo`) | `'Plus Jakarta Sans', 'Iowan Old Style', sans-serif` | self-hosted variable woff2 (weights 600/700/800) |
| Body / UI | `'IBM Plex Sans', -apple-system, sans-serif` | self-hosted variable woff2 (weights 300-700) |
| Mono (amounts, labels, timestamps) | `'IBM Plex Mono', 'SF Mono', monospace` | self-hosted static woff2 (400/500/600) |
| Editorial/display accent (loaded, currently unused in body copy) | `'Fraunces'` variable + italic | self-hosted woff2 |

- Titles: `font-weight: 600`, `letter-spacing: -0.01em`.
- Fluid headline scale: `h1 clamp(1.5rem, 4vw, 2rem)`, `h2 clamp(1.25rem, 3.5vw, 1.75rem)`, `h3 clamp(1.1rem, 3vw, 1.4rem)`.
- Money/amounts (`.money`, `.amount-mono`): mono font + `font-variant-numeric: tabular-nums` so digits align in columns.
- Form labels: mono, 11px, uppercase, `letter-spacing: 0.08em`.
- Input text kept ≥16px (`.input-field`) to avoid iOS Safari auto-zoom on focus.

## 4. Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `--border-radius-sm` | `10px` | tight controls |
| `--border-radius-md` | `14px` | cards, inputs, popups (most common) |
| `--border-radius-lg` | `20px` | large surfaces |
| `--border-radius-pill` | *(referenced but not defined in `:root` — see note)* | buttons, chips, search fields |
| ad hoc `9999px` / `999px` | literal | nav bar, nav pill, tab bar, FAB badges |
| `50%` | literal | all circular icon buttons / avatars / FAB |

**Note:** `--border-radius-pill` is used across 8 rules (`.gradient-btn`, `.secondary-btn`, `.filter-chip`, `.nav-tab-item`, etc.) but is never assigned a value in `src/index.css`. Given every literal pill usage in the file is `9999px`, treat `--border-radius-pill = 9999px` as the intended value — flag this as a token worth actually defining in code.

## 5. Motion / Easing Tokens

- `--transition-smooth`: `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)` — default for hover/active states
- `--ease-spring`: `cubic-bezier(0.32, 0.72, 0, 1)`
- `--ease-decel`: `cubic-bezier(0.16, 1, 0.3, 1)` — panel/header reveal
- `--ease-uber-spring`: `cubic-bezier(0.18, 0.89, 0.32, 1.12)` — tab pill slide
- `--ease-bounce-back`: `cubic-bezier(0.34, 1.4, 0.64, 1)`
- All motion respects `prefers-reduced-motion: reduce` (global collapse to 0.01ms).

## 6. Component Notes

- **Primary button** (`.gradient-btn`): orange gradient `#FF7A00 → #EA580C`, pill radius, `translateY(-1px)` hover lift, glow shadow `rgba(255,122,0,.28)`.
- **Secondary button** (`.secondary-btn`): transparent fill, 1px border, pill radius.
- **Cards** (`.glass-card`): surface bg, 1px border, `--border-radius-md`, `--glass-shadow`.
- **Inputs**: label above field, `--border-radius-sm`/`md`, focus ring = 3px accent-tinted glow.
- **Nav bar**: floating frosted pill, `blur(24px) saturate(190%)`, sliding active-tab indicator.
- **FAB**: 52px circle, header gradient fill, spring-easing hover/press scale.

## 7. Stack Reality Check

No Tailwind config exists in this repo (`tailwind.config.*` absent) — styling is hand-authored CSS custom properties in `src/index.css` plus per-component class names. Any Stitch output should target this token vocabulary (CSS variables), not Tailwind utility classes.
