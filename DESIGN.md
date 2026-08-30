---
name: Trip Tracker 2026
description: Offline-first, multi-device trip expense splitter with a travel-document visual motif
colors:
  primary: "#0F6F63"
  primary-light: "#3FA396"
  ink: "#16181D"
  ink-light: "#3A3D44"
  runway-orange: "#FF7A00"
  success: "#16A34A"
  danger: "#DC2626"
  warning: "#D97706"
  neutral-bg: "#F4F5F7"
  surface: "#FFFFFF"
  surface-hover: "#F1F2F4"
  border: "#E4E7EC"
  text-primary: "#16181D"
  text-secondary: "#55585E"
  text-muted: "#6B6E76"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Iowan Old Style, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, -apple-system, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, SF Mono, monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "10px"
  md: "14px"
  lg: "20px"
  pill: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.runway-orange}"
    textColor: "#FFFFFF"
    rounded: "{rounded.pill}"
    padding: "13px 20px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "18px 20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
---

# Design System: Trip Tracker 2026

## Overview

**Creative North Star: "The Boarding Pass"**

Trip Tracker borrows its confidence from travel documents rather than generic SaaS chrome: a passport-style trip card carries a circular stamp badge, a mono uppercase destination eyebrow, and a dashed-rule footer that reads like a ticket stub perforation. This isn't a decorative theme bolted on top — it's the app's own signature component (`.passport-card` / `.pp-stamp`), grounded in what the codebase already builds, not an invented overlay.

Everywhere else, the system is a restrained "Linear/Stripe/Notion" neutral-gray base: one confident teal accent for structure and trust, one warm orange for the single primary action per screen. A frosted-glass header/nav floats over a live map backdrop on the trip dashboard. The system supports light mode, OS-driven dark mode, and an explicit in-app dark toggle.

**Key Characteristics:**
- Neutral gray-scale foundation, teal for structural/brand elements, orange reserved for the one primary CTA
- A travel-document motif (stamps, mono eyebrows, dashed perforated rules) as the app's recurring signature, not a one-off card
- Frosted glass (`backdrop-filter: blur`) for floating chrome (header, nav, popups) over content, never for base surfaces
- Money is always monospace with tabular figures, everything else is proportional
- Full light/dark parity — every token has a dark-mode counterpart, never a light-only afterthought

## Colors

Neutral gray-scale base carries the interface; color is spent deliberately on two accents, not scattered across the UI.

### Primary
- **Boarding Pass Teal** (`#0F6F63`, dark-mode `#3FCBBD`): structural brand color — headers, stamps, focus rings, active states, links. Used far more often than orange; it's the "always there" color.

### Secondary
- **Runway Orange** (`#FF7A00`): reserved for the single primary action per screen — the gradient CTA button, the FAB, "you owe" amounts. It should read as *the* thing to tap, not decoration.

### Neutral
- **Ink** (`#16181D`, dark-mode `#EDEEF0`): primary text, secondary-accent surfaces.
- **Text Secondary** (`#55585E`, dark `#A3A6AD`) / **Text Muted** (`#6B6E76`, dark `#8B8E96`): supporting copy, timestamps, labels.
- **Page** (`#F4F5F7`, dark `#0D0E10`) → **App Shell** (`#FAFBFC`, dark `#131417`) → **Surface** (`#FFFFFF`, dark `#1A1C20`) → **Surface Hover** (`#F1F2F4`, dark `#22252A`): a four-step elevation stack, lightest at the page and each layer up a shade darker/lighter toward the surface.
- **Border** (`#E4E7EC`, dark `#2A2D33`): 1px hairlines on cards, inputs, dividers.

### Named Rules
**The One Warm Color Rule.** Orange never competes with itself — one primary CTA visible at a time. If two actions on screen both feel primary, one of them is wrong.

**The No-Pure-Black Rule.** Dark mode never drops to `#000000`; the darkest surface (`#0D0E10`) stays a step above true black so depth layers remain visible.

## Typography

**Display Font:** Plus Jakarta Sans (with Iowan Old Style, sans-serif fallback)
**Body Font:** IBM Plex Sans (with -apple-system fallback)
**Label/Mono Font:** IBM Plex Mono (with SF Mono fallback)

**Character:** A geometric, slightly rounded display face for titles paired with a technical, highly legible body/mono combination — reads as "confident travel-tech," not corporate SaaS.

### Hierarchy
- **Display/Title** (600, `clamp(1.5rem, 4vw, 2rem)` down to `clamp(1.1rem, 3vw, 1.4rem)` for h3, line-height 1.2, letter-spacing -0.01em): page and card titles.
- **Body** (400, 15px, line-height 1.4): default UI copy.
- **Label** (600, 11px, uppercase, letter-spacing 0.08em, mono): form field labels, the `.pp-dest` destination eyebrow, category chips.
- **Money/Mono** (500-600, mono, `font-variant-numeric: tabular-nums`): every amount, so digits align in columns down a list.

### Named Rules
**The Money-Is-Mono Rule.** Any rendered currency amount uses the mono family with tabular figures — no exceptions, so a column of amounts always aligns.

