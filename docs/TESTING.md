# Testing

## Test Suites

- `test/index.test.ts`: Acceptance tests covering the full corpus from `test/fixtures/corpus.json`. Verifies correct formatting behavior for plural (with offsets/exacts), selectordinal, select, and number styles. Tests error reporting for invalid types, duplicate selectors, and nesting limits.
- `test/conformance.conformance.test.ts`: CI-only differential testing suite using `fast-check`. It generates 2,000 valid ICU patterns to ensure that both the parser and the formatter match the output of `intl-messageformat` and the parsing behavior of `@formatjs/icu-messageformat-parser`.

## Implementation

- Tests are run via `vitest`.
- Coverage is measured against `src/` and must remain above 80%.
- The library is tested solely through the public API (`src/index.ts`) to ensure strict contract validation.
- Tests are deterministic, require no network access, and clean up temporary state automatically.