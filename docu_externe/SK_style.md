# SK Design System — Web Application Style Guide

> **Purpose**: This document defines the visual language for all web applications, dashboards, and interfaces. It is derived from the Simon-Kucher brand identity and adapted for digital products. Any AI agent or developer reading this file should apply these rules consistently across all UI code produced.

---

## Philosophy

Three guardrails govern every design decision:

1. **Science of perception** — Apply cognitive principles to organize information, guide attention, and make complex ideas instantly accessible.
2. **Brand expression** — Build recognition and trust through precise clarity, reliable consistency, and authentic identity.
3. **Bauhaus** — Form follows function. Every element serves the message. Reduce to the maximum: no ornaments, no decoration, straight to the essence.

**The 5-second rule**: any screen, card, or component must communicate its core message within 5 seconds.

---

## Color Palette

### Brand Colors (Core)

| Name | Hex | RGB | CSS Variable | Usage |
|------|-----|-----|-------------|-------|
| Ruby Red | `#C80041` | 200, 0, 65 | `--sk-ruby` | Primary accent, CTAs, active states, brand highlights |
| Charcoal | `#323F48` | 50, 63, 72 | `--sk-charcoal` | Primary text, headings, dark backgrounds |
| White | `#FFFFFF` | 255, 255, 255 | `--sk-white` | Dominant background (60% of any screen) |
| SK Grey | `#EAEEF1` | 234, 238, 241 | `--sk-grey` | Alternative background, cards, panels |

**Color distribution rule**: 60% White — 30% Charcoal — 10% Ruby Red.

### Brand Complements

| Name | Hex | RGB | CSS Variable | Usage |
|------|-----|-----|-------------|-------|
| Cranberry | `#9E1649` | 158, 22, 73 | `--sk-cranberry` | Darker Ruby complement, hover states on Ruby |
| Salmon | `#E8526B` | 232, 82, 107 | `--sk-salmon` | Lighter Ruby complement, subtle highlights |

> **Rule**: Never use Ruby Red in a negative connotation (errors, destructive actions). Use signal red instead.

### Data Colors — Aqua (Primary data palette)

| Name | Hex | RGB | CSS Variable | Usage |
|------|-----|-----|-------------|-------|
| Aqua | `#6DB1C7` | 109, 177, 199 | `--sk-aqua` | Primary chart/data color |
| Aqua Lighter 40% | `#A7D0DD` | 167, 208, 221 | `--sk-aqua-light-40` | Single-colored charts fill |
| Aqua Lighter 60% | `#C5E0E9` | 197, 224, 233 | `--sk-aqua-light-60` | Backgrounds in data areas |
| Aqua Darker 25% | `#408EA7` | 64, 142, 167 | `--sk-aqua-dark-25` | Emphasis in charts |
| Aqua Darker 50% | `#2B5F6F` | 43, 95, 111 | `--sk-aqua-dark-50` | High-contrast data elements |

### Structure Colors — Ice Blue (Secondary structure palette)

| Name | Hex | RGB | CSS Variable | Usage |
|------|-----|-----|-------------|-------|
| Ice Blue | `#A8B9C3` | 168, 185, 195 | `--sk-ice-blue` | Borders, dividers, secondary structure |
| Ice Blue Lighter 40% | `#CBD5DB` | 203, 213, 219 | `--sk-ice-light-40` | Table row alternation, subtle borders |
| Ice Blue Lighter 60% | `#DCE3E7` | 220, 227, 231 | `--sk-ice-light-60` | Light separators, hover backgrounds |
| Ice Blue Darker 25% | `#728E9E` | 114, 142, 158 | `--sk-ice-dark-25` | Active borders, separator lines |
| Ice Blue Darker 50% | `#4A5F6B` | 74, 95, 107 | `--sk-ice-dark-50` | Strong structural lines |

### Signal Colors (Semantic)

| Name | Hex | RGB | CSS Variable | Usage |
|------|-----|-----|-------------|-------|
| Signal Red | `#E45444` | 228, 84, 68 | `--sk-signal-red` | Errors, critical alerts, negative values |
| Signal Yellow | `#FFCC66` | 255, 204, 102 | `--sk-signal-yellow` | Warnings, caution states |
| Signal Green | `#2FA74D` | 47, 167, 77 | `--sk-signal-green` | Success, positive values, confirmations |

