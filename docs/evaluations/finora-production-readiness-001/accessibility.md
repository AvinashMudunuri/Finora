# Accessibility

Audited in the production preview at 320, 360, 375, 390, 414, 768, 1024, and 1440.

## Verified

- Primary nav is `<nav aria-label="Primary">` with buttons (not fake links). Active dest uses `aria-current="page"` and `.is-active`.
- Mobile: `Open menu` / `Close menu` names, `aria-expanded`, `aria-controls`, native `<dialog>` + `showModal()`, Escape closes, focus returns to `Open menu` after Escape and after dest remount.
- Touch targets on menu trigger/close and mobile dests are `min-height: 44px`.
- `systemNotice` uses `role="alert"`. Account/card success uses `role="status"`. Field errors use `aria-invalid` + `aria-describedby`.
- Sections use `aria-labelledby`. Transaction filters use `role="group"` and `aria-pressed`.
- `:focus-visible` outline exists on nav, menu, chips, and form actions.
- Heading hierarchy is `h1` page title → `h2` panels. Dialog title is `h2`.
- Color is not the only active-nav signal (`aria-current` + left border / class).

## Findings

| ID | Severity | Finding | Action |
| --- | --- | --- | --- |
| A-1 | MEDIUM | `--color-text-muted: #94a3b8` on white is ~2.86:1. Used for history `th`, `.insight-tone`, `.stat-note-quiet`. | **Fixed** → `#64748b` (~4.60:1). Computed header color after fix: `rgb(100, 116, 139)`. |
| A-2 | MEDIUM | No skip-to-main-content control. Keyboard users tab brand + six dests (or Menu) on every remount. | Deferred (PR-D1). Not a silent/broken name defect. |
| A-3 | INFORMATIONAL | `.stat-card h3` / `.panel-header h2` use CSS uppercase. Accessible names stay title case in the a11y tree. | Not a defect. AAEP `assertText` must use `body.innerText`. |
| A-4 | INFORMATIONAL | 320 `html` scrollWidth − clientWidth = 15. Body overflow 0. | Not a defect (scrollbar gutter). |

## Not changed

No layout redesign, no new destinations, no global `overflow-x: hidden`.
