# KodeTalent design system "Canopy" (v2) — conversion spec

Single source of truth for converting screens off the monochrome "W" look onto
the indigo UI-kit look the user chose (canopy header + white sheet, pill CTAs,
soft-shadow cards). This REPLACES `DESIGN_SYSTEM.md` v1 (the black-and-white
spec) — v1's non-negotiables (styling only, no logic changes) still apply.

## Tokens (already defined in index.css)

| Tailwind class | Value | Use for |
|---|---|---|
| `text-ink` / `bg-ink` | `#1a1d2e` | Headings, primary body text |
| `text-ink-muted` | `#9aa0ae` | Secondary text, captions, placeholders, inactive icons |
| `bg-paper` / `text-paper` | `#ffffff` | Sheets, cards, text on brand/ink surfaces |
| `bg-canvas` | `#f4f5f7` | Page background behind the white sheet |
| `border-line` / `bg-line` | `#ecedf3` | Hairline dividers, inactive track fills, input borders |
| `text-brand` / `bg-brand` | `#4a55c7` | Primary CTAs, active states, canopy background, icons-on-brand |
| `bg-brand-soft` | `#eef0fb` | Selected/active tile fills, subtle brand tint backgrounds |
| `text-highlight` / `bg-highlight` | `#f5a040` | ONLY calendar/date highlights, unread badges, "hot" emphasis |
| `text-done` / `bg-done` | `#22c55e` | ONLY a completed checkmark or a passing eligibility gate dot |
| `text-danger` / `bg-danger` | `#dc2626` | ONLY error messages, scam warnings, failing gate dots |
| `shadow-soft` | `0 8px 24px rgba(26,29,46,0.08)` | Cards and sheets that need to lift off the canvas |

Shadcn primitives (`Button`, `Badge`, `Switch`, etc.) already read brand indigo
via the repointed `--primary`/`--secondary`/`--accent` CSS vars — using the
plain shadcn component defaults is usually correct without extra classes.

## Hard replacement map (from the v1 monochrome pass)

| Old (v1 monochrome) | New (v2 canopy) |
|---|---|
| `bg-ink` on CTA buttons | `bg-brand` |
| `bg-paper` as the page background | `bg-canvas` (page) + white `bg-paper` sheet on top |
| `border border-line` as the only card treatment | `bg-paper rounded-2xl shadow-soft` (borders now optional, shadows are back) |
| `border-ink bg-line/40` (active/selected state) | `border-brand bg-brand-soft` |
| black toggles/switches (`bg-ink` when on) | `bg-brand` when on |
| flat `bg-ink` progress fill | `bg-brand` fill, `bg-line` track |
| plain hairline-divider lists | still fine for dense list rows; use cards for anything tappable/primary |

## Structural rules

1. **Canopy + sheet, for primary/flagship screens** (Home, Prep, Onboarding,
   and any screen with a back arrow + title as its header): render a solid
   `bg-brand` header block (back arrow + title, optionally step tabs), and
   place page content in a `bg-paper rounded-t-3xl` sheet that overlaps the
   bottom of the canopy by ~16-24px (negative margin or the canopy simply
   extends behind the sheet). Secondary/list screens (Inbox, InterviewHistory,
   Join) may skip the canopy and just sit on `bg-canvas` with a plain white
   TopBar — use judgment, don't force a canopy where the kit reference
   wouldn't have one.
2. **Step tabs** (used where a flow has stages, e.g. interview setup, resume
   builder): small `bg-paper` (inactive: `bg-white/20` on the canopy) rounded-xl
   tiles with icon + label; a completed tab gets a small `bg-done` check badge
   in its top-right corner. Active tab has a `border-2 border-brand` or solid
   fill per context.
3. **Primary button:** `bg-brand text-white font-bold rounded-full px-6 py-3.5`
   (kit CTAs are pills, not rounded rectangles). Secondary: `bg-paper text-brand
   border border-line rounded-full`. Never a gradient.
4. **Cards:** `bg-paper rounded-2xl shadow-soft p-4` (or `p-5`). Thumbnail/image
   left, bold title + muted meta row. Replace v1's hairline-only cards with
   this pattern wherever the card represents a tappable item (job, course,
   interview, application).
5. **List rows** that are dense/scannable (not card-like) can still use
   `components/kodetalent/TaskRow.tsx`'s shape: `flex items-center gap-3 py-4
   border-t border-line first:border-t-0` — don't force every row into a card.
6. **Type scale:** page title `text-[26px]/[30px] font-extrabold text-ink
   leading-[1.06] tracking-tight` (white on canopy, ink on sheet); section
   label `text-[11px] font-bold uppercase tracking-wider text-ink-muted`;
   body `text-[14px] text-ink`; caption `text-[12px] text-ink-muted`.
7. **Icons / decorative elements:** functional icons (lucide) use `text-brand`
   when they represent an active/primary state, `text-ink-muted` otherwise.
   Domain tiles / category chips get `bg-brand-soft text-brand` instead of the
   v1 `border border-line bg-paper`.
8. **Progress bars / rings / calendars:** track `bg-line`, fill `bg-brand`.
   Calendar "selected range" endpoints use `bg-highlight` (orange), matching
   the kit's date-picker. Score rings stay single-color (brand), not
   red/orange/green thresholds.
9. **Empty states:** `text-ink` headline, `text-ink-muted` sub-line, one
   `bg-brand` pill button. Still no illustrations/dashed boxes unless the kit
   reference actually shows one for that screen type.
10. **Modals / sheets:** `bg-paper rounded-t-3xl shadow-soft`, overlay
    `bg-ink/40`, grabber `bg-line`. Follow the header / scrollable-body /
    pinned-footer structure established in `Prep.tsx`'s interview-setup drawer
    (fixed header with grabber + close button, `flex-1 min-h-0 overflow-y-auto`
    body, `flex-shrink-0 border-t border-line` footer holding the primary CTA)
    — this is what fixed the CTA-trapped-under-nav bug and must not regress.
    All sheets stay `z-[60]`, use `dvh` units for max-height, and pad for
    `env(safe-area-inset-bottom)`.

## Non-negotiable

- Do NOT change any logic, state, data fetching, handler, hook, route, or
  `data-testid`. Styling and presentational markup only.
- Keep all existing functionality working. `npx tsc --noEmit` must pass.
- Do not delete features. Do not rename exports.
- `bg-done` (green) is reserved for completed/passing states only — never a
  general accent. `bg-danger` (red) is reserved for errors/scam warnings only
  — never a general accent. `bg-highlight` (orange) is for calendar/badge
  emphasis only — don't use it as a second CTA color.
- Do not regress the sheet-overlay fix: no `willChange`/`backfaceVisibility`
  on the AppLayout page-fade wrapper, and every bottom sheet keeps its
  header/scrollable-body/pinned-footer structure.