### Value Level Colors

| Name | Hex | RGB | CSS Variable |
|------|-----|-----|-------------|
| Gold | `#E4BF28` | 228, 191, 40 | `--sk-gold` |
| Silver | `#BFBFBF` | 191, 191, 191 | `--sk-silver` |
| Bronze | `#CB8F46` | 203, 143, 70 | `--sk-bronze` |

### CSS Custom Properties Block

```css
:root {
  /* Brand */
  --sk-ruby: #C80041;
  --sk-charcoal: #323F48;
  --sk-white: #FFFFFF;
  --sk-grey: #EAEEF1;
  --sk-cranberry: #9E1649;
  --sk-salmon: #E8526B;

  /* Data — Aqua */
  --sk-aqua: #6DB1C7;
  --sk-aqua-light-40: #A7D0DD;
  --sk-aqua-light-60: #C5E0E9;
  --sk-aqua-dark-25: #408EA7;
  --sk-aqua-dark-50: #2B5F6F;

  /* Structure — Ice Blue */
  --sk-ice-blue: #A8B9C3;
  --sk-ice-light-40: #CBD5DB;
  --sk-ice-light-60: #DCE3E7;
  --sk-ice-dark-25: #728E9E;
  --sk-ice-dark-50: #4A5F6B;

  /* Signals */
  --sk-signal-red: #E45444;
  --sk-signal-yellow: #FFCC66;
  --sk-signal-green: #2FA74D;

  /* Value levels */
  --sk-gold: #E4BF28;
  --sk-silver: #BFBFBF;
  --sk-bronze: #CB8F46;

  /* Semantic aliases */
  --color-bg-primary: var(--sk-white);
  --color-bg-secondary: var(--sk-grey);
  --color-bg-dark: var(--sk-charcoal);
  --color-text-primary: var(--sk-charcoal);
  --color-text-inverse: var(--sk-white);
  --color-accent: var(--sk-ruby);
  --color-accent-hover: var(--sk-cranberry);
  --color-border: var(--sk-ice-light-40);
  --color-border-strong: var(--sk-ice-dark-25);
  --color-success: var(--sk-signal-green);
  --color-warning: var(--sk-signal-yellow);
  --color-error: var(--sk-signal-red);
  --color-data-primary: var(--sk-aqua);
  --color-data-secondary: var(--sk-ice-blue);
}
```

---

## Typography

### Font Stack

```css
--font-primary: 'Inter', 'Helvetica Neue', Arial, sans-serif;
```

> The brand font is "Neue Simon Kucher" which is proprietary. For web, use **Inter** as the closest match (geometric, clean, excellent readability). Fallback to system sans-serif.

### Type Scale

| Role | Size | Weight | Line Height | CSS Variable | Usage |
|------|------|--------|-------------|-------------|-------|
| Display | 32px / 2rem | 700 (Bold) | 1.2 | `--text-display` | Page titles, hero numbers |
| Heading 1 | 24px / 1.5rem | 700 (Bold) | 1.25 | `--text-h1` | Section titles |
| Heading 2 | 20px / 1.25rem | 700 (Bold) | 1.3 | `--text-h2` | Card titles, panel headers |
| Heading 3 | 16px / 1rem | 600 (Semibold) | 1.4 | `--text-h3` | Subsection titles |
| Body | 14px / 0.875rem | 400 (Regular) | 1.5 | `--text-body` | Paragraphs, descriptions |
| Small | 12px / 0.75rem | 400 (Regular) | 1.5 | `--text-small` | Captions, footnotes, labels |
| Tiny | 11px / 0.6875rem | 400 (Regular) | 1.4 | `--text-tiny` | Footers, timestamps, meta |

### Typography Rules