**The 16px Input Floor Rule.** Text inputs never render below 16px, even where the surrounding UI runs smaller, specifically to avoid iOS Safari's auto-zoom-on-focus.

## Layout

Mobile-first single column, `max-width: 500px`, widening at desktop breakpoints (680px, 820px). No formal spacing token scale exists in code — component padding is authored ad hoc per component, generally in an 8-20px range with 12-18px the most common card/section rhythm. Tab content areas reserve top padding equal to the live-measured floating header height (`--trip-header-height` custom property, updated via ResizeObserver) so content never sits under the frosted header.

## Elevation & Depth

Hybrid: flat neutral surfaces at rest, lifted with soft diffuse shadows for cards and popovers, plus true frosted-glass blur for floating chrome (header, bottom nav, popups) that sits over scrolling content or the map backdrop.

### Shadow Vocabulary
- **sm** (`0 1px 2px rgba(22,24,29,.04), 0 4px 12px -4px rgba(22,24,29,.08)`): default resting card lift.
- **md** (`0 4px 12px rgba(22,24,29,.08), 0 12px 32px -8px rgba(22,24,29,.14)`): hover/raised state.
- **lg** (`0 8px 24px rgba(22,24,29,.12), 0 20px 48px -12px rgba(22,24,29,.2)`): modals, sheets.
- **glass** (`0 1px 3px rgba(22,24,29,.06), 0 6px 20px -6px rgba(22,24,29,.12)`): the default card/popup shadow (`.glass-card`).

Dark mode swaps every shadow base from `rgba(22,24,29,...)` to `rgba(0,0,0,...)` at higher opacity rather than reusing the same values — shadows need to read against a dark surface, not just get inverted.

### Named Rules
**The Glass-For-Chrome Rule.** `backdrop-filter: blur` is reserved for floating navigational chrome (header, bottom nav, popovers) over scrolling content — never applied to a base page or card background.

## Shapes

Three-step radius scale (10 / 14 / 20px) plus an uncapped pill (`9999px`) for anything button- or chip-shaped, and `50%` for every avatar/icon-circle/FAB. `--border-radius-pill` is referenced across ~8 rules (`.gradient-btn`, `.secondary-btn`, `.filter-chip`, `.nav-tab-item`, etc.) but was never actually assigned a value in `:root` — every literal usage in the file is `9999px`, so that's the value documented here; it's still worth defining the custom property itself in code rather than relying on convention.

## Components

### Buttons
- **Shape:** pill (9999px), full-height fill.
- **Primary** (`.gradient-btn`): orange gradient `#FF7A00 → #EA580C`, white text, `translateY(-1px)` lift + glow shadow (`rgba(255,122,0,.28)`) on hover.
- **Secondary** (`.secondary-btn`): transparent fill, 1px border, ink text.
- **Hover / Focus:** `--transition-smooth` (0.2s cubic-bezier(0.4,0,0.2,1)); focus-visible gets a 2.5px teal outline with 2px offset, radius 4px.

### Cards / Containers (`.glass-card`)
- **Corner Style:** 14px (md).
- **Background:** surface color, 1px border.
- **Shadow Strategy:** glass shadow (see Elevation).
- **Internal Padding:** ~18-20px, tighter (10-14px) for list-row cards.

### Inputs / Fields
- **Style:** label above field (mono, uppercase, 11px), 10-14px radius, surface background, 1px border.
- **Focus:** 3px accent-tinted glow ring (`--border-color-focus`).
- **Constraint:** text stays ≥16px regardless of visual density, to defeat iOS auto-zoom.

### Navigation
- Floating frosted pill nav (`blur(24px) saturate(190%)`) with a sliding active-tab indicator using `--ease-uber-spring`. FAB is a 52px circle in the header gradient with spring-easing press scale.

### Passport Card (signature component)
The recurring trip-list card: a circular stamp badge (`.pp-stamp`, 48px, 1.5px teal outline) sits top-right; a mono uppercase destination eyebrow (`.pp-dest`) and a title-font trip name (`.pp-name`) sit below it; a dashed 1.5px rule (`.pp-foot`, echoing a ticket-stub perforation) separates the header from the avatar/action footer. This is the component that carries "The Boarding Pass" north star most literally — new travel-context cards should default to this vocabulary rather than a plain generic card.

## Do's and Don'ts

### Do:
- **Do** keep orange to one primary action per screen (The One Warm Color Rule).
- **Do** render every amount in mono with tabular figures (The Money-Is-Mono Rule).
- **Do** reuse the passport-card / stamp vocabulary for new travel-document-flavored surfaces (trip cards, tickets, confirmations) before inventing a new card style.
- **Do** keep dark mode's darkest surface a step above pure black (The No-Pure-Black Rule).
- **Do** reserve `backdrop-filter: blur` for floating chrome, not base surfaces (The Glass-For-Chrome Rule).

### Don't:
- **Don't** introduce a third accent color family (no purple, no neon) — the system is intentionally teal + orange only.
- **Don't** drop interactive text below 16px in form inputs.
- **Don't** apply frosted glass to a resting card or page background — it's a chrome-only treatment.
- **Don't** invent a new pill-radius value; every pill in the system is 9999px.
