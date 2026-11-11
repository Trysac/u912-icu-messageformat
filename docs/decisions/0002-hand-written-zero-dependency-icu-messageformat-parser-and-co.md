# Hand-written zero-dependency ICU MessageFormat parser and compiler

Status: accepted (generated, pending human review)

## Context

UI localization requires standard ICU MessageFormat handling (plurals with offsets and exact matches, select, selectordinal, number styles, and apostrophe quoting). Existing libraries often bundle large runtimes, lack strict input bounds, or provide generic error messages without syntax offsets.

## Decision

Implement a hand-crafted recursive-descent parser and formatter adhering strictly to ICU MessagePattern with ApostropheMode DOUBLE_OPTIONAL. Bounded by maxLength and maxDepth, raising typed MessageFormatError with machine-readable codes and offsets, and verifying conformance against @formatjs/icu-messageformat-parser and intl-messageformat as dev-only test oracles.

## Consequences

Zero runtime dependencies, predictable execution under untrusted translation inputs, strict type safety, and guaranteed conformance with standard ICU formatters.