- **Text color is always Charcoal on light backgrounds or White on dark backgrounds.** No colored text except for interactive links (Ruby Red) and signal states.
- **Never use ALL CAPS** in body text. Exception: short labels, badges, or nav items ≤ 2 words.
- **Bold is for emphasis**, not decoration. If everything is bold, nothing is bold.
- **Italic is reserved for quotes and citations only.**
- Links: Ruby Red `#C80041`, underlined on hover only. Visited: Cranberry `#9E1649`.

### CSS Typography Block

```css
:root {
  --font-primary: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  --text-display: 700 2rem/1.2 var(--font-primary);
  --text-h1: 700 1.5rem/1.25 var(--font-primary);
  --text-h2: 700 1.25rem/1.3 var(--font-primary);
  --text-h3: 600 1rem/1.4 var(--font-primary);
  --text-body: 400 0.875rem/1.5 var(--font-primary);
  --text-small: 400 0.75rem/1.5 var(--font-primary);
  --text-tiny: 400 0.6875rem/1.4 var(--font-primary);
}
```

---

## Spacing & Layout

### Spacing Scale

```css
:root {
  --space-xs: 4px;    /* 0.25rem */
  --space-sm: 8px;    /* 0.5rem */
  --space-md: 16px;   /* 1rem */
  --space-lg: 24px;   /* 1.5rem */
  --space-xl: 32px;   /* 2rem */
  --space-2xl: 48px;  /* 3rem */
  --space-3xl: 64px;  /* 4rem */
}
```

### Border Radius

```css
:root {
  --radius-sm: 4px;   /* Buttons, inputs, small cards */
  --radius-md: 8px;   /* Cards, panels, modals */
  --radius-lg: 12px;  /* Large containers, hero sections */
  --radius-full: 9999px; /* Pills, avatars, badges */
}
```

