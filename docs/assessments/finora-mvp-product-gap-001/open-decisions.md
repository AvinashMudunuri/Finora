# PRD open decisions

Source: `docs/product/PRD.md` “Product Decisions Still Open”.

Do not silently resolve these in implementation chats.

| Decision | Classification | Evidence | Before next slice? |
|---|---|---|---|
| Product name / brand | Already resolved by repository | Finora wordmark, tagline, PWA name | No |
| Geography and institution scope | Still genuinely open | USD-only types; fixture US-like names are not a geo decision | Can remain open |
| Fully manual, imported, or live-connected | First version is manual / fixture + local JSON. Live-connected is MVP-excluded. Import format still open | PRD MVP exclude; `#36–#38` JSON stores; no aggregation | Can remain open. Do not start live connectivity |
| Exact card product model and supported card types | Partially evidenced, still open | One credit-card shape (limit, outstanding, due, min, status). No debit/charge/store-card types | Can remain open for Slices 1–4 |
| Categorization rules | Still genuinely open | No `category` on `Transaction` | **Must resolve before any category-spending work.** Not required for Slices 1–4 |
| Liabilities beyond cards | Still genuinely open | NW liabilities = card outstanding only | Can remain open |
| Depth of investment support | Minimum visibility specified; holdings/instruments still open; trend “later” | Account type + asset line | **Must resolve before instrument-level.** Not required for Slice 4 (account-level) |
| Exact insight generation rules | Four kinds implemented as an engineering choice, not a closed PRD | `listAttentionInsights` | **Must resolve before new kinds.** Slice 3 only deepens existing kinds |
| Authentication / account model | Still genuinely open | No auth | Can remain open |
| Monetization | Still genuinely open | None | Can remain open |
| Mobile-first versus web-first | Partially evidenced, still open | Responsive web breakpoints; not a native app | Can remain open |

## Blocking the recommended roadmap?

No recommended slice is blocked.

Category spending would be blocked until categorization rules are written into a committed product artifact — not chat.
