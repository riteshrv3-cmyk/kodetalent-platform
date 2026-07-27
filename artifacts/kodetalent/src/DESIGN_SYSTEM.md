# KodeTalent design system "W" — conversion spec

Single source of truth for converting screens off the old indigo/gradient look.
Every screen must use ONLY these tokens. No exceptions, no new colors.

## Tokens (already defined in index.css)

| Tailwind class | Value | Use for |
|---|---|---|
| `text-ink` / `bg-ink` | `#0f0f10` | All primary text; primary button background |
| `text-ink-muted` | `#9a9aa2` | Secondary text, captions, placeholders, inactive icons |
| `bg-paper` / `text-paper` | `#ffffff` | Page background; text on ink buttons |
| `border-line` / `bg-line` | `#ececf0` | Hairline dividers, borders, inactive track fills |
| `text-done` / `bg-done` | `#22c55e` | ONLY a completed checkmark or a passing eligibility gate dot |
| `text-danger` / `bg-danger` | `#dc2626` | ONLY error messages, scam warnings, failing gate dots |

## Hard replacement map

| Old | New |
|---|---|
| `#4f46e5`, `#6366f1`, `#7c3aed`, `text-primary`, `bg-primary` | `text-ink` / `bg-ink` |
| `#64748b`, `#94a3b8`, `#cbd5e1` | `text-ink-muted` |
| `#0f172a`, `#1e293b` | `text-ink` |
| `#f8fafc`, `#f1f5f9`, `white`, `bg-white` | `bg-paper` |
| `#e2e8f0`, `#e0e7ff`, `#e5e7eb`, `#f3f4f6` | `border-line` / `bg-line` |
| `#10b981`, `#059669` | `text-ink` (NOT green — green is reserved for done-checkmarks only) |
| `#ef4444` (as error text) | `text-danger` |
| `#f97316`, `#ec4899`, `#0ea5e9`, `#f59e0b`, any accent | `text-ink` or `text-ink-muted` by emphasis |
| `bg-gradient-to-*` (any) | flat `bg-paper` or `bg-ink` |
| `shadow-lg`, `shadow-xl`, `shadow-[0_4px_24px_...]`, colored shadows | remove entirely |

## Structural rules

1. **No cards with shadows.** Replace `Card`+shadow with either a plain block or
   `border border-line rounded-2xl`. A hairline divider (`border-t border-line`)
   is the preferred separator between list rows.
2. **Primary button:** `bg-ink text-paper font-bold rounded-xl px-4 py-3`.
   Secondary: `border border-line text-ink rounded-xl`. Never a gradient.
3. **List rows:** reuse `components/kodetalent/TaskRow.tsx` when the row is a
   checkable task. Otherwise follow its shape: `flex items-center gap-3 py-4
   border-t border-line first:border-t-0`.
4. **Type scale:** page title `text-[26px]/[30px] font-extrabold text-ink
   leading-[1.06] tracking-tight`; section label `text-[11px] font-bold uppercase
   tracking-wider text-ink-muted`; body `text-[14px] text-ink`; caption
   `text-[12px] text-ink-muted`.
5. **Emoji / decorative icons:** keep functional icons (lucide) at
   `text-ink`/`text-ink-muted`. Drop purely decorative emoji and colored icon
   chips. Domain tiles use `border border-line bg-paper`, not colored `domain.bg`.
6. **Progress bars / rings:** track `bg-line`, fill `bg-ink`. No color-coded
   score thresholds (no green/orange/red score rings) — score color is always ink.
7. **Empty states:** one line of `text-ink` explaining what's missing, one
   `text-ink-muted` sub-line, one ink button. No illustration, no dashed boxes
   with colored icons.
8. **Modals / sheets:** `bg-paper rounded-t-3xl`, overlay `bg-ink/40`, grabber
   `bg-line`. No colored headers.

## Non-negotiable

- Do NOT change any logic, state, data fetching, handler, hook, route, or
  `data-testid`. Styling and presentational markup only.
- Keep all existing functionality working. `pnpm run typecheck` must pass.
- Do not delete features. Do not rename exports.
