# Typography System — SME Emission Detector

For a climate-tech B2B product targeting SMEs, auditors, and CFOs, typography must read as **credible, technical, and modern** — not startup-y or playful.

---

## Recommended stack

- **Headings:** Inter Tight (or Inter)
- **Body:** Inter
- **Numbers / data:** JetBrains Mono (or IBM Plex Mono)

All three are free on Google Fonts, load fast, and render tabular numbers correctly — critical for a report that shows tCO₂e values.

### Font import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Tailwind configuration

```js
theme: {
  fontFamily: {
    display: ['"Inter Tight"', 'Inter', 'system-ui', 'sans-serif'],
    sans:    ['Inter', 'system-ui', 'sans-serif'],
    mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
  },
  fontSize: {
    // Marketing / hero
    'display-xl': ['4.5rem',   { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
    'display-lg': ['3.5rem',   { lineHeight: '1.08', letterSpacing: '-0.025em', fontWeight: '700' }],

    // App headings
    'h1': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em',  fontWeight: '700' }],
    'h2': ['1.75rem', { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: '700' }],
    'h3': ['1.25rem', { lineHeight: '1.3',  letterSpacing: '-0.01em',  fontWeight: '600' }],

    // Body
    'body-lg': ['1.125rem', { lineHeight: '1.6' }],
    'body':    ['1rem',     { lineHeight: '1.6' }],
    'body-sm': ['0.875rem', { lineHeight: '1.5' }],
    'caption': ['0.75rem',  { lineHeight: '1.4', letterSpacing: '0.02em' }],
  },
}
```

---

## Rules that make it look impressive (not amateur)

1. **Tight tracking on big headings.** `letter-spacing: -0.02em` on anything ≥ 24px. Default browser tracking makes big text look loose.
2. **Tabular numbers for every KPI, table, and MACC value.** Otherwise digits jitter width when values change.
   ```css
   .num,
   table td.num,
   .kpi-value {
     font-variant-numeric: tabular-nums;
   }
   ```
3. **Never use font-weight 400 on a heading.** 600 minimum, 700 default.
4. **Max line length 65–75 characters** for body copy (`max-w-prose` or `max-w-2xl` in Tailwind).
5. **One display font, one body font, one mono.** No more. Anything with 4+ fonts looks like a hackathon project.
6. **Uppercase micro-labels** for KPI card headers with `letter-spacing: 0.08em` and `font-size: 11px`. Signals "dashboard-grade."

---

## Alternative pairings

| Feel | Display | Body | When to use |
|---|---|---|---|
| **Enterprise credible** | Inter Tight | Inter | Default. Safest, most legible. |
| **Editorial / premium** | Fraunces or Instrument Serif | Inter | Landing page hero only, sans for app. Feels like *The Economist* / Stripe. |
| **Technical / precise** | Space Grotesk | Inter | Slightly more character in headings; still neutral. |

For BRSR Core + SME + CFO audience: **stick with Inter Tight + Inter + JetBrains Mono**. Save Fraunces for the landing hero if you want a "moment" on the marketing page.

---

## What to avoid

- **Poppins, Montserrat, Nunito** — over-used, read as generic startup.
- **Roboto** — feels dated, Google-y.
- **Handwritten / rounded display fonts** — kill B2B credibility.
- **Mixing warm neutrals (`#1F2937` gray) with pure black** — pick one and stay in the same family.

---

## Type scale reference (final)

| Token | Size | Weight | Use |
|---|---|---|---|
| `display-xl` | 72 px | 700 | Landing hero |
| `display-lg` | 56 px | 700 | Landing sub-hero |
| `h1` | 36 px | 700 | App page title |
| `h2` | 28 px | 700 | Section header |
| `h3` | 20 px | 600 | Card title |
| `body-lg` | 18 px | 400 | Lead paragraph |
| `body` | 16 px | 400 | Default text |
| `body-sm` | 14 px | 400 | Secondary text |
| `caption` | 12 px | 500 | Meta / labels |
| `micro-label` | 11 px | 600, `tracking: 0.08em`, `uppercase` | KPI card headers |

---

## Colour tokens (paired, so the AI agent has a full spec)

Neutrals sit in the slate/gray family — never pure black on pure white.

```css
:root {
  /* Ink */
  --ink-900: #0F172A;   /* headings */
  --ink-700: #1F2937;   /* body */
  --ink-500: #4B5563;   /* secondary */
  --ink-400: #6B7280;   /* captions */
  --ink-300: #9CA3AF;   /* disabled */

  /* Surface */
  --bg:      #FFFFFF;
  --bg-alt:  #F9FAFB;
  --bg-mute: #F3F4F6;
  --line:    #E5E7EB;

  /* Brand (climate/finance credible) */
  --brand-900: #0B3B2E;   /* deepest forest */
  --brand-700: #145C48;   /* primary */
  --brand-500: #1F8A6D;   /* accent */
  --brand-100: #E6F4EF;   /* tint */

  /* Signal */
  --pos: #16A34A;   /* saving / good */
  --warn: #F59E0B;  /* attention */
  --neg: #DC2626;   /* hotspot / risk */
}
```

Pair headings with `--ink-900`, body with `--ink-700`, captions with `--ink-400`.

---

_This file is the source of truth for the frontend design system. The AI agent scaffolding the Next.js app should read this before setting up Tailwind._
