# Stack

- **Runtime Dependencies**: None. Built entirely on standard JavaScript / TypeScript and Node.js 22+ native `Intl` capabilities (`Intl.NumberFormat`, `Intl.PluralRules`).
- **Dev Dependencies**:
  - `intl-messageformat`: Differential test oracle for formatting output.
  - `@formatjs/icu-messageformat-parser`: Differential test oracle for parser acceptance.
  - `fast-check`: Property-based generator for CI conformance testing.
