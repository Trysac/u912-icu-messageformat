# Project record: icu-messageformat

## Objective

Provide a robust, hand-written ICU MessageFormat parser and formatter that implements ICU apostrophe quoting, plural with offset and exact matches, selectordinal, select, and native Intl number support.

## Scope

- Parsing and AST construction for the supported ICU subset.
- Compilation of AST nodes to runtime formatter functions.
- Integration with Node.js/Browser `Intl` APIs for localization.
- Enforced resource limits on input length and recursion depth.

## Out of Scope

- Date, time, duration, and spellout arguments.
- Number skeletons (::).
- Choice format.
- Rich text tags.
- Message extraction tooling.

## Timeline

| Date | Milestone |
|---|---|
| 2026 | Repository created from the factory utility template. |

## Effort metrics

| Metric | Value | Source |
|---|---|---|
| Tokens (input / output) | 388578 / 22046 | factory ledger |
| Hours (human) | pending measurement | time log |
| Cost (USD) | 0.1119 | factory ledger |

## Factory run u912 (measured from API usage)

| Phase | Model | Batch | Input | Output | Cache write | Cache read | Cost (USD) |
|---|---|---|---|---|---|---|---|
| generation | google/gemini-3.8-flash | yes | 5927 | 14188 | 0 | 0 | 0.0576 |
| fix-1 | google/gemini-3.1-flash-lite | no | 75117 | 6174 | 0 | 136014 | 0.0314 |
| audit | google/gemini-3.1-flash-lite | no | 53719 | 255 | 0 | 100222 | 0.0163 |
| docs | google/gemini-3.1-flash-lite | no | 17579 | 1429 | 0 | 0 | 0.0065 |

Total: $0.1119. Prices: vertex line, as measured by its adapter.
