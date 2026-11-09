# @trysac/icu-messageformat

Hand-written ICU MessageFormat parser and compiler/formatter in TypeScript. Supports ICU ApostropheMode `DOUBLE_OPTIONAL`, plural (with offset and exact matches), `selectordinal`, `select`, and `Intl` number formatting. It is designed to be lightweight, typed, and dependency-free, relying on Node.js native `Intl` capabilities.

## The Problem

Translating UI strings requires handling plurals, gender selects, and locale-specific number formatting. ICU MessageFormat is the standard, but existing implementations are often large and lack strict resource bounds. This utility provides a compact, typed alternative that catches errors early with precise offsets and enforces input size limits.

## Usage

```typescript
import { format } from '@trysac/icu-messageformat';

const message = '{n, plural, =0 {none} one {# item} other {# items}}';
const result = format(message, 'en', { n: 1000 });
console.log(result); // "1,000 items"
```

## API Summary

- `parse(message: string, opts?: { maxLength?: number; maxDepth?: number }): MessageAst`: Parses an ICU string into a typed AST. Limits default to `maxLength: 10_000` and `maxDepth: 10`.
- `compile(message: string | MessageAst, locale: string | string[]): (values?: Record<string, unknown>) => string`: Compiles patterns into an efficient formatter. Caches `Intl` objects per compile call.
- `format(message: string, locale: string | string[], values?: Record<string, unknown>): string`: Convenience function for one-step parsing, compilation, and evaluation.
- `MessageFormatError`: Thrown for syntax or formatting errors. Includes `code` (e.g., `syntax`, `unclosed_brace`, `missing_other`, `missing_value`, `invalid_value`, `input_too_large`, `too_deep`) and `offset` (UTF-16 index).

## Why not intl-messageformat?

This library is significantly smaller, providing a dependency-free parser that offers granular typed errors with byte-precise offsets and strict input bounds, whereas larger alternatives often bundle broad, unconstrained features.

See [docs/SECURITY.md](docs/SECURITY.md) for safety details.