> Consistent 4px curve radius on small interactive elements (matches SK's call-out box standard).

### Shadows

```css
:root {
  --shadow-sm: 0 1px 2px rgba(50, 63, 72, 0.06);
  --shadow-md: 0 4px 12px rgba(50, 63, 72, 0.08);
  --shadow-lg: 0 8px 24px rgba(50, 63, 72, 0.12);
  --shadow-focus: 0 0 0 3px rgba(200, 0, 65, 0.2);
}
```

### Grid System

Use a **8-column grid** for dashboards, 12-column for full-width layouts. Gutter width: 16px (matches SK's proportion).

```css
.sk-grid {
  display: grid;
  gap: var(--space-md);
}
.sk-grid--dashboard {
  grid-template-columns: repeat(8, 1fr);
}
.sk-grid--full {
  grid-template-columns: repeat(12, 1fr);
}
```

---

## Visual Hierarchy

Structure your UI the way SK structures slides — background to foreground:

1. **Background layer**: White `#FFFFFF` or SK Grey `#EAEEF1` — structural canvas
2. **Container layer**: White cards on grey backgrounds, or subtle Ice Blue borders — grouping
3. **Content layer**: Charcoal text, Aqua data elements — information
4. **Emphasis layer**: Ruby Red accents, bold text, signal colors — attention

> The darker and more saturated an element, the closer it is to the viewer's eye. Start with light base structure, let contrast grow with importance.

---

## Components

### Buttons

```
Primary:     bg: --sk-ruby        text: white     hover: --sk-cranberry    radius: 4px
Secondary:   bg: transparent      text: --sk-charcoal  border: --sk-ice-dark-25  hover: --sk-grey
Ghost:       bg: transparent      text: --sk-ruby      hover: bg --sk-grey
Destructive: bg: --sk-signal-red  text: white     hover: darken 10%
```

- Minimum height: 36px. Padding: 8px 16px.
- Never use Ruby Red on destructive/negative buttons — use Signal Red.
- Only one primary (Ruby) button per visible section.

### Cards & Panels

- Background: `--sk-white` on grey pages, or `--sk-grey` on white pages.
- Border: `1px solid var(--sk-ice-light-40)` or no border with `--shadow-sm`.
- Padding: `--space-lg` (24px).
- Border radius: `--radius-md` (8px).
- Header separator: 1px `--sk-ice-dark-25` below the card title.

### Tables

| Property | Value |
|----------|-------|
| Header background | `--sk-aqua-dark-50` or `--sk-charcoal` |
| Header text | White, semibold |
| Row separator | `1px solid var(--sk-ice-light-60)` |
| Alternating rows | `--sk-grey` or none |
| Cell padding | 8px 12px (inner margin ~0.2 equivalent) |
| Numbers | Right-aligned |
| Text | Left-aligned |
| Symbols/status | Center-aligned |
| Active/selected row | Left border 3px `--sk-ruby` |

- When using signal colors in cells, apply them to the **entire cell background**, never to text color only (reduces contrast).
- No vertical closing borders on the sides, except when multiple tables sit side by side.

### Charts & Data Visualization

**Color order for series (most to least important):**

1. `--sk-aqua-dark-50` (#2B5F6F)
2. `--sk-aqua-dark-25` (#408EA7)
3. `--sk-aqua` (#6DB1C7)
4. `--sk-aqua-light-40` (#A7D0DD)
5. `--sk-aqua-light-60` (#C5E0E9)

**For additional series**, extend into Ice Blue:

6. `--sk-ice-dark-50` (#4A5F6B)
7. `--sk-ice-dark-25` (#728E9E)
8. `--sk-ice-blue` (#A8B9C3)
9. `--sk-ice-light-40` (#CBD5DB)

**Chart rules:**
- Legend: top-right of chart area
- Chart title: separate from chart element, aligned to axis (not axis labels)
- Axis lines: `--sk-charcoal`, 0.75px. Always visible.
- Gridlines: dashed, `--sk-ice-light-40`
- Use signal colors only for evaluation (positive/negative/neutral) — not for regular series
- Single-value charts use `--sk-aqua-light-40` as fill

**Recharts / D3 palette array:**

```js
const SK_CHART_COLORS = [
  '#2B5F6F', // Aqua Darker 50%
  '#408EA7', // Aqua Darker 25%
  '#6DB1C7', // Aqua
  '#A7D0DD', // Aqua Lighter 40%
  '#C5E0E9', // Aqua Lighter 60%
  '#4A5F6B', // Ice Blue Darker 50%
  '#728E9E', // Ice Blue Darker 25%
  '#A8B9C3', // Ice Blue
];

const SK_SIGNAL_COLORS = {
  positive: '#2FA74D',
  neutral: '#FFCC66',
  negative: '#E45444',
};
```

### Status Indicators

**Traffic lights**: Green (#2FA74D) = good, Yellow (#FFCC66) = caution, Red (#E45444) = critical. Never use Ruby Red for status.

**Score bars**: Use evenly sized blocks in Aqua/Ice Blue gradients.

**Harvey balls**: Use `--sk-aqua` or `--sk-ice-blue` fill only. Keep sizing uniform.

### Badges & Tags

- Background: color at 15% opacity, text in full color
- Border-radius: `--radius-full`
- Padding: 2px 8px
- Font: `--text-small`, semibold

### Inputs & Forms

- Height: 36px
- Border: `1px solid var(--sk-ice-dark-25)`
- Border-radius: `--radius-sm` (4px)
- Focus: `--shadow-focus` (Ruby Red glow)
- Background: White
- Placeholder text: `--sk-ice-blue`
- Error border: `--sk-signal-red`

### Navigation & Sidebar

- Sidebar background: `--sk-charcoal`
- Nav text: White, regular weight
- Active item: left border 3px `--sk-ruby`, text white bold, bg rgba(255,255,255,0.08)
- Hover: bg rgba(255,255,255,0.05)
- Section dividers: 1px `--sk-ice-dark-50`

### Modals & Dialogs

- Overlay: `rgba(50, 63, 72, 0.5)`
- Container: White, `--radius-md`, `--shadow-lg`
- Max width: 560px (default), 800px (large)
- Header: Charcoal bold, bottom border `--sk-ice-light-40`
- Actions: right-aligned, primary button rightmost

### Toasts & Alerts

- Success: left border 4px `--sk-signal-green`, bg green at 5% opacity
- Warning: left border 4px `--sk-signal-yellow`, bg yellow at 5% opacity
- Error: left border 4px `--sk-signal-red`, bg red at 5% opacity
- Info: left border 4px `--sk-aqua`, bg aqua at 5% opacity

---

## Separator Lines & Dividers

The red header line is the brand's signature separator:

```css
.sk-separator {
  width: 52px;
  height: 3px;
  background: var(--sk-ruby);
}
```

- Use only as a **text/section separator** between headings and content
- Never overlay it on images, tables, or charts
- For content dividers (non-brand), use `--sk-ice-light-40` at 1px

When using diagonal decorative elements, always maintain a **45° angle**.

---

## Iconography

- Style: **filled, rounded corners**, monochrome
- Default color: `--sk-ruby` (brand context) or `--sk-aqua` / `--sk-ice-blue` (functional context)
- Signal colors allowed only for: alerts, directional arrows, status indicators
- Size: 16px (inline), 20px (buttons), 24px (navigation), 32px+ (feature cards)
- Icons go **before or above** their label — never after or below
- Do not use icons as decoration. Every icon must have a communicative purpose.

---

## Imagery Guidelines

- **Show emotion** with people, **expertise** with data, **vision** with architecture
- No frames, no drop shadows, no color filters on photos
- When text overlays an image, use a gradient overlay:

```css
.sk-image-overlay {
  background: linear-gradient(
    to right,
    rgba(50, 63, 72, 0.85) 0%,
    rgba(50, 63, 72, 0.4) 60%,
    transparent 100%
  );
}
```

- Keep light, contrast, and saturation consistent across all images on the same page
- Imagery reflects an international, inclusive identity

---

## Dark Mode Mapping

When implementing dark mode, follow these mappings:

| Light Mode | Dark Mode |
|------------|-----------|
| `--sk-white` (#FFFFFF) | `--sk-charcoal` (#323F48) |
| `--sk-grey` (#EAEEF1) | #2A333B (slightly lighter than charcoal) |
| `--sk-charcoal` text | `--sk-white` text |
| `--sk-ruby` accent | `--sk-salmon` (#E8526B) for better contrast |
| `--sk-ice-light-*` borders | Borders at 12% white opacity |
| Card shadows | Slightly more pronounced, rgba(0,0,0,0.3) |
| Aqua chart colors | Keep as-is (good contrast on dark) |

---

## Tailwind Mapping

If using Tailwind CSS, extend the config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        sk: {
          ruby: '#C80041',
          cranberry: '#9E1649',
          salmon: '#E8526B',
          charcoal: '#323F48',
          grey: '#EAEEF1',
          aqua: {
            DEFAULT: '#6DB1C7',
            'light-40': '#A7D0DD',
            'light-60': '#C5E0E9',
            'dark-25': '#408EA7',
            'dark-50': '#2B5F6F',
          },
          ice: {
            DEFAULT: '#A8B9C3',
            'light-40': '#CBD5DB',
            'light-60': '#DCE3E7',
            'dark-25': '#728E9E',
            'dark-50': '#4A5F6B',
          },
          signal: {
            red: '#E45444',
            yellow: '#FFCC66',
            green: '#2FA74D',
          },
          gold: '#E4BF28',
          silver: '#BFBFBF',
          bronze: '#CB8F46',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        sk: '4px',
      },
      boxShadow: {
        'sk-focus': '0 0 0 3px rgba(200, 0, 65, 0.2)',
      },
    },
  },
};
```

---

## Do's and Don'ts

### Do
- Keep layouts clean and structured — whitespace is a design tool
- Use the grid system for consistent alignment
- Let visual hierarchy guide the eye: light → dark = low → high importance
- Use Ruby Red sparingly for maximum impact (10% rule)
- Maintain consistent color coding across an entire application
- Right-align numbers, left-align text, center-align status indicators

### Don't
- Use Ruby Red for negative or error states (use Signal Red)
- Bold entire paragraphs — highlight only key phrases
- Use colored text in body content (Charcoal or White only)
- Mix icon styles or visual weights
- Overload screens with too many accent colors — Aqua + Ice Blue + one signal is enough
- Add decorative elements without communicative purpose
- Use frames, drop shadows, or filters on photographs