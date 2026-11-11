# Architecture

`@trysac/icu-messageformat` provides a self-contained, hand-written recursive-descent parser and compiler for ICU MessageFormat patterns without external dependencies.

## Parsing Pipeline

1. **Length check**: The input string length is capped at `maxLength` (default 10,000 characters).
2. **Lexing & Ast Construction**: Characters are scanned sequentially respecting ICU `ApostropheMode.DOUBLE_OPTIONAL`.
   - `''` is converted to a single literal apostrophe everywhere.
   - `'` followed by `{`, `}`, or `#` (inside plural/selectordinal) enters quoted literal mode up to the next `'`.
   - Unpaired or non-syntax apostrophes are treated as literal apostrophes.
3. **Depth bounding**: Recursion into nested select and plural options is tracked against `maxDepth` (default 10) to prevent stack overflow.

## Compilation and Formatting

- `compile` initializes required `Intl.NumberFormat` and `Intl.PluralRules` instances scoped to the compiled function closure. No global cache is shared across callers or locales.
- Plural selector resolution evaluates exact matches (`=N`) against the raw value first, followed by plural category rules calculated on `value - offset`.
